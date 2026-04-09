import { db } from "./db";

/**
 * Digital payment methods that MUST be completed before an order
 * can be accepted into the kitchen. Cash/Counter/Direct follow the
 * "serve first, collect later" workflow and bypass this gate.
 */
const DIGITAL_METHODS = ["ESEWA", "KHALTI", "BANK"] as const;

/** Statuses that satisfy the payment gate for kitchen acceptance. */
const PAID_STATUSES = ["COMPLETED"] as const;

export function requiresPaymentBeforeKitchen(method: string): boolean {
  return (DIGITAL_METHODS as readonly string[]).includes(method);
}

/**
 * Server-side payment gate: determines whether an order can transition
 * to ACCEPTED status based on its payment state.
 *
 * Returns { allowed: true } for:
 *  - Orders with no payment record (legacy/manual)
 *  - CASH, COUNTER, DIRECT payment methods (serve-first model)
 *  - Digital methods (ESEWA, KHALTI, BANK) with COMPLETED payment
 *
 * Returns { allowed: false, reason } for:
 *  - Digital methods with PENDING, FAILED, EXPIRED, or AWAITING_VERIFICATION payment
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

  // No payment record — allow (legacy orders or manual flow)
  if (!order.payment) {
    return { allowed: true };
  }

  const { method, status } = order.payment;

  // Non-digital methods bypass the gate
  if (!requiresPaymentBeforeKitchen(method)) {
    return { allowed: true };
  }

  // Digital method — require completed payment
  if ((PAID_STATUSES as readonly string[]).includes(status)) {
    return { allowed: true };
  }

  const methodLabel =
    method === "ESEWA" ? "eSewa" : method === "KHALTI" ? "Khalti" : "Bank Transfer";

  return {
    allowed: false,
    reason: `Payment must be completed before accepting this order. ${methodLabel} payment is ${status.toLowerCase().replace("_", " ")}.`,
    paymentMethod: method,
    paymentStatus: status,
  };
}
