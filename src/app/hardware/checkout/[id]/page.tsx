"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mountain, Loader2, ArrowLeft, Package, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
  sellerName: string;
  isPlatformListing: boolean;
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]";

export default function HardwareCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    quantity: "1",
    buyerName: "",
    buyerPhone: "",
    buyerEmail: "",
    shippingAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch("/api/public/hardware")
      .then((res) => res.json())
      .then((data) => {
        const list: Product[] = Array.isArray(data.products) ? data.products : [];
        const found = list.find((p) => p.id === id);
        if (found) setProduct(found);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const qty = Math.max(1, Number(form.quantity) || 1);
  const total = product ? product.price * qty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/hardware/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: product.id,
          quantity: qty,
          buyerName: form.buyerName,
          buyerPhone: form.buyerPhone,
          buyerEmail: form.buyerEmail,
          shippingAddress: form.shippingAddress,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/hardware/orders/${data.trackToken}`);
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

  if (notFound || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--canvas)] p-6 text-center">
        <Package className="h-12 w-12 text-[var(--text-3)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--text-1)]">Product unavailable</h1>
        <p className="mt-2 text-sm text-[var(--text-2)]">
          This item is no longer listed on the marketplace.
        </p>
        <Link href="/hardware" className="mt-6 text-sm font-bold text-[var(--accent)]">
          Back to marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-[var(--border-soft)]">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <Link
          href="/hardware"
          className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Marketplace
        </Link>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-10 grid md:grid-cols-5 gap-8">
        {/* Product summary */}
        <div className="md:col-span-2">
          <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-sm md:sticky md:top-8">
            <div className="aspect-square rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center overflow-hidden mb-5">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-6" />
              ) : (
                <Package className="h-16 w-16 text-[var(--text-3)]" />
              )}
            </div>
            <h1 className="text-xl font-black text-[var(--text-1)]">{product.name}</h1>
            <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-3">
              Sold by {product.sellerName}
            </p>
            <p className="text-sm font-medium text-[var(--text-2)] mb-5">{product.description}</p>
            <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
              <span className="text-sm font-bold text-[var(--text-2)]">
                {formatPrice(product.price, "NPR")} × {qty}
              </span>
              <span className="text-xl font-black text-[var(--text-1)]">
                {formatPrice(total, "NPR")}
              </span>
            </div>
          </div>
        </div>

        {/* Buyer form */}
        <div className="md:col-span-3">
          <h2 className="text-2xl font-black text-[var(--text-1)] tracking-tight mb-2">
            Your details
          </h2>
          <p className="text-sm font-medium text-[var(--text-2)] mb-6">
            Place the order, then you will pay the seller directly and upload proof. We will
            confirm once the seller verifies your payment.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Quantity</label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={product.stock > 0 ? product.stock : undefined}
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Full name</label>
                <input
                  className={inputClass}
                  value={form.buyerName}
                  onChange={(e) => set("buyerName", e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  className={inputClass}
                  type="tel"
                  inputMode="numeric"
                  value={form.buyerPhone}
                  onChange={(e) => set("buyerPhone", e.target.value)}
                  placeholder="98XXXXXXXX"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  className={inputClass}
                  type="email"
                  value={form.buyerEmail}
                  onChange={(e) => set("buyerEmail", e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Delivery address</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={form.shippingAddress}
                onChange={(e) => set("shippingAddress", e.target.value)}
                placeholder="Where should the seller ship this?"
                required
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Place order — {formatPrice(total, "NPR")}</>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--text-3)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              No payment taken now — you pay the seller directly.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
