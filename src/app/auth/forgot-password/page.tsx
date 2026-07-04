"use client";

import { useState, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { friendlyAuthError, isRateLimitError, nextEmailCooldown, emailLinkExpiry } from "@/lib/auth-errors";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";
import { Mountain, Loader2, Check, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Step = "email" | "code" | "password" | "done";

const CODE_LENGTH = 6;

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors";

const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  // Supabase throttles email sends per address (~60s). Track when the next
  // send is allowed so we can show a countdown instead of a raw 429 error.
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const cooldownSec = Math.ceil(useCountdown(cooldownUntil) / 1000);
  // Live "expires in MM:SS" for the emailed 6-digit code.
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null);
  const codeExpiryMs = useCountdown(codeExpiry);

  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ─── Step 1: send the 6-digit code ───
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    // No redirectTo — we verify the emailed 6-digit code in-page instead of
    // bouncing through a magic link. (The email template must expose the code
    // via {{ .Token }} — see supabase/email-templates/reset-password.html.)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    if (resetError) {
      setError(friendlyAuthError(resetError));
      // On a rate-limit, start the cooldown so the resend button reflects the
      // wait rather than letting the user hammer it into more 429s.
      if (isRateLimitError(resetError)) setCooldownUntil(nextEmailCooldown());
      setLoading(false);
      return;
    }

    setCooldownUntil(nextEmailCooldown());
    setCodeExpiry(emailLinkExpiry());
    setDigits(Array(CODE_LENGTH).fill(""));
    setStep("code");
    setLoading(false);
    // Focus the first box on the next tick, after it mounts.
    setTimeout(() => boxRefs.current[0]?.focus(), 50);
  };

  const resendCode = async () => {
    if (cooldownSec > 0 || loading) return;
    await sendCode();
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  // ─── Step 2: 6-digit code entry ───
  const verifyCode = async (code: string) => {
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (verifyError) {
      setError(
        isRateLimitError(verifyError)
          ? friendlyAuthError(verifyError)
          : "That code is incorrect or has expired. Please try again.",
      );
      setDigits(Array(CODE_LENGTH).fill(""));
      setLoading(false);
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
      return;
    }

    // Code is valid → we now hold a short-lived recovery session, enough to
    // set a new password.
    setStep("password");
    setLoading(false);
  };

  const setDigit = (index: number, value: string) => {
    // Only keep the last typed numeric character.
    const char = value.replace(/\D/g, "").slice(-1);
    setError("");
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      // Auto-submit once every box is filled.
      if (char && index === CODE_LENGTH - 1 && next.every((d) => d)) {
        verifyCode(next.join(""));
      }
      return next;
    });
    if (char && index < CODE_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      boxRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) boxRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) boxRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError("");
    const lastFilled = Math.min(pasted.length, CODE_LENGTH) - 1;
    boxRefs.current[lastFilled]?.focus();
    if (pasted.length === CODE_LENGTH) verifyCode(next.join(""));
  };

  // ─── Step 3: set the new password ───
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError(updateError.message); setLoading(false); return; }

    // Keep the DB flag in sync so the unified sign-in page shows the password
    // field next time (not another magic link). Best-effort: the credential
    // itself already lives in Supabase, so we don't block on this.
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasPassword: true }),
      });
    } catch {}

    setStep("done");
    setLoading(false);
    setTimeout(() => router.push("/sign-in"), 2200);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas-sub)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Mountain className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
            <span className="text-2xl font-black tracking-tight text-[var(--text-1)]">
              Hima<span className="text-[var(--accent)]">Volt</span>
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-6">
          <AnimatePresence mode="wait">
            {/* ─── Step: email ─── */}
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-6 text-center">
                  <p className="text-base font-bold text-[var(--text-1)]">Forgot your password?</p>
                  <p className="mt-1 text-sm text-[var(--text-2)]">
                    Enter your email and we&apos;ll send you a 6-digit reset code.
                  </p>
                </div>

                <form onSubmit={sendCode} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">{error}</div>
                  )}

                  <div>
                    <label className={labelClass}>Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className={inputClass}
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-[var(--accent)]/20 transition-colors"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send Reset Code"}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-[var(--text-3)]">
                  Remember it?{" "}
                  <Link href="/sign-in" className="font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                    Sign In
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ─── Step: code ─── */}
            {step === "code" && (
              <motion.div key="code" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                    <ShieldCheck className="h-6 w-6 text-[var(--accent)]" />
                  </div>
                  <p className="text-base font-bold text-[var(--text-1)]">Enter the 6-digit code</p>
                  <p className="mt-1 text-sm text-[var(--text-2)]">
                    Sent to <strong className="text-[var(--text-1)]">{email}</strong>
                  </p>
                  {codeExpiryMs > 0 && (
                    <p className="mt-2 text-xs font-medium text-[var(--text-3)]">
                      Code expires in{" "}
                      <span className="font-bold tabular-nums text-[var(--text-1)]">{formatCountdown(codeExpiryMs)}</span>
                    </p>
                  )}
                </div>

                {error && (
                  <div className="mb-4 rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">{error}</div>
                )}

                <div className="mb-5 flex justify-center gap-2" onPaste={handlePaste}>
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { boxRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={d}
                      disabled={loading}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="h-14 w-11 rounded-xl border border-[var(--border)] bg-[var(--canvas)] text-center text-xl font-bold text-[var(--text-1)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] disabled:opacity-60 transition-colors"
                    />
                  ))}
                </div>

                {loading && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-sm text-[var(--text-3)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                  </div>
                )}

                <div className="text-center text-sm text-[var(--text-3)]">
                  {resent ? (
                    <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                      <Check className="h-3.5 w-3.5" /> New code sent
                    </span>
                  ) : cooldownSec > 0 ? (
                    <span>Resend code in {cooldownSec}s</span>
                  ) : (
                    <>
                      Didn&apos;t get it?{" "}
                      <button
                        type="button"
                        onClick={resendCode}
                        disabled={loading}
                        className="font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                      >
                        Resend code
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
                </button>
              </motion.div>
            )}

            {/* ─── Step: new password ─── */}
            {step === "password" && (
              <motion.div key="password" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <div className="mb-6 text-center">
                  <p className="text-base font-bold text-[var(--text-1)]">Set a new password</p>
                  <p className="mt-1 text-sm text-[var(--text-2)]">Choose something strong and memorable.</p>
                </div>

                <form onSubmit={submitPassword} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-[var(--status-error-text)]/20 bg-[var(--status-error-bg)] px-4 py-3 text-sm text-[var(--status-error-text)]">{error}</div>
                  )}

                  <div>
                    <label className={labelClass}>New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoFocus
                        className={`${inputClass} pr-10`}
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Confirm Password</label>
                    <input
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] bg-[var(--canvas)] focus:outline-none focus:ring-2 transition-colors ${
                        confirm && confirm !== password
                          ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                          : confirm && confirm === password
                          ? "border-[var(--accent)] focus:border-[var(--accent)] focus:ring-[var(--accent-border)]"
                          : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-border)]"
                      }`}
                      placeholder="Repeat password"
                    />
                    {confirm && confirm !== password && (
                      <p className="mt-1 text-[11px] text-red-400">Passwords do not match</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password || !confirm}
                    className="w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 shadow-sm shadow-[var(--accent)]/20 transition-colors"
                  >
                    {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Update Password"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ─── Step: done ─── */}
            {step === "done" && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-2 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                  <Check className="h-8 w-8 text-[var(--accent)]" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-[var(--text-1)]">Password updated!</h2>
                <p className="text-sm text-[var(--text-2)]">Redirecting you to sign in…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
