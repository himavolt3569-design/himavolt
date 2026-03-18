"use client";

import { useState } from "react";
import {
  Mountain,
  Loader2,
  Building2,
  Phone,
  MapPin,
  ChevronRight,
  Check,
  Store,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RESTAURANT_TYPES = [
  { value: "RESTAURANT", label: "Restaurant", emoji: "🍽️" },
  { value: "CAFE", label: "Café", emoji: "☕" },
  { value: "FAST_FOOD", label: "Fast Food", emoji: "🍔" },
  { value: "BAKERY", label: "Bakery", emoji: "🥐" },
  { value: "BAR", label: "Bar", emoji: "🍺" },
  { value: "HOTEL", label: "Hotel", emoji: "🏨" },
  { value: "RESORT", label: "Resort", emoji: "🏖️" },
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen", emoji: "📦" },
] as const;

type RestaurantType = (typeof RESTAURANT_TYPES)[number]["value"];

interface FormData {
  name: string;
  type: RestaurantType | "";
  phone: string;
  address: string;
  city: string;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Business Info", "Location & Contact", "Done"];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    name: "",
    type: "",
    phone: "",
    address: "",
    city: "Kathmandu",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const router = useRouter();

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type) return;
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          phone: form.phone,
          address: form.address || "",
          city: form.city || "Kathmandu",
          countryCode: "+977",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create restaurant");
      }

      setRestaurantName(form.name);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[#eaa94d]" strokeWidth={2.5} />
            <span className="text-2xl font-extrabold tracking-tight text-[#3e1e0c]">
              Hima<span className="text-[#eaa94d]">Volt</span>
            </span>
          </Link>

          {step !== 3 && (
            <div className="mt-6">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2">
                {STEP_LABELS.slice(0, 2).map((label, i) => {
                  const stepNum = (i + 1) as Step;
                  const isActive = step === stepNum;
                  const isDone = step > stepNum;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                            isDone
                              ? "bg-green-500 text-white"
                              : isActive
                              ? "bg-[#eaa94d] text-white"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {isDone ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            stepNum
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isActive ? "text-[#3e1e0c]" : "text-gray-400"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      {i < 1 && (
                        <div className="h-px w-8 bg-gray-200" />
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-sm font-semibold text-[#3e1e0c]">
                {step === 1
                  ? "Tell us about your restaurant"
                  : "Where can customers find you?"}
              </p>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Business Info ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <form
                onSubmit={handleStep1}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
              >
                {/* Restaurant Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Restaurant Name <span className="text-[#eaa94d]">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-[#eaa94d]/30 focus:outline-none focus:ring-1 focus:ring-[#eaa94d]/30"
                      placeholder="e.g. The Himalayan Kitchen"
                    />
                  </div>
                </div>

                {/* Restaurant Type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Type <span className="text-[#eaa94d]">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {RESTAURANT_TYPES.map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update("type", value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 px-1 text-center transition-all ${
                          form.type === value
                            ? "border-[#eaa94d] bg-[#eaa94d]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-lg leading-none">{emoji}</span>
                        <span
                          className={`text-[10px] font-semibold leading-tight ${
                            form.type === value
                              ? "text-[#eaa94d]"
                              : "text-gray-500"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!form.name.trim() || !form.type}
                  className="w-full rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white transition-all hover:bg-[#d67620] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#eaa94d]/20 flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* ─── Step 2: Location & Contact ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <form
                onSubmit={handleStep2}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
              >
                {error && (
                  <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Business Phone <span className="text-[#eaa94d]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-[#eaa94d]/30 focus:outline-none focus:ring-1 focus:ring-[#eaa94d]/30"
                      placeholder="+977 01-XXXXXXX or 98XXXXXXXX"
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-[#eaa94d]/30 focus:outline-none focus:ring-1 focus:ring-[#eaa94d]/30"
                      placeholder="Kathmandu"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Address{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#eaa94d]/30 focus:outline-none focus:ring-1 focus:ring-[#eaa94d]/30 resize-none"
                    placeholder="Street, Tole, Landmark..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(""); }}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!form.phone.trim() || loading}
                    className="flex-[2] rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white transition-all hover:bg-[#d67620] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#eaa94d]/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Create Restaurant
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ─── Step 3: Success ─── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="text-center"
            >
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <Building2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-[#3e1e0c] mb-2">
                {restaurantName} is live!
              </h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Your restaurant has been created. Head to the dashboard to set
                up your menu, invite staff, and start taking orders.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white transition-all hover:bg-[#d67620] shadow-sm shadow-[#eaa94d]/20"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Explore the app first
                </button>
              </div>

              <p className="mt-6 text-[11px] text-gray-300">
                You can add more restaurants from the dashboard anytime.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
