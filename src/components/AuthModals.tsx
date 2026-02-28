"use client";

import { useState, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Upload,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  MapPin,
  Lock,
  FileCheck2,
  UserRound,
  Cpu,
} from "lucide-react";

/* ─── Shared props ──────────────────────────────────────────────────── */
interface ModalsProps {
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  registerOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
}

/* ─── Animation variants ────────────────────────────────────────────── */
const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Centered card: scale + fade on desktop
const card = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 28, stiffness: 340, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

// Bottom-sheet on mobile
const sheet = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ─── Shared input ──────────────────────────────────────────────────── */
function Field({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  icon?: typeof Mail;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-gray-400">
        {label}
      </label>
      <div
        className={`relative flex items-center rounded-xl border bg-white transition-all duration-200 ${
          focused
            ? "border-[#FF9933] ring-2 ring-[#FF9933]/15 shadow-sm"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        {Icon && (
          <Icon
            className={`ml-4 h-[18px] w-[18px] shrink-0 transition-colors ${focused ? "text-[#FF9933]" : "text-gray-300"}`}
          />
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent px-3.5 py-4 text-[15px] font-medium text-[#1F2A2A] placeholder-gray-300 outline-none"
        />
        {isPassword && value.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="mr-4 text-gray-300 hover:text-gray-500 transition-colors"
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── 4-box PIN input ───────────────────────────────────────────────── */
function PinInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs[i - 1].current?.focus();
      onChange(value.slice(0, i - 1));
    }
  };

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[i] = digit;
    const joined = next.join("").slice(0, 4);
    onChange(joined);
    if (digit && i < 3) refs[i + 1].current?.focus();
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
        Your PIN
      </label>
      <div className="flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ? "●" : ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            className="h-16 w-16 rounded-2xl border-2 border-gray-200 bg-white text-center text-2xl font-bold text-[#1F2A2A] outline-none transition-all duration-150 focus:border-[#FF9933] focus:ring-4 focus:ring-[#FF9933]/15 focus:shadow-md hover:border-gray-300 shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}

/* ─── File upload zone ──────────────────────────────────────────────── */
function FileUpload({ label }: { label: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-all hover:border-[#FF9933]/40 hover:bg-[#FF9933]/4 ${
          fileName
            ? "border-[#0A4D3C]/40 bg-[#0A4D3C]/5"
            : "border-gray-200 bg-gray-50/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
        {fileName ? (
          <>
            <FileCheck2 className="h-6 w-6 text-[#0A4D3C]" />
            <p className="text-[11px] font-bold text-[#0A4D3C] text-center px-2 truncate max-w-full">
              {fileName}
            </p>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-gray-400" />
            <p className="text-[11px] font-semibold text-gray-400 text-center leading-snug">
              Click to upload proof
              <br />
              <span className="font-medium text-gray-300">PDF, JPG, PNG · max 10 MB</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Centered modal shell ──────────────────────────────────────────── */
function ModalShell({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
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
                {/* Mobile bottom sheet */}
                <motion.div
                  key="sheet"
                  variants={sheet}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="fixed bottom-0 inset-x-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-[#FAFAF9] shadow-2xl md:hidden focus:outline-none"
                >
                  <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-gray-300" />
                  {children}
                </motion.div>

                {/* Desktop centered card */}
                <motion.div
                  key="card"
                  variants={card}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="fixed left-1/2 top-1/2 z-50 hidden max-h-[90dvh] w-full max-w-[580px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-[#FAFAF9] shadow-2xl md:block focus:outline-none"
                >
                  {children}
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/* ─── Secure Login ──────────────────────────────────────────────────── */
type LoginTab = "owner" | "pin";

function SecureLogin({
  onClose,
  onEstablish,
}: {
  onClose: () => void;
  onEstablish: () => void;
}) {
  const [activeTab, setActiveTab] = useState<LoginTab>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [pin, setPin] = useState("");

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="p-8 sm:p-10 space-y-7"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#FF9933]/10">
            <ShieldCheck className="h-6 w-6 text-[#FF9933]" strokeWidth={2} />
          </div>
          <div>
            <Dialog.Title className="text-2xl font-extrabold tracking-tight text-[#1F2A2A] leading-tight">
              Secure Login
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-400 font-medium mt-0.5">
              Access your operational dashboard.
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close asChild>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </motion.div>

      {/* Tab pills */}
      <motion.div
        variants={fadeUp}
        className="flex rounded-2xl bg-[#F0EDE8] p-1.5 gap-1.5"
      >
        {(
          [
            { id: "owner" as LoginTab, label: "Owner / Email" },
            { id: "pin" as LoginTab, label: "Staff PIN" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative flex-1 rounded-xl py-3 text-sm font-bold transition-all ${
              activeTab === t.id ? "text-[#1F2A2A]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {activeTab === t.id && (
              <motion.div
                layoutId="login-tab"
                className="absolute inset-0 rounded-xl bg-white shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "owner" ? (
          <motion.div
            key="owner-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Field
              label="Email"
              type="email"
              placeholder="owner@restaurant.com"
              icon={Mail}
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={setPassword}
            />
            <div className="flex justify-end">
              <button className="text-[11px] font-semibold text-gray-400 hover:text-[#FF9933] transition-colors">
                Forgot password?
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="pin-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Field
              label="Restaurant Code"
              placeholder="your-restaurant-slug"
              icon={Building2}
              value={slug}
              onChange={setSlug}
            />
            <PinInput value={pin} onChange={setPin} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <motion.div variants={fadeUp}>
        <button className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF9933] py-4 text-[15px] font-extrabold text-white shadow-lg shadow-[#FF9933]/25 transition-all hover:bg-[#ff8811] active:scale-[0.97]">
          {activeTab === "owner" ? (
            <>
              Initiate Login
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              <KeyRound className="h-5 w-5" />
              Login with PIN
            </>
          )}
        </button>
      </motion.div>

      {/* Divider */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-bold uppercase tracking-widest text-gray-300">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </motion.div>

      {/* Google */}
      <motion.div variants={fadeUp}>
        <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-4 text-[15px] font-bold text-[#1F2A2A] shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97]">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Continue with Google
        </button>
      </motion.div>

      {/* Footer link */}
      <motion.p
        variants={fadeUp}
        className="text-center text-[12.5px] text-gray-400 pb-1"
      >
        No active configuration?{" "}
        <button
          type="button"
          onClick={onEstablish}
          className="font-bold text-[#FF9933] hover:text-[#ff8811] underline underline-offset-2 transition-colors"
        >
          Establish one here.
        </button>
      </motion.p>
    </motion.div>
  );
}

/* ─── Establish Your System (onboarding) ────────────────────────────── */
function EstablishSystem({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: () => void;
}) {
  const [form, setForm] = useState({
    establishment: "",
    owner: "",
    email: "",
    phone: "",
    location: "",
    passcode: "",
  });

  const set = useCallback(
    (key: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [key]: v })),
    [],
  );

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="p-8 sm:p-10 space-y-7"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#0A4D3C]/10">
            <Cpu className="h-6 w-6 text-[#0A4D3C]" strokeWidth={1.8} />
          </div>
          <div>
            <Dialog.Title className="text-2xl font-extrabold tracking-tight text-[#1F2A2A] leading-tight">
              Establish Your System
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-400 font-medium mt-0.5 leading-snug max-w-[300px]">
              Deploy HimalHub&apos;s precision layer. Submit credentials below.
            </Dialog.Description>
          </div>
        </div>
        <Dialog.Close asChild>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </motion.div>

      {/* Thin accent bar */}
      <motion.div
        variants={fadeUp}
        className="h-[2px] w-full rounded-full bg-linear-to-r from-[#FF9933] via-[#0A4D3C] to-transparent"
      />

      {/* Two-column form grid */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Field
          label="Establishment Name"
          placeholder="The Tech Cafe"
          icon={Building2}
          value={form.establishment}
          onChange={set("establishment")}
        />
        <Field
          label="Owner Name"
          placeholder="Rajan Shrestha"
          icon={UserRound}
          value={form.owner}
          onChange={set("owner")}
        />
        <Field
          label="Terminal Email"
          type="email"
          placeholder="owner@restaurant.com"
          icon={Mail}
          value={form.email}
          onChange={set("email")}
        />
        <Field
          label="Primary Contact"
          type="tel"
          placeholder="+977 98XXXXXXXX"
          icon={Phone}
          value={form.phone}
          onChange={set("phone")}
        />
        <Field
          label="Physical Coordinates"
          placeholder="Thamel, Kathmandu"
          icon={MapPin}
          value={form.location}
          onChange={set("location")}
        />
        <Field
          label="Master Passcode"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          value={form.passcode}
          onChange={set("passcode")}
        />
      </motion.div>

      {/* Upload — full width */}
      <motion.div variants={fadeUp}>
        <FileUpload label="Business Proof Document" />
      </motion.div>

      {/* Terms note */}
      <motion.p variants={fadeUp} className="text-[10.5px] text-gray-400 leading-relaxed">
        By submitting, you confirm all provided details are accurate and agree to HimalHub&apos;s{" "}
        <a href="#" className="font-bold text-gray-500 hover:text-[#0A4D3C] transition-colors">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="font-bold text-gray-500 hover:text-[#0A4D3C] transition-colors">
          Privacy Policy
        </a>
        .
      </motion.p>

      {/* CTA */}
      <motion.div variants={fadeUp}>
        <button className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF9933] py-4 text-[15px] font-extrabold text-white shadow-lg shadow-[#FF9933]/25 transition-all hover:bg-[#ff8811] active:scale-[0.97]">
          Initialize Deployment
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </motion.div>

      {/* Footer link */}
      <motion.p
        variants={fadeUp}
        className="text-center text-[12.5px] text-gray-400 pb-1"
      >
        System already active?{" "}
        <button
          type="button"
          onClick={onLogin}
          className="font-bold text-[#FF9933] hover:text-[#ff8811] underline underline-offset-2 transition-colors"
        >
          Authenticate here.
        </button>
      </motion.p>
    </motion.div>
  );
}

/* ─── Root export ───────────────────────────────────────────────────── */
export default function AuthModals({
  loginOpen,
  setLoginOpen,
  registerOpen,
  setRegisterOpen,
}: ModalsProps) {
  const openEstablish = useCallback(() => {
    setLoginOpen(false);
    setTimeout(() => setRegisterOpen(true), 220);
  }, [setLoginOpen, setRegisterOpen]);

  const openLogin = useCallback(() => {
    setRegisterOpen(false);
    setTimeout(() => setLoginOpen(true), 220);
  }, [setRegisterOpen, setLoginOpen]);

  return (
    <>
      {/* Secure Login */}
      <ModalShell open={loginOpen} onOpenChange={setLoginOpen}>
        <SecureLogin
          onClose={() => setLoginOpen(false)}
          onEstablish={openEstablish}
        />
      </ModalShell>

      {/* Establish Your System */}
      <ModalShell open={registerOpen} onOpenChange={setRegisterOpen}>
        <EstablishSystem
          onClose={() => setRegisterOpen(false)}
          onLogin={openLogin}
        />
      </ModalShell>
    </>
  );
}
