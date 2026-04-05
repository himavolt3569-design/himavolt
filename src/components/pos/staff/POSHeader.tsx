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
} from "lucide-react";

export type POSView = "register" | "tables" | "orders" | "billing" | "held" | "summary";

interface Props {
  restaurantName: string;
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

export default function POSHeader({ restaurantName, staffName, staffRole, activeView, onViewChange }: Props) {
  const router = useRouter();
  const [clock, setClock] = useState("");
  const [soundOn, setSoundOn] = useState(true);

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
    <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 shrink-0">
      {/* Left: restaurant + staff */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm font-bold leading-tight">{restaurantName}</h1>
          <p className="text-xs text-gray-400">{staffName} &middot; {staffRole}</p>
        </div>
        <div className="text-sm font-mono text-gray-400">{clock}</div>
      </div>

      {/* Center: view tabs */}
      <div className="flex items-center gap-1 bg-gray-800 rounded-xl p-1">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                active ? "bg-amber-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSound}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </button>
      </div>
    </div>
  );
}
