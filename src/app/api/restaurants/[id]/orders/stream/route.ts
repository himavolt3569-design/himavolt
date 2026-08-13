import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { getStaffSession } from "@/lib/staff-auth";
import { getOrCreateUser } from "@/lib/auth";

// 5 s instead of 3 s. Each connected kitchen / live-orders client used to fan
// out a `findMany(50)` every 3 s — at N staff devices that's a steady DB
// thrash. Bumping to 5 s cuts DB load ~40 % with no perceptible UX hit.
const POLL_MS = 5000;

/**
 * GET /api/restaurants/[id]/orders/stream
 * SSE stream for real-time kitchen order updates.
 * Authenticated via staff JWT or Supabase session (owner).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: staff JWT or owner session
  const staff = await getStaffSession(req);
  let authorized = staff?.restaurantId === id;

  if (!authorized) {
    try {
      const user = await getOrCreateUser();
      if (user) {
        const restaurant = await db.restaurant.findFirst({
          where: { id, ownerId: user.id },
          select: { id: true },
        });
        authorized = !!restaurant;
      }
    } catch {
      /* no session */
    }
  }

  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastUpdatedAt = new Date(0);

  // Whether this restaurant forces prepayment before an order reaches the
  // kitchen. When prepaid is NOT forced (the order-first / pay-at-end model),
  // unpaid PENDING dine-in orders are allowed into the live feed. Loaded once —
  // it changes rarely and we don't want to re-query it every poll tick.
  let prepaidEnabled = true;
  try {
    const r = await db.restaurant.findUnique({
      where: { id },
      select: { prepaidEnabled: true },
    });
    if (r) prepaidEnabled = r.prepaidEnabled !== false;
  } catch {
    /* default to prepaid-enabled (stricter) if the lookup fails */
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      const fetchAndSend = async (force = false) => {
        if (closed) return;

        try {
          // Fetch active orders + recently completed (last 30 min).
          //
          // This filter MUST stay in sync with the `live=1` branch of
          // GET /api/restaurants/[id]/orders/route.ts — they feed the same
          // live kitchen view and drifting them apart hides orders. In
          // particular, a waiter's "Send to Kitchen" creates a PENDING order
          // with an unpaid CASH/BANK payment row; that has to appear here.
          const cutoff = new Date(Date.now() - 30 * 60 * 1000);

          const liveConditions: Prisma.OrderWhereInput[] = [
            // PENDING after billing marks payment COMPLETED (all methods)
            { status: "PENDING", payment: { status: "COMPLETED" } },
            // Legacy orders without a payment record
            { status: "PENDING", payment: { is: null } },
            // Active orders (already went through the billing gate)
            { status: { in: ["ACCEPTED", "ACCEPTED", "ACCEPTED"] } },
            { isHeld: true },
            // Recently completed (kitchen history window)
            {
              status: { in: ["ACCEPTED", "REJECTED", "REJECTED"] },
              updatedAt: { gte: cutoff },
            },
            // Waiter / QR orders paid in cash or by bank transfer at the table:
            // they go to the kitchen first and are settled at the end.
            {
              status: "PENDING",
              payment: { method: { in: ["CASH", "BANK"] }, status: "PENDING" },
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

          const orders = await db.order.findMany({
            where: {
              restaurantId: id,
              // Fast Pay (DIRECT) and Manual Pay (COUNTER) counter sales never
              // belong in the kitchen queue — mirror the live=1 exclusion.
              NOT: { payment: { method: { in: ["DIRECT", "COUNTER"] } } },
              OR: liveConditions,
            },
            select: {
              id: true,
              orderNo: true,
              tableNo: true,
              roomNo: true,
              guestName: true,
              status: true,
              type: true,
              subtotal: true,
              tax: true,
              total: true,
              note: true,
              
              deliveryFee: true,
              isHeld: true,
              heldAt: true,
              acceptedAt: true,
              
              
              
              createdAt: true,
              updatedAt: true,
              items: true,
              user: { select: { name: true, email: true } },
              payment: {
                select: { method: true, status: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          });

          const latestUpdate = orders.reduce(
            (max, o) => (o.updatedAt > max ? o.updatedAt : max),
            new Date(0),
          );

          if (force || latestUpdate > lastUpdatedAt) {
            // Find new pending orders (for audio alert)
            const newPending = orders.filter(
              (o) => o.status === "PENDING" && o.createdAt > lastUpdatedAt,
            );

            lastUpdatedAt = latestUpdate;
            send(
              JSON.stringify({
                type: "orders",
                orders,
                newPendingCount: force ? 0 : newPending.length,
              }),
            );
          } else {
            send(
              JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              }),
            );
          }
        } catch (err) {
          console.error("[KitchenStream] Poll error:", err);
        }

        if (!closed) {
          setTimeout(fetchAndSend, POLL_MS);
        }
      };

      // `fetchAndSend` self-schedules its next tick at the end of the function,
      // so this single call drives the entire poll loop. A second setTimeout
      // used to be started here too, which ran two parallel loops = 2× the DB
      // poll rate per connected kitchen client.
      await fetchAndSend(true);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
