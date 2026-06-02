"use client";

import { useEffect, useRef } from "react";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";

export interface MapCoords {
  lat: number;
  lon: number;
}

interface OsmPinpointMapProps {
  coords: MapCoords;
  onChange: (coords: MapCoords) => void;
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
  disabled = false,
}: OsmPinpointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    disabledRef.current = disabled;

    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    if (disabled) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      marker.dragging?.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      marker.dragging?.enable();
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

      const marker = L.marker([coords.lat, coords.lon], {
        draggable: !disabledRef.current,
        icon: L.divIcon({
          className: "",
          iconSize: [38, 46],
          iconAnchor: [19, 46],
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 8px 12px rgba(15,18,25,.28));">
              <div style="height:36px;width:36px;border-radius:9999px;background:#eaa94d;border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div style="height:8px;width:8px;margin-top:-1px;border-radius:9999px;background:#eaa94d;border:2px solid #fff;"></div>
            </div>
          `,
        }),
      }).addTo(map);

      map.on("click", (event: LeafletMouseEvent) => {
        if (disabledRef.current) return;
        const next = toCoords(event);
        marker.setLatLng([next.lat, next.lon]);
        map.panTo([next.lat, next.lon], { animate: true });
        onChangeRef.current(next);
      });

      marker.on("dragend", () => {
        if (disabledRef.current) return;
        const nextLatLng = marker.getLatLng();
        const next = { lat: nextLatLng.lat, lon: nextLatLng.lng };
        map.panTo([next.lat, next.lon], { animate: true });
        onChangeRef.current(next);
      });

      mapRef.current = map;
      markerRef.current = marker;

      window.setTimeout(() => map.invalidateSize(), 80);
    }

    mountMap();

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const current = marker.getLatLng();
    if (
      Math.abs(current.lat - coords.lat) < 0.000001 &&
      Math.abs(current.lng - coords.lon) < 0.000001
    ) {
      return;
    }

    marker.setLatLng([coords.lat, coords.lon]);
    map.setView([coords.lat, coords.lon], Math.max(map.getZoom(), 16), {
      animate: true,
    });
  }, [coords]);

  return (
    <div
      className="relative h-52 w-full overflow-hidden rounded-xl bg-[#dce7d7] ring-1 ring-[var(--border)]/80"
      aria-label="Interactive OpenStreetMap location picker"
    >
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-2)] shadow-sm ring-1 ring-black/5">
        Click or drag the marker
      </div>
    </div>
  );
}
