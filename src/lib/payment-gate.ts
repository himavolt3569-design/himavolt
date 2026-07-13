/**
 * Payment gate seam.
 *
 * Currently a no-op: staff can accept any order regardless of payment status
 * (cash-later, staff/counter orders, walk-ins, etc.). This is intentional
 * product behaviour today.
 *
 * It is kept as a single choke point (rather than inlining `allowed: true` at
 * the call sites) so a future "require payment before accept" policy can be
 * re-enabled in one place. The previous implementation ran a DB query on every
 * order-accept and then ignored the result — that query has been removed.
 */
export async function canAcceptOrder(_orderId: string): Promise<{
  allowed: boolean;
  reason?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}> {
  return { allowed: true };
}
