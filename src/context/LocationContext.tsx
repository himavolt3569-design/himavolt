"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Where the customer is, shared across the whole marketplace surface.
 *
 * Lives in context rather than in each section because the header's location
 * picker, the hero, the category rails and the nearby list must all agree, four
 * components each running their own geolocation lookup would mean four different
 * answers, four permission prompts, and four sets of results that disagree.
 *
 * Resolution is deliberately staged:
 *   1. a remembered choice from a previous visit (instant, no network)
 *   2. an IP guess (fast, no permission prompt, roughly city-accurate)
 *   3. precise GPS, only when the customer asks for it
 *
 * A blank screen behind a permission dialog is a bounce, so nothing waits on
 * step 3.
 */

export interface Coords {
  lat: number;
  lon: number;
}

export type LocationSource = "saved" | "ip" | "gps" | "manual";

interface LocationState {
  coords: Coords | null;
  label: string;
  source: LocationSource | null;
  /** True while the first guess is still resolving. */
  resolving: boolean;
  /** True while a precise GPS fix is being requested. */
  locating: boolean;
  isPrecise: boolean;
  requestPrecise: () => void;
  setManual: (coords: Coords, label: string) => void;
}

const STORAGE_KEY = "himavolt:location";

/**
 * Kathmandu — the same place the default `label` already claims, so the first
 * render is internally consistent.
 *
 * Seeding this matters more than it looks. Every rail on the marketplace fetches
 * through `useNearby`, which does nothing until `coords` is non-null. Starting
 * at null meant the whole browse experience waited on `/api/geoip` before it
 * could even begin: measured at 1906ms for the IP lookup, so the nearby query
 * did not start until 2215ms and results landed at ~3.2s, with skeletons on
 * screen the entire time. With a seed the query fires on the first render, in
 * parallel with the IP lookup rather than behind it.
 */
const DEFAULT_COORDS: Coords = { lat: 27.7172, lon: 85.324 };

/**
 * ~5km. Below this the IP guess is not a meaningful correction to the seed, and
 * re-running every rail for it would cost more than the accuracy is worth.
 */
const MEANINGFUL_MOVE_DEG = 0.05;

/**
 * Synchronous so it can seed state on the very first render — a returning
 * visitor never waits, and never watches their saved city get re-derived.
 */
function readSavedCoords(): Coords | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { coords?: Coords };
    return parsed?.coords?.lat != null ? parsed.coords : null;
  } catch {
    return null;
  }
}

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  // Seeded, never null — see DEFAULT_COORDS. Only `coords` is seeded from
  // storage: `label`, `source` and `resolving` are all rendered, so seeding
  // them from localStorage would make the client's first paint disagree with
  // the server's and trip a hydration mismatch. They stay resolved in the
  // effect below, exactly as before.
  const [coords, setCoords] = useState<Coords | null>(
    () => readSavedCoords() ?? DEFAULT_COORDS,
  );
  const [label, setLabel] = useState("Kathmandu, Nepal");
  const [source, setSource] = useState<LocationSource | null>(null);
  const [resolving, setResolving] = useState(true);
  const [locating, setLocating] = useState(false);

  // Stage 1 + 2. A remembered choice wins, someone who set their address last
  // week should not be silently moved by an IP lookup this week.
  useEffect(() => {
    let cancelled = false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          coords: Coords;
          label: string;
        };
        if (parsed?.coords?.lat != null) {
          // `coords` was already seeded from this same entry synchronously, so
          // only the rendered fields are resolved here.
          setLabel(parsed.label || "Your location");
          setSource("saved");
          setResolving(false);
          return;
        }
      }
    } catch {
      /* corrupt entry, fall through to the IP guess */
    }

    fetch("/api/geoip")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.lat) return;
        // The rails are already loading against the seed. Only move them if the
        // IP guess is a genuinely different place — otherwise every rail
        // re-fetches to shift the origin by a few hundred metres.
        const moved =
          Math.abs(d.lat - DEFAULT_COORDS.lat) > MEANINGFUL_MOVE_DEG ||
          Math.abs(d.lon - DEFAULT_COORDS.lon) > MEANINGFUL_MOVE_DEG;
        if (moved) setCoords({ lat: d.lat, lon: d.lon });
        if (d.city) setLabel(`${d.city}, Nepal`);
        setSource("ip");
      })
      .catch(() => {
        /* keep the default label; the UI still offers a manual picker */
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((c: Coords, l: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ coords: c, label: l }));
    } catch {
      /* private mode, not worth surfacing */
    }
  }, []);

  const requestPrecise = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(c);
        setLabel("Your exact location");
        setSource("gps");
        persist(c, "Your exact location");
        setLocating(false);
      },
      () => {
        // Denied or timed out. The earlier guess still stands, so this fails
        // quietly rather than throwing an error at someone who just wanted food.
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [persist]);

  const setManual = useCallback(
    (c: Coords, l: string) => {
      setCoords(c);
      setLabel(l);
      setSource("manual");
      persist(c, l);
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      coords,
      label,
      source,
      resolving,
      locating,
      isPrecise: source === "gps" || source === "manual",
      requestPrecise,
      setManual,
    }),
    [coords, label, source, resolving, locating, requestPrecise, setManual],
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used inside <LocationProvider>");
  }
  return ctx;
}
