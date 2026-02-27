"use client";

import { type ReactNode } from "react";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <OrderProvider>
        <ToastProvider>{children}</ToastProvider>
      </OrderProvider>
    </CartProvider>
  );
}
