"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Calendar as CalendarIcon, Users, MapPin, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnchoredMenu } from "@/components/shared/AnchoredMenu";
import "react-day-picker/style.css";

type Tab = "destination" | "checkin" | "guests" | null;

const DESTINATIONS = ["Kathmandu", "Pokhara", "Chitwan", "Lumbini"];

// Shared DayPicker v10 classNames — brand accent colours
const pickerClassNames = {
  selected:        "!bg-[var(--accent)] !text-white !rounded-full",
  range_start:     "!bg-[var(--accent)] !text-white !rounded-l-full",
  range_end:       "!bg-[var(--accent)] !text-white !rounded-r-full",
  range_middle:    "!bg-[var(--accent)]/20 !rounded-none !text-[var(--text-1)]",
  today:           "!text-[var(--accent)] !font-bold",
  day_button:      "h-9 w-9 rounded-full hover:bg-[var(--surface-alt)] transition-colors font-poppins text-sm",
  button_previous: "h-8 w-8 rounded-full hover:bg-[var(--surface-alt)] transition-colors flex items-center justify-center",
  button_next:     "h-8 w-8 rounded-full hover:bg-[var(--surface-alt)] transition-colors flex items-center justify-center",
  month_caption:   "flex items-center justify-center py-2 gap-2",
  caption_label:   "font-semibold text-sm text-[var(--text-1)] font-poppins",
  weekday:         "text-[var(--text-3)] text-xs font-semibold w-9 text-center",
  months:          "flex gap-8",
};

export function HotelSearchHero() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const pathname    = usePathname();

  const [destination, setDestination] = useState(searchParams.get("dest") || "");
  const [dateRange,   setDateRange]   = useState<DateRange | undefined>(() => {
    const ci = searchParams.get("checkIn");
    const co = searchParams.get("checkOut");
    return ci && co ? { from: new Date(ci), to: new Date(co) } : undefined;
  });
  const [adults,    setAdults]   = useState(Number(searchParams.get("adults"))   || 2);
  const [children,  setChildren] = useState(Number(searchParams.get("children")) || 0);
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [isMobile,  setIsMobile]  = useState(false);

  // AnchoredMenu anchor refs — one per desktop pill button
  const destBtnRef   = useRef<HTMLButtonElement>(null);
  const datesBtnRef  = useRef<HTMLButtonElement>(null);
  const guestsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock body scroll when mobile modal is open
  useEffect(() => {
    if (isMobile && activeTab) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, activeTab]);

  const handleSearch = () => {
    const p = new URLSearchParams(searchParams.toString());
    if (destination) p.set("dest", destination);
    else p.delete("dest");

    if (dateRange?.from) p.set("checkIn", format(dateRange.from, "yyyy-MM-dd"));
    else p.delete("checkIn");

    if (dateRange?.to) p.set("checkOut", format(dateRange.to, "yyyy-MM-dd"));
    else p.delete("checkOut");

    p.set("adults", adults.toString());

    if (children > 0) p.set("children", children.toString());
    else p.delete("children");
    p.delete("page");
    setActiveTab(null);
    router.push(`${pathname}?${p.toString()}`);
  };

  const handleClear = () => {
    setDestination(""); setDateRange(undefined); setAdults(2); setChildren(0);
    router.push(pathname);
  };

  const dateLabel   = dateRange?.from
    ? `${format(dateRange.from, "MMM d")}${dateRange.to ? ` to ${format(dateRange.to, "MMM d")}` : ""}`
    : "Add dates";
  const guestsLabel = `${adults + children} guest${adults + children !== 1 ? "s" : ""}`;

  const close = () => setActiveTab(null);

  return (
    <div className="relative z-20 flex flex-col items-center w-full px-4 mt-8">

      {/* ── Desktop pill search bar ── */}
      <div className="hidden md:flex w-full max-w-4xl bg-[var(--surface)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 divide-x divide-[var(--border)] transition-shadow hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">

        {/* WHERE */}
        <button
          ref={destBtnRef}
          className={cn(
            "flex-1 flex flex-col items-start px-6 py-4 hover:bg-[var(--surface-alt)] transition-colors rounded-l-2xl text-left",
            activeTab === "destination" && "bg-[var(--surface)] shadow-focus z-10 rounded-l-2xl",
          )}
          onClick={() => setActiveTab(activeTab === "destination" ? null : "destination")}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">Where</span>
          <span className={cn("text-sm font-semibold mt-0.5", destination ? "text-[var(--text-1)]" : "text-[var(--text-3)]")}>
            {destination || "Search destinations"}
          </span>
        </button>

        {/* CHECK-IN / OUT */}
        <button
          ref={datesBtnRef}
          className={cn(
            "flex-1 flex flex-col items-start px-6 py-4 hover:bg-[var(--surface-alt)] transition-colors text-left",
            activeTab === "checkin" && "bg-[var(--surface)] shadow-focus z-10",
          )}
          onClick={() => setActiveTab(activeTab === "checkin" ? null : "checkin")}
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">
            <CalendarIcon className="inline h-3 w-3 mr-1" />Check-in / out
          </span>
          <span className={cn("text-sm font-semibold mt-0.5", dateRange?.from ? "text-[var(--text-1)]" : "text-[var(--text-3)]")}>
            {dateLabel}
          </span>
        </button>

        {/* WHO + SEARCH */}
        <div className="flex items-center gap-2 pr-2 pl-4">
          <button
            ref={guestsBtnRef}
            className={cn(
              "flex flex-col items-start px-4 py-4 hover:bg-[var(--surface-alt)] rounded-xl transition-colors text-left",
              activeTab === "guests" && "bg-[var(--surface)] shadow-focus z-10",
            )}
            onClick={() => setActiveTab(activeTab === "guests" ? null : "guests")}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)]">
              <Users className="inline h-3 w-3 mr-1" />Who
            </span>
            <span className="text-sm font-semibold mt-0.5 text-[var(--text-1)]">{guestsLabel}</span>
          </button>

          <button
            onClick={handleSearch}
            className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-black text-sm px-5 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 shrink-0"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>
      </div>

      {/* ── Desktop popovers — portalled via AnchoredMenu so overflow-hidden can't clip them ── */}

      {/* Destination */}
      <AnchoredMenu
        anchorRef={destBtnRef as React.RefObject<HTMLElement>}
        open={!isMobile && activeTab === "destination"}
        onClose={close}
        align="left"
        width={320}
        gap={10}
        className="bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border-soft)] p-5"
      >
        <div className="flex items-center gap-3 bg-[var(--surface-alt)] rounded-xl p-3 mb-4 border border-[var(--border)]">
          <Search className="h-4 w-4 text-[var(--text-3)] shrink-0" />
          <input
            autoFocus
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setActiveTab("checkin")}
            placeholder="City, hotel name…"
            className="bg-transparent outline-none text-sm font-medium w-full text-[var(--text-1)] placeholder:text-[var(--text-3)]"
          />
          {destination && (
            <button onClick={() => setDestination("")}><X className="h-4 w-4 text-[var(--text-3)]" /></button>
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-3)] mb-3">Popular destinations</p>
        <div className="grid grid-cols-2 gap-2">
          {DESTINATIONS.map((label) => (
            <button
              key={label}
              onClick={() => { setDestination(label); setActiveTab("checkin"); }}
              className="flex items-center gap-2.5 p-3 rounded-xl hover:bg-[var(--surface-alt)] transition-colors text-left group/dest"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] transition-transform group-hover/dest:scale-110">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-[var(--text-1)]">{label}</span>
            </button>
          ))}
        </div>
      </AnchoredMenu>

      {/* Dates */}
      <AnchoredMenu
        anchorRef={datesBtnRef as React.RefObject<HTMLElement>}
        open={!isMobile && activeTab === "checkin"}
        onClose={close}
        align="left"
        width={580}
        gap={10}
        className="bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border-soft)] p-5"
      >
        <DayPicker
          mode="range"
          selected={dateRange}
          onSelect={(r) => {
            setDateRange(r);
            if (r?.from && r?.to) setActiveTab("guests");
          }}
          numberOfMonths={2}
          disabled={{ before: new Date() }}
          classNames={pickerClassNames}
        />
        {dateRange?.from && (
          <div className="mt-3 pt-3 border-t border-[var(--border-soft)] flex justify-end">
            <button
              onClick={() => setDateRange(undefined)}
              className="text-xs font-semibold text-[var(--text-3)] hover:text-[var(--text-1)] underline"
            >
              Clear dates
            </button>
          </div>
        )}
      </AnchoredMenu>

      {/* Guests */}
      <AnchoredMenu
        anchorRef={guestsBtnRef as React.RefObject<HTMLElement>}
        open={!isMobile && activeTab === "guests"}
        onClose={close}
        align="right"
        width={320}
        gap={10}
        className="bg-[var(--surface)] rounded-2xl shadow-2xl border border-[var(--border-soft)] p-6"
      >
        <GuestSelector adults={adults} setAdults={setAdults} childrenCount={children} setChildren={setChildren} />
      </AnchoredMenu>

      {/* ── Mobile trigger ── */}
      <button
        className="md:hidden w-full max-w-sm bg-[var(--surface)]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 px-5 py-4 flex items-center gap-3 text-left"
        onClick={() => setActiveTab("destination")}
      >
        <Search className="h-5 w-5 text-[var(--accent)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--text-1)] truncate">
            {destination || "Where to?"}
          </p>
          <p className="text-xs text-[var(--text-3)] truncate">
            {dateLabel !== "Add dates" ? `${dateLabel} · ` : ""}{guestsLabel}
          </p>
        </div>
      </button>

      {/* ── Mobile full-screen modal — portalled to <body> so ancestor stacking
           contexts (z-10/z-20 wrappers above) can never trap it behind the
           navbar or other fixed page chrome ── */}
      <AnimatePresence>
        {isMobile && activeTab && typeof document !== "undefined" && createPortal(
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed inset-0 z-[100] bg-[var(--canvas)] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--surface)]">
              <button onClick={() => setActiveTab(null)} className="p-2 rounded-full hover:bg-[var(--surface-alt)]">
                <X className="h-5 w-5" />
              </button>
              <span className="text-sm font-bold text-[var(--text-1)]">Search stays</span>
              <button onClick={handleClear} className="text-sm font-semibold text-[var(--text-3)] underline px-2">
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
              {/* Destination */}
              <div className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border-soft)] shadow-sm">
                <h3 className="font-fraunces text-lg font-bold mb-4">Where to?</h3>
                <div className="flex items-center gap-3 bg-[var(--surface-alt)] rounded-2xl p-3 border border-[var(--border)] mb-4">
                  <Search className="h-4 w-4 text-[var(--text-3)]" />
                  <input
                    autoFocus={activeTab === "destination"}
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Search destinations"
                    className="bg-transparent outline-none flex-1 text-sm font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DESTINATIONS.map((label) => (
                    <button
                      key={label}
                      onClick={() => setDestination(label)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-2xl border transition-all text-left",
                        destination === label
                          ? "border-[var(--accent)] bg-[var(--accent)]/5"
                          : "border-[var(--border)] hover:bg-[var(--surface-alt)]",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border-soft)] shadow-sm flex flex-col items-center">
                <h3 className="font-fraunces text-lg font-bold mb-4 self-start">When&apos;s your trip?</h3>
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  disabled={{ before: new Date() }}
                  classNames={{ ...pickerClassNames, months: "flex gap-0" }}
                />
              </div>

              {/* Guests */}
              <div className="bg-[var(--surface)] rounded-3xl p-5 border border-[var(--border-soft)] shadow-sm">
                <h3 className="font-fraunces text-lg font-bold mb-5">Who&apos;s coming?</h3>
                <GuestSelector adults={adults} setAdults={setAdults} childrenCount={children} setChildren={setChildren} />
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-between gap-4">
              <button onClick={handleClear} className="text-sm font-semibold underline text-[var(--text-2)]">
                Clear all
              </button>
              <button
                onClick={handleSearch}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent)] text-white font-bold py-3.5 rounded-xl hover:bg-[var(--accent-hover)] transition-all"
              >
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </motion.div>,
          document.body,
        )}
      </AnimatePresence>

      {/* Clear filter hint */}
      {(searchParams.get("dest") || searchParams.get("checkIn")) && !activeTab && !isMobile && (
        <button
          onClick={handleClear}
          className="mt-4 text-white/70 hover:text-white text-sm flex items-center gap-1 drop-shadow transition-colors"
        >
          <X className="h-4 w-4" /> Clear filters
        </button>
      )}
    </div>
  );
}

function GuestCounter({
  label, sub, value, min = 0, onChange,
}: {
  label: string; sub: string; value: number; min?: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-[var(--text-1)] text-sm">{label}</p>
        <p className="text-xs text-[var(--text-3)]">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center hover:border-[var(--text-1)] hover:text-[var(--text-1)] disabled:opacity-30 transition-colors active:scale-90"
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-4 text-center font-semibold text-[var(--text-1)]">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-2)] hover:border-[var(--text-1)] hover:text-[var(--text-1)] transition-colors active:scale-90"
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function GuestSelector({ adults, setAdults, childrenCount, setChildren }: {
  adults: number;        setAdults:   (v: number) => void;
  childrenCount: number; setChildren: (v: number) => void;
}) {
  return (
    <div className="space-y-5 divide-y divide-[var(--border-soft)]">
      <GuestCounter label="Adults"   sub="Age 13+"  value={adults}   min={1} onChange={setAdults} />
      <div className="pt-5">
        <GuestCounter label="Children" sub="Age 2 to 12" value={childrenCount} min={0} onChange={setChildren} />
      </div>
    </div>
  );
}
