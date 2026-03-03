"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { RESTAURANT_TYPE_OPTIONS } from "@/lib/restaurant-types";

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

const sheet = {
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
                  variants={sheet}
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
              <p className="text-[13px] text-gray-400 mt-0.5">
                Set up in seconds — edit anytime later.
              </p>
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
          {/* Name */}
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

          {/* Phone */}
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

          {/* Type */}
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
                return (
                  <button
                    key={value}
                    onClick={() => setSelectedType(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center transition-all ring-1 ${
                      selected
                        ? "bg-[#0F1219] text-white ring-[#0F1219] shadow-md"
                        : "bg-white text-gray-600 ring-gray-200/80 hover:ring-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 ${
                        selected ? "text-amber-400" : "text-gray-400"
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

          {/* Address */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              Address
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Search location"
                  className="w-full rounded-xl bg-gray-50 pl-10 pr-9 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none ring-1 ring-gray-200/80 transition-all focus:bg-white focus:ring-amber-400"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              </div>
              <button className="flex h-11.5 w-11.5 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 ring-1 ring-gray-200/80 hover:bg-amber-50 hover:text-amber-500 hover:ring-amber-300 transition-all">
                <LocateFixed className="h-4 w-4" />
              </button>
            </div>
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
