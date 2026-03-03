"use client";

import { type ReactNode, useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";
import { LiveOrdersProvider } from "@/context/LiveOrdersContext";
import { RestaurantProvider } from "@/context/RestaurantContext";
import { registerServiceWorker } from "@/lib/sw-registration";
import NotificationSetup from "@/components/shared/NotificationSetup";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
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
  );
}
