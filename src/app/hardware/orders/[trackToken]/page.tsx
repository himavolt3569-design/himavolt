"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Mountain,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  Upload,
  QrCode,
} from "lucide-react";
import { formatPrice } from "@/lib/currency";
import HardwareImageUpload from "@/components/hardware/HardwareImageUpload";

interface Order {
  id: string;
  trackToken: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: string | null;
  proofUrl: string | null;
  rejectionNote: string | null;
  createdAt: string;
  listing: {
    name: string;
    type: string;
    imageUrl: string;
    sellerName: string;
    sellerPhone: string;
    sellerPayoutNote: string;
    sellerPaymentQr: string;
  } | null;
}

const STEPS = ["PENDING", "AWAITING_VERIFICATION", "CONFIRMED"] as const;
const STATUS_META: Record<string, { label: string; sub: string; icon: typeof Clock; cls: string }> = {
  PENDING: {
    label: "Order placed",
    sub: "Pay the seller and upload your proof below.",
    icon: Clock,
    cls: "bg-amber-50 text-amber-600",
  },
  AWAITING_VERIFICATION: {
    label: "Proof uploaded",
    sub: "The seller is verifying your payment.",
    icon: Upload,
    cls: "bg-blue-50 text-blue-600",
  },
  CONFIRMED: {
    label: "Confirmed",
    sub: "Payment verified. Your hardware is on its way.",
    icon: CheckCircle2,
    cls: "bg-emerald-50 text-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    sub: "This order was cancelled.",
    icon: XCircle,
    cls: "bg-red-50 text-red-600",
  },
};

export default function HardwareOrderStatusPage() {
  const { trackToken } = useParams<{ trackToken: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/public/hardware/orders/${trackToken}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setOrder(data.order))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [trackToken]);

  useEffect(() => load(), [load]);

  const handleProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/hardware/orders/${trackToken}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setProofUrl("");
      setSubmitting(false);
      load();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas)] p-6 text-center">
        <Package className="h-12 w-12 text-[var(--text-3)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--text-1)]">Order not found</h1>
        <p className="mt-2 text-sm text-[var(--text-2)]">This tracking link is invalid.</p>
        <Link href="/hardware" className="mt-6 text-sm font-bold text-[var(--accent)]">
          Back to marketplace
        </Link>
      </div>
    );
  }

  const sm = STATUS_META[order.status] ?? STATUS_META.PENDING;
  const SIcon = sm.icon;
  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const canUploadProof = order.status === "PENDING" || order.status === "AWAITING_VERIFICATION";

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
        {/* Status header */}
        <div className="rounded-3xl border border-[var(--border-soft)] bg-white p-6 shadow-sm">
          <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold ${sm.cls}`}>
            <SIcon className="h-4 w-4" />
            {sm.label}
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--text-2)]">{sm.sub}</p>

          {order.status !== "CANCELLED" && (
            <div className="mt-6 flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full ${
                      i <= stepIndex ? "bg-[var(--accent)]" : "bg-[var(--surface-alt)]"
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="rounded-3xl border border-[var(--border-soft)] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center overflow-hidden">
              {order.listing?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.listing.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-7 w-7 text-[var(--text-3)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-[var(--text-1)]">
                {order.listing?.name ?? "Hardware"}
              </h1>
              <p className="text-sm font-bold text-[var(--text-2)]">
                {order.quantity} × {formatPrice(order.unitPrice, "NPR")}
              </p>
              <p className="text-xs text-[var(--text-3)]">
                Sold by {order.listing?.sellerName ?? "seller"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-[var(--text-1)]">
                {formatPrice(order.total, "NPR")}
              </p>
            </div>
          </div>
        </div>

        {/* Seller payment instructions */}
        {order.status !== "CONFIRMED" &&
          order.status !== "CANCELLED" &&
          order.listing &&
          (order.listing.sellerPayoutNote || order.listing.sellerPaymentQr) && (
            <div className="rounded-3xl border border-[var(--accent)]/30 bg-[var(--accent-muted)] p-6">
              <h2 className="flex items-center gap-2 text-sm font-black text-[var(--accent-text)] mb-3">
                <Wallet className="h-4 w-4" />
                How to pay the seller
              </h2>

              {order.listing.sellerPaymentQr && (
                <div className="mb-4 flex flex-col items-center">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.listing.sellerPaymentQr}
                      alt="Seller payment QR"
                      className="h-52 w-52 object-contain"
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[var(--text-2)]">
                    <QrCode className="h-3.5 w-3.5" />
                    Scan to pay
                  </p>
                </div>
              )}

              {order.listing.sellerPayoutNote && (
                <p className="text-sm font-medium text-[var(--text-1)] whitespace-pre-wrap">
                  {order.listing.sellerPayoutNote}
                </p>
              )}
              <p className="mt-3 text-xs font-medium text-[var(--text-2)]">
                Seller contact: {order.listing.sellerPhone}
              </p>
            </div>
          )}

        {/* Proof upload */}
        {canUploadProof && (
          <div className="rounded-3xl border border-[var(--border-soft)] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-[var(--text-1)] mb-1">
              {order.proofUrl ? "Update payment proof" : "Upload payment proof"}
            </h2>
            <p className="text-xs font-medium text-[var(--text-2)] mb-4">
              Upload a screenshot of your payment to the seller.
            </p>
            <form onSubmit={handleProof} className="space-y-3">
              <HardwareImageUpload
                label="Payment screenshot"
                hint="JPEG, PNG or WebP · up to 5MB"
                aspect="square"
                value={proofUrl}
                onChange={setProofUrl}
              />
              {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !proofUrl}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {order.proofUrl ? "Replace proof" : "Submit proof"}
                  </>
                )}
              </button>
            </form>
            {order.proofUrl && (
              <p className="mt-3 text-xs font-medium text-emerald-600">
                Proof received — awaiting the seller&apos;s verification.
              </p>
            )}
          </div>
        )}

        {order.status === "CANCELLED" && order.rejectionNote && (
          <div className="rounded-3xl bg-red-50 p-6">
            <p className="text-sm font-medium text-red-600">{order.rejectionNote}</p>
          </div>
        )}
      </main>
    </div>
  );
}
