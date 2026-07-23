"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Mountain, Loader2, Clock, CheckCircle2, XCircle, Archive, Package } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Listing {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
  status: string;
  rejectionNote: string | null;
  sellerName: string;
  sellerPayoutNote: string;
  createdAt: string;
}
interface Order {
  id: string;
  quantity: number;
  total: number;
  commissionAmount: number;
  status: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string | null;
  createdAt: string;
}
interface Payload {
  listing: Listing;
  orders: Order[];
  commission: { rate: number; owed: number; settled: number };
}

const STATUS_META: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  PENDING_REVIEW: { label: "Awaiting review", icon: Clock, cls: "bg-amber-50 text-amber-600" },
  APPROVED: { label: "Live on marketplace", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-600" },
  REJECTED: { label: "Rejected", icon: XCircle, cls: "bg-red-50 text-red-600" },
  ARCHIVED: { label: "Archived", icon: Archive, cls: "bg-gray-100 text-gray-500" },
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Placed",
  AWAITING_VERIFICATION: "Proof uploaded",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export default function SellerStatusPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public/hardware/listings/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas)] p-6 text-center">
        <XCircle className="h-12 w-12 text-[var(--text-3)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--text-1)]">Listing not found</h1>
        <p className="mt-2 text-sm text-[var(--text-2)]">This status link is invalid.</p>
        <Link href="/hardware" className="mt-6 text-sm font-bold text-[var(--accent)]">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const { listing, orders, commission } = data;
  const sm = STATUS_META[listing.status] ?? STATUS_META.PENDING_REVIEW;
  const SIcon = sm.icon;

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-[var(--border-soft)]">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <Link href="/hardware" className="text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)]">
          Marketplace
        </Link>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Listing card */}
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center overflow-hidden">
              {listing.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-7 w-7 text-[var(--text-3)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-[var(--text-1)]">{listing.name}</h1>
              <p className="text-sm font-bold text-[var(--text-2)]">
                {formatPrice(listing.price, "NPR")} · {listing.type} · {listing.stock} in stock
              </p>
            </div>
          </div>
          <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${sm.cls}`}>
            <SIcon className="h-3.5 w-3.5" />
            {sm.label}
          </div>
          {listing.status === "REJECTED" && listing.rejectionNote && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {listing.rejectionNote}
            </p>
          )}
        </div>

        {/* Commission ledger */}
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-3)] mb-4">
            Commission to HimaVolt ({commission.rate}%)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-black text-[var(--text-1)]">
                {formatPrice(commission.owed, "NPR")}
              </p>
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Owed</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[var(--text-1)]">
                {formatPrice(commission.settled, "NPR")}
              </p>
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Settled</p>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-3)] mb-4">
            Orders ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-1)] truncate">
                      {o.quantity}× — {o.buyerName}
                    </p>
                    <p className="text-xs text-[var(--text-3)]">{o.buyerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--text-1)]">
                      {formatPrice(o.total, "NPR")}
                    </p>
                    <p className="text-[11px] font-bold text-[var(--text-3)] uppercase tracking-wider">
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
