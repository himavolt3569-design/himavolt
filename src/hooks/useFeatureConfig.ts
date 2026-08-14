"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRestaurant } from "@/context/RestaurantContext";
import { apiFetch } from "@/lib/api-client";

/**
 * Durable per-feature state for dashboard feature tabs.
 *
 * A tab calls `useFeatureConfig("brunch-mode", DEFAULTS)` and treats
 * `config` / `setConfig` like a persisted `useState`: edits apply instantly
 * (optimistic) and are saved to the server debounced. On mount it hydrates the
 * saved blob for the selected restaurant. This gives every feature tab real
 * persistence with a one-line change and no bespoke API/schema per feature.
 *
 * Instant by design: `config` starts at `defaults` (no loading gate), then
 * quietly reconciles once the saved blob arrives. A user edit before hydration
 * wins (we never clobber a dirty local state with server data).
 */
export function useFeatureConfig<T extends object>(
  featureId: string,
  defaults: T,
  restaurantId?: string,
): {
  config: T;
  setConfig: (updater: T | ((prev: T) => T)) => void;
  /** True once the saved blob (or its absence) has been loaded from the server. */
  loaded: boolean;
} {
  const { selectedRestaurant } = useRestaurant();
  const rid = restaurantId ?? selectedRestaurant?.id;

  const [config, setConfigState] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);

  const defaultsRef = useRef(defaults);
  // Kept in step at commit time; only ever read from the async hydrate
  // callback below, which resolves well after the commit that set it.
  useEffect(() => {
    defaultsRef.current = defaults;
  });
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate whenever the target restaurant changes.
  useEffect(() => {
    if (!rid) return;
    let cancelled = false;
    dirtyRef.current = false;
    setLoaded(false);
    apiFetch<{ data: Partial<T> | null }>(
      `/api/restaurants/${rid}/feature-config/${featureId}`,
      { cacheTtl: 0 },
    )
      .then((res) => {
        // Don't overwrite edits the user already made while we were loading.
        if (cancelled || dirtyRef.current) return;
        setConfigState(
          res.data ? { ...defaultsRef.current, ...res.data } : defaultsRef.current,
        );
      })
      .catch(() => {
        if (!cancelled && !dirtyRef.current) setConfigState(defaultsRef.current);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [rid, featureId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = useCallback(
    (next: T) => {
      if (!rid) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        apiFetch(`/api/restaurants/${rid}/feature-config/${featureId}`, {
          method: "PUT",
          body: next,
        }).catch(() => {
          /* offline / not-yet-migrated — keep the optimistic local state */
        });
      }, 600);
    },
    [rid, featureId],
  );

  const setConfig = useCallback(
    (updater: T | ((prev: T) => T)) => {
      dirtyRef.current = true;
      setConfigState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T) => T)(prev)
            : updater;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { config, setConfig, loaded };
}
