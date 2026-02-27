"use client";

import { type ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";
import { LiveOrdersProvider } from "@/context/LiveOrdersContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <OrderProvider>
        <LiveOrdersProvider>
          <ToastProvider>{children}</ToastProvider>
        </LiveOrdersProvider>
      </OrderProvider>
    </CartProvider>
  );
}
