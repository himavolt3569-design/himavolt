import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { generateBill, getTaxConfig } from "@/lib/billing";
import { deductStock } from "@/lib/stock";

/**
 * Phase 2.5c — single, transactional order-create service.
 *
 * Everything that must succeed or fail together (Order + items + prepTimeSnapshot,
 * Payment(PENDING), Bill, table-session link, delivery/prepaid records, stock
 * decrement, order counter) runs inside ONE interactive `$transaction`. NO side
 * effects (realtime, SSE, FCM, printing) happen here — the caller fires those
 * only AFTER commit succeeds.
 *
 * Idempotency is restaurant-scoped: a repeat call with the same
 * (restaurantId, idempotencyKey) returns the original order's ids and does NOT
 * create a second order/bill/payment or decrement stock again.
 *
 * NOTE: this relies on the Phase 2.5b additive columns existing in the database.
 * Deploy the schema first (ADDITIVE_SCHEMA_SYNC=true) — there is no silent
 * "retry without new columns" fallback, by design (silent degradation would drop
 * the idempotency/track-token guarantees).
 */

type TaxConfig = Awaited<ReturnType<typeof getTaxConfig>>;

export type OrderSourceType = "TABLE_QR" | "HOTEL_ROOM_QR" | "POS" | "STAFF";

export interface CreateOrderItemInput {
  name: string;
  quantity: number;
  price: number;
  menuItemId: string;
  addOns?: string;
  prepTimeSnapshot?: string | null;
  drinkCategory?: string | null;
}

export interface CreateOrderInput {
  restaurantId: string;
  status: "PENDING" | "ACCEPTED";
  acceptedAt: Date | null;
  type: "DINE_IN" | "DELIVERY" | "TAKEAWAY";
  items: CreateOrderItemInput[];
  subtotal: number;
  tax: number;
  total: number;
  deliveryFee: number;
  note: string | null;
  tableNo: number | null;
  roomNo: string | null;
  guestName: string | null;
  userId: string | null;
  processedByStaffId: string | null;
  isPrepaid: boolean;
  paymentMethod: "ESEWA" | "KHALTI" | "BANK" | "CASH" | "COUNTER" | "DIRECT";
  couponId: string | null;
  couponDiscount: number;
  tableSessionId: string | null;
  delivery: {
    address: string | null;
    lat: number | null;
    lng: number | null;
    phone: string | null;
    note: string | null;
  } | null;
  sourceType: OrderSourceType | null;
  idempotencyKey: string | null;
  taxConfig: TaxConfig;
  restaurantName: string | null;
}

export interface CreateOrderResult {
  orderId: string;
  orderNo: string;
  trackToken: string;
  billId: string | null;
  /** true when an existing order was returned for a duplicate idempotencyKey. */
  deduped: boolean;
}

async function findByIdempotencyKey(
  restaurantId: string,
  idempotencyKey: string,
): Promise<CreateOrderResult | null> {
  const existing = await db.order.findFirst({
    where: { restaurantId, idempotencyKey },
    select: { id: true, orderNo: true, trackToken: true, bill: { select: { id: true } } },
  });
  if (!existing) return null;
  return {
    orderId: existing.id,
    orderNo: existing.orderNo,
    trackToken: existing.trackToken ?? "",
    billId: existing.bill?.id ?? null,
    deduped: true,
  };
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  // 1. Idempotency fast-path: a repeat submit returns the original order.
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(
      input.restaurantId,
      input.idempotencyKey,
    );
    if (existing) return existing;
  }

  const orderNo = `HH-${Date.now().toString(36).toUpperCase()}`;
  const trackToken = randomBytes(24).toString("hex");
  const isDelivery = input.type === "DELIVERY";
  // One timestamp shared by every item in this initial batch — its "round".
  const batchAt = new Date();

  try {
    const { orderId, billId } = await db.$transaction(
      async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNo,
            status: input.status,
            acceptedAt: input.acceptedAt,
            tableNo: input.tableNo,
            roomNo: input.roomNo,
            guestName: input.guestName,
            subtotal: input.subtotal,
            tax: input.tax,
            total: input.total,
            note: input.note,
            type: input.type,
            restaurantId: input.restaurantId,
            userId: input.userId,
            deliveryAddress: isDelivery ? input.delivery?.address ?? null : null,
            deliveryLat: isDelivery ? input.delivery?.lat ?? null : null,
            deliveryLng: isDelivery ? input.delivery?.lng ?? null : null,
            deliveryPhone: isDelivery ? input.delivery?.phone ?? null : null,
            deliveryNote: isDelivery ? input.delivery?.note ?? null : null,
            deliveryFee: input.deliveryFee,
            isPrepaid: input.isPrepaid,
            couponId: input.couponId,
            couponDiscount: input.couponDiscount,
            processedByStaffId: input.processedByStaffId,
            sourceType: input.sourceType,
            trackToken,
            idempotencyKey: input.idempotencyKey,
            items: {
              createMany: {
                data: input.items.map((it) => ({
                  name: it.name,
                  quantity: it.quantity,
                  price: it.price,
                  menuItemId: it.menuItemId,
                  kitchenStatus: "PENDING",
                  ...(it.addOns ? { addOns: it.addOns } : {}),
                  ...(it.prepTimeSnapshot
                    ? { prepTimeSnapshot: it.prepTimeSnapshot }
                    : {}),
                })),
              },
            },
          },
          select: { id: true },
        });

        // Prepaid token (when the restaurant runs prepaid mode)
        if (input.isPrepaid) {
          const token = await tx.prepaidToken.create({
            data: { amount: input.total, restaurantId: input.restaurantId },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { prepaidTokenId: token.id },
          });
        }

        // Delivery record
        if (isDelivery) {
          await tx.delivery.create({
            data: {
              orderId: order.id,
              status: "PENDING",
              dropoffLat: input.delivery?.lat ?? null,
              dropoffLng: input.delivery?.lng ?? null,
              fee: input.deliveryFee,
            },
          });
        }

        // Payment — always starts PENDING (QR/online verified by staff later).
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: input.paymentMethod,
            status: "PENDING",
            amount: input.total,
          },
        });

        // Link the table session. updateMany (not update) so a missing/stale
        // session id can't abort the whole transaction.
        if (input.tableSessionId) {
          await tx.tableSession.updateMany({
            where: { id: input.tableSessionId, restaurantId: input.restaurantId },
            data: { orderId: order.id },
          });
        }

        // Bill + order counter + stock decrement — all inside the transaction.
        const bill = await generateBill(order.id, {
          taxConfig: input.taxConfig,
          tx,
        });
        await tx.restaurant.update({
          where: { id: input.restaurantId },
          data: { totalOrders: { increment: 1 } },
        });

        // Consume the coupon INSIDE the transaction so a rollback never leaves a
        // coupon marked used without an order. (Validation happens read-only in
        // the route; only the usedCount increment lives here.)
        if (input.couponId) {
          await tx.coupon.update({
            where: { id: input.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        await deductStock(input.items, tx);

        // Enqueue a durable KOT PrintJob INSIDE the transaction so a rollback
        // can never leave an orphaned print job, and a commit always leaves one.
        const kotPayload = {
          restaurantName: input.restaurantName,
          orderNo,
          tableNo: input.tableNo,
          roomNo: input.roomNo,
          guestName: input.guestName,
          note: input.note,
          sourceType: input.sourceType,
          items: input.items.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            drinkCategory: it.drinkCategory ?? null,
          })),
        };
        await tx.printJob.create({
          data: {
            restaurantId: input.restaurantId,
            orderId: order.id,
            type: "KOT",
            status: "PENDING",
            payload: kotPayload,
          },
        });

        return { orderId: order.id, billId: bill.id };
      },
      { timeout: 20000, maxWait: 10000 },
    );

    return { orderId, orderNo, trackToken, billId, deduped: false };
  } catch (err) {
    // Concurrency: two simultaneous submits with the same key — the second hits
    // the @@unique([restaurantId, idempotencyKey]) constraint (P2002). Resolve to
    // the order the winner created instead of surfacing an error.
    if (
      input.idempotencyKey &&
      (err as { code?: string })?.code === "P2002"
    ) {
      const existing = await findByIdempotencyKey(
        input.restaurantId,
        input.idempotencyKey,
      );
      if (existing) return existing;
    }
    throw err;
  }
}

export interface AppendToOrderInput {
  restaurantId: string;
  orderId: string;
  existingNote: string | null;
  items: CreateOrderItemInput[];
  note: string | null;
  taxConfig: TaxConfig;
}

export interface AppendToOrderResult {
  orderId: string;
  billId: string | null;
  addedSubtotal: number;
  addedTotal: number;
}

/**
 * Phase 2.5c — transactional "add items to an existing open order" (running tab).
 * Item rows, order totals, payment amount, bill regen and stock decrement all
 * commit together. NO side effects here — the caller fires realtime AFTER commit.
 *
 * Auth/ownership and idempotency are enforced by the caller (the orders route)
 * BEFORE this runs.
 */
export async function appendToOrder(
  input: AppendToOrderInput,
): Promise<AppendToOrderResult> {
  const addedSubtotal = input.items.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0,
  );
  const addedTax = input.taxConfig.taxEnabled
    ? Math.round(addedSubtotal * (input.taxConfig.taxRate / 100) * 100) / 100
    : 0;
  const addedTotal = addedSubtotal + addedTax;

  // Cap concatenated note length over many add-to-order rounds.
  const mergedNote = input.note
    ? input.existingNote
      ? `${input.existingNote}; ${input.note}`.slice(0, 500)
      : input.note.slice(0, 500)
    : undefined;

  // One timestamp shared by every item in this add-on batch — its "round".
  const batchAt = new Date();

  const billId = await db.$transaction(
    async (tx) => {
      await tx.orderItem.createMany({
        data: input.items.map((it) => ({
          orderId: input.orderId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          menuItemId: it.menuItemId,
          kitchenStatus: "PENDING",
          ...(it.addOns ? { addOns: it.addOns } : {}),
          ...(it.prepTimeSnapshot
            ? { prepTimeSnapshot: it.prepTimeSnapshot }
            : {}),
        })),
      });

      await tx.order.update({
        where: { id: input.orderId },
        data: {
          subtotal: { increment: addedSubtotal },
          tax: { increment: addedTax },
          total: { increment: addedTotal },
          ...(mergedNote !== undefined ? { note: mergedNote } : {}),
        },
      });

      // Keep the payment amount in step with the new total (no-op if no payment).
      await tx.payment.updateMany({
        where: { orderId: input.orderId },
        data: { amount: { increment: addedTotal } },
      });

      const bill = await generateBill(input.orderId, {
        taxConfig: input.taxConfig,
        tx,
      });
      await deductStock(input.items, tx);

      const existingOrder = await tx.order.findUnique({
        where: { id: input.orderId },
        select: { orderNo: true, tableNo: true, roomNo: true, guestName: true, sourceType: true, restaurant: { select: { name: true } } }
      });

      if (existingOrder) {
        const kotPayload = {
          restaurantName: existingOrder.restaurant.name,
          orderNo: existingOrder.orderNo,
          tableNo: existingOrder.tableNo,
          roomNo: existingOrder.roomNo,
          guestName: existingOrder.guestName,
          note: input.note,
          sourceType: existingOrder.sourceType,
          isAddOn: true,
          batchLabel: "Add-on",
          items: input.items.map((it) => ({
            name: it.name,
            quantity: it.quantity,
            drinkCategory: it.drinkCategory ?? null,
          })),
        };
        await tx.printJob.create({
          data: {
            restaurantId: input.restaurantId,
            orderId: input.orderId,
            type: "KOT",
            status: "PENDING",
            payload: kotPayload,
          },
        });
      }

      return bill.id;
    },
    { timeout: 20000, maxWait: 10000 },
  );

  return { orderId: input.orderId, billId, addedSubtotal, addedTotal };
}
