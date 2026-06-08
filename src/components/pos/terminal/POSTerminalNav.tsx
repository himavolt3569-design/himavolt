"use client";

import {
  Monitor,
  ClipboardList,
  LayoutGrid,
  Receipt,
  PauseCircle,
  BarChart3,
} from "lucide-react";

export type POSView =
  | "register"
  | "orders"
  | "tables"
  | "billing"
  | "held"
  | "summary"
  | "menu";

interface NavDef {
  id: POSView;
  label: string;
  icon: typeof Monitor;
  hotkey: string;
  badgeKey?: "orders" | "held" | "billing";
}

const NAV: NavDef[] = [
  { id: "register", label: "Register", icon: Monitor, hotkey: "1" },
  { id: "orders", label: "Live Orders", icon: ClipboardList, hotkey: "2", badgeKey: "orders" },
  { id: "tables", label: "Tables", icon: LayoutGrid, hotkey: "3" },
  { id: "billing", label: "Billing", icon: Receipt, hotkey: "4", badgeKey: "billing" },
  { id: "held", label: "Held", icon: PauseCircle, hotkey: "5", badgeKey: "held" },
  { id: "summary", label: "Summary", icon: BarChart3, hotkey: "6" },
  { id: "menu", label: "Menu", icon: ClipboardList, hotkey: "7" },
];

interface Props {
  activeView: POSView;
  onViewChange: (v: POSView) => void;
  pendingOrdersCount: number;
  heldOrdersCount: number;
  unbilledCount: number;
}

export default function POSTerminalNav({
  activeView,
  onViewChange,
  pendingOrdersCount,
  heldOrdersCount,
  unbilledCount,
}: Props) {
  return (
    <aside className="flex w-[72px] shrink-0 flex-col gap-1 border-r border-white/10 bg-[#0d0d0d] p-2 lg:w-[88px]">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        const badge =
          item.badgeKey === "orders"
            ? pendingOrdersCount
            : item.badgeKey === "held"
            ? heldOrdersCount
            : item.badgeKey === "billing"
            ? unbilledCount
            : 0;

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={`${item.label} (${item.hotkey})`}
            className={`group relative flex flex-col items-center gap-1 rounded-xl px-2 py-3 transition-colors ${
              active
                ? "bg-amber-500 text-black shadow-sm shadow-amber-500/30"
                : "text-white/55 hover:bg-white/5 hover:text-white/90"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] font-bold tracking-wide">
              {item.label}
            </span>
            <span
              className={`absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[9px] font-bold leading-none ${
                active
                  ? "bg-black/20 text-black/70"
                  : "bg-white/10 text-white/45"
              }`}
            >
              {item.hotkey}
            </span>

            {badge > 0 && (
              <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
