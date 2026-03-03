import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const lastId = searchParams.get("lastId");

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastMessageId = lastId || "";
      let lastTimestamp = lastId
        ? null
        : new Date().toISOString();

      const poll = async () => {
        if (closed) return;

        try {
          const where: Record<string, unknown> = { chatRoomId: roomId };

          if (lastMessageId) {
            const lastMsg = await db.chatMessage.findUnique({
              where: { id: lastMessageId },
              select: { createdAt: true },
            });
            if (lastMsg) {
              where.createdAt = { gt: lastMsg.createdAt };
            }
          } else if (lastTimestamp) {
            where.createdAt = { gt: new Date(lastTimestamp) };
          }

          const messages = await db.chatMessage.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: 20,
          });

          if (messages.length > 0) {
            lastMessageId = messages[messages.length - 1].id;
            lastTimestamp = null;

            const data = JSON.stringify(messages);
            controller.enqueue(
              encoder.encode(`data: ${data}\n\n`)
            );
          } else {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }
        } catch {
          // DB error, keep going
        }

        if (!closed) {
          setTimeout(poll, 2000);
        }
      };

      controller.enqueue(encoder.encode(": connected\n\n"));
      poll();

      req.signal.addEventListener("abort", () => {
        closed = true;
        controller.close();
      });
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
    },
  });
}
