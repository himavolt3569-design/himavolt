"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarOff,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Moon,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import Toggle from "@/components/ui/Toggle";
import LocationPickerModal from "@/components/modals/LocationPickerModal";
import { apiFetch, invalidateApiCache } from "@/lib/api-client";
import {
  DAY_LABELS,
  MINUTES_PER_DAY,
  formatMinutes,
  type ServiceTypeValue,
  type SpecialHoursScopeValue,
} from "@/lib/hours";

/**
 * Days, hours and location, the settings that everything else depends on.
 *
 * Overnight windows are handled implicitly: if the closing time is at or before
 * the opening time, the row is a spill into the next day and is stored as
 * `closeMin + 1440`. Owners think "we close at 2am", not "we close at minute
 * 1560", so the encoding stays out of the UI and only the badge shows.
 */

interface HoursRow {
  serviceType: ServiceTypeValue;
  dayOfWeek: number;
  isClosed: boolean;
  openMin: number;
  closeMin: number;
}

interface SpecialRow {
  id: string;
  date: string;
  serviceType: SpecialHoursScopeValue;
  isClosed: boolean;
  openMin: number | null;
  closeMin: number | null;
  reason: string | null;
}

const SERVICES: { id: ServiceTypeValue; label: string; hint: string }[] = [
  { id: "DINE_IN", label: "Dine-in", hint: "When guests can eat in" },
  { id: "DELIVERY", label: "Delivery", hint: "Often stops earlier than the kitchen" },
  { id: "PICKUP", label: "Pickup", hint: "When customers can collect" },
];

const DEFAULT_OPEN = 540; // 09:00
const DEFAULT_CLOSE = 1380; // 23:00

/** minutes → `"HH:MM"` for an `<input type="time">`. */
const toTimeValue = (m: number) => formatMinutes(m);

/** `"HH:MM"` → minutes, or null when the browser hands back an empty value. */
function fromTimeValue(v: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function blankWeek(serviceType: ServiceTypeValue): HoursRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    serviceType,
    dayOfWeek,
    isClosed: false,
    openMin: DEFAULT_OPEN,
    closeMin: DEFAULT_CLOSE,
  }));
}

export default function OperatingHoursTab() {
  const { selectedRestaurant, updateRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const restaurantId = selectedRestaurant?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<ServiceTypeValue>("DINE_IN");
  const [rows, setRows] = useState<HoursRow[]>([]);
  const [special, setSpecial] = useState<SpecialRow[]>([]);
  const [timezone, setTimezone] = useState("Asia/Kathmandu");
  const [uniform, setUniform] = useState(true);

  // Visibility + location, moved here from Menu Management where they never belonged.
  const [isOpen, setIsOpen] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  /* ── load ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    Promise.all([
      apiFetch<{
        timezone: string;
        hours: HoursRow[];
        specialHours: SpecialRow[];
        legacy: { openingTime: string | null; closingTime: string | null };
      }>(`/api/restaurants/${restaurantId}/hours`),
      apiFetch<{ isOpen: boolean }>(`/api/restaurants/${restaurantId}/status`),
    ])
      .then(([h, s]) => {
        if (cancelled) return;
        setTimezone(h.timezone);
        setIsOpen(s.isOpen);

        if (h.hours.length > 0) {
          setRows(h.hours);
          // "Same every day" is only true if it actually is, otherwise the
          // toggle would flatten a schedule the owner deliberately varied.
          const dineIn = h.hours.filter((r) => r.serviceType === "DINE_IN");
          setUniform(
            dineIn.length > 0 &&
              dineIn.every(
                (r) =>
                  r.openMin === dineIn[0].openMin &&
                  r.closeMin === dineIn[0].closeMin &&
                  r.isClosed === dineIn[0].isClosed,
              ),
          );
        } else {
          // First open: seed from the old single schedule rather than showing
          // seven empty rows the owner has to fill from scratch.
          const open = h.legacy.openingTime
            ? (fromTimeValue(h.legacy.openingTime) ?? DEFAULT_OPEN)
            : DEFAULT_OPEN;
          const rawClose = h.legacy.closingTime
            ? (fromTimeValue(h.legacy.closingTime) ?? DEFAULT_CLOSE)
            : DEFAULT_CLOSE;
          const close = rawClose <= open ? rawClose + MINUTES_PER_DAY : rawClose;
          setRows(
            blankWeek("DINE_IN").map((r) => ({ ...r, openMin: open, closeMin: close })),
          );
          setUniform(true);
        }
        setSpecial(h.specialHours);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRows(blankWeek("DINE_IN"));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  /* ── derived ───────────────────────────────────────────────────── */
  const activeRows = useMemo(() => {
    const existing = rows.filter((r) => r.serviceType === service);
    return existing.length === 7 ? existing : blankWeek(service);
  }, [rows, service]);

  const hasServiceRows = rows.some((r) => r.serviceType === service);

  /* ── mutations ─────────────────────────────────────────────────── */
  const setDay = useCallback(
    (dayOfWeek: number, patch: Partial<HoursRow>) => {
      setRows((prev) => {
        const others = prev.filter((r) => r.serviceType !== service);
        const mine =
          prev.filter((r) => r.serviceType === service).length === 7
            ? prev.filter((r) => r.serviceType === service)
            : blankWeek(service);
        const next = mine.map((r) =>
          // "Same every day" edits the whole week at once, which is what an
          // owner means when they leave that switch on.
          uniform || r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r,
        );
        return [...others, ...next];
      });
    },
    [service, uniform],
  );

  const setTime = useCallback(
    (dayOfWeek: number, field: "openMin" | "closeMin", value: string) => {
      const mins = fromTimeValue(value);
      if (mins == null) return;
      setRows((prev) => {
        const others = prev.filter((r) => r.serviceType !== service);
        const mine =
          prev.filter((r) => r.serviceType === service).length === 7
            ? prev.filter((r) => r.serviceType === service)
            : blankWeek(service);
        const next = mine.map((r) => {
          if (!uniform && r.dayOfWeek !== dayOfWeek) return r;
          const open = field === "openMin" ? mins : r.openMin;
          const rawClose = field === "closeMin" ? mins : r.closeMin % MINUTES_PER_DAY;
          // Closing at or before opening is how an owner says "past midnight".
          const close = rawClose <= open ? rawClose + MINUTES_PER_DAY : rawClose;
          return { ...r, openMin: open, closeMin: close };
        });
        return [...others, ...next];
      });
    },
    [service, uniform],
  );

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      // Send every service that has rows, not just the visible tab, the editor
      // holds the complete state and the API replaces the whole schedule.
      const payload = rows.length > 0 ? rows : activeRows;
      await apiFetch(`/api/restaurants/${restaurantId}/hours`, {
        method: "PUT",
        body: { hours: payload },
      });
      invalidateApiCache(`/api/restaurants/${restaurantId}/hours`);
      invalidateApiCache(`/api/restaurants/${restaurantId}/status`);
      showToast("Hours saved", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save hours", "error");
    }
    setSaving(false);
  };

  const toggleVisibility = async (next: boolean) => {
    if (!restaurantId) return;
    const prev = isOpen;
    setIsOpen(next);
    setStatusSaving(true);
    try {
      await apiFetch(`/api/restaurants/${restaurantId}/status`, {
        method: "PATCH",
        body: { isOpen: next },
      });
      invalidateApiCache(`/api/restaurants/${restaurantId}/status`);
    } catch {
      setIsOpen(prev);
      showToast("Could not update visibility", "error");
    }
    setStatusSaving(false);
  };

  const addSpecial = async () => {
    if (!restaurantId || !newDate) return;
    try {
      const created = await apiFetch<SpecialRow>(
        `/api/restaurants/${restaurantId}/hours/special`,
        {
          method: "POST",
          body: {
            date: newDate,
            serviceType: "ALL",
            isClosed: true,
            reason: newReason.trim() || null,
          },
        },
      );
      setSpecial((prev) =>
        [...prev.filter((s) => s.id !== created.id), created].sort((a, b) =>
          String(a.date).localeCompare(String(b.date)),
        ),
      );
      setNewDate("");
      setNewReason("");
      showToast("Closure added", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add closure", "error");
    }
  };

  const removeSpecial = async (overrideId: string) => {
    if (!restaurantId) return;
    const prev = special;
    setSpecial((s) => s.filter((x) => x.id !== overrideId));
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/hours/special?overrideId=${overrideId}`,
        { method: "DELETE" },
      );
    } catch {
      setSpecial(prev);
      showToast("Could not remove closure", "error");
    }
  };

  const handleLocation = async (result: {
    address: string;
    city: string;
    coords: { lat: number; lon: number };
  }) => {
    if (!restaurantId) return;
    try {
      await updateRestaurant(restaurantId, {
        address: result.address,
        city: result.city,
        latitude: result.coords.lat,
        longitude: result.coords.lon,
      });
      showToast("Location updated", "success");
    } catch {
      showToast("Could not update location", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-1)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--text-1)]">
          <Clock className="h-5 w-5" />
          Hours &amp; Location
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          When you are open, and where you are. Delivery cannot be switched on
          until this is set.
        </p>
      </div>

      {/* Visibility, the manual override that beats the schedule */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isOpen ? "bg-[var(--accent-muted)]" : "bg-[var(--surface)]"
              }`}
            >
              {isOpen ? (
                <Eye className="h-4 w-4 text-[var(--accent-text)]" />
              ) : (
                <EyeOff className="h-4 w-4 text-[var(--text-3)]" />
              )}
            </span>
            <div>
              <p className="text-[13px] font-bold text-[var(--text-1)]">
                {isOpen ? "Visible to customers" : "Temporarily closed"}
              </p>
              <p className="text-[11px] text-[var(--text-3)]">
                {isOpen
                  ? "Shown on the site during your open hours"
                  : "Hidden everywhere, whatever your hours say"}
              </p>
            </div>
          </div>
          <Toggle
            checked={isOpen}
            onChange={toggleVisibility}
            disabled={statusSaving}
          />
        </div>
      </div>

      {/* Location */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[var(--text-1)]" />
          <h3 className="text-sm font-bold text-[var(--text-1)]">Location</h3>
        </div>
        <p className="text-[12px] text-[var(--text-3)]">
          Used to work out delivery distance and to show you to nearby customers.
          Be precise, the pin decides what people are charged.
        </p>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 rounded-xl bg-[var(--canvas-sub)] px-3 py-2.5 text-[13px] text-[var(--text-2)]">
            {selectedRestaurant?.address || "No address set"}
            {selectedRestaurant?.city ? `, ${selectedRestaurant.city}` : ""}
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="shrink-0 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Change
          </button>
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">Weekly hours</h3>
            <p className="text-[11px] text-[var(--text-3)]">
              Times are local ({timezone.replace("_", " ")})
            </p>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-2)]">
            Same every day
            <Toggle checked={uniform} onChange={setUniform} />
          </label>
        </div>

        {/* Service switcher */}
        <div className="flex w-full gap-1 rounded-xl bg-[var(--surface)] p-1">
          {SERVICES.map((s) => (
            <button
              key={s.id}
              onClick={() => setService(s.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-bold transition-all ${
                service === s.id
                  ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                  : "text-[var(--text-2)] hover:text-[var(--text-1)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-3)]">
          {SERVICES.find((s) => s.id === service)?.hint}
          {service !== "DINE_IN" && !hasServiceRows
            ? ", not set, so it follows your dine-in hours."
            : ""}
        </p>

        <div className="space-y-2">
          {(uniform ? activeRows.slice(0, 1) : activeRows).map((row) => {
            const overnight = row.closeMin > MINUTES_PER_DAY;
            return (
              <div
                key={row.dayOfWeek}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--canvas-sub)] px-3 py-2.5"
              >
                <span className="w-24 shrink-0 text-[13px] font-bold text-[var(--text-1)]">
                  {uniform ? "Every day" : DAY_LABELS[row.dayOfWeek]}
                </span>

                <Toggle
                  checked={!row.isClosed}
                  onChange={(v) => setDay(row.dayOfWeek, { isClosed: !v })}
                />

                {row.isClosed ? (
                  <span className="text-[12px] font-semibold text-[var(--text-3)]">
                    Closed
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={toTimeValue(row.openMin)}
                      onChange={(e) => setTime(row.dayOfWeek, "openMin", e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1.5 text-[13px] text-[var(--text-1)]"
                    />
                    <span className="text-[var(--text-3)]">to</span>
                    <input
                      type="time"
                      value={toTimeValue(row.closeMin)}
                      onChange={(e) => setTime(row.dayOfWeek, "closeMin", e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1.5 text-[13px] text-[var(--text-1)]"
                    />
                    {overnight && (
                      <span className="flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                        <Moon className="h-3 w-3" />
                        next day
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!uniform && (
          <p className="text-[11px] text-[var(--text-3)]">
            Set a closing time earlier than the opening time to run past midnight
           , a bar open 6pm to 2am is a normal Saturday.
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save hours
        </button>
      </div>

      {/* Holidays & one-off closures */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarOff className="h-4 w-4 text-[var(--text-1)]" />
          <h3 className="text-sm font-bold text-[var(--text-1)]">
            Holidays &amp; one-off closures
          </h3>
        </div>
        <p className="text-[12px] text-[var(--text-3)]">
          Dashain, a private event, a day off. These beat your weekly hours.
        </p>

        {special.length > 0 && (
          <div className="space-y-2">
            {special.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[var(--canvas-sub)] px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <CalendarClock className="h-4 w-4 shrink-0 text-[var(--text-3)]" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">
                      {String(s.date).slice(0, 10)}
                      {s.serviceType !== "ALL" ? ` · ${s.serviceType.replace("_", "-").toLowerCase()}` : ""}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-3)]">
                      {s.isClosed ? "Closed" : `${formatMinutes(s.openMin ?? 0)} to ${formatMinutes(s.closeMin ?? 0)}`}
                      {s.reason ? ` · ${s.reason}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeSpecial(s.id)}
                  className="shrink-0 rounded-lg p-2 text-[var(--text-3)] transition-colors hover:bg-[var(--surface)] hover:text-red-500"
                  aria-label="Remove closure"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-1)]"
          />
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={120}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
          />
          <button
            onClick={addSpecial}
            disabled={!newDate}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--text-1)] px-3.5 py-2 text-[12px] font-bold text-[var(--canvas)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add closure
          </button>
        </div>
      </div>

      {pickerOpen && selectedRestaurant && (
        <LocationPickerModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialCoords={{
            lat: selectedRestaurant.latitude ?? 27.7172,
            lon: selectedRestaurant.longitude ?? 85.324,
          }}
          initialAddress={selectedRestaurant.address ?? ""}
          initialCity={selectedRestaurant.city ?? "Kathmandu"}
          onConfirm={handleLocation}
        />
      )}
    </div>
  );
}
