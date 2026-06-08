"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import FoodParticles from "@/components/three/FoodParticles";
import { ShoppingBag, Loader2, Info, UtensilsCrossed } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { useCFDSync, type CFDMessage } from "@/hooks/useCFDSync";
import POSPaymentQROverlay from "./POSPaymentQROverlay";
import type { POSOrderItem } from "@/hooks/usePOSOrders";

interface StaffSession {
  restaurantId: string;
  restaurantName: string;
  currency: string;
  posTerminalName: string | null;
}

export default function POSCFD() {
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  // CFD State
  const [cartItems, setCartItems] = useState<POSOrderItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [qrOpen, setQrOpen] = useState(false);
  const [qrAmount, setQrAmount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const res = await fetch("/api/staff-session", { credentials: "include" });
        if (!res.ok) {
          router.push("/staff-login");
          return;
        }
        const data = await res.json();
        if (!cancelled) setSession(data);
      } catch {
        if (!cancelled) router.push("/staff-login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadSession();
    return () => { cancelled = true; };
  }, [router]);

  useCFDSync((msg: CFDMessage) => {
    switch (msg.type) {
      case "SYNC_CART":
        setCartItems(msg.payload.items);
        setSubtotal(msg.payload.subtotal);
        setTax(msg.payload.tax);
        setTotal(msg.payload.total);
        setQrOpen(false); // Hide QR if they are editing cart
        break;
      case "CLEAR_CART":
        setCartItems([]);
        setSubtotal(0);
        setTax(0);
        setTotal(0);
        setQrOpen(false);
        break;
      case "SHOW_QR":
        setQrAmount(msg.payload.amount);
        setQrOpen(true);
        break;
      case "HIDE_QR":
        setQrOpen(false);
        break;
    }
  });

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Connecting to terminal...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[var(--canvas-sub)] via-[var(--canvas)] to-[var(--canvas-sub)]">
      {/* Background ambient particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-60 mix-blend-screen">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.8} color="#fff5ee" />
            <pointLight position={[4, 4, 6]} intensity={1.4} color="#eaa94d" />
            <pointLight position={[-6, -2, 4]} intensity={0.8} color="#e58f2a" />
            <FoodParticles count={40} />
          </Suspense>
        </Canvas>
      </div>

      {/* Header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--canvas)]/90 px-8 py-5 backdrop-blur-md shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">
            Welcome to
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--text-1)]">
            {session.restaurantName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-5 py-2.5 ring-1 ring-indigo-200 shadow-inner">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            <span className="text-sm font-bold tracking-wide text-indigo-700 uppercase">
              Customer Display
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {cartItems.length > 0 ? (
            <motion.div
              key="cart"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-2xl flex flex-col bg-[var(--canvas)] rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden"
            >
              <div className="bg-amber-50 px-8 py-5 flex items-center gap-3 border-b border-amber-100">
                <ShoppingBag className="h-6 w-6 text-amber-600" />
                <h2 className="text-xl font-bold text-amber-900">Your Current Order</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[50vh] p-8">
                <div className="divide-y divide-gray-100">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--canvas-sub)] font-bold text-[var(--text-2)]">
                          {item.quantity}
                        </span>
                        <span className="text-lg font-semibold text-[var(--text-1)]">{item.name}</span>
                      </div>
                      <span className="text-lg font-bold text-[var(--text-1)]">
                        {formatPrice(item.price * item.quantity, session.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--canvas-sub)] p-8 border-t border-[var(--border)]">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-base font-medium text-[var(--text-2)]">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, session.currency)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-base font-medium text-[var(--text-2)]">
                      <span>Tax</span>
                      <span>{formatPrice(tax, session.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-black text-amber-700 pt-4 border-t border-[var(--border)]">
                    <span>Total</span>
                    <span>{formatPrice(total, session.currency)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 bg-white/50 py-3 rounded-xl border border-gray-100">
                  <Info className="h-4 w-4" />
                  Review your order before the staff confirms it
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center max-w-md"
            >
              <div className="rounded-full bg-white/50 p-8 shadow-sm backdrop-blur-md border border-white/40 mb-6">
                <UtensilsCrossed className="h-20 w-20 text-amber-500/50" />
              </div>
              <h2 className="text-4xl font-black tracking-tight text-[var(--text-1)] mb-4">
                Ready to Order?
              </h2>
              <p className="text-lg font-medium text-[var(--text-3)] leading-relaxed">
                Let the staff know what you'd like. Your items will appear right here as they are added.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <POSPaymentQROverlay
        open={qrOpen}
        restaurantId={session.restaurantId}
        restaurantName={session.restaurantName}
        currency={session.currency}
        amount={qrAmount}
        onClose={() => setQrOpen(false)}
      />
    </div>
  );
}
