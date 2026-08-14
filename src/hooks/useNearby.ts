"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "@/context/LocationContext";
import type { OperationalStatus } from "@/lib/operational-status";

/**
 * One nearby query, shared by every rail on the marketplace.
 *
 * The landing page runs several of these at once (nearby stores, a delivery-led
 * rail, a category page). Each needs the same request shape, the same
 * out-of-order protection and the same loading semantics, so it lives here
 * instead of being re-implemented per section.
 */

export interface NearbyRestaurant {
  id: string;
  name: string;
  slug: string;
  type: string;
  address: string;
  city: string;
  imageUrl: string | null;
  coverUrl: string | null;
  rating: number;
  totalOrders: number;
  distanceKm: number;
  deliversHere: boolean;
  etaMins: number | null;
  fromDeliveryFee: number | null;
  status: OperationalStatus;
  hasDrinks: boolean;
}

export interface NearbyOptions {
  radiusKm?: number;
  kind?: "all" | "food" | "drinks";
  openNow?: boolean;
  deliveryOnly?: boolean;
  types?: string[];
  q?: string;
  limit?: number;
  /** Skip the request entirely, used to stagger rails below the fold. */
  enabled?: boolean;
}

export function useNearby(options: NearbyOptions = {}) {
  const {
    radiusKm = 5,
    kind = "all",
    openNow = false,
    deliveryOnly = false,
    types,
    q,
    limit = 12,
    enabled = true,
  } = options;

  const { coords } = useLocation();
  const [results, setResults] = useState<NearbyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter chips fire fast; without this a slow earlier response can land after
  // a fast later one and show the wrong list with no way to tell.
  const reqId = useRef(0);

  // Serialised so the effect depends on a stable primitive rather than a fresh
  // array identity on every render.
  const typesKey = types ? types.join(",") : "";

  const run = useCallback(async () => {
    if (!coords || !enabled) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lon,
          radiusKm,
          kind,
          openNow,
          deliveryOnly,
          ...(typesKey ? { types: typesKey.split(",") } : {}),
          ...(q ? { q } : {}),
          limit,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json())?.error ?? "Could not search nearby");
      }
      const data = await res.json();
      if (id !== reqId.current) return;
      setResults(data.restaurants ?? []);
      setLoading(false);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "Could not search nearby");
      setLoading(false);
    }
  }, [coords, enabled, radiusKm, kind, openNow, deliveryOnly, typesKey, q, limit]);

  useEffect(() => {
    void run();
  }, [run]);

  return { results, loading: loading && enabled, error, refetch: run };
}
