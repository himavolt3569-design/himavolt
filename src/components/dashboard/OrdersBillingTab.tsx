"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ClipboardList, Receipt, Loader2 } from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";

/**
 * The unified "Orders & Billing" workspace, shown on the dashboard when the
 * owner has switched on `RestaurantCapability.mergeBillingOrders`.
 *
 * Why one page: staff sat on the Billing screen while new orders piled up
 * unaccepted on the Live Orders screen. Two screens for one job meant orders
 * stranded in PENDING and guests waited on food nobody had started.
 *
 * The segmented switch deliberately mirrors the one `/kitchen` already uses for
 * the same flag — staff moving between the dashboard, the counter and the
 * kitchen should not have to learn a third layout. Both halves are the existing
 * components, unchanged, so nothing about billing or order handling shifts; only
 * where they live does.
 */

const TabLoader = () => (
  <div className="flex min-h-[240px] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
  </div>
);

const LiveOrdersTab = dynamic(
  () => import("@/components/dashboard/LiveOrdersTab"),
  { loading: TabLoader },
);
const BillingTab = dynamic(() => import("@/components/billing/BillingTab"), {
  loading: TabLoader,
});

type View = "orders" | "billing";

interface Props {
  restaurantId?: string;
  staffRole?: string;
  currency?: string;
  /** `/dashboard/billing` deep-links straight to the billing half. */
  initialView?: View;
}

const VIEWS: { id: View; label: string; icon: typeof ClipboardList }[] = [
  { id: "orders", label: "Live Orders", icon: ClipboardList },
  { id: "billing", label: "Billing", icon: Receipt },
];

export default function OrdersBillingTab({
  restaurantId,
  staffRole,
  currency,
  initialView = "orders",
}: Props) {
  const [view, setView] = useState<View>(initialView);
  const { selectedRestaurant } = useRestaurant();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight text-[var(--text-1)]">
          Orders &amp; Billing
        </h1>
        <p className="mt-0.5 text-[12px] text-[var(--text-2)]">
          Accept incoming orders and settle bills without leaving the page.
        </p>
      </div>

      <div className="inline-flex rounded-2xl bg-[var(--canvas-sub)] p-1 ring-1 ring-[var(--border)]">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
              view === id
                ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
                : "text-[var(--text-3)] hover:text-[var(--text-2)]"
            }`}
          >
            <Icon
              className={`h-4 w-4 ${view === id ? "text-[var(--accent)]" : ""}`}
            />
            {label}
          </button>
        ))}
      </div>

      {/* Both halves stay mounted-on-demand rather than rendered together: the
          live-orders board and the billing list each hold their own SSE stream,
          and running both at once doubles the connections for no benefit. */}
      {view === "orders" ? (
        <LiveOrdersTab />
      ) : (
        <BillingTab
          restaurantId={restaurantId}
          staffRole={staffRole}
          currency={currency ?? selectedRestaurant?.currency ?? "NPR"}
        />
      )}
    </div>
  );
}
