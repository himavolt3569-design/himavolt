"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  QrCode,
  MonitorSmartphone,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Dot,
  ChefHat,
  MonitorPlay,
} from "lucide-react";
import type { SSEStatus } from "@/hooks/useSSE";

interface Props {
  terminalName: string;
  restaurantName: string;
  staffName: string;
  staffRole: string;
  connectionStatus: SSEStatus;
  soundOn: boolean;
  onToggleSound: (v: boolean) => void;
  onOpenQR: () => void;
  onFlipToCustomerMode: () => void;
  customerModeAvailable: boolean;
  newOrdersCount: number;
}

export default function POSTerminalHeader({
  terminalName,
  restaurantName,
  staffName,
  staffRole,
  connectionStatus,
  soundOn,
  onToggleSound,
  onOpenQR,
  onFlipToCustomerMode,
  customerModeAvailable,
  newOrdersCount,
}: Props) {
  const router = useRouter();
  const [clock, setClock] = useState(() => formatClock(new Date()));
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/staff-session", {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    router.push("/staff-login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-b from-[#141414] to-[#0f0f0f] px-4 text-white">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 shadow-sm shadow-amber-500/30">
          <span className="text-[11px] font-black text-black">POS</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight">
            {terminalName}
          </p>
          <p className="truncate text-[10px] leading-tight text-white/50">
            {restaurantName}
          </p>
        </div>
      </div>

      <div className="mx-3 h-8 w-px bg-white/10" />

      <ConnectionPill
        status={connectionStatus}
        newOrdersCount={newOrdersCount}
      />

      <div className="hidden items-center gap-1.5 text-[11px] font-semibold text-white/50 md:flex">
        <Dot className="h-4 w-4 text-white/40" />
        <span className="tabular-nums">{clock}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <HeaderButton
          onClick={onOpenQR}
          icon={<QrCode className="h-4 w-4" />}
          label="Show QR"
          tone="primary"
          hotkey="Q"
        />

        {customerModeAvailable && (
          <HeaderButton
            onClick={onFlipToCustomerMode}
            icon={<MonitorSmartphone className="h-4 w-4" />}
            label="Hand to customer"
            tone="subtle"
            hotkey="C"
          />
        )}

        <a
          href="/pos/cfd"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Customer Facing Display"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 text-[12px] font-bold text-indigo-300 ring-1 ring-indigo-500/30 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
        >
          <MonitorPlay className="h-4 w-4" />
          <span className="hidden sm:inline">CFD Display</span>
        </a>

        <button
          onClick={() => onToggleSound(!soundOn)}
          title={soundOn ? "Mute new-order sound" : "Enable new-order sound"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {soundOn ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>

        <a
          href="/kitchen"
          title="Back to Kitchen"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[12px] font-bold text-white/80 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] hover:text-white"
        >
          <ChefHat className="h-4 w-4" />
          <span className="hidden sm:inline">Kitchen</span>
        </a>

        <div className="mx-1 h-6 w-px bg-white/10" />

        <div className="hidden items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1 ring-1 ring-white/5 sm:flex">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-[10px] font-bold text-amber-300">
            {initial(staffName)}
          </div>
          <div className="text-right leading-tight">
            <p className="text-[11px] font-semibold">{staffName}</p>
            <p className="text-[9px] uppercase tracking-wider text-white/40">
              {staffRole}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          disabled={loggingOut}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function HeaderButton({
  onClick,
  icon,
  label,
  tone,
  hotkey,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tone: "primary" | "subtle";
  hotkey?: string;
}) {
  const base =
    "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition-colors";
  const toneClass =
    tone === "primary"
      ? "bg-amber-500 text-black hover:bg-amber-400 shadow-sm shadow-amber-500/20"
      : "bg-white/[0.06] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.12] hover:text-white";
  return (
    <button onClick={onClick} className={`${base} ${toneClass}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {hotkey && (
        <span
          className={`hidden items-center justify-center rounded px-1 text-[9px] font-bold md:inline-flex ${
            tone === "primary"
              ? "bg-black/15 text-black/70"
              : "bg-white/10 text-white/50"
          }`}
        >
          ⇧{hotkey}
        </span>
      )}
    </button>
  );
}

function ConnectionPill({
  status,
  newOrdersCount,
}: {
  status: SSEStatus;
  newOrdersCount: number;
}) {
  const { dotClass, label, Icon, tone } = pillLook(status);
  return (
    <div
      className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold ring-1 ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span
        className={`ml-1 h-1.5 w-1.5 rounded-full ${dotClass} ${
          status === "connected" ? "animate-pulse" : ""
        }`}
      />
      {newOrdersCount > 0 && (
        <span className="ml-1 rounded-md bg-amber-500 px-1.5 text-[10px] font-bold text-black">
          {newOrdersCount}
        </span>
      )}
    </div>
  );
}

function pillLook(status: SSEStatus) {
  switch (status) {
    case "connected":
      return {
        dotClass: "bg-green-400",
        label: "Live",
        Icon: Wifi,
        tone: "bg-green-500/10 text-green-400 ring-green-500/20",
      };
    case "connecting":
      return {
        dotClass: "bg-amber-400",
        label: "Connecting",
        Icon: Wifi,
        tone: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
      };
    case "error":
      return {
        dotClass: "bg-red-500",
        label: "Offline",
        Icon: WifiOff,
        tone: "bg-red-500/10 text-red-400 ring-red-500/20",
      };
    default:
      return {
        dotClass: "bg-white/40",
        label: String(status ?? "—"),
        Icon: Wifi,
        tone: "bg-white/5 text-white/60 ring-white/10",
      };
  }
}

function formatClock(d: Date) {
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function initial(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")
  ).toUpperCase();
}
