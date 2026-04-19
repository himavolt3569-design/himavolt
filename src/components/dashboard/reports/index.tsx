"use client";

import { useState } from "react";
import { BarChart3, Clock4, Users, CalendarDays } from "lucide-react";
import OverviewTab from "./OverviewTab";
import TodayTab from "./TodayTab";
import ShiftsTab from "./ShiftsTab";
import StaffTab from "./StaffTab";
import StaffDrillDownPanel from "./StaffDrillDownPanel";

type TabKey = "overview" | "today" | "shifts" | "staff";

const TABS: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "today", label: "Today", icon: Clock4 },
  { key: "shifts", label: "Shifts", icon: CalendarDays },
  { key: "staff", label: "Staff", icon: Users },
];

export default function ReportsShell() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [openStaffId, setOpenStaffId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas)]/60 p-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab onOpenStaff={setOpenStaffId} />}
      {tab === "today" && <TodayTab />}
      {tab === "shifts" && <ShiftsTab />}
      {tab === "staff" && <StaffTab onOpenStaff={setOpenStaffId} />}

      {openStaffId && (
        <StaffDrillDownPanel
          staffId={openStaffId}
          onClose={() => setOpenStaffId(null)}
        />
      )}
    </div>
  );
}
