import { db } from "@/lib/db";

/**
 * End the active table session for an order/table so the next customer gets a
 * fresh start.
 *
 * The schema has @@unique([restaurantId, tableNo, isActive]), so flipping a
 * session to isActive:false throws P2002 whenever a previous inactive session
 * already exists for that table — i.e. every table after its first-ever
 * clear. The inactive row(s) must be deleted first. This is the single shared
 * implementation of that dance; call it from every settle/reject/cancel path
 * instead of touching tableSession directly.
 *
 * Never throws: table clearing must not abort a payment/reject response that
 * already committed. Failures are logged loudly and reported via the return
 * value so callers can surface them (e.g. in audit metadata).
 */
export async function endTableSession(
  restaurantId: string,
  ref: { orderId?: string; tableNo?: number },
): Promise<{ cleared: number; error?: string }> {
  const { orderId, tableNo } = ref;
  if (!orderId && tableNo == null) {
    return { cleared: 0, error: "orderId or tableNo required" };
  }

  try {
    // Resolve the table number so we can purge stale inactive rows for it.
    let resolvedTableNo = tableNo;
    if (resolvedTableNo == null && orderId) {
      const active = await db.tableSession.findFirst({
        where: { restaurantId, orderId, isActive: true },
        select: { tableNo: true },
      });
      // No active session — nothing to clear (already cleared, or the order
      // never had a table session, e.g. takeaway/delivery).
      if (!active) return { cleared: 0 };
      resolvedTableNo = active.tableNo;
    }

    if (resolvedTableNo != null) {
      await db.tableSession.deleteMany({
        where: { restaurantId, tableNo: resolvedTableNo, isActive: false },
      });
    }

    const where = orderId
      ? { restaurantId, orderId }
      : { restaurantId, tableNo: resolvedTableNo as number };

    const updated = await db.tableSession.updateMany({
      where: { ...where, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    return { cleared: updated.count };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[table-session] Failed to end session (restaurant=${restaurantId}, order=${orderId ?? "-"}, table=${tableNo ?? "-"}): ${detail}`,
    );
    return { cleared: 0, error: detail };
  }
}
