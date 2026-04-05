"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import POSHeader, { type POSView } from "@/components/pos/staff/POSHeader";
import POSRegister from "@/components/pos/staff/POSRegister";
import POSTableView from "@/components/pos/staff/POSTableView";
import POSActiveOrders from "@/components/pos/staff/POSActiveOrders";
import POSBilling from "@/components/pos/staff/POSBilling";
import POSSplitBill from "@/components/pos/staff/POSSplitBill";
import POSHeldOrders from "@/components/pos/staff/POSHeldOrders";
import POSDailySummary from "@/components/pos/staff/POSDailySummary";

/* ── Types ─────────────────────────────────────────────────────────── */

interface StaffSession {
  userId: string;
  staffId: string;
  restaurantId: string;
  role: string;
  name: string;
  restaurantType: string;
  currency: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  taxRate: number;
  taxEnabled: boolean;
}

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

interface BillOrder {
  id: string;
  orderNo: string;
  tableNo: number | null;
  guestName: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  type: string;
  createdAt: string;
  items: { id: string; name: string; quantity: number; price: number }[];
  payment?: { method: string; status: string; amount: number } | null;
  bill?: { id: string; billNo: string; subtotal: number; tax: number; serviceCharge: number; discount: number; total: number; paidVia: string | null } | null;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function StaffPOSPage() {
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<POSView>("register");

  // Data for register view
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableRecord[]>([]);

  // Split bill modal
  const [splitOrder, setSplitOrder] = useState<BillOrder | null>(null);

  // Load staff session
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/staff-session", { credentials: "include" });
        if (!res.ok) {
          router.push("/staff-login");
          return;
        }
        const data = await res.json();
        setSession(data);
      } catch {
        router.push("/staff-login");
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [router]);

  // Load menu, categories, tables when session is available
  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [itemsRes, catsRes, tablesRes] = await Promise.all([
        fetch(`/api/restaurants/${session.restaurantId}/menu`, { credentials: "include" }),
        fetch(`/api/restaurants/${session.restaurantId}/categories`, { credentials: "include" }),
        fetch(`/api/restaurants/${session.restaurantId}/tables`, { credentials: "include" }),
      ]);
      const items = await itemsRes.json();
      const cats = await catsRes.json();
      const tblData = await tablesRes.json();

      setMenuItems(Array.isArray(items) ? items.filter((i: MenuItem) => i.isAvailable) : []);
      setCategories(Array.isArray(cats) ? cats : []);
      const rawTables = Array.isArray(tblData) ? tblData : tblData.tables ?? [];
      setTables(rawTables.map((t: { tableNo: number; label: string | null }) => ({ tableNo: t.tableNo, label: t.label })));
    } catch {
      // silent
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm font-medium text-gray-500">Loading POS...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 select-none overflow-hidden">
      <POSHeader
        restaurantName={session.restaurantName}
        staffName={session.name}
        staffRole={session.role}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="flex-1 overflow-hidden">
        {activeView === "register" && (
          <POSRegister
            restaurantId={session.restaurantId}
            menuItems={menuItems}
            categories={categories}
            tables={tables}
            currency={session.currency}
            taxRate={session.taxRate}
            taxEnabled={session.taxEnabled}
            onOrderCreated={loadData}
          />
        )}

        {activeView === "tables" && (
          <POSTableView
            restaurantId={session.restaurantId}
            currency={session.currency}
            onTableSelect={(tableNo) => {
              setActiveView("register");
              // The register will handle table selection from its own state
            }}
          />
        )}

        {activeView === "orders" && (
          <POSActiveOrders
            restaurantId={session.restaurantId}
            currency={session.currency}
          />
        )}

        {activeView === "billing" && (
          <POSBilling
            restaurantId={session.restaurantId}
            currency={session.currency}
            onSplitBill={(order) => setSplitOrder(order)}
          />
        )}

        {activeView === "held" && (
          <POSHeldOrders
            restaurantId={session.restaurantId}
            currency={session.currency}
            onRecall={() => {
              setActiveView("orders");
            }}
          />
        )}

        {activeView === "summary" && (
          <POSDailySummary
            restaurantId={session.restaurantId}
            currency={session.currency}
          />
        )}
      </div>

      {/* Split bill modal */}
      <AnimatePresence>
        {splitOrder && (
          <POSSplitBill
            orderId={splitOrder.id}
            orderNo={splitOrder.orderNo}
            total={splitOrder.bill?.total ?? splitOrder.total}
            restaurantId={session.restaurantId}
            currency={session.currency}
            onClose={() => setSplitOrder(null)}
            onDone={() => {
              setSplitOrder(null);
              // Billing will auto-refresh
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
