"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Check,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Store,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { formatDistance } from "@/lib/geo";
import { CUSTOMER_STATUS_LABELS } from "@/lib/delivery/transitions";
import type { DeliveryStatus } from "@/generated/prisma";

/**
 * The rider's screen. One delivery, big buttons, nothing else.
 *
 * Designed for someone on a bike, one-handed, in daylight: every action is a
 * full-width target, the next step is the only prominent button, and the cash to
 * collect is impossible to miss.
 *
 * Location sharing is opt-in and foreground-only. Browsers throttle background
 * tabs hard, so this makes no promise it cannot keep — the honest framing is
 * "updated N seconds ago", never "live GPS".
 */

interface RiderDelivery {
  id: string;
  status: DeliveryStatus;
  assigned: boolean;
  driverName: string | null;
  orderNo: string;
  total: number;
  currency: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  collectCash: number;
  items: { id: string; name: string; quantity: number }[];
  pickup: {
    name: string;
    address: string;
    phone: string;
    lat: number | null;
    lng: number | null;
  };
  dropoff: {
    address: string | null;
    phone: string | null;
    note: string | null;
    name: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  distanceKm: number | null;
  estimatedMins: number | null;
}

const NEXT_STEP: Partial<
  Record<DeliveryStatus, { to: DeliveryStatus; label: string }>
> = {
  ASSIGNED: { to: "PICKED_UP", label: "I've picked it up" },
  PICKED_UP: { to: "IN_TRANSIT", label: "On my way" },
  IN_TRANSIT: { to: "DELIVERED", label: "Delivered" },
};

const PING_INTERVAL_MS = 15_000;

export default function RiderClient({ token }: { token: string }) {
  const [data, setData] = useState<RiderDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [lastPing, setLastPing] = useState<Date | null>(null);

  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestFix = useRef<GeolocationPosition | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rider/${token}`);
      if (!res.ok) throw new Error("This delivery link is not valid.");
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this delivery.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ── location sharing ───────────────────────────────────────────── */
  const stopSharing = useCallback(() => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    watchRef.current = null;
    timerRef.current = null;
    setSharing(false);
  }, []);

  const startSharing = useCallback(() => {
    if (!navigator.geolocation) return;
    setSharing(true);

    // `watchPosition` keeps a warm fix; a separate timer decides how often it is
    // actually sent. Posting on every callback would drain the rider's battery
    // and hammer the endpoint for movement nobody can see on a map.
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestFix.current = pos;
      },
      () => stopSharing(),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    timerRef.current = setInterval(() => {
      const fix = latestFix.current;
      if (!fix) return;
      void fetch(`/api/rider/${token}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: fix.coords.latitude,
          longitude: fix.coords.longitude,
          accuracyM: fix.coords.accuracy,
        }),
      })
        .then(() => setLastPing(new Date()))
        .catch(() => {
          /* a dropped ping is not worth interrupting a ride for */
        });
    }, PING_INTERVAL_MS);
  }, [token, stopSharing]);

  useEffect(() => stopSharing, [stopSharing]);

  // Stop the moment the job is done — no reason to keep a rider's phone
  // reporting its position after handover.
  useEffect(() => {
    if (!data) return;
    const done = ["DELIVERED", "CANCELLED", "FAILED", "RETURNED"].includes(
      data.status,
    );
    if (done && sharing) stopSharing();
  }, [data, sharing, stopSharing]);

  const act = async (to: DeliveryStatus) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/rider/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not update.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update.");
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--text-1)]" />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)] p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-9 w-9 text-[var(--text-3)]" />
          <p className="text-[15px] font-bold text-[var(--text-1)]">{error}</p>
          <p className="mt-1 text-[13px] text-[var(--text-3)]">
            Ask the restaurant for a new link.
          </p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const step = NEXT_STEP[data.status];
  const finished = ["DELIVERED", "CANCELLED", "FAILED", "RETURNED"].includes(
    data.status,
  );

  return (
    <main className="min-h-screen bg-[var(--canvas-sub)] pb-32">
      <header className="bg-[var(--canvas)] px-5 py-5 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
          Order #{data.orderNo}
        </p>
        <h1 className="mt-1 text-[22px] font-black text-[var(--text-1)]">
          {CUSTOMER_STATUS_LABELS[data.status]}
        </h1>
        {data.distanceKm != null && (
          <p className="mt-1 text-[13px] text-[var(--text-2)]">
            {formatDistance(data.distanceKm)}
            {data.estimatedMins ? ` · about ${data.estimatedMins} min` : ""}
          </p>
        )}
      </header>

      <div className="space-y-4 p-4">
        {/* Cash first — it is the thing a rider must not forget */}
        {data.collectCash > 0 && !finished && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-amber-700">
              <Banknote className="h-4 w-4" />
              Collect on delivery
            </p>
            <p className="mt-1 text-[28px] font-black text-amber-900">
              {formatPrice(data.collectCash, data.currency)}
            </p>
          </div>
        )}

        {/* Pickup */}
        <Card
          icon={Store}
          label="Pick up from"
          title={data.pickup.name}
          address={data.pickup.address}
          phone={data.pickup.phone}
          lat={data.pickup.lat}
          lng={data.pickup.lng}
        />

        {/* Dropoff — only once assigned */}
        {data.dropoff ? (
          <Card
            icon={MapPin}
            label="Deliver to"
            title={data.dropoff.name ?? "Customer"}
            address={data.dropoff.address ?? "No address given"}
            phone={data.dropoff.phone}
            note={data.dropoff.note}
            lat={data.dropoff.lat}
            lng={data.dropoff.lng}
            accent
          />
        ) : (
          <div className="rounded-2xl bg-[var(--canvas)] p-4 text-center">
            <p className="text-[13px] text-[var(--text-3)]">
              The customer&apos;s address appears once the restaurant assigns this
              order to you.
            </p>
          </div>
        )}

        {/* Items */}
        <div className="rounded-2xl bg-[var(--canvas)] p-4">
          <p className="mb-2 flex items-center gap-2 text-[12px] font-bold text-[var(--text-3)]">
            <Package className="h-3.5 w-3.5" />
            {data.items.length} item{data.items.length === 1 ? "" : "s"}
          </p>
          <ul className="space-y-1">
            {data.items.map((i) => (
              <li key={i.id} className="text-[14px] text-[var(--text-1)]">
                <span className="font-bold">{i.quantity}×</span> {i.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Location sharing */}
        {!finished && data.assigned && (
          <div className="rounded-2xl bg-[var(--canvas)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-[var(--text-1)]">
                  Share my location
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--text-3)]">
                  {sharing
                    ? lastPing
                      ? `Sent ${Math.round((Date.now() - lastPing.getTime()) / 1000)}s ago`
                      : "Starting…"
                    : "Lets the customer see you approaching. Keep this screen open."}
                </p>
              </div>
              <button
                onClick={sharing ? stopSharing : startSharing}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors ${
                  sharing
                    ? "bg-[var(--surface)] text-[var(--text-2)]"
                    : "bg-[var(--text-1)] text-[var(--canvas)]"
                }`}
              >
                {sharing ? "Stop" : "Start"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Sticky action bar — thumb-reachable */}
      {!finished && step && data.assigned && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--canvas)] p-4">
          <button
            onClick={() => act(step.to)}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-[16px] font-black text-white transition-colors active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            {step.label}
          </button>
          {data.status === "IN_TRANSIT" && (
            <button
              onClick={() => act("FAILED")}
              disabled={busy}
              className="mt-2 w-full py-2 text-[13px] font-bold text-[var(--text-3)] disabled:opacity-50"
            >
              Can&apos;t deliver this
            </button>
          )}
        </div>
      )}

      {finished && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--canvas)] p-5 text-center">
          <p className="text-[15px] font-bold text-[var(--text-1)]">
            {data.status === "DELIVERED" ? "Nice work, all done." : "This delivery is closed."}
          </p>
        </div>
      )}
    </main>
  );
}

function Card({
  icon: Icon,
  label,
  title,
  address,
  phone,
  note,
  lat,
  lng,
  accent,
}: {
  icon: typeof MapPin;
  label: string;
  title: string;
  address: string;
  phone?: string | null;
  note?: string | null;
  lat: number | null;
  lng: number | null;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        accent
          ? "border-2 border-[var(--accent-border)] bg-[var(--accent-muted)]"
          : "bg-[var(--canvas)]"
      }`}
    >
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-bold text-[var(--text-1)]">{title}</p>
      <p className="mt-0.5 text-[13px] text-[var(--text-2)]">{address}</p>
      {note && (
        <p className="mt-2 rounded-lg bg-[var(--canvas)]/70 px-3 py-2 text-[12px] italic text-[var(--text-2)]">
          “{note}”
        </p>
      )}

      <div className="mt-3 flex gap-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--canvas-sub)] py-3 text-[14px] font-bold text-[var(--text-1)]"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
        )}
        {lat != null && lng != null && (
          // Hands off to whatever map app the rider actually uses. `geo:` is the
          // Android intent; the https fallback covers iOS and desktop.
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--canvas-sub)] py-3 text-[14px] font-bold text-[var(--text-1)]"
          >
            <Navigation className="h-4 w-4" />
            Directions
          </a>
        )}
      </div>
    </div>
  );
}
