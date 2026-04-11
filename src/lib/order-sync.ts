import { db } from "@/lib/db";

/**
 * Touch order.updatedAt so SSE streams detect the change.
 * Call this after ANY payment status change (verify, collect, callback, proof upload, expiry).
 */
export async function touchOrderUpdatedAt(orderId: string) {
  await db.order.update({
    where: { id: orderId },
    data: { updatedAt: new Date() },
  });
}
