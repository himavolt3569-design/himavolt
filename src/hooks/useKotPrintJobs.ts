import { useCallback, useEffect, useRef } from "react";
import { printKOT, type PrintTicketItem, type TicketContext } from "@/lib/print-kot";
import { apiFetch } from "@/lib/api-client";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantKitchenTopic } from "@/lib/realtime-topics";

/** Shape of a queued KOT print job as returned by the print-jobs endpoint. */
interface KotPrintJob {
  id: string;
  payload: {
    items: PrintTicketItem[];
    restaurantName?: string;
    orderNo?: string;
    tableNo?: string;
    roomNo?: string;
    guestName?: string;
  };
}

function getClientId() {
  if (typeof window === "undefined") return "server";
  let id = sessionStorage.getItem("himavolt:kitchenPrintClientId");
  if (!id) {
    id = `kitchen-${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem("himavolt:kitchenPrintClientId", id);
  }
  return id;
}

export function useKotPrintJobs(restaurantId: string | null | undefined, enabled = true) {
  const processingRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processJobs = useCallback(async () => {
    if (!restaurantId || !enabled) return;
    const clientId = getClientId();

    try {
      const res = await apiFetch<{ jobs: KotPrintJob[] }>(`/api/restaurants/${restaurantId}/print-jobs`);
      for (const job of res.jobs || []) {
        if (processingRef.current.has(job.id)) continue;
        processingRef.current.add(job.id);

        try {
          const claimRes = await apiFetch<{ claimed: boolean }>(
            `/api/restaurants/${restaurantId}/print-jobs/${job.id}`,
            {
              method: "POST",
              // apiFetch JSON-stringifies the body itself — pass the object, not
              // a pre-stringified string (that double-encodes it and the server
              // reads `clientId` as undefined → "clientId is required").
              body: { action: "claim", clientId },
            }
          );

          if (claimRes.claimed) {
            // We won the claim! Print it.
            const payload = job.payload;
            printKOT(payload.items as PrintTicketItem[], {
              restaurantName: payload.restaurantName,
              orderNo: payload.orderNo,
              tableNo: payload.tableNo,
              roomNo: payload.roomNo,
              guestName: payload.guestName,
            } as TicketContext);

            // Mark printed
            await apiFetch(
              `/api/restaurants/${restaurantId}/print-jobs/${job.id}`,
              {
                method: "POST",
                body: { action: "printed", clientId },
              }
            );
          }
        } catch (err) {
          console.error("[KOT PrintJob] Failed to process job:", err);
          // Only mark failed if we claimed it (but we don't know for sure if it failed during claim or after).
          // We'll let the lease expire if it failed midway, or we can explicitly fail it.
        } finally {
          processingRef.current.delete(job.id);
        }
      }
    } catch {
      // Ignored
    }
  }, [restaurantId]);

  // Poll periodically as fallback
  useEffect(() => {
    if (!restaurantId || !enabled) return;
    processJobs();
    timerRef.current = setInterval(processJobs, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restaurantId, enabled, processJobs]);

  // Trigger instantly on realtime signal
  useRealtimeSignal(restaurantId && enabled ? restaurantKitchenTopic(restaurantId) : null, () => {
    processJobs();
  });

  return { processJobs };
}
