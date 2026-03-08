import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

/**
 * GET /api/admin/audit/stream
 * Server-Sent Events stream for realtime audit log updates.
 * Polls every 3 seconds for new entries since last check.
 */
export async function GET(_req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      let lastChecked = new Date();

      const send = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial heartbeat
      send(JSON.stringify({ type: "connected", timestamp: lastChecked.toISOString() }));

      const poll = async () => {
        if (closed) return;

        try {
          const newLogs = await db.auditLog.findMany({
            where: { createdAt: { gt: lastChecked } },
            include: {
              user: { select: { name: true, email: true, imageUrl: true } },
              restaurant: { select: { name: true, slug: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          });

          if (newLogs.length > 0) {
            lastChecked = newLogs[0].createdAt;
            send(JSON.stringify({ type: "logs", logs: newLogs }));
          } else {
            send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
          }
        } catch (err) {
          console.error("[AuditStream] Poll error:", err);
        }

        if (!closed) {
          setTimeout(poll, 3000);
        }
      };

      // Start polling after initial delay
      setTimeout(poll, 3000);
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
