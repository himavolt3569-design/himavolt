"use client";

import { type ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { LocationProvider } from "@/context/LocationContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";
import { LiveOrdersProvider } from "@/context/LiveOrdersContext";
import { RestaurantProvider } from "@/context/RestaurantContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PwaInstallProvider } from "@/context/PwaInstallContext";
import { registerServiceWorker } from "@/lib/sw-registration";
import { createQueryClient } from "@/lib/query-client";
// Static import (renders null until mounted) rather than dynamic(ssr:false), so
// it adds no server-rendered Suspense placeholder that would shift sibling
// hydration and trip a mismatch on the ToastProvider subtree.
import AccountSetupModal from "@/components/shared/AccountSetupModal";

const NotificationSetup = dynamic(
  () => import("@/components/shared/NotificationSetup"),
  { ssr: false },
);

const PresenceTracker = dynamic(
  () => import("@/components/shared/PresenceTracker"),
  { ssr: false },
);

const OAuthLandingRedirect = dynamic(
  () => import("@/components/shared/OAuthLandingRedirect"),
  { ssr: false },
);

// Onboarding's closing beat. Renders null until it has both a signed-in account
// past the password step and a featured video, so it costs nothing otherwise.
const DemoPromptModal = dynamic(
  () => import("@/components/tutorials/DemoPromptModal"),
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
          <PwaInstallProvider>
          <AuthProvider>
            <OAuthLandingRedirect />
            <AccountSetupModal />
            <DemoPromptModal />
            <RestaurantProvider>
              {/* Above the cart: the header's location picker and every nearby
                  rail must agree on one answer, and it is needed before a
                  customer has added anything to a basket. */}
              <LocationProvider>
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
              </LocationProvider>
            </RestaurantProvider>
          </AuthProvider>
          </PwaInstallProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
