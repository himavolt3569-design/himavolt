import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/staff-auth";
import { getOrCreateUser } from "@/lib/auth";

/**
 * GET /api/restaurants/[id]/orders/stream
 * SSE stream for real-time kitchen order updates.
 * Authenticated via staff JWT or Clerk session (owner).
 * Polls every 3 seconds and pushes new/changed orders.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth: staff JWT or Clerk owner
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
      /* no clerk session */
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
          const cutoff = new Date(Date.now() - 30 * 60 * 1000);

          const orders = await db.order.findMany({
            where: {
              restaurantId: id,
              OR: [
                { status: { in: ["PENDING", "ACCEPTED", "PREPARING", "READY"] } },
                {
                  status: { in: ["DELIVERED", "CANCELLED", "REJECTED"] },
                  updatedAt: { gte: cutoff },
                },
              ],
            },
            include: {
              items: true,
              user: { select: { name: true, email: true } },
              payment: {
                select: { method: true, status: true },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          });

          // Detect if anything changed
          const latestUpdate = orders.reduce(
            (max, o) => (o.updatedAt > max ? o.updatedAt : max),
            new Date(0),
          );

          if (force || latestUpdate > lastUpdatedAt) {
            // Find new pending orders (for audio alert)
            const newPending = orders.filter(
              (o) =>
                o.status === "PENDING" && o.createdAt > lastUpdatedAt,
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
          setTimeout(fetchAndSend, 3000);
        }
      };

      // Send initial data immediately
      await fetchAndSend(true);

      // Start polling
      if (!closed) {
        setTimeout(fetchAndSend, 3000);
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
