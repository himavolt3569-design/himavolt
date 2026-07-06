"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, Loader2, Check, TriangleAlert } from "lucide-react";
import OsmPinpointMap, { type MapCoords } from "@/components/maps/OsmPinpointMap";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface NominatimReverseResult {
  display_name?: string;
  address?: NominatimResult["address"];
}

function cityFromAddress(address: NominatimResult["address"] | undefined) {
  return address?.city || address?.town || address?.village || address?.suburb || "Kathmandu";
}

function compactAddress(displayName: string | undefined, fallback: MapCoords) {
  return (
    displayName?.split(",").slice(0, 3).join(",").trim() ||
    `${fallback.lat.toFixed(5)}, ${fallback.lon.toFixed(5)}`
  );
}

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const card = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 380, mass: 0.6 },
  },
  exit: { opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.15 } },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialCoords: MapCoords;
  initialAddress?: string;
  initialCity?: string;
  onConfirm: (result: { address: string; city: string; coords: MapCoords }) => void;
}

// Standalone map picker (screenshot 5), opened by the pin-icon button in
// CreateRestaurantModal. Search + reverse-geocode logic extracted from that
// modal's previous inline implementation, wrapping the existing
// OsmPinpointMap component unchanged.
export default function LocationPickerModal({
  open,
  onOpenChange,
  initialCoords,
  initialAddress,
  initialCity,
  onConfirm,
}: Props) {
  const [coords, setCoords] = useState<MapCoords>(initialCoords);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [city, setCity] = useState(initialCity ?? "Kathmandu");
  const [query, setQuery] = useState(initialAddress ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [reverseSearching, setReverseSearching] = useState(false);
  // Meters of uncertainty on the current GPS fix (null when not GPS-sourced),
  // so the UI can show how precise the pin actually is.
  const [accuracy, setAccuracy] = useState<number | null>(null);
  // Tracks how the pin got where it is, so the UI never presents a rough
  // IP-based guess with the same confidence as a real GPS fix or a place the
  // owner explicitly picked.
  const [locationSource, setLocationSource] = useState<"gps" | "ip" | "manual" | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<"map" | "search-preview" | "selected" | "locate">("map");
  // Live geolocation stream handles (see handleLocateMe). watchPosition gives a
  // fast first fix that then sharpens as the GPS chip locks on; we keep the id
  // and a hard-cap timer so we can stop draining the sensor once it's precise
  // enough (or the user takes over by dragging/searching).
  const watchIdRef = useRef<number | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestAccuracyRef = useRef<number>(Infinity);
  // When the picker opens with no address yet, we're about to auto-locate —
  // skip the reverse-geocode call for the throwaway Kathmandu placeholder so
  // it doesn't fire a second Nominatim request within ~1s of the real one
  // (Nominatim rate-limits bursts, which was silently swallowing the result).
  const skipReverseRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setCoords(initialCoords);
    setAddress(initialAddress ?? "");
    setCity(initialCity ?? "Kathmandu");
    setQuery(initialAddress ?? "");
    setLocateError("");
    setAccuracy(null);
    setLocationSource(initialAddress ? "manual" : null);
    skipReverseRef.current = !initialAddress;
  }, [open, initialCoords, initialAddress, initialCity]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open || query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?mode=search&q=${encodeURIComponent(query)}`);
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setShowResults(true);
      } catch {
        /* silent fail */
      }
      setSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Stop any in-flight geolocation stream + its hard-cap timer. Called both on
  // cleanup and whenever the user takes manual control, so a late GPS fix can
  // never yank the pin off a place they deliberately chose.
  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    if (watchTimerRef.current) {
      clearTimeout(watchTimerRef.current);
      watchTimerRef.current = null;
    }
  }, []);

  const handleSelectResult = (result: NominatimResult) => {
    const nextCoords = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    const shortAddr = compactAddress(result.display_name, nextCoords);
    clearWatch();
    setAccuracy(null);
    sourceRef.current = "selected";
    skipReverseRef.current = false;
    setLocationSource("manual");
    setAddress(shortAddr);
    setCity(cityFromAddress(result.address));
    setQuery(shortAddr);
    setCoords(nextCoords);
    setShowResults(false);
    setResults([]);
  };

  useEffect(() => {
    if (!open) return;
    if (skipReverseRef.current) return;
    const timer = setTimeout(async () => {
      setReverseSearching(true);
      try {
        const res = await fetch(`/api/geocode?mode=reverse&lat=${coords.lat}&lon=${coords.lon}`);
        const data: NominatimReverseResult = await res.json();
        const nextAddress = compactAddress(data.display_name, coords);
        setAddress(nextAddress);
        setCity(cityFromAddress(data.address));
        if (sourceRef.current !== "search-preview") setQuery(nextAddress);
      } catch {
        const fallback = compactAddress(undefined, coords);
        setAddress(fallback);
        if (sourceRef.current !== "search-preview") setQuery(fallback);
      } finally {
        setReverseSearching(false);
      }
    }, 650);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, open]);

  // Rough, city-level guess from the request's IP (see /api/geoip) — used
  // ONLY as a last-resort fallback when real GPS fails, and always flagged
  // via locationSource so the UI never presents it with the confidence of an
  // actual device location.
  const detectByIp = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/geoip");
      if (!res.ok) return false;
      const data: { lat?: number; lon?: number; city?: string } = await res.json();
      if (typeof data.lat !== "number" || typeof data.lon !== "number") return false;
      sourceRef.current = "locate";
      skipReverseRef.current = false;
      setLocationSource("ip");
      setCoords({ lat: data.lat, lon: data.lon });
      if (data.city) setCity(data.city);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Always asks for real GPS permission first — that's what the owner
  // expects, and it's the only source accurate enough to trust outright.
  // The IP guess only kicks in if GPS is denied/unavailable, and stays
  // clearly labeled as approximate (see locationSource in the render below).
  const applyGpsFix = useCallback((pos: GeolocationPosition) => {
    // Move the pin on the precise fix — the reverse-geocode effect below
    // fills in the address text separately, so a flaky Nominatim call
    // (blocked by an ad-blocker, rate limited, offline) can no longer
    // prevent the pin itself from updating.
    sourceRef.current = "locate";
    skipReverseRef.current = false;
    setLocationSource("gps");
    setAccuracy(pos.coords.accuracy);
    setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    setResults([]);
    setShowResults(false);
    setLocatingMe(false);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      detectByIp().then((ok) => {
        if (!ok) setLocateError("Your browser doesn't support location detection.");
      });
      return;
    }

    clearWatch();
    setLocateError("");
    setLocatingMe(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyGpsFix(pos);
        setLocatingMe(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocatingMe(false);
          setLocateError(
            "Location access was denied. Enable it in your browser's site settings, or search / drag the pin instead.",
          );
          return;
        }
        detectByIp().then((ok) => {
          setLocatingMe(false);
          if (!ok && skipReverseRef.current) {
            skipReverseRef.current = false;
            setCoords((prev) => ({ ...prev }));
          }
          if (!ok) {
            setLocateError("Couldn't determine your location. Try again, or search / drag the pin instead.");
          }
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5000 },
    );
  }, [detectByIp, applyGpsFix, clearWatch]);

  // Stop any live geolocation stream when the picker closes or unmounts, so it
  // isn't left running in the background after the owner is done.
  useEffect(() => {
    if (!open) clearWatch();
    return clearWatch;
  }, [open, clearWatch]);

  // Reduce friction for first-time setup: if the owner hasn't already
  // confirmed an address, ask for their real location the instant the
  // picker opens instead of leaving it on the Kathmandu placeholder.
  useEffect(() => {
    if (!open || initialAddress) return;
    handleLocateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = useCallback(() => {
    onConfirm({ address, city, coords });
    onOpenChange(false);
  }, [address, city, coords, onConfirm, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                variants={backdrop}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[3px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                variants={card}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed left-1/2 top-1/2 z-[60] max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-[var(--canvas)] shadow-2xl ring-1 ring-[var(--border)]/60 focus:outline-none"
              >
                <Dialog.Title className="sr-only">Choose location</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Search for a place, drag the map, or use your current location to set the exact spot.
                </Dialog.Description>
                <div className="relative">
                  <OsmPinpointMap
                    coords={coords}
                    onChange={(next) => {
                      clearWatch();
                      setAccuracy(null);
                      sourceRef.current = "map";
                      skipReverseRef.current = false;
                      setLocationSource("manual");
                      setCoords(next);
                    }}
                    onLocate={handleLocateMe}
                    locating={locatingMe}
                  />

                  <div className="absolute left-3 right-3 top-3 z-[502]" ref={searchBoxRef}>
                    <div className="relative">
                      {searching ? (
                        <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--accent)]" />
                      ) : (
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                      )}
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                          sourceRef.current = "search-preview";
                          setQuery(e.target.value);
                        }}
                        onFocus={() => results.length > 0 && setShowResults(true)}
                        placeholder="Search for a place in Nepal..."
                        className="w-full rounded-xl bg-white pl-10 pr-9 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 shadow-lg outline-none ring-1 ring-black/5 focus:ring-[var(--accent)]"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setResults([]);
                            setShowResults(false);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showResults && results.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="mt-1.5 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
                        >
                          {results.map((result) => {
                            const parts = result.display_name.split(",");
                            const primary = parts.slice(0, 2).join(",").trim();
                            const secondary = parts.slice(2, 4).join(",").trim();
                            return (
                              <button
                                key={result.place_id}
                                type="button"
                                onClick={() => handleSelectResult(result)}
                                className="flex w-full items-start gap-2.5 border-b border-black/5 px-3.5 py-2.5 text-left last:border-0 hover:bg-[var(--accent-muted)]"
                              >
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12px] font-semibold text-[var(--text-1)]">{primary}</p>
                                  {secondary && (
                                    <p className="truncate text-[10px] text-[var(--text-3)]">{secondary}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-4">
                  {locateError && (
                    <div className="mb-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
                      {locateError}
                    </div>
                  )}
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 ring-1 ring-[var(--border)]/70">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      {reverseSearching || locatingMe ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">
                        {locatingMe
                          ? "Finding your location..."
                          : reverseSearching
                            ? "Looking up address..."
                            : address || "Move the map to choose a location"}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)]">
                        {city} · {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                        {locationSource === "gps" && accuracy != null && (
                          <> · ±{Math.round(accuracy)} m</>
                        )}
                      </p>
                    </div>
                    {!reverseSearching &&
                      !locatingMe &&
                      locationSource &&
                      (locationSource === "ip" ? (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">
                          <TriangleAlert className="h-3 w-3" />
                          Approximate
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-1 text-[10px] font-bold text-[var(--accent-text)]">
                          <Check className="h-3 w-3" />
                          {locationSource === "gps" ? "Your location" : "Selected"}
                        </span>
                      ))}
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="rounded-xl px-5 py-2.5 text-[13px] font-medium text-[var(--text-2)] hover:bg-[var(--canvas-sub)] ring-1 ring-transparent hover:ring-[var(--border)] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="rounded-xl bg-[var(--accent)] px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.97] transition-all"
                    >
                      Save location
                    </button>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
