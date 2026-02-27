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
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

const panelVariants = {
  hidden: { x: "100%", opacity: 0.5 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

const mobilePanelVariants = {
  hidden: { y: "100%", opacity: 0.5 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1] as [number, number, number, number],
    },
  },
};

const staggerChildren = {
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
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
  const [showPassword, setShowPassword] = useState(false);
  const isActive = focused || value.length > 0;
  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;

  return (
    <div className="relative">
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`peer w-full rounded-lg border bg-white px-4 pt-6 pb-2 text-base font-medium text-[#1F2A2A] outline-none transition-all duration-200 ${
          focused
            ? "border-[#FF9933] ring-1 ring-[#FF9933]/40"
            : "border-gray-300 hover:border-gray-400"
        }`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 transition-all duration-200 ${
          isActive
            ? "top-2 text-[11px] font-semibold text-[#FF9933]"
            : "top-1/2 -translate-y-1/2 text-base text-gray-500"
        }`}
      >
        {label}
      </label>
      {isPasswordField && value.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  );
}

export default function AuthModals({
  loginOpen,
  setLoginOpen,
  registerOpen,
  setRegisterOpen,
}: ModalsProps) {
  const [activeRole, setActiveRole] = useState<
    "Customer" | "Restaurant"
  >("Customer");

  const handleSwitchToRegister = () => {
    setLoginOpen(false);
    setTimeout(() => setRegisterOpen(true), 200);
  };

  const handleSwitchToLogin = () => {
    setRegisterOpen(false);
    setTimeout(() => setLoginOpen(true), 200);
  };

  const roles = ["Customer", "Restaurant"] as const;

  return (
    <>
      {/* LOGIN */}
      <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
        <AnimatePresence>
          {loginOpen && (
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
                    <LoginContent
                      onSwitch={handleSwitchToRegister}
                      onClose={() => setLoginOpen(false)}
                    />
                  </motion.div>
                  <motion.div
                    variants={panelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="hidden md:flex w-full max-w-[480px] flex-col bg-white shadow-2xl focus:outline-none overflow-y-auto"
                  >
                    <LoginContent
                      onSwitch={handleSwitchToRegister}
                      onClose={() => setLoginOpen(false)}
                    />
                  </motion.div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* REGISTER */}
      <Dialog.Root open={registerOpen} onOpenChange={setRegisterOpen}>
        <AnimatePresence>
          {registerOpen && (
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
                    <RegisterContent
                      onSwitch={handleSwitchToLogin}
                      onClose={() => setRegisterOpen(false)}
                      activeRole={activeRole}
                      setActiveRole={setActiveRole}
                      roles={roles}
                    />
                  </motion.div>
                  <motion.div
                    variants={panelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="hidden md:flex w-full max-w-[480px] flex-col bg-white shadow-2xl focus:outline-none overflow-y-auto"
                  >
                    <RegisterContent
                      onSwitch={handleSwitchToLogin}
                      onClose={() => setRegisterOpen(false)}
                      activeRole={activeRole}
                      setActiveRole={setActiveRole}
                      roles={roles}
                    />
                  </motion.div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
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
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full"
    >
      <div className="bg-[#0A4D3C] px-8 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <motion.div variants={fadeUp}>
              <Dialog.Title className="text-3xl font-bold text-white tracking-tight">
                Login
              </Dialog.Title>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Dialog.Description className="text-white/70 mt-2 text-sm">
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
              className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>
        <motion.div
          variants={fadeUp}
          className="absolute -bottom-5 left-8 w-28 h-1 rounded-full bg-[#FF9933]"
        />
      </div>

      <form
        className="flex flex-col gap-5 px-8 pt-10 pb-8 flex-1"
        onSubmit={(e) => e.preventDefault()}
      >
        <motion.div variants={fadeUp}>
          <FloatingInput label="Phone number or Email" type="text" id="login-email" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <FloatingInput label="Password" type="password" id="login-password" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <button className="w-full rounded-lg bg-[#FF9933] py-4 font-bold text-white text-lg transition-all hover:bg-[#ff8811] active:scale-[0.98] shadow-lg shadow-[#FF9933]/25 hover:shadow-xl hover:shadow-[#FF9933]/30">
            LOGIN
          </button>
        </motion.div>

        <motion.div variants={fadeUp} className="flex justify-end">
          <button
            type="button"
            className="text-sm font-semibold text-gray-500 hover:text-[#FF9933] transition-colors"
          >
            Forgot password?
          </button>
        </motion.div>

        <motion.div variants={fadeUp} className="relative flex items-center py-2">
          <div className="grow border-t border-gray-200" />
          <span className="shrink-0 mx-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            or
          </span>
          <div className="grow border-t border-gray-200" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white py-3.5 font-bold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] shadow-sm"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="h-5 w-5"
            />
            Continue with Google
          </button>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-center text-xs text-gray-400 mt-auto pt-4 leading-relaxed"
        >
          By clicking on Login, I accept the{" "}
          <a href="#" className="font-bold text-gray-600 hover:text-[#0A4D3C]">
            Terms & Conditions
          </a>{" "}
          &{" "}
          <a href="#" className="font-bold text-gray-600 hover:text-[#0A4D3C]">
            Privacy Policy
          </a>
        </motion.p>
      </form>
    </motion.div>
  );
}

function RegisterContent({
  onSwitch,
  onClose,
  activeRole,
  setActiveRole,
  roles,
}: {
  onSwitch: () => void;
  onClose: () => void;
  activeRole: string;
  setActiveRole: (role: "Customer" | "Restaurant") => void;
  roles: readonly ["Customer", "Restaurant"];
}) {
  return (
    <motion.div
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-full"
    >
      <div className="bg-[#0A4D3C] px-8 pt-10 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <motion.div variants={fadeUp}>
              <Dialog.Title className="text-3xl font-bold text-white tracking-tight">
                Create account
              </Dialog.Title>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Dialog.Description className="text-white/70 mt-2 text-sm">
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
              className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>
        <motion.div
          variants={fadeUp}
          className="absolute -bottom-5 left-8 w-28 h-1 rounded-full bg-[#FF9933]"
        />
      </div>

      <form
        className="flex flex-col gap-5 px-8 pt-10 pb-8 flex-1"
        onSubmit={(e) => e.preventDefault()}
      >
        <motion.div variants={fadeUp} className="flex rounded-lg bg-gray-100 p-1">
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`relative flex-1 rounded-md py-2.5 text-sm font-bold transition-all duration-200 ${
                activeRole === role
                  ? "bg-white text-[#0A4D3C] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {role}
            </button>
          ))}
        </motion.div>

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
          <FloatingInput label="Password" type="password" id="reg-password" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <button className="w-full rounded-lg bg-[#0A4D3C] py-4 font-bold text-white text-lg transition-all hover:bg-[#083a2d] active:scale-[0.98] shadow-lg shadow-[#0A4D3C]/25 hover:shadow-xl hover:shadow-[#0A4D3C]/30">
            CREATE ACCOUNT
          </button>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="text-center text-xs text-gray-400 mt-auto pt-2 leading-relaxed"
        >
          By creating an account, I accept the{" "}
          <a href="#" className="font-bold text-gray-600 hover:text-[#0A4D3C]">
            Terms & Conditions
          </a>{" "}
          &{" "}
          <a href="#" className="font-bold text-gray-600 hover:text-[#0A4D3C]">
            Privacy Policy
          </a>
        </motion.p>
      </form>
    </motion.div>
  );
}
