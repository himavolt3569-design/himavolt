import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { notifyKitchenNewOrder } from "@/lib/notifications";
import { generateBill, getTaxConfig } from "@/lib/billing";
import { safeHandler, unauthorized, notFound } from "@/lib/api-helpers";
import { createOrderSchema } from "@/lib/validations";
import { logAudit, getClientIp } from "@/lib/audit";
import { getCurrencySymbol } from "@/lib/currency";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Accept staff JWT or owner Clerk session
  const staff = await getStaffSession(req);
  if (!staff || staff.restaurantId !== id) {
    const user = await getOrCreateUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const where: Record<string, unknown> = { restaurantId: id };
  if (status) where.status = status;

  // For live-orders view: exclude terminal orders older than 2 hours
  const liveMode = searchParams.get("live") === "1";
  if (liveMode) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    where.OR = [
      { status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY"] } },
      { status: { in: ["DELIVERED", "CANCELLED", "REJECTED"] }, createdAt: { gte: twoHoursAgo } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
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
}

export const POST = safeHandler(
  async (req, { params, body }) => {
    const { id } = await params;

    const {
      tableNo,
      roomNo,
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
    } = body;

    const restaurant = await db.restaurant.findUnique({ where: { id } });
    if (!restaurant) return notFound("Restaurant not found");

    const orderType = type ?? "DINE_IN";

    // ── Add items to existing cash order ─────────────────────────────
    if (addToOrderId) {
      const existing = await db.order.findFirst({
        where: {
          id: addToOrderId,
          restaurantId: id,
          status: { in: ["PENDING", "ACCEPTED", "PREPARING"] },
        },
        include: { payment: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Active order not found" },
          { status: 404 },
        );
      }

      // Allow adding items to any active dine-in order (cash or online)
      // Previously restricted to CASH only — now supports all payment methods for table sessions

      const addSubtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const taxCfg = await getTaxConfig(id);
      const addTax = taxCfg.taxEnabled
        ? Math.round(addSubtotal * (taxCfg.taxRate / 100) * 100) / 100
        : 0;

      await db.orderItem.createMany({
        data: items.map((item) => ({
          orderId: addToOrderId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          menuItemId: item.menuItemId ?? null,
        })),
      });

      const updated = await db.order.update({
        where: { id: addToOrderId },
        data: {
          subtotal: { increment: addSubtotal },
          tax: { increment: addTax },
          total: { increment: addSubtotal + addTax },
          note: note
            ? existing.note
              ? `${existing.note}; ${note}`
              : note
            : undefined,
        },
        include: { items: true, payment: true, bill: true, delivery: true },
      });

      // Update payment amount to match new total
      if (existing.payment) {
        await db.payment.update({
          where: { id: existing.payment.id },
          data: { amount: { increment: addSubtotal + addTax } },
        });
      }

      // Regenerate bill with updated totals
      await generateBill(addToOrderId);

      // Deduct stock for each added item
      for (const item of items) {
        if (!item.menuItemId) continue;
        const ingredients = await db.menuItemIngredient.findMany({
          where: { menuItemId: item.menuItemId },
          include: { inventoryItem: true },
        });
        for (const ing of ingredients) {
          const updatedInv = await db.inventoryItem.update({
            where: { id: ing.inventoryItemId },
            data: { quantity: { decrement: ing.quantityUsed * item.quantity } },
          });
          // Auto-unavailable if stock depleted
          if (updatedInv.quantity <= 0) {
            const dependents = await db.menuItemIngredient.findMany({
              where: { inventoryItemId: ing.inventoryItemId },
            });
            for (const dep of dependents) {
              await db.menuItem.update({
                where: { id: dep.menuItemId },
                data: { isAvailable: false },
              });
            }
          }
        }
      }

      logAudit({
        action: "ORDER_UPDATED",
        entity: "Order",
        entityId: addToOrderId,
        detail: `Added ${items.length} items to order ${existing.orderNo} (+${getCurrencySymbol(restaurant.currency ?? "NPR")}${addSubtotal + addTax})`,
        metadata: {
          orderNo: existing.orderNo,
          addedItems: items.length,
          addedTotal: addSubtotal + addTax,
        },
        restaurantId: id,
        ipAddress: getClientIp(req.headers),
      });

      return NextResponse.json(updated, { status: 200 });
    }

    // ── Create new order ─────────────────────────────────────────────
    if (orderType === "DELIVERY" && !deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 },
      );
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const taxCfgNew = await getTaxConfig(id);
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

    // ── Coupon validation ────────────────────────────────────────────
    let couponDiscount = 0;
    let couponId: string | null = null;
    if (couponCode) {
      const coupon = await db.coupon.findFirst({
        where: {
          restaurantId: id,
          code: couponCode.toUpperCase(),
          isActive: true,
          startsAt: { lte: new Date() },
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } },
          ],
        },
      });
      if (!coupon) {
        return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 400 });
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
      }
      if (subtotal < coupon.minOrder) {
        return NextResponse.json({ error: `Minimum order of ${coupon.minOrder} required for this coupon` }, { status: 400 });
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
      // Increment usage count
      await db.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    // ── Prepaid check ─────────────────────────────────────────────────
    const isPrepaid = restaurant.prepaidEnabled && paymentMethod !== "CASH";

    const total = subtotal + tax + deliveryFee - couponDiscount;
    const orderNo = `HH-${Date.now().toString(36).toUpperCase()}`;

    let userId: string | undefined;
    try {
      const user = await getOrCreateUser();
      if (user) userId = user.id;
    } catch {
      // guest order — no user session
    }

    const totalPrepTime = items.reduce((max, item) => {
      if (!item.prepTime) return max;
      const match = item.prepTime.match(/(\d+)/);
      const mins = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, mins);
    }, 15);

    const order = await db.order.create({
      data: {
        orderNo,
        tableNo:
          orderType === "DINE_IN" && tableNo
            ? parseInt(String(tableNo), 10)
            : null,
        roomNo: roomNo ?? null,
        subtotal,
        tax,
        total,
        note: note ?? null,
        type: orderType,
        estimatedTime: totalPrepTime,
        restaurantId: id,
        userId: userId ?? null,
        deliveryAddress:
          orderType === "DELIVERY" ? (deliveryAddress ?? null) : null,
        deliveryLat: orderType === "DELIVERY" ? (deliveryLat ?? null) : null,
        deliveryLng: orderType === "DELIVERY" ? (deliveryLng ?? null) : null,
        deliveryPhone:
          orderType === "DELIVERY" ? (deliveryPhone ?? null) : null,
        deliveryNote: orderType === "DELIVERY" ? (deliveryNote ?? null) : null,
        deliveryFee,
        isPrepaid,
        couponId,
        couponDiscount,
        items: {
          createMany: {
            data: items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              menuItemId: item.menuItemId ?? null,
            })),
          },
        },
      },
      include: { items: true },
    });

    // Generate prepaid token if prepaid mode
    if (isPrepaid) {
      const prepaidToken = await db.prepaidToken.create({
        data: {
          amount: total,
          restaurantId: id,
        },
      });
      await db.order.update({
        where: { id: order.id },
        data: { prepaidTokenId: prepaidToken.id },
      });
    }

    if (orderType === "DELIVERY") {
      await db.delivery.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          dropoffLat: deliveryLat ?? null,
          dropoffLng: deliveryLng ?? null,
          fee: deliveryFee,
        },
      });
    }

    if (paymentMethod && paymentMethod !== "NONE") {
      await db.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod as "CASH" | "ESEWA" | "KHALTI" | "BANK" | "COUNTER" | "DIRECT",
          status: paymentMethod === "COUNTER" ? "PENDING" : "PENDING",
          amount: total,
        },
      });
    }

    // Link to table session if provided
    if (tableSessionId) {
      await db.tableSession.update({
        where: { id: tableSessionId },
        data: { orderId: order.id },
      }).catch(() => {
        // Session might not exist or already linked — non-critical
      });
    }

    await generateBill(order.id);

    await db.restaurant.update({
      where: { id },
      data: { totalOrders: { increment: 1 } },
    });

    notifyKitchenNewOrder(
      id,
      orderNo,
      total,
      tableNo ? parseInt(String(tableNo), 10) : null,
      restaurant.currency ?? "NPR",
    ).catch((err: unknown) => {
      console.error("[Orders] Failed to send kitchen notification:", err);
    });

    const fullOrder = await db.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        payment: true,
        bill: true,
        delivery: true,
      },
    });

    // Deduct stock for each ordered item
    for (const item of items) {
      if (!item.menuItemId) continue;
      const ingredients = await db.menuItemIngredient.findMany({
        where: { menuItemId: item.menuItemId },
        include: { inventoryItem: true },
      });
      for (const ing of ingredients) {
        const updatedInv = await db.inventoryItem.update({
          where: { id: ing.inventoryItemId },
          data: { quantity: { decrement: ing.quantityUsed * item.quantity } },
        });
        // Auto-unavailable if stock depleted
        if (updatedInv.quantity <= 0) {
          const dependents = await db.menuItemIngredient.findMany({
            where: { inventoryItemId: ing.inventoryItemId },
          });
          for (const dep of dependents) {
            await db.menuItem.update({
              where: { id: dep.menuItemId },
              data: { isAvailable: false },
            });
          }
        }
      }
    }

    logAudit({
      action: "ORDER_CREATED",
      entity: "Order",
      entityId: order.id,
      detail: `Order ${orderNo} placed (${orderType}, ${items.length} items, ${getCurrencySymbol(restaurant.currency ?? "NPR")}${total})`,
      metadata: { orderNo, type: orderType, total, itemCount: items.length },
      userId: userId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json(fullOrder, { status: 201 });
  },
  { schema: createOrderSchema },
);
