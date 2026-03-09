import { NextRequest } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/track/stream?orderId=xxx
 * Server-Sent Events stream for real-time customer order tracking.
 * Polls every 3 seconds and pushes order updates to the client.
 */
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return new Response("orderId is required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let closed = false;
  let lastStatus = "";
  let lastEstimatedTime: number | null = null;

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
          const order = await db.order.findFirst({
            where: { id: orderId },
            include: {
              items: true,
              payment: {
                select: { method: true, status: true, paidAt: true },
              },
              bill: true,
              restaurant: {
                select: {
                  name: true,
                  slug: true,
                  address: true,
                  phone: true,
                  imageUrl: true,
                },
              },
            },
          });

          if (!order) {
            send(JSON.stringify({ type: "error", message: "Order not found" }));
            closed = true;
            controller.close();
            return;
          }

          // Send update if status or estimatedTime changed, or on first fetch
          const changed =
            force ||
            order.status !== lastStatus ||
            order.estimatedTime !== lastEstimatedTime;

          if (changed) {
            lastStatus = order.status;
            lastEstimatedTime = order.estimatedTime;
            send(JSON.stringify({ type: "order", order }));
          } else {
            send(
              JSON.stringify({
                type: "heartbeat",
                timestamp: new Date().toISOString(),
              }),
            );
          }

          // Stop streaming for terminal statuses
          if (["DELIVERED", "CANCELLED", "REJECTED"].includes(order.status)) {
            closed = true;
            controller.close();
            return;
          }
        } catch (err) {
          console.error("[TrackStream] Poll error:", err);
        }

        if (!closed) {
          setTimeout(fetchAndSend, 3000);
        }
      };

      // Send initial order data immediately
      await fetchAndSend(true);

      // Start polling after initial send
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
