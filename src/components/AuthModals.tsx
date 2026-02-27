"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff } from "lucide-react";

interface ModalsProps {
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  registerOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const panelVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const mobilePanelVariants = {
  hidden: { y: "100%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 },
  },
  exit: {
    y: "100%",
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

function FloatingInput({
  label,
  type = "text",
  id,
}: {
  label: string;
  type?: string;
  id: string;
}) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const active = focused || value.length > 0;
  const isPw = type === "password";

  return (
    <div className="relative">
      <input
        id={id}
        type={isPw && show ? "text" : type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer w-full rounded-xl border bg-[#F5F0E8]/40 px-4 pt-6 pb-2 text-base font-medium text-[#1F2A2A] outline-none transition-all duration-200 ${
          focused
            ? "border-[#FF9933] ring-1 ring-[#FF9933]/30 bg-white"
            : "border-gray-200 hover:border-gray-300"
        }`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 transition-all duration-200 ${
          active
            ? "top-2 text-[11px] font-semibold text-[#FF9933]"
            : "top-1/2 -translate-y-1/2 text-base text-gray-400"
        }`}
      >
        {label}
      </label>
      {isPw && value.length > 0 && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1F2A2A] transition-colors"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}

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
            <Dialog.Overlay asChild>
              <motion.div
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
                <motion.div
                  variants={mobilePanelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex w-full flex-col bg-white shadow-2xl focus:outline-none max-h-[92vh] rounded-t-3xl overflow-y-auto md:hidden"
                >
                  {children}
                </motion.div>
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="hidden md:flex w-full max-w-[480px] flex-col bg-white shadow-2xl focus:outline-none overflow-y-auto"
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

export default function AuthModals({
  loginOpen,
  setLoginOpen,
  registerOpen,
  setRegisterOpen,
}: ModalsProps) {
  const switchToRegister = () => {
    setLoginOpen(false);
    setTimeout(() => setRegisterOpen(true), 200);
  };
  const switchToLogin = () => {
    setRegisterOpen(false);
    setTimeout(() => setLoginOpen(true), 200);
  };

  return (
    <>
      <ModalShell open={loginOpen} onOpenChange={setLoginOpen}>
        <LoginContent
          onSwitch={switchToRegister}
          onClose={() => setLoginOpen(false)}
        />
      </ModalShell>

      <ModalShell open={registerOpen} onOpenChange={setRegisterOpen}>
        <RegisterContent
          onSwitch={switchToLogin}
          onClose={() => setRegisterOpen(false)}
        />
      </ModalShell>
    </>
  );
}

function LoginContent({
  onSwitch,
  onClose,
}: {
  onSwitch: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col h-full">
      <div className="bg-[#0A4D3C] px-8 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <motion.div variants={fadeUp}>
              <Dialog.Title className="text-3xl font-bold text-white tracking-tight">
                Welcome back
              </Dialog.Title>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Dialog.Description className="text-white/60 mt-2 text-sm">
                or{" "}
                <button
                  onClick={onSwitch}
                  className="text-[#FF9933] font-bold hover:text-[#ffb366] transition-colors underline underline-offset-2"
                >
                  create an account
                </button>
              </Dialog.Description>
            </motion.div>
          </div>
          <Dialog.Close asChild>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>
        <motion.div variants={fadeUp} className="absolute -bottom-[3px] left-8 w-24 h-[3px] rounded-full bg-[#FF9933]" />
      </div>

      <form className="flex flex-col gap-5 px-8 pt-10 pb-8 flex-1" onSubmit={(e) => e.preventDefault()}>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Phone number or Email" type="text" id="login-email" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Password" type="password" id="login-pw" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <button className="w-full rounded-xl bg-[#FF9933] py-4 font-bold text-white text-base transition-all hover:bg-[#ff8811] active:scale-[0.98] shadow-lg shadow-[#FF9933]/20">
            LOGIN
          </button>
        </motion.div>
        <motion.div variants={fadeUp} className="flex justify-end">
          <button type="button" className="text-sm font-semibold text-gray-400 hover:text-[#FF9933] transition-colors">
            Forgot password?
          </button>
        </motion.div>
        <motion.div variants={fadeUp} className="relative flex items-center py-1">
          <div className="grow border-t border-gray-200" />
          <span className="shrink-0 mx-4 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">or</span>
          <div className="grow border-t border-gray-200" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3.5 font-bold text-[#1F2A2A] text-sm transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
            Continue with Google
          </button>
        </motion.div>
        <motion.p variants={fadeUp} className="text-center text-[11px] text-gray-400 mt-auto pt-4 leading-relaxed">
          By clicking Login, I accept the{" "}
          <a href="#" className="font-bold text-gray-500 hover:text-[#0A4D3C]">Terms</a> &{" "}
          <a href="#" className="font-bold text-gray-500 hover:text-[#0A4D3C]">Privacy Policy</a>
        </motion.p>
      </form>
    </motion.div>
  );
}

function RegisterContent({
  onSwitch,
  onClose,
}: {
  onSwitch: () => void;
  onClose: () => void;
}) {
  const [isOwner, setIsOwner] = useState(false);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col h-full">
      <div className="bg-[#0A4D3C] px-8 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <motion.div variants={fadeUp}>
              <Dialog.Title className="text-3xl font-bold text-white tracking-tight">
                Create account
              </Dialog.Title>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Dialog.Description className="text-white/60 mt-2 text-sm">
                or{" "}
                <button
                  onClick={onSwitch}
                  className="text-[#FF9933] font-bold hover:text-[#ffb366] transition-colors underline underline-offset-2"
                >
                  login to your account
                </button>
              </Dialog.Description>
            </motion.div>
          </div>
          <Dialog.Close asChild>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>
        <motion.div variants={fadeUp} className="absolute -bottom-[3px] left-8 w-24 h-[3px] rounded-full bg-[#FF9933]" />
      </div>

      <form className="flex flex-col gap-4 px-8 pt-8 pb-8 flex-1" onSubmit={(e) => e.preventDefault()}>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Full Name" type="text" id="reg-name" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Email" type="email" id="reg-email" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Phone Number" type="tel" id="reg-phone" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Password" type="password" id="reg-pw" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-gray-200 bg-[#F5F0E8]/30 px-4 py-3.5 transition-all hover:border-[#FF9933]/30">
            <div
              className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                isOwner ? "bg-[#0A4D3C] border-[#0A4D3C]" : "border-gray-300"
              }`}
            >
              {isOwner && (
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input type="checkbox" checked={isOwner} onChange={() => setIsOwner(!isOwner)} className="sr-only" />
            <div>
              <span className="text-sm font-bold text-[#1F2A2A]">I am a Restaurant Owner</span>
              <p className="text-[11px] text-gray-400 mt-0.5">Register your restaurant on HimalHub</p>
            </div>
          </label>
        </motion.div>

        <motion.div variants={fadeUp}>
          <button className="w-full rounded-xl bg-[#0A4D3C] py-4 font-bold text-white text-base transition-all hover:bg-[#083a2d] active:scale-[0.98] shadow-lg shadow-[#0A4D3C]/20">
            CREATE ACCOUNT
          </button>
        </motion.div>

        <motion.p variants={fadeUp} className="text-center text-[11px] text-gray-400 mt-auto pt-2 leading-relaxed">
          By creating an account, I accept the{" "}
          <a href="#" className="font-bold text-gray-500 hover:text-[#0A4D3C]">Terms</a> &{" "}
          <a href="#" className="font-bold text-gray-500 hover:text-[#0A4D3C]">Privacy Policy</a>
        </motion.p>
      </form>
    </motion.div>
  );
}
