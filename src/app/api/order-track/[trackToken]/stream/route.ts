/**
 * GET /api/order-track/[trackToken]/stream
 *
 * Public SSE stream — the `trackToken` is the auth credential. Polls the DB
 * every 4 seconds and pushes order status updates to the tracking page. Closes
 * the stream once the order reaches a terminal status.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const POLL_MS = 4_000;
const TERMINAL = new Set(["REJECTED"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackToken: string }> },
) {
  const { trackToken } = await params;

  const initial = await db.order.findUnique({
    where: { trackToken },
    select: { id: true },
  });
  if (!initial) {
    return new Response("Order not found or link has expired", { status: 404 });
  }

  const orderId = initial.id;
  const encoder = new TextEncoder();
  let closed = false;
  let lastStatus = "";
  let lastKitchenStatus = "";

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

      const poll = async (force = false) => {
        if (closed) return;
        try {
          const order = await db.order.findUnique({
            where: { id: orderId },
            select: {
              id: true,
              orderNo: true,
              status: true,
              kitchenStatus: true,
              rejectReason: true,
              tableNo: true,
              roomNo: true,
              guestName: true,
              type: true,
              note: true,
              subtotal: true,
              tax: true,
              total: true,
              sourceType: true,
              createdAt: true,
              acceptedAt: true,
              items: {
                select: {
                  id: true,
                  name: true,
                  quantity: true,
                  price: true,
                  addOns: true,
                  kitchenStatus: true,
                  rejectedReason: true,
                  prepTimeSnapshot: true,
                  menuItem: { select: { imageUrl: true, prepTime: true } },
                },
                orderBy: { id: "asc" },
              },
              restaurant: {
                select: { name: true, slug: true, currency: true, address: true, phone: true },
              },
              payment: { select: { status: true, method: true } },
              bill: { select: { total: true } },
            },
          });

          if (!order) {
            send(JSON.stringify({ type: "error", message: "Order not found" }));
            closed = true;
            controller.close();
            return;
          }

          const changed =
            force ||
            order.status !== lastStatus ||
            (order.kitchenStatus ?? "") !== lastKitchenStatus;

          if (changed) {
            lastStatus = order.status;
            lastKitchenStatus = order.kitchenStatus ?? "";
            send(JSON.stringify({ type: "order", order }));
          } else {
            send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
          }

          if (TERMINAL.has(order.status)) {
            closed = true;
            controller.close();
            return;
          }
        } catch (err) {
          console.error("[OrderTrackStream] poll error:", err);
        }

        if (!closed) setTimeout(() => poll(), POLL_MS);
      };

      await poll(true);
      if (!closed) setTimeout(() => poll(), POLL_MS);
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
