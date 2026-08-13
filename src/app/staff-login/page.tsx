"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Mountain,
  Building2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Lock,
} from "lucide-react";
import Link from "next/link";

// ─── Sophisticated Background Components ───────────────────────────

function TechGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  );
}

function AmbientGlow() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-[var(--accent)]/[0.04] rounded-full blur-[120px]" />
      <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-slate-400/[0.04] rounded-full blur-[100px]" />
    </div>
  );
}

// ─── PIN Interaction ───────────────────────────────────────────────

function PinSlot({ filled, active }: { filled: boolean; active: boolean }) {
  return (
    <div className="relative flex-1 max-w-[56px] h-14">
      <motion.div
        className={`absolute inset-0 rounded-xl border transition-colors duration-300 ${
          active 
            ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm shadow-[var(--accent)]/10" 
            : filled 
            ? "border-[var(--border)] bg-[var(--surface-alt)]" 
            : "border-[var(--border)] bg-[var(--surface-alt)]/50"
        }`}
      />
      <AnimatePresence>
        {filled && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-2 w-2 rounded-full bg-[var(--text-1)]" />
          </motion.div>
        )}
      </AnimatePresence>
      {active && (
        <motion.div
          layoutId="pin-cursor"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[var(--accent)] rounded-full"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export default function StaffLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get("qr");

  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formShake, setFormShake] = useState(false);
  const [qrChecking, setQrChecking] = useState(!!qrToken);

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Scan-to-login: a badge QR lands here with ?qr=<token> — try it silently
  // before showing the Terminal ID / PIN form at all.
  useEffect(() => {
    if (!qrToken) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/staff-login/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrToken }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setErrorMsg(data.error || "This badge is invalid or expired. Sign in with your PIN instead.");
          setQrChecking(false);
          return;
        }

        setSuccess(true);
        await new Promise((r) => setTimeout(r, 1200));
        if (!cancelled) {
          router.push("/kitchen");
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setErrorMsg("Couldn't reach the server. Sign in with your PIN instead.");
          setQrChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(val);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || pin.length !== 4) return;

    setLoading(true);
    try {
      const res = await fetch("/api/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantCode: code.toUpperCase(), pin, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication Failed");

      setSuccess(true);
      await new Promise(r => setTimeout(r, 1200));
      router.push("/kitchen");
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication Failed");
      setPin("");
      setFormShake(true);
      setTimeout(() => setFormShake(false), 500);
      hiddenInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const isReady = code.length >= 4 && pin.length === 4 && !loading;

  return (
    <div className="min-h-screen bg-[var(--canvas-sub)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <TechGrid />
      <AmbientGlow />

      {/* ── Top Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 relative z-10 flex flex-col items-center"
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Mountain className="h-6 w-6 text-[var(--text-1)]" strokeWidth={2.5} />
          <span className="text-xl font-bold tracking-tighter uppercase text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-3)]">
           <ShieldCheck className="h-3 w-3 text-green-500" />
           Secure Enterprise Node
        </div>
      </motion.div>

      {/* ── Main Auth Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        <motion.div 
          animate={formShake ? { x: [-8, 8, -4, 4, 0] } : {}}
          className="bg-[var(--surface)] border border-[var(--border)] p-8 md:p-10 rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          {qrChecking ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--text-1)] mb-4" />
              <h2 className="text-lg font-bold tracking-tight text-[var(--text-1)] mb-1">Reading your badge...</h2>
              <p className="text-[var(--text-3)] text-[11px] font-medium">Hold on while we log you in.</p>
            </div>
          ) : (
          <>
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-1)] mb-2">Staff Authentication</h2>
            <p className="text-[var(--text-3)] text-[11px] font-medium leading-relaxed">Enter your credentials to access the operational portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Terminal ID */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] ml-1">Terminal ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-[var(--text-3)] group-focus-within:text-[var(--text-1)] transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                  className="w-full pl-11 pr-4 py-3.5 bg-[var(--surface-alt)]/50 border border-[var(--border)] rounded-xl text-[var(--text-1)] font-mono text-sm tracking-widest focus:outline-none focus:border-[var(--text-3)] focus:bg-[var(--surface)] transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-[var(--text-3)] uppercase"
                  placeholder="HH-NODE-001"
                />
              </div>
            </div>

            {/* PIN Entry */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)] ml-1">Secure PIN</label>
              <div 
                className="flex justify-between gap-3 cursor-pointer"
                onClick={() => hiddenInputRef.current?.focus()}
              >
                {[0, 1, 2, 3].map((i) => (
                  <PinSlot key={i} filled={pin.length > i} active={pin.length === i} />
                ))}
              </div>
              <input
                ref={hiddenInputRef}
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={handlePinChange}
                className="absolute opacity-0 pointer-events-none"
              />
            </div>

            {/* Remember Me Sleek Checkbox */}
            <div className="flex items-center gap-3 px-1">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  rememberMe ? "bg-[var(--text-1)] border-[var(--text-1)]" : "bg-[var(--surface)] border-[var(--border)]"
                }`}
              >
                {rememberMe && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-1.5 h-1.5 rounded-full bg-[var(--canvas)]" />}
              </button>
              <span 
                className="text-[11px] font-semibold text-[var(--text-3)] cursor-pointer select-none"
                onClick={() => setRememberMe(!rememberMe)}
              >
                Remember me for 30 days
              </span>
            </div>

            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2.5 text-red-600"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{errorMsg}</span>
              </motion.div>
            )}

            {/* Action Button */}
            <motion.button
              type="submit"
              disabled={!isReady}
              whileHover={isReady ? { scale: 1.01 } : {}}
              whileTap={isReady ? { scale: 0.99 } : {}}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-2 ${
                isReady 
                  ? "bg-[var(--text-1)] text-[var(--canvas)] shadow-lg shadow-slate-900/10" 
                  : "bg-[var(--surface-alt)] text-[var(--text-3)] cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  Authenticate
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </motion.button>
          </form>
          </>
          )}

          {/* Success Overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-[var(--surface)] flex flex-col items-center justify-center text-center p-8"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="h-16 w-16 rounded-full bg-[var(--text-1)] flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-[var(--text-1)] uppercase tracking-tight">Verified</h3>
                <p className="text-[var(--text-3)] text-[10px] font-bold uppercase tracking-widest mt-2">Connecting to Command Center...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ── Footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 relative z-10"
      >
        <Link 
          href="/" 
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
        >
          <KeyRound className="h-3 w-3" />
          Return to Platform
        </Link>
      </motion.div>
    </div>
  );
}
