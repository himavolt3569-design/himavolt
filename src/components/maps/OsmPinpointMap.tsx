"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { MapPinned } from "lucide-react";

export interface MapCoords {
  lat: number;
  lon: number;
}

interface OsmPinpointMapProps {
  coords: MapCoords;
  onChange: (coords: MapCoords) => void;
  disabled?: boolean;
}

const TILE_SIZE = 256;
const ZOOM = 16;
const MAX_LAT = 85.05112878;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function latLonToWorld({ lat, lon }: MapCoords, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const safeLat = clamp(lat, -MAX_LAT, MAX_LAT);
  const sinLat = Math.sin((safeLat * Math.PI) / 180);

  return {
    x: ((lon + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) *
      scale,
  };
}

function worldToLatLon(x: number, y: number, zoom: number): MapCoords {
  const scale = TILE_SIZE * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));

  return {
    lat: clamp(lat, -MAX_LAT, MAX_LAT),
    lon: clamp(lon, -180, 180),
  };
}

export default function OsmPinpointMap({
  coords,
  onChange,
  disabled = false,
}: OsmPinpointMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const centerWorld = useMemo(() => latLonToWorld(coords, ZOOM), [coords]);

  const tiles = useMemo(() => {
    if (size.width === 0 || size.height === 0) return [];

    const minX = Math.floor((centerWorld.x - size.width / 2) / TILE_SIZE);
    const maxX = Math.floor((centerWorld.x + size.width / 2) / TILE_SIZE);
    const minY = Math.floor((centerWorld.y - size.height / 2) / TILE_SIZE);
    const maxY = Math.floor((centerWorld.y + size.height / 2) / TILE_SIZE);
    const tileCount = 2 ** ZOOM;
    const nextTiles: Array<{
      key: string;
      x: number;
      y: number;
      left: number;
      top: number;
    }> = [];

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        if (y < 0 || y >= tileCount) continue;
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        nextTiles.push({
          key: `${wrappedX}-${y}`,
          x: wrappedX,
          y,
          left: x * TILE_SIZE - (centerWorld.x - size.width / 2),
          top: y * TILE_SIZE - (centerWorld.y - size.height / 2),
        });
      }
    }

    return nextTiles;
  }, [centerWorld, size]);

  const coordsFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const element = containerRef.current;
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    return worldToLatLon(centerWorld.x + offsetX, centerWorld.y + offsetY, ZOOM);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    const nextCoords = coordsFromPointer(event);
    if (!nextCoords) return;

    onChange(nextCoords);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    const nextCoords = coordsFromPointer(event);
    if (nextCoords) onChange(nextCoords);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-44 w-full overflow-hidden rounded-xl bg-[#dce7d7] ring-1 ring-[var(--border)]/80"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="application"
      aria-label="Restaurant location map"
    >
      {tiles.map((tile) => (
        <img
          key={tile.key}
          alt=""
          src={`https://tile.openstreetmap.org/${ZOOM}/${tile.x}/${tile.y}.png`}
          draggable={false}
          className="absolute h-64 w-64 select-none"
          style={{ left: tile.left, top: tile.top }}
        />
      ))}

      <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg ring-2 ring-white">
          <MapPinned className="h-5 w-5" />
        </div>
        <div className="h-2 w-2 rounded-full bg-[var(--accent)] shadow ring-2 ring-white" />
      </div>

      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-1 right-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-[#2f5f8f] shadow-sm"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
