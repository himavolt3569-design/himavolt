"use client";

import { useState } from "react";
import { Megaphone, Ticket } from "lucide-react";
import OffersTab from "./OffersTab";
import CouponManagementTab from "./CouponManagementTab";

/**
 * Offers and Coupons merged into one page with a segmented sub-tab switch.
 * Both panels stay mounted and are toggled with `hidden`, so flipping between
 * them is instant — no re-fetch, no loading, no re-render flash.
 */
export default function OffersCouponsTab({
  initialTab = "offers",
}: {
  initialTab?: "offers" | "coupons";
}) {
  const [tab, setTab] = useState<"offers" | "coupons">(initialTab);

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-2xl bg-[var(--canvas-sub)] p-1 ring-1 ring-[var(--border)]">
        <button
          onClick={() => setTab("offers")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
            tab === "offers"
              ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
              : "text-[var(--text-3)] hover:text-[var(--text-2)]"
          }`}
        >
          <Megaphone className={`h-4 w-4 ${tab === "offers" ? "text-[var(--accent)]" : ""}`} />
          Offers
        </button>
        <button
          onClick={() => setTab("coupons")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-colors ${
            tab === "coupons"
              ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm"
              : "text-[var(--text-3)] hover:text-[var(--text-2)]"
          }`}
        >
          <Ticket className={`h-4 w-4 ${tab === "coupons" ? "text-[var(--accent)]" : ""}`} />
          Coupons
        </button>
      </div>

      {/* Both stay mounted; only visibility toggles so switching is instant. */}
      <div className={tab === "offers" ? "" : "hidden"}>
        <OffersTab />
      </div>
      <div className={tab === "coupons" ? "" : "hidden"}>
        <CouponManagementTab />
      </div>
    </div>
  );
}
