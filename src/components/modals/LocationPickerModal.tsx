"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, X, Loader2, Check } from "lucide-react";
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
  const [reverseSearching, setReverseSearching] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<"map" | "search-preview" | "selected" | "locate">("map");

  useEffect(() => {
    if (!open) return;
    setCoords(initialCoords);
    setAddress(initialAddress ?? "");
    setCity(initialCity ?? "Kathmandu");
    setQuery(initialAddress ?? "");
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=np`,
          { headers: { "Accept-Language": "en" } },
        );
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

  const handleSelectResult = (result: NominatimResult) => {
    const nextCoords = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    const shortAddr = compactAddress(result.display_name, nextCoords);
    sourceRef.current = "selected";
    setAddress(shortAddr);
    setCity(cityFromAddress(result.address));
    setQuery(shortAddr);
    setCoords(nextCoords);
    setShowResults(false);
    setResults([]);
  };

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setReverseSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}&addressdetails=1`,
          { headers: { "Accept-Language": "en" } },
        );
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

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } },
          );
          const data: NominatimReverseResult = await res.json();
          const nextCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          const addr = compactAddress(data.display_name, nextCoords);
          sourceRef.current = "locate";
          setAddress(addr);
          setCity(cityFromAddress(data.address));
          setQuery(addr);
          setCoords(nextCoords);
          setResults([]);
          setShowResults(false);
        } catch {
          /* silent fail */
        }
        setLocatingMe(false);
      },
      () => setLocatingMe(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

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
                className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-[var(--canvas)] shadow-2xl ring-1 ring-[var(--border)]/60 focus:outline-none"
              >
                <Dialog.Title className="sr-only">Choose location</Dialog.Title>
                <Dialog.Description className="sr-only">
                  Search for a place, drag the map, or use your current location to set the exact spot.
                </Dialog.Description>
                <div className="relative">
                  <OsmPinpointMap
                    coords={coords}
                    onChange={(next) => {
                      sourceRef.current = "map";
                      setCoords(next);
                    }}
                    label={address}
                    city={city}
                    loadingLabel={reverseSearching || locatingMe}
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
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 ring-1 ring-[var(--border)]/70">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--text-1)]">
                        {address || "Move the map to choose a location"}
                      </p>
                      <p className="text-[10px] text-[var(--text-3)]">
                        {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-1 text-[10px] font-bold text-[var(--accent-text)]">
                      <Check className="h-3 w-3" />
                      Selected
                    </span>
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
