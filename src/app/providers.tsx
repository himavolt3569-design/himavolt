"use client";

import { type ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";
import { LiveOrdersProvider } from "@/context/LiveOrdersContext";
import { RestaurantProvider } from "@/context/RestaurantContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { registerServiceWorker } from "@/lib/sw-registration";
import { createQueryClient } from "@/lib/query-client";

const NotificationSetup = dynamic(
  () => import("@/components/shared/NotificationSetup"),
  { ssr: false },
);

const PresenceTracker = dynamic(
  () => import("@/components/shared/PresenceTracker"),
  { ssr: false },
);

const SERVICE_WORKER_DELAY_MS = 3_000;
const BACKGROUND_EFFECTS_DELAY_MS = 8_000;

export default function Providers({ children }: { children: ReactNode }) {
  const [backgroundEffectsReady, setBackgroundEffectsReady] = useState(false);
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    const timer = window.setTimeout(
      registerServiceWorker,
      SERVICE_WORKER_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setBackgroundEffectsReady(true),
      BACKGROUND_EFFECTS_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RestaurantProvider>
              <CartProvider>
                <OrderProvider>
                  <LiveOrdersProvider>
                    {children}
                    {backgroundEffectsReady && (
                      <>
                        <NotificationSetup />
                        <PresenceTracker />
                      </>
                    )}
                  </LiveOrdersProvider>
                </OrderProvider>
              </CartProvider>
            </RestaurantProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
