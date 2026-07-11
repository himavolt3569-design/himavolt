"use client";

import { useEffect, useRef } from "react";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  TileLayer,
} from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export interface MapCoords {
  lat: number;
  lon: number;
}

interface OsmPinpointMapProps {
  coords: MapCoords;
  onChange: (coords: MapCoords) => void;
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

// Clean, edge-to-edge map surface: just the centered pin the user drags the map
// under, plus a "use my location" button. The host (LocationPickerModal) owns
// the search bar on top and the address/confirm bar below, so this component
// deliberately carries no info cards of its own — no stacked chrome.
export default function OsmPinpointMap({
  coords,
  onChange,
  onLocate,
  locating = false,
  disabled = false,
}: OsmPinpointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const suppressNextMoveRef = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    const url = theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(url);
    }
  }, [theme]);

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

      const initialUrl = theme === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      tileLayerRef.current = L.tileLayer(initialUrl, {
        maxZoom: 20,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

  return (
    <div
      className="relative h-[26rem] w-full overflow-hidden rounded-xl bg-[#dce7d7] ring-1 ring-[var(--border)]/80 sm:h-[30rem]"
      aria-label="Interactive location picker"
    >
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] flex -translate-x-1/2 -translate-y-full flex-col items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white shadow-xl ring-4 ring-white">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="h-3 w-3 rounded-full bg-[#111827] shadow ring-2 ring-white" />
      </div>

      <button
        type="button"
        onClick={onLocate}
        disabled={disabled || locating}
        className="absolute bottom-3 right-3 z-[501] flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#111827] shadow-lg ring-1 ring-black/10 transition-all hover:bg-[var(--accent-muted)] active:scale-95 disabled:opacity-60"
        title="Use my current location"
        aria-label="Use my current location"
      >
        <LocateFixed className={`h-5 w-5 ${locating ? "animate-pulse text-[var(--accent)]" : ""}`} />
      </button>
    </div>
  );
}
