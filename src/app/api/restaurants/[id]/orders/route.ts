import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { notifyKitchenNewOrder } from "@/lib/notifications";
import { notifyOrderChanged, notifyRestaurantOrders } from "@/lib/realtime";
import { getTaxConfig } from "@/lib/billing";
import { safeHandler, notFound } from "@/lib/api-helpers";
import { createOrderSchema } from "@/lib/validations";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";
import { rateLimit, clientKey, claimOnce, releaseClaim } from "@/lib/rate-limit";
import { setOrderTrackCookie, canAccessOrder } from "@/lib/order-access";
import {
  createOrder,
  appendToOrder,
  type OrderSourceType,
} from "@/lib/orders/create-order";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // Accept staff JWT or owner session
  const staff = await getStaffSession(req);
  if (!staff || staff.restaurantId !== id) {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (restaurant.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: Record<string, unknown> = { restaurantId: id };
  if (status) where.status = status;

  // For live-orders view: only show paid orders in the kitchen queue
  const liveMode = searchParams.get("live") === "1";
  if (liveMode) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    delete where.status;

    // Exclude Manual Pay (COUNTER) and Fast Pay (DIRECT) from POS entirely
    // so fast-pay walk-ins don't clog the kitchen queue.
    where.NOT = {
      sourceType: "POS",
      payment: {
        method: {
          in: ["DIRECT", "COUNTER"]
        }
      }
    };

    const liveConditions: any[] = [
      // PENDING: only after payment verified (all methods)
      { status: "PENDING", payment: { status: "COMPLETED" } },
      // Legacy orders without a payment record
      { status: "PENDING", payment: { is: null } },
      // Active orders (already passed through payment gate when accepted)
      { status: { in: ["ACCEPTED", "ACCEPTED", "ACCEPTED"] } },
      // Recently completed (for kitchen history)
      {
        status: { in: ["ACCEPTED", "REJECTED", "REJECTED"] },
        createdAt: { gte: twoHoursAgo },
      },
      // QR customer orders with physical payment (CASH / BANK / COUNTER / DIRECT):
      {
        status: "PENDING",
        payment: { method: { in: ["CASH", "BANK", "COUNTER", "DIRECT"] }, status: "PENDING" },
      },
    ];

    // If prepaid is NOT forced, allow DINE_IN orders to skip the payment gate
    if (restaurant.prepaidEnabled === false) {
      liveConditions.push({
        status: "PENDING",
        payment: { status: "PENDING" },
        type: "DINE_IN",
      });
    }

    where.OR = liveConditions;
  }

  // Use explicit select to avoid pulling columns that may not exist in the
  // production database yet (schema drift protection).
  const orderSelect = {
    id: true,
    orderNo: true,
    tableNo: true,
    roomNo: true,
    guestName: true,
    status: true,
    type: true,
    subtotal: true,
    tax: true,
    total: true,
    note: true,
    
    deliveryAddress: true,
    deliveryLat: true,
    deliveryLng: true,
    deliveryPhone: true,
    deliveryNote: true,
    deliveryFee: true,
    acceptedAt: true,
    
    
    
    createdAt: true,
    updatedAt: true,
    userId: true,
    restaurantId: true,
  };

  try {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        select: {
          ...orderSelect,
          items: true,
          user: { select: { name: true, email: true } },
          payment: {
            select: { method: true, status: true, transactionId: true },
          },
          delivery: {
            include: {
              driver: {
                select: {
                  name: true,
                  phone: true,
                  vehicleType: true,
                  vehicleNo: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, limit, offset });
  } catch (err) {
    console.error("[Orders GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

export const POST = safeHandler(
  async (req, { params, body }) => {
    const { id } = await params;

    // Light per-IP rate limit so a single bot can't spam thousands of orders
    // at one restaurant. The fraud-protection layers below are the real fix;
    // this just keeps the kitchen queue from being flooded.
    const limit = await rateLimit(clientKey(req, "orders"), 10 * 60_000, 30);
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many orders from this address. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const {
      tableNo,
      roomNo,
      guestName,
      items,
      note,
      type,
      paymentMethod,
      addToOrderId,
      tableSessionId,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryPhone,
      deliveryNote,
      couponCode,
      autoAccept,
      idempotencyKey,
    } = body;

    const restaurant = await db.restaurant.findUnique({ where: { id } });
    if (!restaurant) return notFound("Restaurant not found");

    const orderType = type ?? "DINE_IN";

    // Resolve menu items once. Server is the source of truth for prices —
    // a malicious client could send `price: 0.01` otherwise.
    const menuItemIds = Array.from(
      new Set(items.map((i) => i.menuItemId).filter(Boolean) as string[]),
    );
    const menuItems = menuItemIds.length
      ? await db.menuItem.findMany({
          where: { id: { in: menuItemIds }, restaurantId: id },
          select: {
            id: true,
            name: true,
            price: true,
            discount: true,
            prepTime: true,
            isDrink: true,
            drinkCategory: true,
            stockEnabled: true,
            stockQuantity: true,
            sizes: { select: { priceAdd: true } },
            addOns: { select: { price: true } },
          },
        })
      : [];
    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    /**
     * Resolve the authoritative unit price for an order item.
     * Floor: discounted base price (customers cannot underpay).
     * Ceiling: base + max size add + sum of all add-on prices (legitimate
     * variations stay within this band). Returns the clamped client price.
     */
    function priceForLine(line: {
      menuItemId?: string;
      quantity: number;
    }): { ok: true; price: number } | { ok: false; error: string } {
      if (!line.menuItemId) {
        return { ok: false, error: "menuItemId is required" };
      }
      const m = menuItemMap.get(line.menuItemId);
      if (!m) {
        return { ok: false, error: "Menu item not found in this restaurant" };
      }
      const base = m.price;
      const floor =
        m.discount > 0
          ? Math.round(base * (1 - m.discount / 100) * 100) / 100
          : base;
      const maxSizeAdd = m.sizes.reduce(
        (max, s) => Math.max(max, s.priceAdd),
        0,
      );
      const addOnSum = m.addOns.reduce((sum, a) => sum + a.price, 0);
      // Ceiling allows for size + every add-on plus a small surge buffer.
      const ceiling = (base + maxSizeAdd + addOnSum) * 1.5;

      // Use the menu's current floor as the authoritative price. We never
      // store the client-supplied number — the database is the source.
      return { ok: true, price: Math.max(floor, Math.min(base, ceiling)) };
    }

    // Replace each line's price with the server-resolved value before any math.
    const resolvedItems: Array<{
      name: string;
      quantity: number;
      price: number;
      menuItemId: string;
      addOns?: string;
      prepTimeSnapshot?: string | null;
      drinkCategory?: string | null;
    }> = [];
    for (const line of items) {
      const result = priceForLine(line);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const m = menuItemMap.get(line.menuItemId!);
      resolvedItems.push({
        name: m?.name ?? line.name,
        quantity: line.quantity,
        price: result.price,
        menuItemId: line.menuItemId!,
        ...(line.addOns ? { addOns: line.addOns } : {}),
        // Snapshot the item's configured prep time at order time (2.5b/2.5c) so
        // the tracking page (2.5e) shows the value as it was when ordered.
        prepTimeSnapshot: m?.prepTime ?? null,
        drinkCategory: m?.drinkCategory ?? null,
      });
    }

    // Idempotency short-circuit (Phase 2.5c): a repeat submit whose key already
    // produced an order (any source) returns that order before we decide
    // create-vs-append, so a retry can never become a second order OR a stray
    // append. (createOrder also re-checks this for direct callers.)
    if (idempotencyKey) {
      const prior = await db.order.findFirst({
        where: { restaurantId: id, idempotencyKey },
        select: { id: true },
      });
      if (prior) {
        const dupOrder = await db.order.findUnique({
          where: { id: prior.id },
          include: { items: true, payment: true, bill: true, delivery: true },
        });
        const dupRes = NextResponse.json(dupOrder, { status: 200 });
        setOrderTrackCookie(dupRes, prior.id);
        return dupRes;
      }
    }

    // One running bill per table: when the client didn't pass an explicit
    // addToOrderId but this dine-in is tied to an active table session that
    // already has an open, unpaid order, append to that order instead of
    // opening a second ticket. tableSessionId is a server-issued token bound to
    // the physical table, so a stranger can't grow someone else's tab.
    let appendOrderId: string | undefined = addToOrderId ?? undefined;
    if (!appendOrderId && tableSessionId) {
      const sessionOrder = await db.order.findFirst({
        where: {
          restaurantId: id,
          status: { in: ["PENDING", "ACCEPTED", "ACCEPTED"] },
          tableSession: { id: tableSessionId, isActive: true },
          OR: [
            { payment: null },
            { payment: { status: { notIn: ["COMPLETED", "REFUNDED"] } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (sessionOrder) appendOrderId = sessionOrder.id;
    }

    if (appendOrderId) {
      const existing = await db.order.findFirst({
        where: {
          id: appendOrderId,
          restaurantId: id,
          status: { in: ["PENDING", "ACCEPTED", "ACCEPTED"] },
        },
        include: { payment: true, tableSession: { select: { id: true } } },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Active order not found" },
          { status: 404 },
        );
      }

      // Add-to-order ownership. Reuse the canonical canAccessOrder helper —
      // it accepts staff of this restaurant, the order's owning user, the
      // restaurant owner, AND an anonymous guest presenting the order's track
      // cookie (set on the order POST, auto-sent on later requests). We also
      // allow a table co-diner holding the matching tableSessionId, proving
      // they're physically at the table even if they didn't place the order.
      // The previous hand-rolled check missed the track-cookie path, which
      // 403'd anonymous guests adding to their OWN running tab (e.g. Takeaway,
      // or Dine-In placed without scanning a table QR).
      const sessionMatch =
        !!tableSessionId &&
        !!existing.tableSession?.id &&
        tableSessionId === existing.tableSession.id;
      const isAuthorisedToAdd =
        (await canAccessOrder(req, existing)) || sessionMatch;
      if (!isAuthorisedToAdd) {
        return NextResponse.json(
          { error: "Not allowed to modify this order" },
          { status: 403 },
        );
      }

      const taxCfg = await getTaxConfig(id, restaurant);

      // Idempotency for append: a repeat submit with the same key (that didn't
      // already create an order — handled above) must not add items twice. Claim
      // the key; a lost claim means a duplicate, so return the order unchanged.
      const appendClaimKey = idempotencyKey
        ? `order-append:${id}:${idempotencyKey}`
        : null;
      if (appendClaimKey) {
        const fresh = await claimOnce(appendClaimKey, 120);
        if (!fresh) {
          const current = await db.order.findUnique({
            where: { id: existing.id },
            include: { items: true, payment: true, bill: true, delivery: true },
          });
          return NextResponse.json(current, { status: 200 });
        }
      }

      // Atomic append: items + totals + payment amount + bill + stock in ONE
      // transaction. No side effects inside.
      let appendResult;
      try {
        appendResult = await appendToOrder({
          restaurantId: id,
          orderId: existing.id,
          existingNote: existing.note,
          items: resolvedItems,
          note: note ?? null,
          taxConfig: taxCfg,
        });
      } catch (appendErr) {
        // Free the claim so a genuine retry can re-attempt the failed append.
        if (appendClaimKey) await releaseClaim(appendClaimKey);
        throw appendErr;
      }

      const updated = await db.order.findUnique({
        where: { id: existing.id },
        include: { items: true, payment: true, bill: true, delivery: true },
      });

      // Ensure trackToken exists for older orders that might not have one (Phase 2.5e fallback)
      if (updated && !updated.trackToken) {
        const { randomBytes } = require("crypto");
        const trackToken = randomBytes(24).toString("hex");
        await db.order.update({
          where: { id: updated.id },
          data: { trackToken },
        });
        updated.trackToken = trackToken;
      }

      // ── Side effects AFTER commit only ──
      logAudit({
        action: "ORDER_UPDATED",
        entity: "Order",
        entityId: existing.id,
        detail: `Added ${resolvedItems.length} items to order ${existing.orderNo} (+${getCurrencySymbol(restaurant.currency ?? "NPR")}${appendResult.addedTotal})`,
        metadata: {
          orderNo: existing.orderNo,
          addedItems: resolvedItems.length,
          addedTotal: appendResult.addedTotal,
        },
        restaurantId: id,
        ipAddress: getClientIp(req.headers),
      });

      notifyOrderChanged(existing.id, id, { reason: "items-added" });

      return NextResponse.json(updated, { status: 200 });
    }

    if (orderType === "DELIVERY" && !deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 },
      );
    }

    // Server-authoritative table number: when the order belongs to a table
    // session, trust the session's table (which was set securely from the QR
    // token) rather than the client-supplied tableNo — a guest editing
    // ?table=N in the URL can no longer place orders against another table.
    let resolvedTableNo: number | null =
      orderType === "DINE_IN" &&
      tableNo &&
      !isNaN(parseInt(String(tableNo), 10))
        ? parseInt(String(tableNo), 10)
        : null;
    if (tableSessionId) {
      const sess = await db.tableSession.findFirst({
        where: { id: tableSessionId, restaurantId: id },
        select: { tableNo: true },
      });
      if (sess) resolvedTableNo = sess.tableNo;
    }

    const subtotal = resolvedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const taxCfgNew = await getTaxConfig(id, restaurant);
    const tax = taxCfgNew.taxEnabled
      ? Math.round(subtotal * (taxCfgNew.taxRate / 100) * 100) / 100
      : 0;

    // Calculate delivery fee — single query to avoid race conditions
    let deliveryFee = 0;
    if (orderType === "DELIVERY") {
      const zone = await db.deliveryZone.findFirst({
        where: { restaurantId: id, isActive: true },
      });
      if (zone) {
        deliveryFee =
          zone.freeAbove && subtotal >= zone.freeAbove ? 0 : zone.baseFee;
      } else {
        deliveryFee = 50; // default delivery charge
      }
    }

    // Validate the coupon READ-ONLY here. The usedCount increment happens inside
    // createOrder's transaction (Phase 2.5c), so a coupon is never consumed
    // unless the order actually commits.
    let couponDiscount = 0;
    let couponId: string | null = null;
    if (couponCode) {
      try {
        const coupon = await db.coupon.findFirst({
          where: {
            restaurantId: id,
            code: couponCode.toUpperCase(),
            isActive: true,
            startsAt: { lte: new Date() },
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        });
        if (!coupon) {
          return NextResponse.json(
            { error: "Invalid or expired coupon code" },
            { status: 400 },
          );
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          return NextResponse.json(
            { error: "Coupon usage limit reached" },
            { status: 400 },
          );
        }
        if (subtotal < coupon.minOrder) {
          return NextResponse.json(
            {
              error: `Minimum order of ${coupon.minOrder} required for this coupon`,
            },
            { status: 400 },
          );
        }
        if (coupon.type === "PERCENTAGE") {
          couponDiscount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
          if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
            couponDiscount = coupon.maxDiscount;
          }
        } else {
          couponDiscount = Math.min(coupon.value, subtotal);
        }
        couponId = coupon.id;
      } catch {
        // Coupon table may not exist yet — skip coupon
        console.warn("Coupon validation skipped — table may not exist");
      }
    }

    const r = restaurant as Record<string, unknown>;
    const isPrepaid = r.prepaidEnabled === true && paymentMethod !== "CASH";

    // Floor at 0 — coupons can't take the order negative.
    const rawTotal = subtotal + tax + deliveryFee - couponDiscount;
    const total = Math.max(0, Math.round(rawTotal * 100) / 100);

    let userId: string | undefined;
    try {
      const user = await getOrCreateUser();
      if (user) userId = user.id;
    } catch {
      // guest order — no user session
    }

    // Capture which staff member created this order (for shift attribution)
    // and decide if autoAccept is honored — only staff sessions can bypass
    // the PENDING queue.
    let processedByStaffId: string | null = null;
    let staffAuthorisedAutoAccept = false;
    try {
      const staffSession = await getStaffSession(req);
      if (staffSession?.restaurantId === id) {
        processedByStaffId = staffSession.staffId;
        staffAuthorisedAutoAccept = true;
      }
    } catch {
      // no staff session — customer order
    }

    // Fast Pay (DIRECT) is a counter sale — the food is handed over now, so the
    // order skips the PENDING queue (ACCEPTED immediately) and the kitchen push.
    const isFastPayCounterSale =
      staffAuthorisedAutoAccept && paymentMethod === "DIRECT";
    const accepted =
      isFastPayCounterSale || (autoAccept && staffAuthorisedAutoAccept);
    const status: "PENDING" | "ACCEPTED" = accepted ? "ACCEPTED" : "PENDING";
    const acceptedAt = accepted ? new Date() : null;

    // Best-effort order source classification from request context.
    const sourceType: OrderSourceType | null = processedByStaffId
      ? "POS"
      : roomNo
        ? "HOTEL_ROOM_QR"
        : tableSessionId || resolvedTableNo != null
          ? "TABLE_QR"
          : null;

    // ── Atomic create (Phase 2.5c): Order+items+prepTimeSnapshot, Payment,
    //    Bill, session link, delivery/prepaid, stock, counter — one transaction.
    //    Idempotent on (restaurantId, idempotencyKey). NO side effects inside. ──
    const created = await createOrder({
      restaurantId: id,
      status,
      acceptedAt,
      type: orderType,
      items: resolvedItems,
      subtotal,
      tax,
      total,
      deliveryFee,
      note: note ? note.slice(0, 500) : null,
      tableNo: resolvedTableNo,
      roomNo: roomNo ?? null,
      guestName: guestName?.trim() || null,
      userId: userId ?? null,
      processedByStaffId,
      isPrepaid,
      paymentMethod: paymentMethod ?? "COUNTER",
      couponId,
      couponDiscount,
      tableSessionId: tableSessionId ?? null,
      delivery:
        orderType === "DELIVERY"
          ? {
              address: deliveryAddress ?? null,
              lat: deliveryLat ?? null,
              lng: deliveryLng ?? null,
              phone: deliveryPhone ?? null,
              note: deliveryNote ?? null,
            }
          : null,
      sourceType,
      idempotencyKey: idempotencyKey ?? null,
      taxConfig: taxCfgNew,
      restaurantName: restaurant.name ?? null,
    });

    const fullOrder = await db.order.findUnique({
      where: { id: created.orderId },
      include: { items: true, payment: true, bill: true, delivery: true },
    });

    const response = NextResponse.json(fullOrder, {
      status: created.deduped ? 200 : 201,
    });
    setOrderTrackCookie(response, created.orderId);

    // Duplicate submit (same idempotencyKey) — return the original order WITHOUT
    // re-running any side effects (no double notify / kitchen push / audit).
    if (created.deduped) {
      return response;
    }

    // ── Side effects AFTER commit only (never inside the transaction) ──
    // Fast Pay sales never enter the kitchen workflow, so skip the push too.
    if (!isFastPayCounterSale) {
      notifyKitchenNewOrder(
        id,
        created.orderNo,
        total,
        resolvedTableNo,
        restaurant.currency ?? "NPR",
      ).catch((err: unknown) => {
        console.error("[Orders] Failed to send kitchen notification:", err);
      });
    }

    logAudit({
      action: "ORDER_CREATED",
      entity: "Order",
      entityId: created.orderId,
      detail: `Order ${created.orderNo} placed (${orderType}, ${resolvedItems.length} items, ${getCurrencySymbol(restaurant.currency ?? "NPR")}${total})`,
      metadata: {
        orderNo: created.orderNo,
        type: orderType,
        total,
        itemCount: resolvedItems.length,
      },
      userId: userId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    // Push to the kitchen/dashboard live feed instantly over WebSocket.
    notifyRestaurantOrders(id, { reason: "new-order", orderId: created.orderId });

    return response;
  },
  { schema: createOrderSchema },
);
