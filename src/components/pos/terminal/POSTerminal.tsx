"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import POSTerminalHeader from "./POSTerminalHeader";
import POSTerminalNav, { type POSView } from "./POSTerminalNav";
import POSPaymentQROverlay from "./POSPaymentQROverlay";
import POSCustomerMode from "./POSCustomerMode";
import POSRegister from "@/components/pos/staff/POSRegister";
import POSTables3DView from "./POSTables3DView";
import POSActiveOrders from "@/components/pos/staff/POSActiveOrders";
import POSBilling from "@/components/pos/staff/POSBilling";
import POSHeldOrders from "@/components/pos/staff/POSHeldOrders";
import POSDailySummary from "@/components/pos/staff/POSDailySummary";
import POSSplitBill from "@/components/pos/staff/POSSplitBill";
import POSInactiveScreen from "@/components/pos/staff/POSInactiveScreen";
import { usePOSOrders } from "@/hooks/usePOSOrders";

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
  restaurantSlug: string;
  posEnabled: boolean;
  posTerminalName: string | null;
  posCustomerModeEnabled: boolean;
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

interface SplitOrderRef {
  id: string;
  orderNo: string;
  total: number;
}

const SOUND_KEY = "hh_pos_sound";

export default function POSTerminal() {
  const router = useRouter();

  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<POSView>("register");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableRecord[]>([]);

  // Bridges between views
  const [selectedTableNo, setSelectedTableNo] = useState<number | null>(null);
  const [recalledItems, setRecalledItems] = useState<
    { id: string; name: string; price: number; quantity: number }[] | null
  >(null);
  const [splitOrder, setSplitOrder] = useState<SplitOrderRef | null>(null);

  // Shell overlays / modes
  const [qrOpen, setQROpen] = useState(false);
  const [qrAmount, setQRAmount] = useState<number | null>(null);
  const [customerMode, setCustomerMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // SSE stream
  const { orders: liveOrders, connectionStatus, optimisticUpdate } =
    usePOSOrders(session?.restaurantId ?? null);

  /* ── Load staff session ────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const res = await fetch("/api/staff-session", {
          credentials: "include",
        });
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
    return () => {
      cancelled = true;
    };
  }, [router]);

  /* ── Restore sound preference ──────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      if (raw === "0") setSoundOn(false);
    } catch {
      // ignore
    }
  }, []);

  const toggleSound = useCallback((v: boolean) => {
    setSoundOn(v);
    try {
      localStorage.setItem(SOUND_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  /* ── Load menu/categories/tables ───────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [itemsRes, catsRes, tablesRes] = await Promise.all([
        fetch(`/api/restaurants/${session.restaurantId}/menu`, {
          credentials: "include",
        }),
        fetch(`/api/restaurants/${session.restaurantId}/categories`, {
          credentials: "include",
        }),
        fetch(`/api/restaurants/${session.restaurantId}/tables`, {
          credentials: "include",
        }),
      ]);
      const items = await itemsRes.json();
      const cats = await catsRes.json();
      const tblData = await tablesRes.json();

      setMenuItems(
        Array.isArray(items)
          ? items.filter((i: MenuItem) => i.isAvailable)
          : [],
      );
      setCategories(Array.isArray(cats) ? cats : []);
      const rawTables = Array.isArray(tblData) ? tblData : tblData.tables ?? [];
      setTables(
        rawTables.map((t: { tableNo: number; label: string | null }) => ({
          tableNo: t.tableNo,
          label: t.label,
        })),
      );
    } catch {
      // silent — views handle their own fetch errors
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Keyboard shortcuts (only when not in customer mode / modal) ─ */
  useEffect(() => {
    if (!session || customerMode) return;
    const customerModeAllowed = session.posCustomerModeEnabled;

    function onKey(e: KeyboardEvent) {
      // Skip when typing
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.shiftKey) {
        if (e.key === "Q" || e.key === "q") {
          e.preventDefault();
          setQRAmount(null);
          setQROpen(true);
        } else if (e.key === "C" || e.key === "c") {
          if (customerModeAllowed) {
            e.preventDefault();
            setCustomerMode(true);
          }
        }
        return;
      }

      const map: Record<string, POSView> = {
        "1": "register",
        "2": "orders",
        "3": "tables",
        "4": "billing",
        "5": "held",
        "6": "summary",
      };
      const view = map[e.key];
      if (view) {
        e.preventDefault();
        setActiveView(view);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, customerMode]);

  /* ── Derived counters for nav badges ───────────────────────────── */
  const pendingOrdersCount = useMemo(
    () =>
      liveOrders.filter(
        (o) => !o.isHeld && (o.status === "PENDING" || o.status === "ACCEPTED"),
      ).length,
    [liveOrders],
  );
  const heldOrdersCount = useMemo(
    () => liveOrders.filter((o) => o.isHeld).length,
    [liveOrders],
  );
  const unbilledCount = useMemo(
    () =>
      liveOrders.filter(
        (o) =>
          !o.isHeld &&
          o.status !== "CANCELLED" &&
          o.status !== "REJECTED" &&
          (o.payment?.status ?? "PENDING") !== "COMPLETED",
      ).length,
    [liveOrders],
  );

  /* ── Loading + activation gate ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-white/50">Loading POS…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (!session.posEnabled) {
    return (
      <POSInactiveScreen
        restaurantName={session.restaurantName}
        staffName={session.name}
      />
    );
  }

  /* ── Customer mode takes over the whole screen ─────────────────── */
  if (customerMode) {
    return (
      <POSCustomerMode
        restaurantName={session.restaurantName}
        terminalName={session.posTerminalName ?? "Front Counter"}
        menuItems={menuItems}
        categories={categories}
        currency={session.currency}
        onRequestExit={() => setCustomerMode(false)}
      />
    );
  }

  /* ── Main terminal layout ──────────────────────────────────────── */
  return (
    <div className="dark flex h-screen select-none flex-col overflow-hidden bg-[#0a0a0a] text-white">
      <POSTerminalHeader
        terminalName={session.posTerminalName ?? "Front Counter"}
        restaurantName={session.restaurantName}
        staffName={session.name}
        staffRole={session.role}
        connectionStatus={connectionStatus}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onOpenQR={() => {
          setQRAmount(null);
          setQROpen(true);
        }}
        onFlipToCustomerMode={() => setCustomerMode(true)}
        customerModeAvailable={session.posCustomerModeEnabled}
        newOrdersCount={pendingOrdersCount}
      />

      <div className="flex min-h-0 flex-1">
        <POSTerminalNav
          activeView={activeView}
          onViewChange={setActiveView}
          pendingOrdersCount={pendingOrdersCount}
          heldOrdersCount={heldOrdersCount}
          unbilledCount={unbilledCount}
        />

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeView === "register" && (
            <POSRegister
              restaurantId={session.restaurantId}
              menuItems={menuItems}
              categories={categories}
              tables={tables}
              currency={session.currency}
              taxRate={session.taxRate}
              taxEnabled={session.taxEnabled}
              initialTableNo={selectedTableNo}
              onTableNoConsumed={() => setSelectedTableNo(null)}
              initialItems={recalledItems ?? undefined}
              onInitialItemsConsumed={() => setRecalledItems(null)}
              onOrderCreated={loadData}
            />
          )}

          {activeView === "tables" && (
            <POSTables3DView
              restaurantId={session.restaurantId}
              currency={session.currency}
              onTableSelect={(tableNo) => {
                setSelectedTableNo(tableNo);
                setActiveView("register");
              }}
            />
          )}

          {activeView === "orders" && (
            <POSActiveOrders
              restaurantId={session.restaurantId}
              currency={session.currency}
              orders={liveOrders}
              connectionStatus={connectionStatus}
              onOptimisticUpdate={optimisticUpdate}
            />
          )}

          {activeView === "billing" && (
            <POSBilling
              restaurantId={session.restaurantId}
              currency={session.currency}
              orders={liveOrders}
              onSplitBill={(id, orderNo, total) => {
                setSplitOrder({ id, orderNo, total });
              }}
              onOptimisticUpdate={optimisticUpdate}
              onShowPaymentQR={(amount) => {
                setQRAmount(amount);
                setQROpen(true);
              }}
            />
          )}

          {activeView === "held" && (
            <POSHeldOrders
              restaurantId={session.restaurantId}
              currency={session.currency}
              orders={liveOrders}
              onOptimisticUpdate={optimisticUpdate}
              onRecall={(order) => {
                setRecalledItems(order.items);
                setActiveView("register");
              }}
            />
          )}

          {activeView === "summary" && (
            <POSDailySummary
              restaurantId={session.restaurantId}
              currency={session.currency}
            />
          )}
        </main>
      </div>

      <AnimatePresence>
        {splitOrder && (
          <POSSplitBill
            orderId={splitOrder.id}
            orderNo={splitOrder.orderNo}
            total={splitOrder.total}
            restaurantId={session.restaurantId}
            currency={session.currency}
            onClose={() => setSplitOrder(null)}
            onDone={() => setSplitOrder(null)}
          />
        )}
      </AnimatePresence>

      <POSPaymentQROverlay
        open={qrOpen}
        restaurantId={session.restaurantId}
        restaurantName={session.restaurantName}
        currency={session.currency}
        amount={qrAmount}
        onClose={() => setQROpen(false)}
      />
    </div>
  );
}
