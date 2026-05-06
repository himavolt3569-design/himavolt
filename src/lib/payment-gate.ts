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

  // Customer QR/self-service orders (no staff session) bypass the gate when not
  // prepaid — kitchen accepts immediately, billing reconciles payment async.
  if (!order.processedByStaffId && !order.isPrepaid) {
    return { allowed: true };
  }

  // No payment record — allow (legacy orders or manual flow)
  if (!order.payment) {
    return { allowed: true };
  }

  const { method, status } = order.payment;

  // Payment completed — allow regardless of method
  if ((PAID_STATUSES as readonly string[]).includes(status)) {
    return { allowed: true };
  }

  const methodLabel = METHOD_LABELS[method] || method;

  return {
    allowed: false,
    reason: `Payment must be verified before accepting this order. ${methodLabel} payment is ${status.toLowerCase().replace("_", " ")}.`,
    paymentMethod: method,
    paymentStatus: status,
  };
}
