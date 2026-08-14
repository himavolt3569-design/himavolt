"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, Check, Clock, MapPin } from "lucide-react";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { orderTopic } from "@/lib/realtime-topics";
import { formatDistance } from "@/lib/geo";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TIMELINE,
} from "@/lib/delivery/transitions";
import { MAP_TILE_OPTIONS, tileUrlFor } from "@/lib/map-tiles";
import { useTheme } from "@/context/ThemeContext";
import type { DeliveryStatus } from "@/generated/prisma";

/**
 * Where is my food?
 *
 * The timeline is the backbone and always works. The moving dot is a bonus layer
 * that appears only when the restaurant enabled live tracking AND the rider has
 * the page open. That is why the label reads "updated 15 seconds ago" and never
 * "live", a rider's phone sleeps, loses signal, and gets throttled in the
 * background, and a stalled dot labelled "live" is worse than an honest timestamp.
 */

interface DeliveryState {
  isDelivery: boolean;
  status: DeliveryStatus;
  distanceKm: number | null;
  estimatedMins: number | null;
  riderName: string | null;
  restaurant: { name: string; lat: number | null; lng: number | null };
  dropoff: { lat: number | null; lng: number | null };
  rider: { lat: number; lng: number; updatedAt: string } | null;
  liveTrackingEnabled: boolean;
}

function agoLabel(iso: string): string {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `updated ${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `updated ${mins} min ago`;
  return "position is stale";
}

export default function DeliveryTrackingPanel({
  trackToken,
  orderId,
}: {
  trackToken: string;
  orderId: string | null;
}) {
  const [state, setState] = useState<DeliveryState | null>(null);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/delivery/${trackToken}`);
      if (!res.ok) return;
      const d = await res.json();
      if (d.isDelivery) setState(d);
    } catch {
      /* keep the last known state on screen */
    }
  }, [trackToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeSignal(orderId ? orderTopic(orderId) : null, load);

  // Re-render once a second purely so "updated Ns ago" stays truthful without
  // re-fetching. The data itself only changes on a realtime signal.
  useEffect(() => {
    if (!state?.rider) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [state?.rider]);

  if (!state?.isDelivery) return null;

  const currentIndex = CUSTOMER_TIMELINE.indexOf(state.status);
  const failed = ["CANCELLED", "FAILED", "RETURNED"].includes(state.status);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-1)]">
            <Bike className="h-4 w-4" />
            {CUSTOMER_STATUS_LABELS[state.status]}
          </h2>
          {state.riderName && !failed && (
            <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
              {state.riderName} is bringing your order
            </p>
          )}
        </div>
        {state.estimatedMins != null && !failed && (
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[12px] font-bold text-[var(--accent-text)]">
            <Clock className="h-3.5 w-3.5" />~{state.estimatedMins} min
          </span>
        )}
      </header>

      {!failed && (
        <ol className="mb-5 space-y-0">
          {CUSTOMER_TIMELINE.map((s, i) => {
            const done = i <= currentIndex;
            const current = i === currentIndex;
            return (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      done
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--surface)] text-[var(--text-3)]"
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {i < CUSTOMER_TIMELINE.length - 1 && (
                    <span
                      className={`w-0.5 flex-1 ${
                        i < currentIndex ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                      }`}
                      style={{ minHeight: 18 }}
                    />
                  )}
                </div>
                <p
                  className={`pb-4 text-[13px] ${
                    current
                      ? "font-bold text-[var(--text-1)]"
                      : done
                        ? "text-[var(--text-2)]"
                        : "text-[var(--text-3)]"
                  }`}
                >
                  {CUSTOMER_STATUS_LABELS[s]}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {failed && (
        <p className="mb-4 rounded-xl bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--text-2)]">
          Something went wrong with this delivery. The restaurant will be in touch
         , please call them if you have not heard shortly.
        </p>
      )}

      <TrackingMap state={state} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-3)]">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3" />
          {state.distanceKm != null
            ? `${formatDistance(state.distanceKm)} from ${state.restaurant.name}`
            : state.restaurant.name}
        </span>
        {state.rider ? (
          <span>{agoLabel(state.rider.updatedAt)}</span>
        ) : state.liveTrackingEnabled ? (
          <span>Rider location not being shared right now</span>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Leaflet is loaded on demand and never server-rendered, it touches `window` at
 * import time and would break the build otherwise.
 */
function TrackingMap({ state }: { state: DeliveryState }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const riderMarkerRef = useRef<unknown>(null);
  const { theme } = useTheme();

  const { restaurant, dropoff, rider } = state;
  const hasPins =
    restaurant.lat != null && restaurant.lng != null && dropoff.lat != null;

  useEffect(() => {
    if (!hasPins || !ref.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      // Leaflet refuses to re-init a container it has already claimed.
      const el = ref.current as HTMLDivElement & { _leaflet_id?: number };
      if (el._leaflet_id) delete el._leaflet_id;

      const map = L.map(el, { zoomControl: false, scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer(tileUrlFor(theme), MAP_TILE_OPTIONS).addTo(map);

      const pin = (color: string, label: string) =>
        L.divIcon({
          className: "",
          html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)" title="${label}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

      const points: [number, number][] = [];

      const rPoint: [number, number] = [restaurant.lat!, restaurant.lng!];
      L.marker(rPoint, { icon: pin("#f59e0b", "Restaurant") }).addTo(map);
      points.push(rPoint);

      const dPoint: [number, number] = [dropoff.lat!, dropoff.lng!];
      L.marker(dPoint, { icon: pin("#10b981", "You") }).addTo(map);
      points.push(dPoint);

      // A straight line, not a road route. Drawing a fake road path would imply
      // an accuracy we do not have without a routing engine.
      L.polyline([rPoint, dPoint], {
        color: "#94a3b8",
        weight: 2,
        dashArray: "6 6",
      }).addTo(map);

      if (rider) {
        const riderPoint: [number, number] = [rider.lat, rider.lng];
        riderMarkerRef.current = L.marker(riderPoint, {
          icon: pin("#3b82f6", "Rider"),
        }).addTo(map);
        points.push(riderPoint);
      }

      map.fitBounds(L.latLngBounds(points).pad(0.25));
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      map?.remove?.();
      mapRef.current = null;
    };
    // Re-created when the rider's position changes so the marker and bounds
    // follow. Cheap: two or three markers on a small map.
  }, [hasPins, restaurant.lat, restaurant.lng, dropoff.lat, dropoff.lng, rider, theme]);

  if (!hasPins) return null;

  return (
    <div
      ref={ref}
      className="h-52 w-full overflow-hidden rounded-xl bg-[var(--surface)]"
    />
  );
}
