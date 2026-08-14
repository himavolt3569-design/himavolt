"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ClipboardList, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { playSound } from "@/lib/sounds";
import { useToast } from "@/context/ToastContext";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantKitchenTopic } from "@/lib/realtime-topics";
import { useKotPrintJobs } from "@/hooks/useKotPrintJobs";
import TableOrderBoard from "@/components/orders/TableOrderBoard";

/* ── Types ─────────────────────────────────────────────────────────── */

interface KdsItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  kitchenStatus?: string | null;
  // Round marker — items submitted together share this timestamp.
  createdAt?: string;
}

interface KdsOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  roomNo: string | null;
  status: string;
  type: string;
  total: number;
  note: string | null;
  createdAt: string;
  items: KdsItem[];
  user?: { name: string | null } | null;
  payment?: { method: string; status: string } | null;
}

/* ── Status model (per-order; mapped onto RestroX's 4 KOT states) ───── */

type Pill = "all" | "pending" | "accepted" | "rejected";

const PILL_STATUSES: Record<Exclude<Pill, "all">, string[]> = {
  pending: ["PENDING"],
  accepted: ["ACCEPTED"],
  rejected: ["REJECTED"],
};

const PILLS: { id: Pill; label: string; dot: string }[] = [
  { id: "all", label: "All", dot: "bg-[var(--accent)]" },
  { id: "pending", label: "Pending", dot: "bg-amber-500" },
  { id: "accepted", label: "Accepted", dot: "bg-blue-500" },
  { id: "rejected", label: "Rejected", dot: "bg-red-500" },
];

function pillOf(o: KdsOrder): Exclude<Pill, "all"> {
  if (o.status !== "REJECTED" && o.items.some(i => i.kitchenStatus === "PENDING")) {
    return "pending";
  }
  for (const [pill, list] of Object.entries(PILL_STATUSES)) {
    if (list.includes(o.status)) return pill as Exclude<Pill, "all">;
  }
  return "pending";
}

const PILL_META: Record<Exclude<Pill, "all">, { label: string; dot: string; text: string; bg: string }> = {
  pending: { label: "Pending", dot: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
  accepted: { label: "Accepted", dot: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  rejected: { label: "Rejected", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
};

/* ── Component ─────────────────────────────────────────────────────── */

export default function KitchenBoard({
  restaurantId,
  currency,
}: {
  restaurantId: string;
  currency: string;
  // Accepted for API compatibility with the kitchen page; the board no longer
  // prints from here (KOT auto-print is handled by useKotPrintJobs / print jobs).
  restaurantName?: string;
  kitchenWidth?: number;
  autoPrintKOT?: boolean;
}) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pill, setPill] = useState<Pill>("all");
  const [dishSearch, setDishSearch] = useState("");
  const [busyOrderIds, setBusyOrderIds] = useState<Set<string>>(new Set());
  // Per-order count of items still awaiting the kitchen (kitchenStatus PENDING).
  // We track THIS — not just the count of PENDING-status orders — so we can
  // alert when a guest ADDS items to an order the kitchen already accepted: the
  // order stays ACCEPTED, so the old "pending order count climbed" check stayed
  // silent and the kitchen never noticed the new food while the bill kept rising.
  const prevPendingByOrder = useRef<Map<string, number> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: KdsOrder[] }>(
        `/api/restaurants/${restaurantId}/orders?limit=50`,
        { cacheTtl: 0 },
      );
      const next = data.orders ?? [];

      const pendingByOrder = new Map<string, number>();
      for (const o of next) {
        if (o.status === "REJECTED") continue;
        pendingByOrder.set(
          o.id,
          o.items.filter((i) => i.kitchenStatus === "PENDING").length,
        );
      }

      const prev = prevPendingByOrder.current;
      if (prev) {
        let newOrders = 0;
        const addOnNos: string[] = [];
        for (const o of next) {
          const count = pendingByOrder.get(o.id);
          if (count === undefined) continue; // rejected — skip
          const before = prev.get(o.id);
          if (before === undefined) {
            if (count > 0) newOrders++; // brand-new order with kitchen work
          } else if (count > before) {
            addOnNos.push(o.orderNo); // existing order gained new items
          }
        }
        if (newOrders > 0) {
          playSound("newOrder");
          showToast("New order received!", "info");
        }
        // Add-on chime — pulls the kitchen's attention to items a guest tacked
        // onto an order that was already accepted/prepared.
        if (addOnNos.length > 0) {
          playSound("newOrder");
          showToast(
            `New items added to order #${addOnNos[0]}${addOnNos.length > 1 ? ` +${addOnNos.length - 1} more` : ""}, check the Pending column`,
            "info",
          );
        }
      }
      prevPendingByOrder.current = pendingByOrder;
      setOrders(next);
    } catch {
      /* ignore — live board, next tick retries */
    } finally {
      setLoading(false);
    }
  }, [restaurantId, showToast]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  // Instant push via Supabase Realtime; the interval above is the fallback.
  useRealtimeSignal(restaurantId ? restaurantKitchenTopic(restaurantId) : null, load);

  // Accept / reject a single ordering round (initial order or an add-on batch).
  // The server scopes the action to that round's items so earlier rounds stay
  // untouched; it also handles the first-round payment gate + order status.
  const roundAction = useCallback(
    async (orderId: string, roundAt: string, action: "ACCEPT" | "REJECT") => {
      setBusyOrderIds((prev) => new Set(prev).add(orderId));
      try {
        await apiFetch(
          `/api/restaurants/${restaurantId}/orders/${orderId}/round`,
          { method: "PATCH", body: { roundAt, action } },
        );
        load();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Action failed, please retry",
          "error",
        );
      } finally {
        setBusyOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    },
    [restaurantId, load, showToast],
  );

  useKotPrintJobs(restaurantId);
  const counts = useMemo(() => {
    const c: Record<Pill, number> = { all: 0, pending: 0, accepted: 0, rejected: 0 };
    for (const o of orders) {
      c.all++;
      c[pillOf(o)]++;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const list = pill === "all" ? orders : orders.filter((o) => pillOf(o) === pill);
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, pill]);

  // Dish List — informational roll-up of dishes across the visible KOTs.
  const dishes = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; kots: number; pill: Exclude<Pill, "all"> }>();
    const rank: Exclude<Pill, "all">[] = ["pending", "accepted", "rejected"];
    for (const o of visible) {
      const p = pillOf(o);
      for (const it of o.items) {
        const cur = map.get(it.name);
        if (cur) {
          cur.qty += it.quantity;
          cur.kots++;
          if (rank.indexOf(p) < rank.indexOf(cur.pill)) cur.pill = p; // headline = most-pending
        } else {
          map.set(it.name, { name: it.name, qty: it.quantity, kots: 1, pill: p });
        }
      }
    }
    const q = dishSearch.trim().toLowerCase();
    return [...map.values()]
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => b.qty - a.qty);
  }, [visible, dishSearch]);

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* ── Board ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {PILLS.map((p) => {
            const active = pill === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPill(p.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all ${
                  active
                    ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/25"
                    : "bg-[var(--canvas)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--accent-border)]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : p.dot}`} />
                {p.label}
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-extrabold ${
                    active ? "bg-white/20 text-white" : "bg-[var(--surface)] text-[var(--text-2)]"
                  }`}
                >
                  {counts[p.id]}
                </span>
              </button>
            );
          })}
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface)] mb-4">
              <ClipboardList className="h-8 w-8 text-[var(--text-3)]" />
            </div>
            <p className="font-bold text-[var(--text-2)]">No orders here</p>
            <p className="text-xs text-[var(--text-3)] mt-1">New KOTs appear the moment guests order</p>
          </div>
        ) : (
          <TableOrderBoard
            orders={visible}
            currency={currency}
            busyOrderIds={busyOrderIds}
            onAcceptRound={(o, roundAt) => roundAction(o.id, roundAt, "ACCEPT")}
            onRejectRound={(o, roundAt) => roundAction(o.id, roundAt, "REJECT")}
          />
        )}
      </div>

      {/* ── Dish List (informational) ─────────────────────────── */}
      <aside className="lg:w-80 shrink-0 rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] p-4 h-fit lg:sticky lg:top-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold text-[var(--text-1)]">Dish List</h3>
          <span className="rounded-md bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-text)]">
            {dishes.length} Dish{dishes.length === 1 ? "" : "es"}
          </span>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
          <input
            value={dishSearch}
            onChange={(e) => setDishSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)]"
          />
        </div>
        {dishes.length === 0 ? (
          <p className="py-10 text-center text-xs text-[var(--text-3)]">No dishes in the queue</p>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {dishes.map((d) => (
              <div
                key={d.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[var(--text-1)]">{d.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-3)]">
                    <span className={`h-1.5 w-1.5 rounded-full ${PILL_META[d.pill].dot}`} />
                    {d.kots} KOT · {PILL_META[d.pill].label}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-[var(--surface)] px-2 py-1 text-[12px] font-extrabold text-[var(--text-2)]">
                  ×{d.qty}
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>

    </div>
  );
}
