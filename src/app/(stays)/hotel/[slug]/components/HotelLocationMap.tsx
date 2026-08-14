"use client";

import { useEffect, useRef } from "react";
import { MAP_TILE_OPTIONS, MAP_TILE_URL_LIGHT } from "@/lib/map-tiles";

const CITY_COORDS: Record<string, [number, number]> = {
  Kathmandu:  [27.7172, 85.3240],
  Pokhara:    [28.2096, 83.9856],
  Chitwan:    [27.5291, 84.3542],
  Lumbini:    [27.4867, 83.2764],
  Nagarkot:   [27.7173, 85.5195],
  Bhaktapur:  [27.6710, 85.4298],
  Lalitpur:   [27.6644, 85.3188],
  Biratnagar: [26.4831, 87.2834],
};

const NEPAL_DEFAULT: [number, number] = [27.7172, 85.3240];

export function HotelLocationMap({
  name,
  city,
  latitude,
  longitude,
}: {
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (containerRef.current as any)._leaflet_id;

    const lat = latitude ?? CITY_COORDS[city]?.[0] ?? NEPAL_DEFAULT[0];
    const lng = longitude ?? CITY_COORDS[city]?.[1] ?? NEPAL_DEFAULT[1];

    import("leaflet").then((L) => {
      // Cleanup already ran — this callback is stale, bail out
      if (cancelled || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer(MAP_TILE_URL_LIGHT, MAP_TILE_OPTIONS).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            background: #eaa94d;
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 12px rgba(0,0,0,0.35);
            transform: rotate(-45deg);
          ">
            <span style="transform:rotate(45deg); display:flex;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
            </span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -40],
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: Poppins, sans-serif; padding: 4px 0; min-width: 160px;">
            <p style="font-weight: 700; font-size: 14px; color: #2c1a0e; margin: 0 0 2px;">${name}</p>
            <p style="font-size: 12px; color: #9e8576; margin: 0;">${city}, Nepal</p>
          </div>
        `, { maxWidth: 220 })
        .openPopup();
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (containerRef.current) delete (containerRef.current as any)._leaflet_id;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="w-full h-full z-0" />;
}
