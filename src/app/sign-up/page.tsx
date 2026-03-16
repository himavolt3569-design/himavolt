"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  Mountain,
  Loader2,
  UtensilsCrossed,
  Building2,
  Check,
  ArrowLeft,
  ShoppingBag,
  BarChart3,
  Users,
  ClipboardList,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Role = "CUSTOMER" | "OWNER";
type Step = "role" | "form";

const CUSTOMER_FEATURES = [
  { icon: UtensilsCrossed, text: "Browse restaurant menus" },
  { icon: ShoppingBag, text: "Order & track delivery" },
  { icon: Heart, text: "Save your favourites" },
];

const OWNER_FEATURES = [
  { icon: ClipboardList, text: "Live order management" },
  { icon: BarChart3, text: "Analytics & reports" },
  { icon: Users, text: "Staff & inventory control" },
];

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          intended_role: role,
          ...(phone ? { phone } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    if (!role) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
      },
    });
  };

  /* ─── Success Screen ─── */
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-[#1F2A2A] mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-500">
            We&apos;ve sent a confirmation link to{" "}
            <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block text-sm font-bold text-[#E23744] hover:text-[#c92e3c]"
          >
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50/50 p-6">
      <AnimatePresence mode="wait">
        {step === "role" ? (
          /* ─── Step 1: Role Selection ─── */
          <motion.div
            key="role-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-lg"
          >
            {/* Logo */}
            <div className="mb-8 text-center">
              <Link href="/" className="inline-flex items-center gap-2">
                <Mountain className="h-8 w-8 text-[#E23744]" strokeWidth={2.5} />
                <span className="text-2xl font-extrabold tracking-tight text-[#1F2A2A]">
                  Hima<span className="text-[#E23744]">Volt</span>
                </span>
              </Link>
              <p className="mt-3 text-lg font-bold text-[#1F2A2A]">
                How will you use HimaVolt?
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Choose your account type to get started
              </p>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
              {/* Customer Card */}
              <button
                onClick={() => setRole("CUSTOMER")}
                className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                  role === "CUSTOMER"
                    ? "border-[#E23744] bg-[#E23744]/5 shadow-lg shadow-[#E23744]/10"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {role === "CUSTOMER" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#E23744]"
                  >
                    <Check className="h-3.5 w-3.5 text-white" />
                  </motion.div>
                )}

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E23744]/10">
                  <UtensilsCrossed className="h-6 w-6 text-[#E23744]" />
                </div>
                <h3 className="text-base font-bold text-[#1F2A2A] mb-1">
                  Food Lover
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Discover restaurants &amp; order your favourite meals
                </p>
                <ul className="space-y-2">
                  {CUSTOMER_FEATURES.map(({ icon: Icon, text }) => (
                    <li
                      key={text}
                      className="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#E23744]" />
                      {text}
                    </li>
                  ))}
                </ul>
              </button>

              {/* Owner Card */}
              <button
                onClick={() => setRole("OWNER")}
                className={`relative rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
                  role === "OWNER"
                    ? "border-[#1F2A2A] bg-[#1F2A2A] shadow-lg shadow-[#1F2A2A]/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {role === "OWNER" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400"
                  >
                    <Check className="h-3.5 w-3.5 text-[#1F2A2A]" />
                  </motion.div>
                ) : (
                  <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                    Business
                  </span>
                )}

                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                    role === "OWNER" ? "bg-white/10" : "bg-gray-100"
                  }`}
                >
                  <Building2
                    className={`h-6 w-6 ${
                      role === "OWNER" ? "text-amber-400" : "text-gray-600"
                    }`}
                  />
                </div>
                <h3
                  className={`text-base font-bold mb-1 ${
                    role === "OWNER" ? "text-white" : "text-[#1F2A2A]"
                  }`}
                >
                  Restaurant Owner
                </h3>
                <p
                  className={`text-xs mb-4 leading-relaxed ${
                    role === "OWNER" ? "text-white/60" : "text-gray-500"
                  }`}
                >
                  Manage your restaurant, staff &amp; grow your business
                </p>
                <ul className="space-y-2">
                  {OWNER_FEATURES.map(({ icon: Icon, text }) => (
                    <li
                      key={text}
                      className={`flex items-center gap-2 text-xs ${
                        role === "OWNER" ? "text-white/70" : "text-gray-500"
                      }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          role === "OWNER" ? "text-amber-400" : "text-gray-500"
                        }`}
                      />
                      {text}
                    </li>
                  ))}
                </ul>
              </button>
            </div>

            {/* Actions */}
            <button
              onClick={() => role && setStep("form")}
              disabled={!role}
              className="w-full rounded-xl bg-[#E23744] py-3 text-sm font-bold text-white transition-all hover:bg-[#c92e3c] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[#E23744]/20 mb-3"
            >
              Continue
            </button>
            <button
              onClick={handleGoogleSignUp}
              disabled={!role}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue with Google
            </button>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-bold text-[#E23744] hover:text-[#c92e3c]"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        ) : (
          /* ─── Step 2: Registration Form ─── */
          <motion.div
            key="form-step"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-sm"
          >
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => {
                  setStep("role");
                  setError("");
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </button>
              <div>
                <Link href="/" className="flex items-center gap-1.5">
                  <Mountain
                    className="h-5 w-5 text-[#E23744]"
                    strokeWidth={2.5}
                  />
                  <span className="text-base font-extrabold tracking-tight text-[#1F2A2A]">
                    Hima<span className="text-[#E23744]">Volt</span>
                  </span>
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {role === "OWNER" ? (
                    <Building2 className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <UtensilsCrossed className="h-3.5 w-3.5 text-[#E23744]" />
                  )}
                  <span className="text-xs font-semibold text-gray-400">
                    {role === "OWNER"
                      ? "Restaurant Owner Account"
                      : "Food Lover Account"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* Role strip */}
              <div
                className={`px-5 py-3 ${
                  role === "OWNER" ? "bg-[#1F2A2A]" : "bg-[#E23744]/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  {role === "OWNER" ? (
                    <>
                      <Building2 className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-white/80">
                        Setting up Restaurant Owner account
                      </span>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="h-4 w-4 text-[#E23744]" />
                      <span className="text-xs font-bold text-[#E23744]">
                        Setting up Food Lover account
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E23744]/30 focus:outline-none focus:ring-1 focus:ring-[#E23744]/30"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E23744]/30 focus:outline-none focus:ring-1 focus:ring-[#E23744]/30"
                      placeholder="you@example.com"
                    />
                  </div>

                  {role === "OWNER" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.18 }}
                    >
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Phone Number{" "}
                        <span className="text-[#E23744]">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E23744]/30 focus:outline-none focus:ring-1 focus:ring-[#E23744]/30"
                        placeholder="+977 98XXXXXXXX"
                      />
                      <p className="mt-1 text-[11px] text-gray-400">
                        Required for restaurant verification
                      </p>
                    </motion.div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E23744]/30 focus:outline-none focus:ring-1 focus:ring-[#E23744]/30"
                      placeholder="Min 6 characters"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#E23744] py-3 text-sm font-bold text-white transition-all hover:bg-[#c92e3c] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-[#E23744]/20"
                  >
                    {loading ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-gray-400">or</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignUp}
                  className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Continue with Google
                </button>
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-bold text-[#E23744] hover:text-[#c92e3c]"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
