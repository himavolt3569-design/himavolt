import { NextRequest } from "next/server";
import { db } from "@/lib/db";
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
          // Fetch active orders + recently completed (last 30 min)
          // KITCHEN ONLY: PENDING orders only appear after payment is COMPLETED (biller verified)
          const cutoff = new Date(Date.now() - 30 * 60 * 1000);

          const orders = await db.order.findMany({
            where: {
              restaurantId: id,
              OR: [
                // PENDING: only after billing marks payment COMPLETED (all methods)
                { status: "PENDING", payment: { status: "COMPLETED" } },
                { status: "PENDING", payment: { is: null } },
                // Active orders (already went through billing gate)
                { status: { in: ["ACCEPTED", "PREPARING", "READY"] } },
                { isHeld: true },
                // Recently completed
                {
                  status: { in: ["DELIVERED", "CANCELLED", "REJECTED"] },
                  updatedAt: { gte: cutoff },
                },
              ],
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
              estimatedTime: true,
              deliveryFee: true,
              isHeld: true,
              heldAt: true,
              acceptedAt: true,
              preparingAt: true,
              readyAt: true,
              deliveredAt: true,
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

      await fetchAndSend(true);

      if (!closed) {
        setTimeout(fetchAndSend, POLL_MS);
      }
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
