"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface LocationState {
  area: string;
  coords: { lat: number; lng: number } | null;
  status: "idle" | "detecting" | "resolved" | "denied" | "manual";
}

interface LocationContextValue {
  location: LocationState;
  detect: () => void;
  setManual: (area: string) => void;
}

const STORAGE_KEY = "himavolt_location";

const defaultLocation: LocationState = {
  area: "Kathmandu",
  coords: null,
  status: "idle",
};

const LocationContext = createContext<LocationContextValue>({
  location: defaultLocation,
  detect: () => {},
  setManual: () => {},
});

export function useLocation() {
  return useContext(LocationContext);
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationState>(defaultLocation);

  /* Read from localStorage on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LocationState;
        setLocation({ ...parsed, status: "manual" });
      }
    } catch {
      /* ignore parse errors */
    }
  }, []);

  /* Persist to localStorage on change */
  const persist = useCallback((state: LocationState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded — ignore */
    }
  }, []);

  /* Reverse geocode via our server-side Nominatim proxy (see /api/geocode) —
     browsers can't set a custom User-Agent and direct client calls to
     nominatim.openstreetmap.org are often blocked by ad-blockers/ISPs. */
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const res = await fetch(`/api/geocode?mode=reverse&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        const addr = data?.address;
        return (
          addr?.suburb ||
          addr?.neighbourhood ||
          addr?.city_district ||
          addr?.city ||
          "Kathmandu"
        );
      } catch {
        return "Kathmandu";
      }
    },
    [],
  );

  /* Trigger browser geolocation */
  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, status: "denied" }));
      return;
    }

    setLocation((prev) => ({ ...prev, status: "detecting" }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const area = await reverseGeocode(lat, lng);
        const next: LocationState = {
          area,
          coords: { lat, lng },
          status: "resolved",
        };
        setLocation(next);
        persist(next);
      },
      () => {
        const next: LocationState = {
          area: "Kathmandu",
          coords: null,
          status: "denied",
        };
        setLocation(next);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [reverseGeocode, persist]);

  /* Set a manually chosen area */
  const setManual = useCallback(
    (area: string) => {
      const next: LocationState = { area, coords: null, status: "manual" };
      setLocation(next);
      persist(next);
    },
    [persist],
  );

  return (
    <LocationContext.Provider value={{ location, detect, setManual }}>
      {children}
    </LocationContext.Provider>
  );
}
