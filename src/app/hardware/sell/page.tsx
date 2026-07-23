"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mountain, Loader2, CheckCircle2, Copy, ArrowLeft } from "lucide-react";
import HardwareImageUpload from "@/components/hardware/HardwareImageUpload";

const TYPES = ["Terminal", "Screen", "Printer", "Accessory"] as const;

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)] transition-colors";
const labelClass =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]";

export default function SellHardwarePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "Terminal",
    price: "",
    stock: "1",
    imageUrl: "",
    sellerName: "",
    sellerPhone: "",
    sellerEmail: "",
    sellerPayoutNote: "",
    sellerPaymentQr: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/hardware/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          type: form.type,
          price: Number(form.price),
          stock: Number(form.stock || "1"),
          imageUrl: form.imageUrl,
          sellerName: form.sellerName,
          sellerPhone: form.sellerPhone,
          sellerEmail: form.sellerEmail,
          sellerPayoutNote: form.sellerPayoutNote,
          sellerPaymentQr: form.sellerPaymentQr,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setManageToken(data.manageToken);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const statusUrl =
    manageToken && typeof window !== "undefined"
      ? `${window.location.origin}/hardware/sell/${manageToken}`
      : "";

  if (manageToken) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--canvas)] p-8 shadow-xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-muted)]">
            <CheckCircle2 className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text-1)]">Submitted for review</h1>
          <p className="mt-2 text-sm font-medium text-[var(--text-2)]">
            Our team will review your listing shortly. Save this link to check its status —
            it is the only way back to this listing.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-[var(--surface-alt)] p-3">
            <span className="flex-1 truncate text-left text-xs font-mono text-[var(--text-2)]">
              {statusUrl}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(statusUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 flex items-center gap-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-1)]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => router.push(`/hardware/sell/${manageToken}`)}
            className="mt-6 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            View my listing
          </button>
          <Link
            href="/hardware"
            className="mt-3 inline-block text-sm font-bold text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            Back to marketplace
          </Link>
        </div>
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
          className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Marketplace
        </Link>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-6 py-10">
        <h1 className="text-3xl font-black text-[var(--text-1)] tracking-tight">
          Sell your hardware
        </h1>
        <p className="mt-2 text-sm font-medium text-[var(--text-2)]">
          List a product on the HimaVolt marketplace — no account needed. Once approved,
          buyers pay you directly. HimaVolt takes a 5% commission on each confirmed sale.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className={labelClass}>Product name</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. 15-inch POS Terminal"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Specs, condition, what's included…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select
                className={`${inputClass} cursor-pointer`}
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Price (NPR)</label>
              <input
                className={inputClass}
                type="number"
                min={1}
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="45000"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Units available</label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
              placeholder="1"
            />
          </div>

          <HardwareImageUpload
            label="Product photo (optional)"
            hint="JPEG, PNG or WebP · up to 5MB"
            value={form.imageUrl}
            onChange={(url) => set("imageUrl", url)}
          />

          <hr className="border-[var(--border-soft)]" />

          <div>
            <label className={labelClass}>Your name</label>
            <input
              className={inputClass}
              value={form.sellerName}
              onChange={(e) => set("sellerName", e.target.value)}
              placeholder="Full name or business name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                className={inputClass}
                type="tel"
                inputMode="numeric"
                value={form.sellerPhone}
                onChange={(e) => set("sellerPhone", e.target.value)}
                placeholder="98XXXXXXXX"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                type="email"
                value={form.sellerEmail}
                onChange={(e) => set("sellerEmail", e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>How should buyers pay you?</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              value={form.sellerPayoutNote}
              onChange={(e) => set("sellerPayoutNote", e.target.value)}
              placeholder="e.g. eSewa 98XXXXXXXX, or NIC Asia a/c 1234567890 (Ram Bahadur)"
              required
            />
          </div>

          <HardwareImageUpload
            label="Payment QR (optional — buyers scan to pay)"
            hint="eSewa / Khalti / Fonepay / bank QR · PNG or JPEG"
            aspect="square"
            value={form.sellerPaymentQr}
            onChange={(url) => set("sellerPaymentQr", url)}
          />

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
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
          </button>
        </form>
      </main>
    </div>
  );
}
