"use client";

import { useState, useEffect, useRef } from "react";
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
  AtSign,
  Mail,
  Lock,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const debouncedUsername = useDebounce(username, 400);
  const checkedRef = useRef("");

  useEffect(() => {
    const u = debouncedUsername;
    if (!u || checkedRef.current === u) return;

    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      setUsernameStatus(u.length < 3 ? "idle" : "invalid");
      return;
    }

    checkedRef.current = u;
    setUsernameStatus("checking");
    fetch(`/api/me/username-check?username=${encodeURIComponent(u)}`)
      .then((r) => r.json())
      .then(({ available }) => setUsernameStatus(available ? "available" : "taken"))
      .catch(() => setUsernameStatus("idle"));
  }, [debouncedUsername]);

  const handleUsernameChange = (val: string) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setUsername(cleaned);
    setUsernameStatus("idle");
    checkedRef.current = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== "available") return;
    setError("");
    setLoading(true);

    // Persist intended role in a cookie so the callback can read it even if
    // Supabase metadata is lost/overwritten during email confirmation or
    // account linking.  Also append it as a query param to the redirect URL.
    if (role) {
      document.cookie = `intended_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    }

    const supabase = getSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          intended_role: role,
          username,
          ...(phone ? { phone } : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?role=${role}`,
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
    document.cookie = `intended_role=${role}; path=/; max-age=600; SameSite=Lax`;
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
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#EFF6FF] via-[#F5F8FF] to-[#EDF2FF] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-[#1A2744] mb-2">Check your email</h2>
          <p className="text-sm text-slate-400">
            We&apos;ve sent a confirmation link to{" "}
            <strong className="text-slate-600">{email}</strong>. Click it to activate your account.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-block text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors"
          >
            Back to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-[#EFF6FF] via-[#F5F8FF] to-[#EDF2FF] p-6">
      {/* Soft background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {step === "role" ? (
          /* ─── Step 1: Role Selection ─── */
          <motion.div
            key="role-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-lg"
          >
            {/* Logo */}
            <div className="mb-8 text-center">
              <Link href="/" className="inline-flex items-center gap-2">
                <Mountain className="h-8 w-8 text-[#eaa94d]" strokeWidth={2.5} />
                <span className="text-2xl font-extrabold tracking-tight text-[#1A2744]">
                  Hima<span className="text-[#eaa94d]">Volt</span>
                </span>
              </Link>
              <p className="mt-3 text-lg font-bold text-[#1A2744]">
                How will you use HimaVolt?
              </p>
              <p className="mt-1 text-sm text-slate-400">
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
                    ? "border-blue-400 bg-blue-50/80 shadow-lg shadow-blue-100/60"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {role === "CUSTOMER" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500"
                  >
                    <Check className="h-3.5 w-3.5 text-white" />
                  </motion.div>
                )}

                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                  role === "CUSTOMER" ? "bg-blue-100" : "bg-slate-100"
                }`}>
                  <UtensilsCrossed className={`h-6 w-6 ${role === "CUSTOMER" ? "text-blue-500" : "text-slate-400"}`} />
                </div>
                <h3 className="text-base font-bold text-[#1A2744] mb-1">Food Lover</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Discover restaurants &amp; order your favourite meals
                </p>
                <ul className="space-y-2">
                  {CUSTOMER_FEATURES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2 text-xs text-slate-400">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${role === "CUSTOMER" ? "text-blue-400" : "text-slate-300"}`} />
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
                    ? "border-indigo-400 bg-linear-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-200/60"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {role === "OWNER" ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-white/20"
                  >
                    <Check className="h-3.5 w-3.5 text-white" />
                  </motion.div>
                ) : (
                  <span className="absolute right-4 top-4 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                    Business
                  </span>
                )}

                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                  role === "OWNER" ? "bg-white/15" : "bg-slate-100"
                }`}>
                  <Building2 className={`h-6 w-6 ${role === "OWNER" ? "text-white" : "text-slate-400"}`} />
                </div>
                <h3 className={`text-base font-bold mb-1 ${role === "OWNER" ? "text-white" : "text-[#1A2744]"}`}>
                  Restaurant Owner
                </h3>
                <p className={`text-xs mb-4 leading-relaxed ${role === "OWNER" ? "text-white/65" : "text-slate-400"}`}>
                  Manage your restaurant, staff &amp; grow your business
                </p>
                <ul className="space-y-2">
                  {OWNER_FEATURES.map(({ icon: Icon, text }) => (
                    <li key={text} className={`flex items-center gap-2 text-xs ${role === "OWNER" ? "text-white/70" : "text-slate-400"}`}>
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${role === "OWNER" ? "text-blue-200" : "text-slate-300"}`} />
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
              className="w-full rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition-all hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mb-3"
            >
              Continue
            </button>
            {role === "OWNER" && (
              <button
                onClick={handleGoogleSignUp}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </span>
              </button>
            )}

            <p className="mt-5 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-bold text-blue-500 hover:text-blue-600 transition-colors">
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
            className="relative w-full max-w-sm"
          >
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => { setStep("role"); setError(""); }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" />
              </button>
              <div>
                <Link href="/" className="flex items-center gap-1.5">
                  <Mountain className="h-5 w-5 text-[#eaa94d]" strokeWidth={2.5} />
                  <span className="text-base font-extrabold tracking-tight text-[#1A2744]">
                    Hima<span className="text-[#eaa94d]">Volt</span>
                  </span>
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {role === "OWNER" ? (
                    <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  ) : (
                    <UtensilsCrossed className="h-3.5 w-3.5 text-blue-400" />
                  )}
                  <span className="text-xs font-semibold text-slate-400">
                    {role === "OWNER" ? "Restaurant Owner Account" : "Food Lover Account"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white/90 shadow-xl shadow-blue-100/40 backdrop-blur-sm">
              {/* Role strip */}
              <div className={`px-5 py-3 ${
                role === "OWNER"
                  ? "bg-linear-to-r from-indigo-500 to-blue-500"
                  : "bg-linear-to-r from-blue-50 to-indigo-50"
              }`}>
                <div className="flex items-center gap-2">
                  {role === "OWNER" ? (
                    <>
                      <Building2 className="h-4 w-4 text-white/80" />
                      <span className="text-xs font-bold text-white/90">
                        Setting up Restaurant Owner account
                      </span>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-bold text-blue-500">
                        Setting up Food Lover account
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Username <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        required
                        placeholder="your_username"
                        className={`w-full rounded-xl border py-2.5 pl-10 pr-9 text-sm focus:outline-none focus:ring-2 transition-all bg-slate-50/50 focus:bg-white ${
                          usernameStatus === "available"
                            ? "border-green-300 focus:border-green-300 focus:ring-green-100 text-slate-800"
                            : usernameStatus === "taken" || usernameStatus === "invalid"
                            ? "border-red-300 focus:border-red-300 focus:ring-red-100 text-slate-800"
                            : "border-slate-200 focus:border-blue-300 focus:ring-blue-100 text-slate-800"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-300" />}
                        {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                    <p className={`mt-1 text-[11px] ${
                      usernameStatus === "available" ? "text-green-500"
                      : usernameStatus === "taken" ? "text-red-400"
                      : usernameStatus === "invalid" ? "text-red-400"
                      : "text-slate-300"
                    }`}>
                      {usernameStatus === "available" && "Username is available!"}
                      {usernameStatus === "taken" && "Username is already taken"}
                      {usernameStatus === "invalid" && "3–20 chars: lowercase, numbers, underscores"}
                      {(usernameStatus === "idle" || usernameStatus === "checking") && "3–20 chars: a–z, 0–9, underscores only"}
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  {/* Phone (Owner only) */}
                  {role === "OWNER" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.18 }}
                    >
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Phone Number <span className="text-blue-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                          placeholder="+977 98XXXXXXXX"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-slate-300">
                        Required for restaurant verification
                      </p>
                    </motion.div>
                  )}

                  {/* Password */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || usernameStatus !== "available"}
                    className="w-full rounded-xl bg-linear-to-r from-blue-500 to-indigo-500 py-3 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition-all hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </form>

                {role === "OWNER" && (
                  <>
                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-100" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-3 text-slate-300">or</span>
                      </div>
                    </div>

                    <button
                      onClick={handleGoogleSignUp}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="mt-5 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-bold text-blue-500 hover:text-blue-600 transition-colors">
                Sign In
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
