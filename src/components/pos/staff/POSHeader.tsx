"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Monitor,
  LayoutGrid,
  ClipboardList,
  Receipt,
  PauseCircle,
  BarChart3,
  Volume2,
  VolumeX,
  Copy,
  Check,
} from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

export type POSView = "register" | "tables" | "orders" | "billing" | "held" | "summary";

interface Props {
  restaurantName: string;
  restaurantSlug?: string;
  staffName: string;
  staffRole: string;
  activeView: POSView;
  onViewChange: (view: POSView) => void;
}

const VIEWS: { id: POSView; label: string; icon: typeof Monitor }[] = [
  { id: "register", label: "Register", icon: Monitor },
  { id: "tables", label: "Tables", icon: LayoutGrid },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "held", label: "Held", icon: PauseCircle },
  { id: "summary", label: "Summary", icon: BarChart3 },
];

export default function POSHeader({ restaurantName, restaurantSlug, staffName, staffRole, activeView, onViewChange }: Props) {
  const router = useRouter();
  const [clock, setClock] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const copySlug = () => {
    if (!restaurantSlug) return;
    navigator.clipboard.writeText(`${window.location.origin}/pos/${restaurantSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setSoundOn(localStorage.getItem("hh_sound") !== "off");
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("hh_sound", next ? "on" : "off");
  };

  const logout = async () => {
    await fetch("/api/staff-session", { method: "DELETE", credentials: "include" });
    router.push("/staff-login");
  };

  return (
    <header className="flex items-center justify-between bg-gray-950 text-white px-5 h-14 shrink-0 border-b border-white/5">
      {/* Left: restaurant + staff info */}
      <div className="flex items-center gap-5 min-w-0 w-56">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold leading-tight text-white truncate">{restaurantName}</h1>
          <p className="text-[11px] text-[var(--text-2)] truncate mt-0.5">{staffName} &middot; {staffRole}</p>
        </div>
        <span className="text-sm font-mono text-[var(--text-2)] tabular-nums shrink-0">{clock}</span>
      </div>

      {/* Center: navigation */}
      <nav className="flex items-center gap-0.5 bg-gray-900 rounded-xl p-1">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[var(--text-2)] hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{v.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: controls */}
      <div className="flex items-center gap-1 w-56 justify-end">
        {restaurantSlug && (
          <button
            onClick={copySlug}
            title="Copy customer POS link"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-2)] hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#d67620]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden xl:inline">{copied ? "Copied!" : `pos/${restaurantSlug}`}</span>
          </button>
        )}
        <button
          onClick={toggleSound}
          title={soundOn ? "Mute" : "Unmute"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <ThemeToggle />
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--text-2)] hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </header>
  );
}
