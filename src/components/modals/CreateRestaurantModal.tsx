"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  LocateFixed,
  Store,
  Phone,
  MapPin,
  Building2,
  Cloud,
  Wine,
  Coffee,
  UtensilsCrossed,
  Flame,
  Cake,
  Umbrella,
  Loader2,
  Search,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  RESTAURANT_TYPE_OPTIONS,
  TYPE_FEATURES,
} from "@/lib/restaurant-types";

const TYPE_ICONS: Record<string, typeof Flame> = {
  FAST_FOOD: Flame,
  RESORT: Umbrella,
  HOTEL: Building2,
  BAKERY: Cake,
  CLOUD_KITCHEN: Cloud,
  BAR: Wine,
  CAFE: Coffee,
  RESTAURANT: UtensilsCrossed,
};

/* Accent colors for each type (warm, calming palette) */
const TYPE_ACCENTS: Record<string, { bg: string; ring: string; iconBg: string; text: string }> = {
  FAST_FOOD: { bg: "bg-orange-500", ring: "ring-orange-400", iconBg: "bg-orange-50", text: "text-orange-600" },
  RESORT: { bg: "bg-teal-500", ring: "ring-teal-400", iconBg: "bg-teal-50", text: "text-teal-600" },
  HOTEL: { bg: "bg-indigo-500", ring: "ring-indigo-400", iconBg: "bg-indigo-50", text: "text-indigo-600" },
  BAKERY: { bg: "bg-pink-500", ring: "ring-pink-400", iconBg: "bg-pink-50", text: "text-pink-600" },
  CLOUD_KITCHEN: { bg: "bg-violet-500", ring: "ring-violet-400", iconBg: "bg-violet-50", text: "text-violet-600" },
  BAR: { bg: "bg-rose-500", ring: "ring-rose-400", iconBg: "bg-rose-50", text: "text-rose-600" },
  CAFE: { bg: "bg-amber-500", ring: "ring-amber-400", iconBg: "bg-amber-50", text: "text-amber-600" },
  RESTAURANT: { bg: "bg-emerald-500", ring: "ring-emerald-400", iconBg: "bg-emerald-50", text: "text-emerald-600" },
};

/* ── Nominatim result type ──────────────────────────────────────────── */
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
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
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 380,
      mass: 0.6,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

const sheetVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    y: "100%",
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function CreateRestaurantModal({ open, onOpenChange }: Props) {
  const { createRestaurant } = useRestaurant();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode] = useState("+977");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setPhone("");
    setSelectedType(null);
    setAddress("");
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !selectedType || saving) return;
    setSaving(true);
    try {
      await createRestaurant({
        name: name.trim(),
        phone: phone.trim(),
        countryCode,
        type: selectedType,
        address: address.trim(),
      });
      reset();
      onOpenChange(false);
    } catch {
      /* toast error in future */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                key="backdrop"
                variants={backdrop}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <div>
                <motion.div
                  key="sheet"
                  variants={sheetVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="fixed bottom-0 inset-x-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl md:hidden focus:outline-none"
                >
                  <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-gray-300" />
                  <ModalBody
                    name={name}
                    setName={setName}
                    phone={phone}
                    setPhone={setPhone}
                    countryCode={countryCode}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    address={address}
                    setAddress={setAddress}
                    onReset={reset}
                    onSave={handleSave}
                    onClose={() => onOpenChange(false)}
                    saving={saving}
                  />
                </motion.div>

                <motion.div
                  key="card"
                  variants={card}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="fixed left-1/2 top-1/2 z-50 hidden max-h-[90dvh] w-full max-w-130 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/60 md:block focus:outline-none"
                >
                  <ModalBody
                    name={name}
                    setName={setName}
                    phone={phone}
                    setPhone={setPhone}
                    countryCode={countryCode}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    address={address}
                    setAddress={setAddress}
                    onReset={reset}
                    onSave={handleSave}
                    onClose={() => onOpenChange(false)}
                    saving={saving}
                  />
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/* ── Modal Body ────────────────────────────────────────────────────── */
function ModalBody({
  name,
  setName,
  phone,
  setPhone,
  countryCode,
  selectedType,
  setSelectedType,
  address,
  setAddress,
  onReset,
  onSave,
  onClose,
  saving,
}: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  countryCode: string;
  selectedType: string | null;
  setSelectedType: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isValid = name.trim() && phone.trim() && selectedType;

  /* ── Location search state (local to ModalBody) ─────────────────── */
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locatingMe, setLocatingMe] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        locationRef.current &&
        !locationRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* Debounced Nominatim search */
  useEffect(() => {
    if (locationQuery.length < 3) {
      setLocationResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5&addressdetails=1&countrycodes=np`,
          { headers: { "Accept-Language": "en" } },
        );
        const data: NominatimResult[] = await res.json();
        setLocationResults(data);
        setShowResults(true);
      } catch {
        /* silent fail */
      }
      setSearchingLocation(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  /* Select a location from search results */
  const handleSelectLocation = (result: NominatimResult) => {
    const city =
      result.address?.city ||
      result.address?.town ||
      result.address?.village ||
      "";
    const shortAddr = city
      ? `${result.display_name.split(",").slice(0, 3).join(",").trim()}`
      : result.display_name.split(",").slice(0, 3).join(",").trim();

    setAddress(shortAddr);
    setLocationQuery(shortAddr);
    setSelectedCoords({
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    });
    setShowResults(false);
    setLocationResults([]);
  };

  /* Use my location — browser Geolocation + Nominatim reverse */
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocatingMe(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const addr =
            data.display_name?.split(",").slice(0, 3).join(",").trim() ||
            `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          setAddress(addr);
          setLocationQuery(addr);
          setSelectedCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
          setLocationResults([]);
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

  /* Type features for the selected type */
  const features = selectedType ? TYPE_FEATURES[selectedType] ?? [] : [];
  const accent = selectedType
    ? TYPE_ACCENTS[selectedType] ?? TYPE_ACCENTS.RESTAURANT
    : null;

  return (
    <div>
      {/* Accent strip */}
      <div className="h-0.5 bg-linear-to-r from-amber-400 via-amber-500 to-amber-400" />

      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <Dialog.Title className="text-lg font-bold tracking-tight text-gray-900">
                New Restaurant
              </Dialog.Title>
              <Dialog.Description className="text-[13px] text-gray-400 mt-0.5">
                Set up in seconds — edit anytime later.
              </Dialog.Description>
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>

        <div className="space-y-5">
          {/* ── Name ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              Restaurant Name <span className="text-amber-500">*</span>
            </label>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter restaurant name"
                className="w-full rounded-xl bg-gray-50 pl-10 pr-3.5 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none ring-1 ring-gray-200/80 transition-all focus:bg-white focus:ring-amber-400"
              />
            </div>
          </div>

          {/* ── Phone ────────────────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              Phone Number <span className="text-amber-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-3.5 py-3 ring-1 ring-gray-200/80 shrink-0">
                <span className="text-[13px] font-bold tracking-wide text-gray-600">
                  NP
                </span>
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </div>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder={countryCode}
                  className="w-full rounded-xl bg-gray-50 pl-10 pr-3.5 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none ring-1 ring-gray-200/80 transition-all focus:bg-white focus:ring-amber-400"
                />
              </div>
            </div>
          </div>

          {/* ── Type Selection ───────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-2">
              Type <span className="text-amber-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {RESTAURANT_TYPE_OPTIONS.map(({ value, label }) => {
                const Icon =
                  TYPE_ICONS[value as keyof typeof TYPE_ICONS] ??
                  UtensilsCrossed;
                const selected = selectedType === value;
                const typeAccent = TYPE_ACCENTS[value] ?? TYPE_ACCENTS.RESTAURANT;
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedType(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center transition-all ring-1 cursor-pointer ${
                      selected
                        ? `${typeAccent.bg} text-white ${typeAccent.ring} shadow-md`
                        : "bg-white text-gray-600 ring-gray-200/80 hover:ring-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 ${
                        selected ? "text-white/90" : "text-gray-400"
                      }`}
                    />
                    <span className="text-[11px] font-medium leading-tight">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Type-Specific Features ───────────────────────────── */}
          <AnimatePresence mode="wait">
            {selectedType && features.length > 0 && accent && (
              <motion.div
                key={selectedType}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className={`rounded-xl ${accent.iconBg} p-4 ring-1 ring-gray-100/80`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className={`h-3.5 w-3.5 ${accent.text}`} />
                    <p className={`text-[12px] font-bold ${accent.text} uppercase tracking-wider`}>
                      {RESTAURANT_TYPE_OPTIONS.find((t) => t.value === selectedType)?.label} Features
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {features.map((f) => (
                      <div
                        key={f.label}
                        className="flex items-start gap-2 rounded-lg bg-white/80 p-2.5 ring-1 ring-gray-100/60"
                      >
                        <CheckCircle2
                          className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${accent.text}`}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                            {f.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Address with Nominatim Search ────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              Address
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={locationRef}>
                {searchingLocation ? (
                  <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" />
                ) : (
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                )}
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => {
                    setLocationQuery(e.target.value);
                    if (e.target.value !== address) {
                      setSelectedCoords(null);
                    }
                  }}
                  onFocus={() => {
                    if (locationResults.length > 0) setShowResults(true);
                  }}
                  placeholder="Search for a place in Nepal..."
                  className="w-full rounded-xl bg-gray-50 pl-10 pr-3.5 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none ring-1 ring-gray-200/80 transition-all focus:bg-white focus:ring-amber-400"
                />

                {/* Search results dropdown */}
                <AnimatePresence>
                  {showResults && locationResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl bg-white ring-1 ring-gray-200 shadow-xl overflow-hidden"
                    >
                      {locationResults.map((result) => {
                        const parts = result.display_name.split(",");
                        const primary = parts.slice(0, 2).join(",").trim();
                        const secondary = parts.slice(2, 4).join(",").trim();
                        return (
                          <button
                            key={result.place_id}
                            onClick={() => handleSelectLocation(result)}
                            className="flex items-start gap-2.5 w-full px-3.5 py-2.5 text-left hover:bg-amber-50/60 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-gray-800 truncate">
                                {primary}
                              </p>
                              {secondary && (
                                <p className="text-[10px] text-gray-400 truncate">
                                  {secondary}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100">
                        <p className="text-[9px] text-gray-300 text-right">
                          Powered by OpenStreetMap
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Locate me button */}
              <button
                onClick={handleLocateMe}
                disabled={locatingMe}
                className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 ring-1 ring-gray-200/80 hover:bg-amber-50 hover:text-amber-500 hover:ring-amber-300 transition-all disabled:opacity-50"
                title="Use my location"
              >
                {locatingMe ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Map preview */}
            <AnimatePresence>
              {selectedCoords && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 rounded-xl overflow-hidden ring-1 ring-gray-200/80">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedCoords.lon - 0.006},${selectedCoords.lat - 0.004},${selectedCoords.lon + 0.006},${selectedCoords.lat + 0.004}&layer=mapnik&marker=${selectedCoords.lat},${selectedCoords.lon}`}
                      className="w-full h-36 border-0"
                      loading="lazy"
                      title="Selected location"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    {address}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-7 mb-5 h-px bg-gray-100" />

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onReset}
            className="rounded-xl px-5 py-2.5 text-[13px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 ring-1 ring-transparent hover:ring-gray-100 transition-all"
          >
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={!isValid || saving}
            className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.97] ${
              isValid && !saving
                ? "bg-amber-500 hover:bg-amber-400 shadow-sm shadow-amber-500/20"
                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
            }`}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Creating..." : "Create Restaurant"}
          </button>
        </div>
      </div>
    </div>
  );
}
