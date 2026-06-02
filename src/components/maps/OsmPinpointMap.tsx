"use client";

import { useEffect, useRef } from "react";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
} from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";

export interface MapCoords {
  lat: number;
  lon: number;
}

interface OsmPinpointMapProps {
  coords: MapCoords;
  onChange: (coords: MapCoords) => void;
  label?: string;
  city?: string;
  loadingLabel?: boolean;
  onLocate?: () => void;
  locating?: boolean;
  disabled?: boolean;
}

function toCoords(event: LeafletMouseEvent): MapCoords {
  return {
    lat: event.latlng.lat,
    lon: event.latlng.lng,
  };
}

export default function OsmPinpointMap({
  coords,
  onChange,
  label,
  city,
  loadingLabel = false,
  onLocate,
  locating = false,
  disabled = false,
}: OsmPinpointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const suppressNextMoveRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;

    const map = mapRef.current;
    if (!map) return;

    if (disabled) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
    }
  }, [disabled]);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      const element = containerRef.current;
      if (!element || mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(element, {
        center: [coords.lat, coords.lon],
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.on("click", (event: LeafletMouseEvent) => {
        if (disabledRef.current) return;
        const next = toCoords(event);
        map.panTo([next.lat, next.lon], { animate: true });
        onChangeRef.current(next);
      });

      map.on("moveend", () => {
        if (suppressNextMoveRef.current) {
          suppressNextMoveRef.current = false;
          return;
        }
        if (disabledRef.current) return;
        const center = map.getCenter();
        onChangeRef.current({ lat: center.lat, lon: center.lng });
      });

      mapRef.current = map;

      window.setTimeout(() => map.invalidateSize(), 80);
    }

    mountMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const current = map.getCenter();
    if (
      Math.abs(current.lat - coords.lat) < 0.000001 &&
      Math.abs(current.lng - coords.lon) < 0.000001
    ) {
      return;
    }

    suppressNextMoveRef.current = true;
    map.setView([coords.lat, coords.lon], Math.max(map.getZoom(), 16), {
      animate: true,
    });
  }, [coords]);

  const title = label?.split(",")[0]?.trim() || "Choose exact location";
  const subtitle =
    label && label !== title ? label : "Move the map until the pin is exact";

  return (
    <div
      className="relative h-72 w-full overflow-hidden rounded-xl bg-[#dce7d7] ring-1 ring-[var(--border)]/80"
      aria-label="Interactive OpenStreetMap location picker"
    >
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] flex -translate-x-1/2 -translate-y-full flex-col items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white shadow-xl ring-4 ring-white">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="h-3 w-3 rounded-full bg-[#111827] shadow ring-2 ring-white" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-20 bg-linear-to-b from-black/35 to-transparent" />

      <div className="absolute left-3 right-3 top-3 z-[501] rounded-xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[13px] font-bold text-[var(--text-1)]">
                {loadingLabel ? "Finding location..." : title}
              </p>
              {city && (
                <span className="shrink-0 rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-text)]">
                  {city}
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--text-3)]">
              {loadingLabel ? "Reading the OpenStreetMap address" : subtitle}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onLocate}
        disabled={disabled || locating}
        className="absolute bottom-20 right-3 z-[501] flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111827] shadow-lg ring-1 ring-black/10 transition-all hover:bg-[var(--accent-muted)] disabled:opacity-60"
        title="Use my current location"
      >
        <LocateFixed className={`h-5 w-5 ${locating ? "animate-pulse" : ""}`} />
      </button>

      <div className="absolute inset-x-3 bottom-3 z-[501] rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-3)]">
              Selected point
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-[var(--text-1)]">
              {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#111827] px-3 py-1.5 text-[11px] font-bold text-white">
            Move map
          </span>
        </div>
      </div>
    </div>
  );
}
