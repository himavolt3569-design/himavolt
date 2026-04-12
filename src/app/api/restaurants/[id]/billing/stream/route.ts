import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/staff-auth";
import { getOrCreateUser } from "@/lib/auth";

/**
 * GET /api/restaurants/[id]/billing/stream
 * SSE stream for the Billing tab — includes ALL pending orders regardless of payment status.
 * Unlike the kitchen stream, this includes unverified/unpaid pending orders so billers
 * can see and process them before they reach the kitchen.
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
          const cutoff = new Date(Date.now() - 30 * 60 * 1000);

          // Billing stream: ALL pending orders (any payment status) + active + recent completed
          const orders = await db.order.findMany({
            where: {
              restaurantId: id,
              OR: [
                // ALL pending orders — unpaid ones go to biller first
                { status: "PENDING" },
                // Active kitchen orders (already accepted through billing)
                { status: { in: ["ACCEPTED", "PREPARING", "READY"] } },
                { isHeld: true },
                // Recent completed
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
              createdAt: true,
              updatedAt: true,
              user: { select: { name: true, email: true } },
              payment: {
                select: {
                  method: true,
                  status: true,
                  proofUrl: true,
                  proofUploadedAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
          });

          const latestUpdate = orders.reduce(
            (max, o) => (o.updatedAt > max ? o.updatedAt : max),
            new Date(0),
          );

          if (force || latestUpdate > lastUpdatedAt) {
            const newPending = orders.filter(
              (o) => o.status === "PENDING" && o.createdAt > lastUpdatedAt,
            );
            const newProofs = orders.filter(
              (o) =>
                o.payment?.status === "AWAITING_VERIFICATION" &&
                o.payment.proofUploadedAt &&
                new Date(o.payment.proofUploadedAt) > lastUpdatedAt,
            );

            lastUpdatedAt = latestUpdate;
            send(
              JSON.stringify({
                type: "orders",
                orders,
                newPendingCount: force ? 0 : newPending.length,
                newProofCount: force ? 0 : newProofs.length,
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
          console.error("[BillingStream] Poll error:", err);
        }

        if (!closed) {
          setTimeout(fetchAndSend, 3000);
        }
      };

      await fetchAndSend(true);

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
