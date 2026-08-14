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

const LocationContext = createContext<LocationState | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null);
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
          setCoords(parsed.coords);
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
        setCoords({ lat: d.lat, lon: d.lon });
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
