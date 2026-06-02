"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  X,
  ChevronDown,
  Store,
  Phone,
  MapPin,
  Building2,
  Coffee,
  UtensilsCrossed,
  Flame,
  Loader2,
  Search,
  Sparkles,
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  Sandwich,
  Hotel,
  ChefHat,
  Beer,
  Soup,
  Candy,
  Croissant,
  Sun,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import OsmPinpointMap, { type MapCoords } from "@/components/maps/OsmPinpointMap";
import {
  RESTAURANT_TYPE_OPTIONS,
  TYPE_FEATURES,
} from "@/lib/restaurant-types";
import { extractNepalMobile, isValidNepalMobile, normalizeNepalPhone } from "@/lib/phone";

const TYPE_ICONS: Record<string, typeof Flame> = {
  FAST_FOOD: Sandwich,
  RESORT: Sun,
  HOTEL: Hotel,
  BAKERY: Croissant,
  CLOUD_KITCHEN: ChefHat,
  BAR: Beer,
  CAFE: Coffee,
  RESTAURANT: UtensilsCrossed,
  MO_MO_SHOP: Soup,
  TANDOORI: Flame,
  GUEST_HOUSE: Building2,
  SWEETS: Candy,
};

/* Accent colors for each type (warm, calming palette) */
const TYPE_ACCENTS: Record<string, { bg: string; ring: string; iconBg: string; text: string }> = {
  FAST_FOOD: { bg: "bg-[var(--accent)]", ring: "ring-orange-400", iconBg: "bg-[var(--accent)]", text: "text-[var(--accent)]" },
  RESORT: { bg: "bg-teal-500", ring: "ring-teal-400", iconBg: "bg-teal-50", text: "text-teal-600" },
  HOTEL: { bg: "bg-indigo-500", ring: "ring-indigo-400", iconBg: "bg-indigo-50", text: "text-indigo-600" },
  BAKERY: { bg: "bg-pink-500", ring: "ring-pink-400", iconBg: "bg-pink-50", text: "text-pink-600" },
  CLOUD_KITCHEN: { bg: "bg-violet-500", ring: "ring-violet-400", iconBg: "bg-violet-50", text: "text-violet-600" },
  BAR: { bg: "bg-rose-500", ring: "ring-rose-400", iconBg: "bg-rose-50", text: "text-rose-600" },
  CAFE: { bg: "bg-[var(--accent)]", ring: "ring-[var(--accent)]", iconBg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]" },
  RESTAURANT: { bg: "bg-[var(--accent)]", ring: "ring-[var(--accent)]", iconBg: "bg-[var(--accent-muted)]", text: "text-[var(--accent-text)]" },
};

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

interface NominatimReverseResult {
  display_name?: string;
  address?: NominatimResult["address"];
}

const DEFAULT_MAP_COORDS: MapCoords = { lat: 27.7172, lon: 85.324 };

function cityFromAddress(address: NominatimResult["address"] | undefined) {
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.suburb ||
    "Kathmandu"
  );
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
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<MapCoords | null>(null);
  const [phoneOwnershipConfirmed, setPhoneOwnershipConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setPhone("");
    setSelectedType(null);
    setAddress("");
    setCity("");
    setCoords(null);
    setPhoneOwnershipConfirmed(false);
    setSubmitError("");
  }, []);

  const handleSave = async () => {
    const normalizedPhone = normalizeNepalPhone(phone);

    if (saving) return;
    if (name.trim().length < 2) {
      setSubmitError("Restaurant name must be at least 2 characters.");
      return;
    }
    if (!isValidNepalMobile(normalizedPhone)) {
      setSubmitError("Enter a real Nepal mobile number starting with 96, 97, or 98.");
      return;
    }
    if (!selectedType) {
      setSubmitError("Choose a restaurant type.");
      return;
    }
    if (!address.trim() || !city.trim() || !coords) {
      setSubmitError("Select an exact map location before creating the restaurant.");
      return;
    }
    if (!phoneOwnershipConfirmed) {
      setSubmitError("Confirm this is your own active phone number.");
      return;
    }

    setSaving(true);
    setSubmitError("");
    try {
      await createRestaurant({
        name: name.trim(),
        phone: normalizedPhone,
        countryCode,
        type: selectedType,
        address: address.trim(),
        city: city.trim(),
        latitude: coords.lat,
        longitude: coords.lon,
        phoneOwnershipConfirmed: true,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not create restaurant. Check the form and try again.",
      );
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
                  className="fixed bottom-0 inset-x-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl bg-[var(--canvas)] shadow-2xl md:hidden focus:outline-none"
                >
                  <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-[var(--border)]" />
                  <ModalBody
                    name={name}
                    setName={setName}
                    phone={phone}
                    setPhone={setPhone}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    address={address}
                    setAddress={setAddress}
                    city={city}
                    setCity={setCity}
                    coords={coords}
                    setCoords={setCoords}
                    phoneOwnershipConfirmed={phoneOwnershipConfirmed}
                    setPhoneOwnershipConfirmed={setPhoneOwnershipConfirmed}
                    submitError={submitError}
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
                  className="fixed left-1/2 top-1/2 z-50 hidden max-h-[90dvh] w-full max-w-130 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-[var(--canvas)] shadow-2xl ring-1 ring-[var(--border)]/60 md:block focus:outline-none"
                >
                  <ModalBody
                    name={name}
                    setName={setName}
                    phone={phone}
                    setPhone={setPhone}
                    selectedType={selectedType}
                    setSelectedType={setSelectedType}
                    address={address}
                    setAddress={setAddress}
                    city={city}
                    setCity={setCity}
                    coords={coords}
                    setCoords={setCoords}
                    phoneOwnershipConfirmed={phoneOwnershipConfirmed}
                    setPhoneOwnershipConfirmed={setPhoneOwnershipConfirmed}
                    submitError={submitError}
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

function ModalBody({
  name,
  setName,
  phone,
  setPhone,
  selectedType,
  setSelectedType,
  address,
  setAddress,
  city,
  setCity,
  coords,
  setCoords,
  phoneOwnershipConfirmed,
  setPhoneOwnershipConfirmed,
  submitError,
  onReset,
  onSave,
  onClose,
  saving,
}: {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  selectedType: string | null;
  setSelectedType: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  coords: MapCoords | null;
  setCoords: (v: MapCoords | null) => void;
  phoneOwnershipConfirmed: boolean;
  setPhoneOwnershipConfirmed: (v: boolean) => void;
  submitError: string;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const normalizedPhone = normalizeNepalPhone(phone);
  const phoneValid = isValidNepalMobile(normalizedPhone);
  const isValid = Boolean(
    name.trim().length >= 2 &&
    phoneValid &&
    selectedType &&
    address.trim().length >= 4 &&
    city.trim().length >= 2 &&
    coords &&
    phoneOwnershipConfirmed,
  );

  /* ── Location search state (local to ModalBody) ─────────────────── */
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<NominatimResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [reverseSearching, setReverseSearching] = useState(false);
  const [phoneScanning, setPhoneScanning] = useState(false);
  const [phoneScanMessage, setPhoneScanMessage] = useState("");
  const locationRef = useRef<HTMLDivElement>(null);
  const phoneScanInputRef = useRef<HTMLInputElement>(null);
  const locationSourceRef = useRef<"map" | "search-preview" | "selected" | "locate">("map");

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
        const first = data[0];
        if (first) {
          const nextCoords = {
            lat: parseFloat(first.lat),
            lon: parseFloat(first.lon),
          };

          locationSourceRef.current = "search-preview";
          setAddress(compactAddress(first.display_name, nextCoords));
          setCity(cityFromAddress(first.address));
          setCoords(nextCoords);
        }
      } catch {
        /* silent fail */
      }
      setSearchingLocation(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [locationQuery, setAddress, setCity, setCoords]);

  /* Select a location from search results */
  const handleSelectLocation = (result: NominatimResult) => {
    const nextCoords = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
    const shortAddr = compactAddress(result.display_name, nextCoords);

    locationSourceRef.current = "selected";
    setAddress(shortAddr);
    setCity(cityFromAddress(result.address));
    setLocationQuery(shortAddr);
    setCoords(nextCoords);
    setShowResults(false);
    setLocationResults([]);
  };

  useEffect(() => {
    if (!coords) return;

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
        if (locationSourceRef.current !== "search-preview") {
          setLocationQuery(nextAddress);
        }
      } catch {
        const fallback = compactAddress(undefined, coords);
        setAddress(fallback);
        setCity("Kathmandu");
        if (locationSourceRef.current !== "search-preview") {
          setLocationQuery(fallback);
        }
      } finally {
        setReverseSearching(false);
      }
    }, 650);

    return () => clearTimeout(timer);
  }, [coords, setAddress, setCity]);

  /* Use my location — browser Geolocation + Nominatim reverse */
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
          const nextCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          };
          const addr = compactAddress(data.display_name, nextCoords);
          locationSourceRef.current = "locate";
          setAddress(addr);
          setCity(cityFromAddress(data.address));
          setLocationQuery(addr);
          setCoords(nextCoords);
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

  const handlePhoneScan = async (file: File | null) => {
    if (!file || phoneScanning) return;

    setPhoneScanning(true);
    setPhoneScanMessage("");
    try {
      const { recognize } = await import("tesseract.js");
      const result = await recognize(file, "eng");
      const scannedPhone = extractNepalMobile(result.data.text);

      if (!scannedPhone) {
        setPhoneScanMessage("No Nepal mobile number found in the image.");
        return;
      }

      setPhone(scannedPhone);
      setPhoneScanMessage("Phone number scanned.");
    } catch {
      setPhoneScanMessage("Phone scan failed. Enter the number manually.");
    } finally {
      setPhoneScanning(false);
      if (phoneScanInputRef.current) phoneScanInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    setLocationQuery("");
    setLocationResults([]);
    setShowResults(false);
    setPhoneScanMessage("");
    onReset();
  };

  /* Type features for the selected type */
  const features = selectedType ? TYPE_FEATURES[selectedType] ?? [] : [];
  const accent = selectedType
    ? TYPE_ACCENTS[selectedType] ?? TYPE_ACCENTS.RESTAURANT
    : null;

  return (
    <div>
      <div className="h-0.5 bg-linear-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--accent-hover)]" />

      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between mb-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <Dialog.Title className="text-lg font-bold tracking-tight text-[var(--text-1)]">
                New Restaurant
              </Dialog.Title>
              <Dialog.Description className="text-[13px] text-[var(--text-3)] mt-0.5">
                Set up in seconds — edit anytime later.
              </Dialog.Description>
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-3)] hover:bg-[var(--surface)] hover:text-[var(--text-2)] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>

        <div className="space-y-5">
          {/* ── Name ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">
              Restaurant Name <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter restaurant name"
                className="w-full rounded-xl bg-[var(--canvas-sub)] pl-10 pr-3.5 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 outline-none ring-1 ring-[var(--border)]/80 transition-all focus:bg-[var(--canvas)] focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          {/* ── Phone ────────────────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">
              Phone Number <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 ring-1 ring-[var(--border)]/80 shrink-0">
                <span className="text-[13px] font-bold tracking-wide text-[var(--text-2)]">
                  NP
                </span>
                <ChevronDown className="h-3 w-3 text-[var(--text-3)]" />
              </div>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setPhoneScanMessage("");
                  }}
                  required
                  maxLength={10}
                  minLength={10}
                  pattern="\d{10}"
                  inputMode="numeric"
                  title="Enter exactly 10 digits"
                  placeholder="98XXXXXXXX"
                  className={`w-full rounded-xl bg-[var(--canvas-sub)] pl-10 pr-12 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 outline-none ring-1 transition-all focus:bg-[var(--canvas)] ${
                    phone.length > 0 && !phoneValid
                      ? "ring-red-300 focus:ring-red-400"
                      : "ring-[var(--border)]/80 focus:ring-[var(--accent)]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => phoneScanInputRef.current?.click()}
                  disabled={phoneScanning}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-3)] transition-all hover:bg-[var(--accent-muted)] hover:text-[var(--accent)] disabled:opacity-50"
                  title="Scan phone number from image"
                >
                  {phoneScanning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={phoneScanInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhoneScan(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            {(phoneScanMessage || (phone.length > 0 && !phoneValid)) && (
              <p
                className={`mt-1.5 flex items-center gap-1 text-[11px] ${
                  phoneValid ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {phoneValid ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {phoneScanMessage ||
                  "Use a 10 digit Nepal mobile starting with 96, 97, or 98."}
              </p>
            )}
            <label className="mt-2.5 flex items-start gap-2 rounded-xl bg-[var(--canvas-sub)] px-3 py-2.5 ring-1 ring-[var(--border)]/70">
              <input
                type="checkbox"
                checked={phoneOwnershipConfirmed}
                onChange={(e) => setPhoneOwnershipConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-[11px] font-medium leading-snug text-[var(--text-2)]">
                This is my own active phone number.
              </span>
            </label>
          </div>

          {/* ── Type Selection ───────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-2">
              Type <span className="text-[var(--accent)]">*</span>
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
                        : "bg-[var(--canvas)] text-[var(--text-2)] ring-[var(--border)]/80 hover:ring-[var(--border)] hover:bg-[var(--canvas-sub)]"
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 ${
                        selected ? "text-white/90" : "text-[var(--text-3)]"
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
                <div className={`rounded-xl ${accent.iconBg} p-4 ring-1 ring-[var(--border)]/80`}>
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
                        className="flex items-start gap-2 rounded-lg bg-[var(--canvas)]/80 p-2.5 ring-1 ring-[var(--border)]/60"
                      >
                        <CheckCircle2
                          className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${accent.text}`}
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--text-1)] leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-3)] leading-tight mt-0.5">
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
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">
              Address <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="relative" ref={locationRef}>
                {searchingLocation || reverseSearching ? (
                  <Loader2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--accent)] animate-spin" />
                ) : (
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                )}
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => {
                    locationSourceRef.current = "search-preview";
                    setLocationQuery(e.target.value);
                  }}
                  onFocus={() => {
                    if (locationResults.length > 0) setShowResults(true);
                  }}
                  placeholder="Search for a place in Nepal..."
                  className="w-full rounded-xl bg-[var(--canvas-sub)] pl-10 pr-3.5 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 outline-none ring-1 ring-[var(--border)]/80 transition-all focus:bg-[var(--canvas)] focus:ring-[var(--accent)]"
                />

                <AnimatePresence>
                  {showResults && locationResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 top-full mt-1.5 z-[1000] rounded-xl bg-[var(--canvas)] ring-1 ring-[var(--border)] shadow-xl overflow-hidden"
                    >
                      {locationResults.map((result) => {
                        const parts = result.display_name.split(",");
                        const primary = parts.slice(0, 2).join(",").trim();
                        const secondary = parts.slice(2, 4).join(",").trim();
                        return (
                          <button
                            key={result.place_id}
                            onClick={() => handleSelectLocation(result)}
                            className="flex items-start gap-2.5 w-full px-3.5 py-2.5 text-left hover:bg-[var(--accent-muted)] transition-colors border-b border-[var(--border-soft)] last:border-0"
                          >
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--accent)]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-[var(--text-1)] truncate">
                                {primary}
                              </p>
                              {secondary && (
                                <p className="text-[10px] text-[var(--text-3)] truncate">
                                  {secondary}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      <div className="px-3 py-1.5 bg-[var(--canvas-sub)] border-t border-[var(--border-soft)]">
                        <p className="text-[9px] text-[var(--text-3)] text-right">
                          Powered by OpenStreetMap
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            <div className="mt-2.5">
              <OsmPinpointMap
                coords={coords ?? DEFAULT_MAP_COORDS}
                onChange={(nextCoords) => {
                  locationSourceRef.current = "map";
                  setCoords(nextCoords);
                }}
                label={address}
                city={city}
                loadingLabel={reverseSearching || locatingMe}
                onLocate={handleLocateMe}
                locating={locatingMe}
                disabled={saving}
              />
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3 text-[10px] text-[var(--text-3)]">
              <p className="flex min-w-0 items-center gap-1">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">
                  {address || "Move the map or search to choose the restaurant point"}
                </span>
              </p>
              {coords && (
                <span className="shrink-0 font-mono">
                  {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-7 mb-5 h-px bg-[var(--surface)]" />

        {submitError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-[12px] font-medium text-red-700 ring-1 ring-red-100">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={handleReset}
            className="rounded-xl px-5 py-2.5 text-[13px] font-medium text-[var(--text-2)] hover:text-[var(--text-2)] hover:bg-[var(--canvas-sub)] ring-1 ring-transparent hover:ring-[var(--border)] transition-all"
          >
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={!isValid || saving}
            className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.97] ${
              isValid && !saving
                ? "bg-[var(--accent)] hover:bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/20/20"
                : "bg-[var(--surface-alt)] text-[var(--text-3)] cursor-not-allowed shadow-none"
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
