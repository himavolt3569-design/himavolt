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
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[var(--canvas-sub)] font-sans">
      {/* Background ambient particles */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
          <Suspense fallback={null}>
            <ambientLight intensity={1.5} color="#fff" />
            <pointLight position={[4, 4, 6]} intensity={1.0} color="#eaa94d" />
            <pointLight position={[-6, -2, 4]} intensity={0.5} color="#e58f2a" />
            <FoodParticles count={40} />
          </Suspense>
        </Canvas>
      </div>

      {/* Header */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-10 py-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">
            Welcome to
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--text-1)]">
            {session.restaurantName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--canvas)] px-6 py-3 ring-1 ring-[var(--border)] shadow-sm">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[var(--accent)]"></span>
            </span>
            <span className="text-[13px] font-bold tracking-widest text-[var(--text-2)] uppercase">
              Customer Display
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {cartItems.length > 0 ? (
            <motion.div
              key="cart"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-2xl flex flex-col bg-[var(--surface)] rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-[var(--border)] overflow-hidden"
            >
              <div className="bg-[var(--accent)] px-8 py-6 flex items-center gap-4 border-b border-[var(--accent-border)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Your Current Order</h2>
                  <p className="text-sm font-semibold text-white/80">Please review your items below</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[55vh] p-2">
                <div className="divide-y divide-[var(--border)] px-6">
                  {cartItems.map((item, index) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex justify-between items-center py-5"
                    >
                      <div className="flex items-center gap-5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas-sub)] font-black text-[var(--accent)] border border-[var(--border)] shadow-sm">
                          {item.quantity}x
                        </span>
                        <span className="text-[17px] font-bold text-[var(--text-1)]">{item.name}</span>
                      </div>
                      <span className="text-[17px] font-black text-[var(--text-1)]">
                        {formatPrice(item.price * item.quantity, session.currency)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--canvas-sub)] p-8 border-t border-[var(--border)] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-lg font-semibold text-[var(--text-3)]">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal, session.currency)}</span>
                  </div>
                  {tax > 0 && (
                    <div className="flex justify-between text-lg font-semibold text-[var(--text-3)]">
                      <span>Tax</span>
                      <span>{formatPrice(tax, session.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-3xl font-black text-[var(--text-1)] pt-5 border-t border-[var(--border)]">
                    <span>Total</span>
                    <span className="text-[var(--accent)]">{formatPrice(total, session.currency)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2.5 text-[13px] font-bold uppercase tracking-wider text-[var(--text-3)] bg-[var(--surface)] py-4 rounded-2xl border border-[var(--border)] shadow-sm">
                  <Info className="h-4 w-4 text-[var(--accent)]" />
                  Review your order before the staff confirms it
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col items-center text-center max-w-lg"
            >
              <div className="relative mb-10 flex h-32 w-32 items-center justify-center rounded-full bg-[var(--surface)] shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-[var(--border)]">
                <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)] opacity-20 animate-ping" />
                <UtensilsCrossed className="h-12 w-12 text-[var(--accent)]" />
              </div>
              <h2 className="text-5xl font-black tracking-tight text-[var(--text-1)] mb-5">
                Ready to Order?
              </h2>
              <p className="text-xl font-medium text-[var(--text-3)] leading-relaxed">
                Please let our staff know what you&apos;d like. Your items will appear right here as they are added.
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
