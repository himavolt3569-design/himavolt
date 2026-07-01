"use client";

import { useState, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  X,
  Store,
  Phone,
  MapPin,
  Building2,
  Coffee,
  UtensilsCrossed,
  Flame,
  Loader2,
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
import type { MapCoords } from "@/components/maps/OsmPinpointMap";
import LocationPickerModal from "@/components/modals/LocationPickerModal";
import { RESTAURANT_TYPE_OPTIONS } from "@/lib/restaurant-types";
import { isValidNepalMobile, normalizeNepalPhone } from "@/lib/phone";

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
const TYPE_ACCENTS: Record<string, { bg: string; ring: string }> = {
  FAST_FOOD: { bg: "bg-[var(--accent)]", ring: "ring-orange-400" },
  RESORT: { bg: "bg-teal-500", ring: "ring-teal-400" },
  HOTEL: { bg: "bg-indigo-500", ring: "ring-indigo-400" },
  BAKERY: { bg: "bg-pink-500", ring: "ring-pink-400" },
  CLOUD_KITCHEN: { bg: "bg-violet-500", ring: "ring-violet-400" },
  BAR: { bg: "bg-rose-500", ring: "ring-rose-400" },
  CAFE: { bg: "bg-[var(--accent)]", ring: "ring-[var(--accent)]" },
  RESTAURANT: { bg: "bg-[var(--accent)]", ring: "ring-[var(--accent)]" },
};

const DEFAULT_MAP_COORDS: MapCoords = { lat: 27.7172, lon: 85.324 };

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
  const [mapOpen, setMapOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setPhone("");
    setSelectedType(null);
    setAddress("");
    setCity("");
    setCoords(null);
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
      setSubmitError("Pick a location using the map button before creating the restaurant.");
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
                    coords={coords}
                    onOpenMap={() => setMapOpen(true)}
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
                    coords={coords}
                    onOpenMap={() => setMapOpen(true)}
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

      <LocationPickerModal
        open={mapOpen}
        onOpenChange={setMapOpen}
        initialCoords={coords ?? DEFAULT_MAP_COORDS}
        initialAddress={address}
        initialCity={city}
        onConfirm={({ address: nextAddress, city: nextCity, coords: nextCoords }) => {
          setAddress(nextAddress);
          setCity(nextCity);
          setCoords(nextCoords);
        }}
      />
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
  coords,
  onOpenMap,
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
  coords: MapCoords | null;
  onOpenMap: () => void;
  submitError: string;
  onReset: () => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const normalizedPhone = normalizeNepalPhone(phone);
  const phoneValid = isValidNepalMobile(normalizedPhone);
  const isValid = Boolean(
    name.trim().length >= 2 && phoneValid && selectedType && address.trim().length >= 4 && coords,
  );

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
                placeholder="e.g. Ameci Cafe & Restaurant"
                className="w-full rounded-xl bg-[var(--canvas-sub)] pl-10 pr-3.5 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 outline-none ring-1 ring-[var(--border)]/80 transition-all focus:bg-[var(--canvas)] focus:ring-[var(--accent)]"
              />
            </div>
          </div>

          {/* ── Phone ────────────────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">
              Restaurant Number <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-[var(--canvas-sub)] px-3 py-3 ring-1 ring-[var(--border)]/80 shrink-0">
                <span className="text-base leading-none">🇳🇵</span>
                <span className="text-[13px] font-bold tracking-wide text-[var(--text-2)]">+977</span>
              </div>
              <div className="relative flex-1">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  required
                  maxLength={10}
                  minLength={10}
                  pattern="\d{10}"
                  inputMode="numeric"
                  title="Enter exactly 10 digits"
                  placeholder="98XXXXXXXX"
                  className={`w-full rounded-xl bg-[var(--canvas-sub)] pl-10 pr-3.5 py-3 text-sm text-[var(--text-1)] placeholder-gray-400 outline-none ring-1 transition-all focus:bg-[var(--canvas)] ${
                    phone.length > 0 && !phoneValid
                      ? "ring-red-300 focus:ring-red-400"
                      : "ring-[var(--border)]/80 focus:ring-[var(--accent)]"
                  }`}
                />
              </div>
            </div>
            {phone.length > 0 && !phoneValid && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-500">
                <AlertCircle className="h-3 w-3" />
                Use a 10 digit Nepal mobile starting with 96, 97, or 98.
              </p>
            )}
          </div>

          {/* ── Type Selection ───────────────────────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-2">
              Type <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {RESTAURANT_TYPE_OPTIONS.map(({ value, label }) => {
                const Icon = TYPE_ICONS[value as keyof typeof TYPE_ICONS] ?? UtensilsCrossed;
                const selected = selectedType === value;
                const typeAccent = TYPE_ACCENTS[value] ?? TYPE_ACCENTS.RESTAURANT;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedType(value)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-all ring-1 cursor-pointer ${
                      selected
                        ? `${typeAccent.bg} text-white ${typeAccent.ring} shadow-sm`
                        : "bg-[var(--canvas)] text-[var(--text-2)] ring-[var(--border)]/80 hover:ring-[var(--border)] hover:bg-[var(--canvas-sub)]"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${selected ? "text-white/90" : "text-[var(--text-3)]"}`} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Address — opens the map picker ───────────────────── */}
          <div>
            <label className="block text-[13px] font-semibold text-[var(--text-2)] mb-1.5">
              Address <span className="text-[var(--accent)]">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenMap}
                className="flex flex-1 items-center gap-2.5 rounded-xl bg-[var(--canvas-sub)] px-3.5 py-3 text-left ring-1 ring-[var(--border)]/80 transition-all hover:bg-[var(--canvas)] hover:ring-[var(--accent)]"
              >
                <MapPin className="h-4 w-4 shrink-0 text-[var(--text-3)]" />
                <span className={`truncate text-sm ${address ? "text-[var(--text-1)]" : "text-[var(--text-3)]"}`}>
                  {address || "Search Location"}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenMap}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[var(--accent-border)] transition-all hover:bg-[var(--accent)] hover:text-white"
                title="Pick on map"
              >
                <MapPin className="h-4.5 w-4.5" />
              </button>
            </div>
            {coords && (
              <p className="mt-1.5 font-mono text-[10px] text-[var(--text-3)]">
                {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
              </p>
            )}
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
            onClick={onReset}
            className="rounded-xl px-5 py-2.5 text-[13px] font-medium text-[var(--text-2)] hover:text-[var(--text-2)] hover:bg-[var(--canvas-sub)] ring-1 ring-transparent hover:ring-[var(--border)] transition-all"
          >
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={!isValid || saving}
            className={`flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.97] ${
              isValid && !saving
                ? "bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-sm shadow-[var(--accent)]/20"
                : "bg-[var(--surface-alt)] text-[var(--text-3)] cursor-not-allowed shadow-none"
            }`}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? "Creating..." : "Save Restaurant"}
          </button>
        </div>
      </div>
    </div>
  );
}
