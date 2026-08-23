"use client";

import { useEffect, useState } from "react";
import { useLocation } from "@/context/LocationContext";
import type { NearbyOptions } from "./useNearby";

export interface NearbyFoodItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  restaurant: {
    name: string;
    slug: string;
  };
}

export function useNearbyFoods(options: NearbyOptions) {
  const { coords } = useLocation();
  const [items, setItems] = useState<NearbyFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!coords) {
      if (active) {
        setItems([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    const lat = coords?.lat ?? 27.7172;
    const lon = coords?.lon ?? 85.3240;

    fetch("/api/public/nearby-foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: lat,
        longitude: lon,
        radiusKm: options.radiusKm,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch trending foods.");
        return res.json();
      })
      .then((data) => {
        if (active) setItems(data.items || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [coords, options.radiusKm]);

  return { items, loading, error };
}
