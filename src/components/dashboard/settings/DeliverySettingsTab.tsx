"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Bike,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import Toggle from "@/components/ui/Toggle";
import { apiFetch, invalidateApiCache } from "@/lib/api-client";
import { formatPrice } from "@/lib/currency";

/**
 * Delivery, pickup and cash-on-delivery settings, plus the pricing zones.
 *
 * Delivery cannot be switched on until hours exist, the same rule the server
 * enforces. The toggle renders disabled rather than failing on click, because a
 * control that looks available and then errors is worse than one that explains
 * itself up front.
 */

interface Capability {
  dineInEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  codEnabled: boolean;
  codMaxAmount: number;
  liveTrackingEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryPrepMins: number;
}

interface Zone {
  id: string;
  name: string;
  baseFee: number;
  perKmFee: number;
  freeAbove: number | null;
  maxRadiusKm: number;
  isActive: boolean;
}

const NEW_ZONE = {
  name: "",
  baseFee: 50,
  perKmFee: 15,
  freeAbove: null as number | null,
  maxRadiusKm: 5,
};

export default function DeliverySettingsTab() {
  const { selectedRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const restaurantId = selectedRestaurant?.id;
  const currency = selectedRestaurant?.currency ?? "NPR";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cap, setCap] = useState<Capability | null>(null);
  const [canEnableDelivery, setCanEnableDelivery] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [draft, setDraft] = useState({ ...NEW_ZONE });
  const [addingZone, setAddingZone] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;

    Promise.all([
      apiFetch<{ capability: Capability; canEnableDelivery: boolean }>(
        `/api/restaurants/${restaurantId}/capabilities`,
      ),
      apiFetch<{ zones: Zone[] }>(
        `/api/restaurants/${restaurantId}/delivery-zones`,
      ).catch(() => ({ zones: [] as Zone[] })),
    ])
      .then(([c, z]) => {
        if (cancelled) return;
        setCap(c.capability);
        setCanEnableDelivery(c.canEnableDelivery);
        setZones(z.zones);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const patch = async (changes: Partial<Capability>) => {
    if (!restaurantId || !cap) return;
    const prev = cap;
    setCap({ ...cap, ...changes });
    setSaving(true);
    try {
      const res = await apiFetch<{ capability: Capability }>(
        `/api/restaurants/${restaurantId}/capabilities`,
        { method: "PATCH", body: changes },
      );
      setCap(res.capability);
      invalidateApiCache(`/api/restaurants/${restaurantId}/capabilities`);
      invalidateApiCache(`/api/restaurants/${restaurantId}/status`);
    } catch (err) {
      setCap(prev);
      showToast(
        err instanceof Error ? err.message : "Could not save settings",
        "error",
      );
    }
    setSaving(false);
  };

  const addZone = async () => {
    if (!restaurantId || !draft.name.trim()) return;
    setAddingZone(true);
    try {
      const zone = await apiFetch<Zone>(
        `/api/restaurants/${restaurantId}/delivery-zones`,
        { method: "POST", body: { ...draft, name: draft.name.trim() } },
      );
      setZones((z) => [zone, ...z]);
      setDraft({ ...NEW_ZONE });
      showToast("Zone added", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add zone", "error");
    }
    setAddingZone(false);
  };

  const removeZone = async (zoneId: string) => {
    if (!restaurantId) return;
    const prev = zones;
    setZones((z) => z.filter((x) => x.id !== zoneId));
    try {
      await apiFetch(
        `/api/restaurants/${restaurantId}/delivery-zones/${zoneId}`,
        { method: "DELETE" },
      );
    } catch {
      setZones(prev);
      showToast("Could not remove zone", "error");
    }
  };

  if (loading || !cap) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-1)]" />
      </div>
    );
  }

  const deliveryBlocked = !canEnableDelivery && !cap.deliveryEnabled;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[var(--text-1)]">
          <Truck className="h-5 w-5" />
          Delivery &amp; Pickup
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          What you offer, how far you go, and what you charge for it.
        </p>
      </div>

      {deliveryBlocked && (
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" />
          <div>
            <p className="text-[13px] font-bold text-[var(--text-1)]">
              Set your hours first
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--accent-text)]">
              Customers must never be sent to a kitchen that is closed. Fill in
              Hours &amp; Location, then come back and switch delivery on.
            </p>
          </div>
        </div>
      )}

      {/* What you offer */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-1">
        <h3 className="mb-3 text-sm font-bold text-[var(--text-1)]">
          What you offer
        </h3>

        <CapRow
          label="Dine-in"
          hint="Guests eat at your tables"
          checked={cap.dineInEnabled}
          onChange={(v) => patch({ dineInEnabled: v })}
          disabled={saving}
        />
        <CapRow
          label="Pickup"
          hint="Customers order ahead and collect"
          checked={cap.pickupEnabled}
          onChange={(v) => patch({ pickupEnabled: v })}
          disabled={saving}
        />
        <CapRow
          label="Delivery"
          hint={
            deliveryBlocked
              ? "Needs opening hours before it can be switched on"
              : "Your own riders take orders to customers"
          }
          checked={cap.deliveryEnabled}
          onChange={(v) => patch({ deliveryEnabled: v })}
          disabled={saving || deliveryBlocked}
        />
      </div>

      {cap.deliveryEnabled && (
        <>
          {/* Range & timing */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--text-1)]" />
              <h3 className="text-sm font-bold text-[var(--text-1)]">
                Range &amp; timing
              </h3>
            </div>

            <NumberField
              label="Maximum delivery distance"
              suffix="km"
              value={cap.deliveryRadiusKm}
              min={0.5}
              max={50}
              step={0.5}
              hint="Orders beyond this are refused before payment. This is a hard limit, it beats any zone set wider."
              onCommit={(v) => patch({ deliveryRadiusKm: v })}
            />

            <NumberField
              label="Kitchen prep time"
              suffix="min"
              value={cap.deliveryPrepMins}
              min={0}
              max={240}
              step={5}
              hint="Added to travel time for the customer's estimated arrival."
              onCommit={(v) => patch({ deliveryPrepMins: v })}
            />

            <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)]">
                  <Bike className="h-4 w-4 text-[var(--text-2)]" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-1)]">
                    Live rider location
                  </p>
                  <p className="text-[11px] text-[var(--text-3)]">
                    Customers see the rider move, when the rider&apos;s phone is
                    awake with data on. Progress steps always show either way.
                  </p>
                </div>
              </div>
              <Toggle
                checked={cap.liveTrackingEnabled}
                onChange={(v) => patch({ liveTrackingEnabled: v })}
                disabled={saving}
              />
            </div>
          </div>

          {/* Cash on delivery */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-[var(--text-1)]" />
              <h3 className="text-sm font-bold text-[var(--text-1)]">
                Cash on delivery
              </h3>
            </div>
            <p className="text-[12px] text-[var(--text-3)]">
              Delivery is paid up front by eSewa or Khalti by default, so nobody
              orders to a fake address at midnight. Switch cash on if you want it,
              and cap how much you are willing to risk per order.
            </p>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-semibold text-[var(--text-1)]">
                Accept cash on delivery
              </span>
              <Toggle
                checked={cap.codEnabled}
                onChange={(v) => patch({ codEnabled: v })}
                disabled={saving}
              />
            </div>

            {cap.codEnabled && (
              <NumberField
                label="Maximum cash order"
                suffix={currency}
                value={cap.codMaxAmount}
                min={0}
                max={1_000_000}
                step={100}
                hint={`Orders above ${formatPrice(cap.codMaxAmount, currency)} must be paid online.`}
                onCommit={(v) => patch({ codMaxAmount: v })}
              />
            )}
          </div>

          {/* Pricing zones */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-1)]">
                Delivery charges
              </h3>
              <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
                Zones are rings around your restaurant. The narrowest one that
                reaches the customer sets the price, so add the cheap close-by
                zone as well as the wider one.
              </p>
            </div>

            {zones.length === 0 && (
              <div className="rounded-xl bg-[var(--canvas-sub)] px-4 py-6 text-center">
                <p className="text-[13px] font-semibold text-[var(--text-2)]">
                  No charges set up yet
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-3)]">
                  Customers cannot check out for delivery until at least one zone
                  exists.
                </p>
              </div>
            )}

            {zones.map((z) => (
              <div
                key={z.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[var(--canvas-sub)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[var(--text-1)]">
                    {z.name}
                    <span className="ml-2 text-[11px] font-medium text-[var(--text-3)]">
                      up to {z.maxRadiusKm} km
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-3)]">
                    {formatPrice(z.baseFee, currency)} base +{" "}
                    {formatPrice(z.perKmFee, currency)}/km
                    {z.freeAbove
                      ? ` · free over ${formatPrice(z.freeAbove, currency)}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeZone(z.id)}
                  className="shrink-0 rounded-lg p-2 text-[var(--text-3)] transition-colors hover:bg-[var(--surface)] hover:text-red-500"
                  aria-label={`Remove ${z.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <div className="space-y-3 rounded-xl border border-dashed border-[var(--border)] p-4">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Zone name, e.g. Inner Ring Road"
                maxLength={60}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-1)] placeholder:text-[var(--text-3)]"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniField
                  label="Base"
                  value={draft.baseFee}
                  onChange={(v) => setDraft({ ...draft, baseFee: v })}
                />
                <MiniField
                  label="Per km"
                  value={draft.perKmFee}
                  onChange={(v) => setDraft({ ...draft, perKmFee: v })}
                />
                <MiniField
                  label="Max km"
                  value={draft.maxRadiusKm}
                  onChange={(v) => setDraft({ ...draft, maxRadiusKm: v })}
                />
                <MiniField
                  label="Free over"
                  value={draft.freeAbove ?? 0}
                  onChange={(v) =>
                    setDraft({ ...draft, freeAbove: v > 0 ? v : null })
                  }
                />
              </div>
              <button
                onClick={addZone}
                disabled={!draft.name.trim() || addingZone}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--text-1)] px-3.5 py-2 text-[12px] font-bold text-[var(--canvas)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {addingZone ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add zone
              </button>
            </div>
          </div>
        </>
      )}

      {saving && (
        <p className="flex items-center gap-2 text-[12px] text-[var(--text-3)]">
          <Save className="h-3.5 w-3.5" />
          Saving…
        </p>
      )}
    </div>
  );
}

/* ── small building blocks ────────────────────────────────────────── */

function CapRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[var(--text-1)]">{label}</p>
        <p className="text-[11px] text-[var(--text-3)]">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

/**
 * Commits on blur rather than on every keystroke, a PATCH per digit would both
 * hammer the API and let a half-typed "1" briefly become the real radius.
 */
function NumberField({
  label,
  suffix,
  value,
  min,
  max,
  step,
  hint,
  onCommit,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onCommit: (v: number) => void;
}) {
  // Re-sync from the prop during render rather than in an effect: an effect here
  // would render the stale value once, then immediately re-render with the new
  // one. This is React's documented "adjust state when a prop changes" pattern.
  const [local, setLocal] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setLocal(String(value));
  }

  const commit = () => {
    const n = Number(local);
    if (!Number.isFinite(n) || n < min || n > max) {
      setLocal(String(value));
      return;
    }
    if (n !== value) onCommit(n);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-[var(--text-1)]">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-32 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-[13px] text-[var(--text-1)]"
        />
        <span className="text-[12px] font-semibold text-[var(--text-3)]">
          {suffix}
        </span>
      </div>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-3)]">{hint}</p>}
    </div>
  );
}

function MiniField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-[var(--text-3)]">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2.5 py-1.5 text-[13px] text-[var(--text-1)]"
      />
    </div>
  );
}
