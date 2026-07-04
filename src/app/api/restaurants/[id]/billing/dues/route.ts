import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { STAFF_BILLING_ROLES } from "@/lib/staff-roles";
import { settleDueSchema } from "@/lib/validations";
import { endTableSession } from "@/lib/table-session";
import { touchOrderUpdatedAt } from "@/lib/order-sync";
import { notifyOrderChanged } from "@/lib/realtime";

async function verifyBillingAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && (STAFF_BILLING_ROLES as readonly string[]).includes(staff.role)) {
    return { type: "staff" as const, id: staff.staffId, staffId: staff.staffId };
  }

  const user = await getAuthUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  if (!restaurant || restaurant.ownerId !== user.id) return null;
  return { type: "owner" as const, id: user.id, staffId: null };
}

// GET /api/restaurants/[id]/billing/dues — list credit entries (open by default)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await verifyBillingAccess(req, id);
  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized — Cashier/Manager access required" },
      { status: 401 },
    );
  }

  const scope = req.nextUrl.searchParams.get("scope") ?? "open";

  const entries = await db.creditEntry.findMany({
    where: {
      restaurantId: id,
      ...(scope === "settled"
        ? { settledAt: { not: null } }
        : scope === "all"
          ? {}
          : { settledAt: null }),
    },
    select: {
      id: true,
      amount: true,
      customerName: true,
      customerPhone: true,
      note: true,
      createdAt: true,
      settledAt: true,
      settledVia: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          tableNo: true,
          total: true,
          payment: { select: { amount: true, method: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalOpen = entries
    .filter((e) => !e.settledAt)
    .reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    entries,
    totalOpen: Math.round(totalOpen * 100) / 100,
  });
}

// POST /api/restaurants/[id]/billing/dues — settle a credit entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await verifyBillingAccess(req, id);
  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized — Cashier/Manager access required" },
      { status: 401 },
    );
  }

  const parsed = settleDueSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { creditEntryId, method, transactionId } = parsed.data;

  const entry = await db.creditEntry.findFirst({
    where: { id: creditEntryId, restaurantId: id },
    select: {
      id: true,
      amount: true,
      customerName: true,
      customerPhone: true,
      settledAt: true,
      orderId: true,
      order: {
        select: {
          orderNo: true,
          payment: { select: { id: true, amount: true, status: true } },
        },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Credit entry not found" }, { status: 404 });
  }
  if (entry.settledAt) {
    return NextResponse.json({ error: "Already settled" }, { status: 400 });
  }

  const payment = entry.order.payment;
  await db.$transaction([
    db.creditEntry.update({
      where: { id: entry.id },
      data: {
        settledAt: new Date(),
        settledVia: method,
        settledByStaffId: actor.staffId,
      },
    }),
    // Upgrade the payment to COMPLETED at the full amount now that the
    // remainder is in. (Guarded to the partial state so a concurrent full
    // re-collect doesn't double-bump the amount.)
    ...(payment && payment.status === "PARTIALLY_PAID"
      ? [
          db.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              amount: Math.round((payment.amount + entry.amount) * 100) / 100,
              ...(transactionId ? { transactionId } : {}),
            },
          }),
          db.bill.updateMany({
            where: { orderId: entry.orderId },
            data: { paidVia: `${method} (dues settled)` },
          }),
        ]
      : []),
  ]);

  await touchOrderUpdatedAt(entry.orderId);
  notifyOrderChanged(entry.orderId, id, { payment: "COMPLETED" });

  // Free the table in case the session survived the original partial collect.
  await endTableSession(id, { orderId: entry.orderId });

  logAudit({
    action: "PAYMENT_COLLECTED",
    entity: "CreditEntry",
    entityId: entry.id,
    detail: `Dues of ${entry.amount} settled via ${method} for order ${entry.order.orderNo}${entry.customerName ? ` (${entry.customerName})` : ""}`,
    metadata: {
      orderId: entry.orderId,
      orderNo: entry.order.orderNo,
      amount: entry.amount,
      method,
      transactionId,
    },
    userId: actor.id,
    restaurantId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true, settled: entry.amount });
}
