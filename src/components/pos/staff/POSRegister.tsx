"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
import { formatPrice } from "@/lib/currency";
import POSMenuGrid from "./POSMenuGrid";
import POSOrderPanel from "./POSOrderPanel";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  categoryId: string;
  category: { name: string };
}

interface TableRecord {
  tableNo: number;
  label: string | null;
}

interface OrderLineItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  restaurantId: string;
  menuItems: MenuItem[];
  categories: Category[];
  tables: TableRecord[];
  currency: string;
  taxRate: number;
  taxEnabled: boolean;
  onOrderCreated: () => void;
}

async function staffFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export default function POSRegister({
  restaurantId, menuItems, categories, tables, currency, taxRate, taxEnabled, onOrderCreated,
}: Props) {
  const { showToast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = useCallback((item: MenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find((o) => o.menuItemId === item.id);
      if (existing) {
        return prev.map((o) => o.menuItemId === item.id ? { ...o, quantity: o.quantity + 1 } : o);
      }
      return [...prev, { id: item.id, menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  }, []);

  const updateQty = (id: string, delta: number) => {
    setOrderItems((prev) =>
      prev.map((o) => o.id === id ? { ...o, quantity: Math.max(0, o.quantity + delta) } : o)
        .filter((o) => o.quantity > 0)
    );
  };

  const voidItem = (id: string) => {
    setOrderItems((prev) => prev.filter((o) => o.id !== id));
  };

  const clearAll = () => setOrderItems([]);

  const sendToKitchen = async (type: "DINE_IN" | "TAKEAWAY", tableNo: number | null, guestName: string, note: string) => {
    if (orderItems.length === 0) return;
    setSubmitting(true);
    try {
      await staffFetch(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        body: JSON.stringify({
          type,
          paymentMethod: "CASH",
          tableNo: tableNo ?? undefined,
          guestName: guestName || undefined,
          note: note || undefined,
          items: orderItems.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      showToast("Order sent to kitchen", "success");
      setOrderItems([]);
      onOrderCreated();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const holdOrder = async (guestName: string, note: string) => {
    if (orderItems.length === 0) return;
    setSubmitting(true);
    try {
      const order = await staffFetch<{ id: string; orderNo: string }>(`/api/restaurants/${restaurantId}/orders`, {
        method: "POST",
        body: JSON.stringify({
          type: "DINE_IN",
          paymentMethod: "CASH",
          guestName: guestName || "Held Order",
          note: note ? `[HELD] ${note}` : "[HELD]",
          items: orderItems.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      // Mark as held
      await staffFetch(`/api/restaurants/${restaurantId}/orders/held`, {
        method: "PATCH",
        body: JSON.stringify({ orderId: order.id, isHeld: true }),
      });
      showToast(`Order #${order.orderNo} held`, "success");
      setOrderItems([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to hold order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = () => {
    showToast("Create order first, then settle from Billing tab", "info");
  };

  return (
    <div className="flex h-full">
      {/* Left: Menu grid */}
      <div className="flex-1 bg-gray-50">
        <POSMenuGrid
          items={menuItems}
          categories={categories}
          currency={currency}
          onItemTap={addItem}
        />
      </div>

      {/* Right: Order panel */}
      <div className="w-[340px] shrink-0">
        <POSOrderPanel
          items={orderItems}
          tables={tables}
          currency={currency}
          taxRate={taxRate}
          taxEnabled={taxEnabled}
          submitting={submitting}
          onUpdateQty={updateQty}
          onVoidItem={voidItem}
          onClear={clearAll}
          onSendToKitchen={sendToKitchen}
          onHoldOrder={holdOrder}
          onSettle={handleSettle}
        />
      </div>
    </div>
  );
}
