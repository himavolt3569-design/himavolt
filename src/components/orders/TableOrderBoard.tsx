"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Utensils,
  BedDouble,
  ShoppingBag,
  Truck,
  Check,
  X,
  Clock,
  Loader2,
  CheckCircle2,
  Ban,
  ChevronDown,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface BoardItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  kitchenStatus?: string | null;
  createdAt?: string;
}

export interface BoardOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  roomNo?: string | null;
  status: string;
  type: string;
  total: number;
  note?: string | null;
  createdAt: string;
  items: BoardItem[];
  user?: { name?: string | null } | null;
}

export interface RoundActionMeta {
  isFirstRound: boolean;
  isWholeOrder: boolean;
}

interface TableOrderBoardProps {
  orders: BoardOrder[];
  currency: string;
  onAcceptRound: (order: BoardOrder, roundAt: string, meta: RoundActionMeta) => void;
  onRejectRound: (order: BoardOrder, roundAt: string, meta: RoundActionMeta, reason?: string) => void;
  busyOrderIds?: Set<string>;
}

/* ── Grouping helpers ──────────────────────────────────────────────── */

type GroupMeta = { key: string; label: string; sub: string | null; icon: typeof Utensils };

function groupMeta(o: BoardOrder): GroupMeta {
  if (o.tableNo != null)
    return { key: `table:${o.tableNo}`, label: `Table ${o.tableNo}`, sub: o.user?.name ?? null, icon: Utensils };
  if (o.roomNo)
    return { key: `room:${o.roomNo}`, label: `Room ${o.roomNo}`, sub: o.user?.name ?? null, icon: BedDouble };
  if (o.type === "DELIVERY")
    return { key: `delivery:${o.id}`, label: `Delivery #${o.orderNo}`, sub: o.user?.name ?? null, icon: Truck };
  if (o.type === "TAKEAWAY")
    return { key: `takeaway:${o.id}`, label: `Takeaway #${o.orderNo}`, sub: o.user?.name ?? null, icon: ShoppingBag };
  return { key: `counter:${o.id}`, label: `Counter #${o.orderNo}`, sub: o.user?.name ?? null, icon: Utensils };
}

type RoundState = "new" | "accepted" | "rejected";

interface Round {
  key: string; // roundAt ISO (or fallback) — passed back to the action
  no: number; // 1-based, oldest first
  items: BoardItem[];
  state: RoundState;
  isFirst: boolean;
  isWhole: boolean;
}

function isPending(it: BoardItem, orderStatus: string): boolean {
  const ks = it.kitchenStatus ?? (orderStatus === "PENDING" ? "PENDING" : "ACCEPTED");
  return ks === "PENDING";
}

/** Split one order's items into ordering rounds, oldest → newest. */
function splitRounds(o: BoardOrder): Round[] {
  const byKey = new Map<string, BoardItem[]>();
  for (const it of o.items) {
    const key = it.createdAt ?? o.createdAt;
    const arr = byKey.get(key);
    if (arr) arr.push(it);
    else byKey.set(key, [it]);
  }
  const keys = [...byKey.keys()].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  return keys.map((key, idx) => {
    const items = byKey.get(key)!;
    const allRejected = items.length > 0 && items.every((i) => i.kitchenStatus === "REJECTED");
    const anyPending = items.some((i) => isPending(i, o.status));
    const state: RoundState = allRejected ? "rejected" : anyPending ? "new" : "accepted";
    return {
      key,
      no: idx + 1,
      items,
      state,
      isFirst: idx === 0,
      isWhole: keys.length === 1,
    };
  });
}

interface Group {
  meta: GroupMeta;
  orders: BoardOrder[];
  rounds: { order: BoardOrder; round: Round }[]; // newest first
  total: number;
  hasNew: boolean;
  lastActivity: number; // ms — newest round time
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function TableOrderBoard({
  orders,
  currency,
  onAcceptRound,
  onRejectRound,
  busyOrderIds,
}: TableOrderBoardProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const o of orders) {
      const meta = groupMeta(o);
      let g = map.get(meta.key);
      if (!g) {
        g = { meta, orders: [], rounds: [], total: 0, hasNew: false, lastActivity: 0 };
        map.set(meta.key, g);
      }
      g.orders.push(o);
      g.total += o.total;
      for (const round of splitRounds(o)) {
        g.rounds.push({ order: o, round });
        const t = new Date(round.key).getTime();
        if (t > g.lastActivity) g.lastActivity = t;
        if (round.state === "new") g.hasNew = true;
      }
    }
    const list = [...map.values()];
    // Newest round on top within each group.
    for (const g of list) {
      g.rounds.sort(
        (a, b) => new Date(b.round.key).getTime() - new Date(a.round.key).getTime(),
      );
    }
    // Most-recently-active table on top.
    list.sort((a, b) => b.lastActivity - a.lastActivity);
    return list;
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      <AnimatePresence>
        {groups.map((g) => {
          const Icon = g.meta.icon;
          const isCollapsed = collapsed[g.meta.key] ?? false;
          return (
            <motion.div
              key={g.meta.key}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={`rounded-2xl border bg-[var(--canvas)] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${
                g.hasNew ? "border-amber-300 hv-flash" : "border-[var(--border-soft)]"
              }`}
            >
              {/* Table header */}
              <button
                onClick={() => toggleGroup(g.meta.key)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-[var(--canvas-sub)] hover:bg-[var(--surface-alt)] transition-colors text-left border-b ${
                  isCollapsed ? "border-transparent" : "border-[var(--border-soft)]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${g.hasNew ? "bg-amber-100 text-amber-700" : "bg-[var(--accent-muted)] text-[var(--accent-text)]"}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-[var(--text-1)] truncate">{g.meta.label}</p>
                    <p className="text-[11px] text-[var(--text-3)] truncate">
                      {g.meta.sub ? `${g.meta.sub} · ` : ""}
                      {g.rounds.length} round{g.rounds.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--text-1)] tabular-nums">{formatPrice(g.total, currency)}</p>
                    {g.hasNew && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold text-amber-700 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> NEW
                      </span>
                    )}
                  </div>
                  <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-5 w-5 text-[var(--text-3)]" />
                  </motion.div>
                </div>
              </button>

              {/* Stacked round sub-cards — newest first */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-2.5">
                      {g.rounds.map(({ order, round }) => {
                        const busy = busyOrderIds?.has(order.id) ?? false;
                        const meta: RoundActionMeta = { isFirstRound: round.isFirst, isWholeOrder: round.isWhole };
                        const tone =
                          round.state === "new"
                            ? "border-amber-400 bg-amber-50/70 hv-flash"
                            : round.state === "rejected"
                              ? "border-red-200 bg-red-50/60"
                              : "border-[var(--border-soft)] bg-[var(--canvas)]";
                        return (
                          <div key={`${order.id}:${round.key}`} className={`rounded-xl border ${tone} px-3 py-2.5`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                                {round.state === "new" && <span className="text-amber-700">● New · Round {round.no}</span>}
                                {round.state === "accepted" && (
                                  <span className="flex items-center gap-1 text-[var(--accent-text)]"><CheckCircle2 className="h-3 w-3" /> Round {round.no} · In kitchen</span>
                                )}
                                {round.state === "rejected" && (
                                  <span className="flex items-center gap-1 text-red-600"><Ban className="h-3 w-3" /> Round {round.no} · Rejected</span>
                                )}
                              </span>
                              <span className="text-[10px] font-bold text-[var(--text-3)]">#{order.orderNo}</span>
                            </div>

                            <div className="space-y-0.5">
                              {round.items.map((it) => (
                                <div key={it.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                                  <span className={`font-semibold ${round.state === "rejected" ? "text-red-400 line-through" : "text-[var(--text-1)]"}`}>
                                    <span className="text-[var(--accent-text)]">{it.quantity}×</span> {it.name}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-[12px] text-[var(--text-2)]">{formatPrice(it.price * it.quantity, currency)}</span>
                                </div>
                              ))}
                            </div>

                            {round.state === "new" && (
                              <div className="mt-2.5 flex flex-col gap-2">
                                {rejectId === round.key ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Reason..."
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      disabled={busy}
                                      className="flex-1 rounded-lg border border-[var(--border)] px-2 py-2 text-[12px] font-medium outline-none focus:ring-2 focus:ring-red-500/20 text-black dark:text-white bg-transparent"
                                    />
                                    <button
                                      disabled={busy}
                                      onClick={() => {
                                        onRejectRound(order, round.key, meta, rejectReason);
                                        setRejectId(null);
                                        setRejectReason("");
                                      }}
                                      className="flex h-[34px] items-center justify-center rounded-lg bg-red-500 px-3 text-[12px] font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => setRejectId(null)}
                                      className="flex h-[34px] items-center justify-center rounded-lg bg-[var(--surface-alt)] px-3 text-[12px] font-bold text-[var(--text-2)] hover:bg-[var(--border-soft)] transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      disabled={busy}
                                      onClick={() => onAcceptRound(order, round.key, meta)}
                                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--text-1)] py-2 text-[12px] font-bold text-white hover:bg-[#2d1508] disabled:opacity-50 transition-colors"
                                    >
                                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                      Accept
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => {
                                        setRejectId(round.key);
                                        setRejectReason("");
                                      }}
                                      className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-red-200 px-3 py-2 text-[12px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" /> Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {g.orders.some((o) => o.note) && (
                        <p className="flex items-start gap-1 text-[11px] text-amber-700">
                          <Clock className="h-3 w-3 mt-0.5 shrink-0" />
                          {g.orders.find((o) => o.note)?.note}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Flashing border for tables/rounds awaiting action. */}
      <style jsx global>{`
        @keyframes hvFlash {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          50% { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35); }
        }
        .hv-flash {
          animation: hvFlash 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
