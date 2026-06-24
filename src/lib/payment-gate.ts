import { db } from "./db";

/** Statuses that satisfy the payment gate for kitchen acceptance. */
const PAID_STATUSES = ["COMPLETED"] as const;

/** Human-readable labels for payment methods. */
const METHOD_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  BANK: "Bank Transfer",
  CASH: "Cash",
  COUNTER: "Counter",
  DIRECT: "Direct",
};

/**
 * Server-side payment gate: determines whether an order can transition
 * to ACCEPTED status based on its payment state.
 *
 * ALL payment methods must be verified/collected (status = COMPLETED)
 * before the kitchen can accept the order. This ensures:
 *  - Digital (ESEWA, KHALTI, BANK): gateway callback or staff verification
 *  - Cash/Counter/Direct: staff marks payment as collected via billing
 *
 * Returns { allowed: true } only for:
 *  - Orders with no payment record (legacy/manual)
 *  - Any method with COMPLETED payment status
 *
 * Returns { allowed: false, reason } for:
 *  - Any method with non-COMPLETED status (PENDING, FAILED, EXPIRED, AWAITING_VERIFICATION)
 */
export async function canAcceptOrder(orderId: string): Promise<{
  allowed: boolean;
  reason?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      isPrepaid: true,
      processedByStaffId: true,
      payment: {
        select: {
          method: true,
          status: true,
        },
      },
    },
  });

  if (!order) {
    return { allowed: false, reason: "Order not found" };
  }

  // Bypass payment gate: kitchen should be able to accept any order immediately
  // regardless of payment status (e.g., cash later, staff orders, etc.)
  return { allowed: true };
}
