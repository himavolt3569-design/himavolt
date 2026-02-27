"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalsProps {
  loginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
  registerOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
}

export default function AuthModals({
  loginOpen,
  setLoginOpen,
  registerOpen,
  setRegisterOpen,
}: ModalsProps) {
  const handleSwitchToRegister = () => {
    setLoginOpen(false);
    setTimeout(() => setRegisterOpen(true), 150);
  };

  const handleSwitchToLogin = () => {
    setRegisterOpen(false);
    setTimeout(() => setLoginOpen(true), 150);
  };

  return (
    <>
      <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
        <AnimatePresence>
          {loginOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 100, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 100, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="fixed top-[5%] left-[5%] right-[5%] max-h-[90vh] md:top-[10%] md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 z-50 flex flex-col overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl focus:outline-none"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <Dialog.Title className="text-3xl font-bold tracking-tight text-[#1F2A2A]">
                        Login
                      </Dialog.Title>
                      <Dialog.Description className="text-gray-500 mt-1">
                        or{" "}
                        <button
                          onClick={handleSwitchToRegister}
                          className="text-[#FF9933] font-semibold hover:underline"
                        >
                          create an account
                        </button>
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button className="rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500">
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <form
                    className="flex flex-col gap-4 mt-2"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <div>
                      <input
                        type="text"
                        placeholder="Phone number or Email"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 focus:border-[#FF9933] focus:outline-none focus:ring-1 focus:ring-[#FF9933] transition-all bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 focus:border-[#FF9933] focus:outline-none focus:ring-1 focus:ring-[#FF9933] transition-all bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <button className="w-full rounded-xl bg-[#FF9933] py-4 font-bold text-white shadow-lg shadow-[#FF9933]/20 transition-all hover:bg-[#ff8811] active:scale-95 text-lg mt-2">
                      Login
                    </button>

                    <div className="flex items-center justify-between mt-2">
                      <button className="text-sm font-semibold text-gray-500 hover:text-[#1F2A2A]">
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative flex items-center py-4">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">
                        OR
                      </span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-3.5 font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95">
                      <img
                        src="https://www.svgrepo.com/show/475656/google-color.svg"
                        alt="Google"
                        className="h-5 w-5"
                      />
                      Continue with Google
                    </button>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      <Dialog.Root open={registerOpen} onOpenChange={setRegisterOpen}>
        <AnimatePresence>
          {registerOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, y: 100, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 100, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="fixed top-[5%] left-[5%] right-[5%] max-h-[90vh] md:top-[5%] md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 z-50 flex flex-col overflow-y-auto rounded-3xl bg-white p-6 md:p-8 shadow-2xl focus:outline-none"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <Dialog.Title className="text-3xl font-bold tracking-tight text-[#1F2A2A]">
                        Sign up
                      </Dialog.Title>
                      <Dialog.Description className="text-gray-500 mt-1">
                        or{" "}
                        <button
                          onClick={handleSwitchToLogin}
                          className="text-[#0A4D3C] font-semibold hover:underline"
                        >
                          login to your account
                        </button>
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button className="rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500 shrink-0">
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <form
                    className="flex flex-col gap-4 mt-2"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    {/* Role Selection */}
                    <div className="flex rounded-xl bg-gray-100 p-1 mb-2">
                      <button className="flex-1 rounded-lg bg-white py-2 text-sm font-bold shadow-sm text-[#0A4D3C]">
                        Customer
                      </button>
                      <button className="flex-1 rounded-lg py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        Restaurant
                      </button>
                      <button className="flex-1 rounded-lg py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        Hotel
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Full Name"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 focus:border-[#FF9933] focus:outline-none focus:ring-1 focus:ring-[#FF9933] transition-all bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 focus:border-[#FF9933] focus:outline-none focus:ring-1 focus:ring-[#FF9933] transition-all bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 focus:border-[#FF9933] focus:outline-none focus:ring-1 focus:ring-[#FF9933] transition-all bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        className="w-full rounded-xl border border-gray-300 px-4 py-4 text-gray-900 focus:border-[#FF9933] focus:outline-none focus:ring-1 focus:ring-[#FF9933] transition-all bg-gray-50 focus:bg-white"
                      />
                    </div>

                    <button className="w-full rounded-xl bg-[#0A4D3C] py-4 font-bold text-white shadow-lg shadow-[#0A4D3C]/20 transition-all hover:bg-[#083a2d] active:scale-95 text-lg mt-2">
                      Create Account
                    </button>

                    <p className="text-center text-xs text-gray-500 mt-2">
                      By creating an account, I accept the{" "}
                      <a
                        href="#"
                        className="font-bold text-gray-700 hover:text-[#0A4D3C]"
                      >
                        Terms & Conditions
                      </a>{" "}
                      &{" "}
                      <a
                        href="#"
                        className="font-bold text-gray-700 hover:text-[#0A4D3C]"
                      >
                        Privacy Policy
                      </a>
                    </p>
                  </form>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
