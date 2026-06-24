"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  CheckCircle2,
  Check,
  Printer,
  X,
  Pencil,
  Clock,
  ShoppingBag,
  Utensils,
  Truck,
  BedDouble,
  Search,
  ClipboardList,
  Loader2,
  Hourglass,
  Ban,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { playSound } from "@/lib/sounds";
import { useToast } from "@/context/ToastContext";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { restaurantOrdersTopic } from "@/lib/realtime-topics";
import { printKOT } from "@/lib/print-kot";

/* ── Types ─────────────────────────────────────────────────────────── */

interface KdsItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
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

type Pill = "all" | "pending" | "preparing" | "ready" | "completed" | "cancelled";

const PILL_STATUSES: Record<Exclude<Pill, "all">, string[]> = {
  pending: ["PENDING", "ACCEPTED"],
  preparing: ["PREPARING"],
  ready: ["READY"],
  completed: ["DELIVERED"],
  cancelled: ["CANCELLED", "REJECTED"],
};

const PILLS: { id: Pill; label: string; dot: string }[] = [
  { id: "all", label: "All", dot: "bg-[var(--accent)]" },
  { id: "pending", label: "Pending", dot: "bg-amber-500" },
  { id: "preparing", label: "Preparing", dot: "bg-violet-500" },
  { id: "ready", label: "Ready to pick", dot: "bg-blue-500" },
  { id: "completed", label: "Completed", dot: "bg-emerald-500" },
  { id: "cancelled", label: "Cancelled", dot: "bg-red-500" },
];

function pillOf(status: string): Exclude<Pill, "all"> {
  for (const [pill, list] of Object.entries(PILL_STATUSES)) {
    if (list.includes(status)) return pill as Exclude<Pill, "all">;
  }
  return "pending";
}

const PILL_META: Record<Exclude<Pill, "all">, { label: string; dot: string; text: string; bg: string }> = {
  pending: { label: "Pending", dot: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
  preparing: { label: "Preparing", dot: "bg-violet-500", text: "text-violet-600", bg: "bg-violet-50" },
  ready: { label: "Ready to pick", dot: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "Completed", dot: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
  cancelled: { label: "Cancelled", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
};

// The one-tap forward action for each order status (no timing, no payment gate).
function nextAction(status: string): { label: string; to: string; icon: typeof Flame } | null {
  if (status === "PENDING" || status === "ACCEPTED")
    return { label: "Start Preparing", to: "PREPARING", icon: Flame };
  if (status === "PREPARING") return { label: "Ready To Pick", to: "READY", icon: CheckCircle2 };
  if (status === "READY") return { label: "Completed", to: "DELIVERED", icon: Check };
  return null;
}

const MODAL_STATUSES: { value: string; label: string; desc: string; icon: typeof Flame; tint: string }[] = [
  { value: "PENDING", label: "Pending", desc: "Waiting for kitchen action", icon: Hourglass, tint: "text-amber-500 bg-amber-50" },
  { value: "PREPARING", label: "Preparing", desc: "Being prepared in the kitchen", icon: Flame, tint: "text-violet-500 bg-violet-50" },
  { value: "READY", label: "Ready to pick", desc: "Ready for pickup / serving", icon: CheckCircle2, tint: "text-blue-500 bg-blue-50" },
  { value: "DELIVERED", label: "Completed", desc: "Served to the guest", icon: Check, tint: "text-emerald-500 bg-emerald-50" },
];

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s} second${s === 1 ? "" : "s"} ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function typeMeta(o: KdsOrder): { label: string; icon: typeof Utensils } {
  if (o.roomNo) return { label: `Room ${o.roomNo}`, icon: BedDouble };
  if (o.type === "DELIVERY") return { label: "Delivery", icon: Truck };
  if (o.type === "TAKEAWAY") return { label: "Pickup", icon: ShoppingBag };
  return { label: o.tableNo ? `Table ${o.tableNo}` : "Dine In", icon: Utensils };
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function KitchenBoard({
  restaurantId,
  currency,
  restaurantName = "",
  kitchenWidth = 80,
  autoPrintKOT = false,
}: {
  restaurantId: string;
  currency: string;
  restaurantName?: string;
  kitchenWidth?: number;
  autoPrintKOT?: boolean;
}) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pill, setPill] = useState<Pill>("all");
  const [dishSearch, setDishSearch] = useState("");
  const [statusModalId, setStatusModalId] = useState<string | null>(null);
  const [modalChoice, setModalChoice] = useState<string>("PREPARING");
  const prevPending = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: KdsOrder[] }>(
        `/api/restaurants/${restaurantId}/orders?limit=50`,
        { cacheTtl: 0 },
      );
      const next = data.orders ?? [];
      // New-order chime: fire when the pending count climbs.
      const pendingNow = next.filter((o) => o.status === "PENDING").length;
      if (prevPending.current !== null && pendingNow > prevPending.current) {
        playSound("newOrder");
        showToast("New order received!", "info");
      }
      prevPending.current = pendingNow;
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
  useRealtimeSignal(restaurantId ? restaurantOrdersTopic(restaurantId) : null, load);

  // Optimistic status change — flip the card instantly, PATCH in the background,
  // reconcile via realtime/load, roll back on failure.
  const updateStatus = useCallback(
    async (orderId: string, status: string) => {
      const snapshot = orders;
      setOrders((cur) => cur.map((o) => (o.id === orderId ? { ...o, status } : o)));
      try {
        await apiFetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
          method: "PATCH",
          body: { status },
        });
        load();
      } catch (err) {
        setOrders(snapshot);
        showToast(err instanceof Error ? err.message : "Action failed — please retry", "error");
      }
    },
    [orders, restaurantId, load, showToast],
  );

  const handlePrint = useCallback(
    (o: KdsOrder) => {
      printKOT(
        o.items.map((i) => ({ name: i.name, quantity: i.quantity })),
        {
          restaurantName,
          tableNo: o.tableNo,
          roomNo: o.roomNo,
          orderNo: o.orderNo,
          guestName: o.user?.name ?? null,
          width: kitchenWidth,
        },
      );
    },
    [restaurantName, kitchenWidth],
  );

  // Auto-print a KOT the first time an order enters the board (if enabled).
  const printedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!autoPrintKOT) return;
    for (const o of orders) {
      if (o.status === "PENDING" && !printedRef.current.has(o.id)) {
        printedRef.current.add(o.id);
        handlePrint(o);
      }
    }
  }, [orders, autoPrintKOT, handlePrint]);

  const counts = useMemo(() => {
    const c: Record<Pill, number> = { all: 0, pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    for (const o of orders) {
      c.all++;
      c[pillOf(o.status)]++;
    }
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const list = pill === "all" ? orders : orders.filter((o) => PILL_STATUSES[pill].includes(o.status));
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, pill]);

  // Dish List — informational roll-up of dishes across the visible KOTs.
  const dishes = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; kots: number; pill: Exclude<Pill, "all"> }>();
    const rank: Exclude<Pill, "all">[] = ["pending", "preparing", "ready", "completed", "cancelled"];
    for (const o of visible) {
      const p = pillOf(o.status);
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

  const modalOrder = orders.find((o) => o.id === statusModalId) ?? null;

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
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence>
              {visible.map((o, idx) => {
                const meta = typeMeta(o);
                const TypeIcon = meta.icon;
                const action = nextAction(o.status);
                const sp = pillOf(o.status);
                const terminal = ["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status);
                return (
                  <motion.div
                    key={o.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="rounded-2xl bg-[var(--canvas)] border border-[var(--border-soft)] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-[var(--canvas-sub)] border-b border-[var(--border-soft)]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-extrabold text-[var(--text-1)]">KOT {idx + 1}</h3>
                          <span className="text-[11px] font-bold text-[var(--text-3)]">#{o.orderNo}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-3)]">
                          <TypeIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-[11px] text-[var(--text-3)]">
                          <Clock className="h-3 w-3" />
                          {timeAgo(o.createdAt)}
                        </div>
                        <div className="mt-0.5 text-[12px] font-bold text-[var(--text-2)]">
                          {o.user?.name || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Items + per-order status action */}
                    <div className="px-4 py-3">
                      {o.note && (
                        <div className="mb-2.5 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] text-amber-700">
                          <strong>Note:</strong> {o.note}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          {o.items.map((it) => (
                            <p key={it.id} className="text-[13px] font-semibold text-[var(--text-1)]">
                              <span className="text-[var(--accent-text)]">{it.quantity}×</span> {it.name}
                            </p>
                          ))}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${PILL_META[sp].bg} ${PILL_META[sp].text}`}>
                              {PILL_META[sp].label}
                            </span>
                            {o.payment && (
                              <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-3)]">
                                {o.payment.status === "COMPLETED" ? "Paid" : "Unpaid"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {action && (
                            <button
                              onClick={() => updateStatus(o.id, action.to)}
                              className="flex items-center gap-1.5 rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-2 text-[12px] font-bold text-[var(--accent-text)] hover:bg-[var(--accent)] hover:text-white transition-colors active:scale-95"
                            >
                              <action.icon className="h-3.5 w-3.5" />
                              {action.label}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setStatusModalId(o.id);
                              setModalChoice(o.status === "ACCEPTED" ? "PENDING" : o.status);
                            }}
                            aria-label="Change status"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-soft)]">
                      <button
                        onClick={() => updateStatus(o.id, "DELIVERED")}
                        disabled={terminal}
                        className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-700 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Mark as Served
                      </button>
                      <button
                        onClick={() => handlePrint(o)}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-2.5 text-[13px] font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                      >
                        <Printer className="h-4 w-4" /> Print
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Cancel order #${o.orderNo}?`)) updateStatus(o.id, "CANCELLED");
                        }}
                        aria-label="Cancel order"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-3)] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
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

      {/* ── Change Status modal ───────────────────────────────── */}
      <AnimatePresence>
        {modalOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStatusModalId(null)}
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320, mass: 0.7 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[var(--canvas)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-extrabold text-[var(--text-1)]">Change Status</h3>
                <button
                  onClick={() => {
                    if (confirm(`Cancel order #${modalOrder.orderNo}?`)) {
                      updateStatus(modalOrder.id, "CANCELLED");
                      setStatusModalId(null);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel Dish
                </button>
              </div>
              <div className="space-y-2.5">
                {MODAL_STATUSES.map((s) => {
                  const sel = modalChoice === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => setModalChoice(s.value)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                        sel
                          ? "border-[var(--accent)] bg-[var(--accent-muted)]/40 ring-1 ring-[var(--accent-border)]"
                          : "border-[var(--border)] hover:border-[var(--accent-border)]"
                      }`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}>
                        <s.icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-[15px] font-bold text-[var(--text-1)]">{s.label}</span>
                        <span className="block text-[12px] text-[var(--text-3)]">{s.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setStatusModalId(null)}
                  className="flex-1 rounded-xl bg-[var(--surface)] py-3 text-sm font-bold text-[var(--text-2)] hover:bg-[var(--canvas-sub)] transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={() => {
                    updateStatus(modalOrder.id, modalChoice);
                    setStatusModalId(null);
                    showToast(`Status updated to ${PILL_META[pillOf(modalChoice)].label}`, "success");
                  }}
                  className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
