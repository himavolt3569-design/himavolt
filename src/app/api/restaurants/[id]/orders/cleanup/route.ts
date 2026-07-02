import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { restoreStock } from "@/lib/stock";

/**
 * POST /api/restaurants/[id]/orders/cleanup
 *
 * Auto-cleanup stale orders that have been stuck in PENDING or ACCEPTED.
 * Accessible by restaurant owner or staff with manager/cashier roles.
 *
 * Default thresholds (overridable via request body):
 *   - PENDING  (not accepted/rejected): 30 minutes  → auto-reject
 *   - ACCEPTED (sitting too long):      2 hours     → auto-reject
 */

interface CleanupRules {
  pendingTimeoutMins: number;
  acceptedTimeoutMins: number;
}

const DEFAULT_RULES: CleanupRules = {
  pendingTimeoutMins: 30,
  acceptedTimeoutMins: 120,
};

interface CleanupResult {
  status: string;
  counts: {
    pendingRejected: number;
    acceptedRejected: number;
  };
  details: Array<{
    orderId: string;
    orderNo: string;
    previousStatus: string;
    newStatus: string;
    ageMinutes: number;
  }>;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: staff JWT or owner session
  const staff = await getStaffSession(req);
  let actorId: string | undefined;

  if (staff && staff.restaurantId === id) {
    actorId = staff.userId || staff.staffId;
  } else {
    const user = await getOrCreateUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const restaurant = await db.restaurant.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!restaurant)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    actorId = user.id;
  }

  let rules = DEFAULT_RULES;
  try {
    const body = await req.json();
    if (body.rules) {
      rules = { ...DEFAULT_RULES, ...body.rules };
    }
  } catch {
    // No body — use defaults
  }

  const now = Date.now();
  const result: CleanupResult = {
    status: "completed",
    counts: {
      pendingRejected: 0,
      acceptedRejected: 0,
    },
    details: [],
  };

  // 1. PENDING orders older than threshold → REJECTED
  const pendingCutoff = new Date(now - rules.pendingTimeoutMins * 60 * 1000);
  const stalePending = await db.order.findMany({
    where: {
      restaurantId: id,
      status: "PENDING",
      createdAt: { lt: pendingCutoff },
    },
    select: { id: true, orderNo: true, createdAt: true, items: { select: { menuItemId: true, quantity: true } } },
  });

  for (const order of stalePending) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "REJECTED", rejectReason: "Auto-rejected: order timed out" },
    });
    // Cancel pending payments
    await db.payment.updateMany({
      where: { orderId: order.id, status: { in: ["PENDING", "AWAITING_VERIFICATION"] } },
      data: { status: "FAILED", rejectionNote: "Auto-rejected: order timed out" },
    }).catch(() => {});
    // Restore stock
    restoreStock(order.items).catch(() => {});

    const ageMins = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
    result.counts.pendingRejected++;
    result.details.push({
      orderId: order.id,
      orderNo: order.orderNo,
      previousStatus: "PENDING",
      newStatus: "REJECTED",
      ageMinutes: ageMins,
    });
  }

  // 2. ACCEPTED orders older than threshold → REJECTED
  const acceptedCutoff = new Date(now - rules.acceptedTimeoutMins * 60 * 1000);
  const staleAccepted = await db.order.findMany({
    where: {
      restaurantId: id,
      status: "ACCEPTED",
      updatedAt: { lt: acceptedCutoff },
    },
    select: { id: true, orderNo: true, updatedAt: true, items: { select: { menuItemId: true, quantity: true } } },
  });

  for (const order of staleAccepted) {
    await db.order.update({
      where: { id: order.id },
      data: { status: "REJECTED", rejectReason: "Auto-rejected: order stuck too long" },
    });
    await db.payment.updateMany({
      where: { orderId: order.id, status: { in: ["PENDING", "AWAITING_VERIFICATION"] } },
      data: { status: "FAILED", rejectionNote: "Auto-rejected: order stuck too long" },
    }).catch(() => {});
    restoreStock(order.items).catch(() => {});

    const ageMins = Math.floor((now - new Date(order.updatedAt).getTime()) / 60000);
    result.counts.acceptedRejected++;
    result.details.push({
      orderId: order.id,
      orderNo: order.orderNo,
      previousStatus: "ACCEPTED",
      newStatus: "REJECTED",
      ageMinutes: ageMins,
    });
  }

  const totalCleaned =
    result.counts.pendingRejected +
    result.counts.acceptedRejected;

  if (totalCleaned > 0) {
    logAudit({
      action: "ORDER_CLEANUP",
      entity: "Order",
      entityId: id,
      detail: `Auto-cleanup: ${totalCleaned} stale orders resolved (${result.counts.pendingRejected} pending rejected, ${result.counts.acceptedRejected} accepted rejected)`,
      metadata: result.counts,
      userId: actorId,
      restaurantId: id,
      ipAddress: getClientIp(req.headers),
    });
  }

  return NextResponse.json(result);
}

/**
 * GET /api/restaurants/[id]/orders/cleanup
 * Returns current stale order counts without taking action (preview).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth check
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

  const now = Date.now();

  const [stalePending, staleAccepted] = await Promise.all([
    db.order.count({
      where: {
        restaurantId: id,
        status: "PENDING",
        createdAt: { lt: new Date(now - DEFAULT_RULES.pendingTimeoutMins * 60 * 1000) },
      },
    }),
    db.order.count({
      where: {
        restaurantId: id,
        status: "ACCEPTED",
        updatedAt: { lt: new Date(now - DEFAULT_RULES.acceptedTimeoutMins * 60 * 1000) },
      },
    }),
  ]);

  return NextResponse.json({
    stale: {
      pending: stalePending,
      accepted: staleAccepted,
      total: stalePending + staleAccepted,
    },
    thresholds: DEFAULT_RULES,
  });
}
