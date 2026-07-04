import type { Prisma } from "@/generated/prisma";

// How long completed/rejected orders stay visible in the kitchen history.
const LIVE_HISTORY_WINDOW_MS = 45 * 60 * 1000;

/**
 * The ONE definition of "what belongs in the live kitchen queue".
 *
 * Both the initial REST load (GET /api/restaurants/[id]/orders?live=1) and
 * the SSE stream (GET .../orders/stream) feed the same kitchen view. They
 * used to hand-maintain two copies of this filter, which drifted: the stream
 * excluded ALL counter-payment orders (so a QR order paying at the counter
 * appeared on load, then vanished on the first SSE push), used a different
 * pending-methods list, and a different history window. Any change to live
 * semantics goes here and nowhere else.
 */
export function buildLiveOrdersWhere(
  restaurantId: string,
  prepaidEnabled: boolean,
): Prisma.OrderWhereInput {
  const historyCutoff = new Date(Date.now() - LIVE_HISTORY_WINDOW_MS);

  const liveConditions: Prisma.OrderWhereInput[] = [
    // PENDING: only after payment verified (all methods)
    { status: "PENDING", payment: { status: "COMPLETED" } },
    // Legacy orders without a payment record
    { status: "PENDING", payment: { is: null } },
    // Active orders (already passed through the payment gate when accepted)
    { status: "ACCEPTED" },
    // Held orders surface regardless of payment state
    { isHeld: true },
    // Recently rejected (kitchen history window)
    { status: "REJECTED", updatedAt: { gte: historyCutoff } },
    // QR/waiter orders with a physical payment settled at the end
    // (order-first, pay-at-end): they must reach the kitchen immediately.
    {
      status: "PENDING",
      payment: {
        method: { in: ["CASH", "BANK", "COUNTER", "DIRECT"] },
        status: "PENDING",
      },
    },
  ];

  // Pay-at-end restaurants: any unpaid PENDING dine-in order is live.
  if (!prepaidEnabled) {
    liveConditions.push({
      status: "PENDING",
      payment: { status: "PENDING" },
      type: "DINE_IN",
    });
  }

  return {
    restaurantId,
    // Fast Pay (DIRECT) and Manual Pay (COUNTER) counter sales entered at the
    // POS never belong in the kitchen queue — the food is handed over on the
    // spot. Scoped to POS-sourced orders only: a QR customer choosing
    // pay-at-counter still needs their order cooked.
    NOT: {
      sourceType: "POS",
      payment: { method: { in: ["DIRECT", "COUNTER"] } },
    },
    OR: liveConditions,
  };
}
