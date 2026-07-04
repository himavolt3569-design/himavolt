"use client";

import { useEffect, useRef } from "react";

export type MapHotel = {
  id: string;
  name: string;
  slug: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  price: number;
  rating: number;
};

// Fallback coordinates for major Nepal cities
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

const NEPAL_CENTER: [number, number] = [28.1, 84.1];

export function HotelsMapView({ hotels }: { hotels: MapHotel[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (containerRef.current as any)._leaflet_id;

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
        center: NEPAL_CENTER,
        zoom: 7,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Custom accent-coloured marker icon
      const accentIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            background: #eaa94d;
            color: #2c1a0e;
            border: 2px solid white;
            border-radius: 50% 50% 50% 0;
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; font-weight: 900;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transform: rotate(-45deg);
          ">
            <span style="transform: rotate(45deg); display:flex;">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2c1a0e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -36],
      });

      const bounds: [number, number][] = [];

      hotels.forEach((hotel) => {
        const lat = hotel.latitude ?? CITY_COORDS[hotel.city]?.[0] ?? NEPAL_CENTER[0];
        const lng = hotel.longitude ?? CITY_COORDS[hotel.city]?.[1] ?? NEPAL_CENTER[1];

        bounds.push([lat, lng]);

        L.marker([lat, lng], { icon: accentIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: Poppins, sans-serif; min-width: 180px; padding: 4px 0;">
              <p style="font-weight: 700; font-size: 14px; margin: 0 0 2px; color: #2c1a0e;">${hotel.name}</p>
              <p style="font-size: 12px; color: #9e8576; margin: 0 0 6px;">${hotel.city}</p>
              ${hotel.price > 0 ? `<p style="font-size: 13px; font-weight: 700; color: #eaa94d; margin: 0 0 8px;">From Rs. ${hotel.price.toLocaleString()}/night</p>` : ""}
              <a href="/hotel/${hotel.slug}" style="
                display: inline-block; background: #eaa94d; color: #2c1a0e;
                padding: 5px 14px; border-radius: 20px; font-size: 12px;
                font-weight: 700; text-decoration: none;
              ">View hotel</a>
            </div>
          `, { maxWidth: 240 });
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
      }
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl z-0"
      style={{ minHeight: 520 }}
    />
  );
}
