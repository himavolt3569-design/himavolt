"use client";

import { type ReactNode, useEffect } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";
import { LiveOrdersProvider } from "@/context/LiveOrdersContext";
import { RestaurantProvider } from "@/context/RestaurantContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { registerServiceWorker } from "@/lib/sw-registration";
import NotificationSetup from "@/components/shared/NotificationSetup";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <RestaurantProvider>
          <CartProvider>
            <OrderProvider>
              <LiveOrdersProvider>
                <ToastProvider>
                  {children}
                  <NotificationSetup />
                </ToastProvider>
              </LiveOrdersProvider>
            </OrderProvider>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
