"use client";

import { useState } from "react";
import {
  Printer,
  Receipt,
  ChefHat,
  Image as ImageIcon,
  QrCode,
  Check,
  Loader2,
} from "lucide-react";
import { useRestaurant, type Restaurant } from "@/context/RestaurantContext";
import {
  resolvePrintSettings,
  type PrintSettings,
  type PaperWidth,
} from "@/lib/print-settings";

async function save(rid: string, body: PrintSettings) {
  const res = await fetch(`/api/restaurants/${rid}/print-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save");
  return res.json();
}

/* ── Width picker ────────────────────────────────────────────────── */

function WidthPicker({
  value,
  onChange,
}: {
  value: PaperWidth;
  onChange: (w: PaperWidth) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {([80, 58] as PaperWidth[]).map((w) => {
        const active = value === w;
        return (
          <button
            key={w}
            type="button"
            onClick={() => onChange(w)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-4 transition-all ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                : "border-[var(--border)] hover:border-[var(--accent)]/40"
            }`}
          >
            <span className="text-2xl font-extrabold text-[var(--text-1)]">
              {w}mm
            </span>
            <span className="text-[12px] text-[var(--text-3)]">
              {w === 80 ? "Standard roll" : "Compact roll"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-soft)] px-4 py-3.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--canvas-sub)] text-[var(--accent)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--text-1)]">{label}</p>
        <p className="text-[12px] text-[var(--text-3)]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

/* ── Form (keyed by restaurant so it re-seeds cleanly on switch) ──── */

function PrintingForm({
  restaurant,
  onSaved,
}: {
  restaurant: Restaurant;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<PrintSettings>(() =>
    resolvePrintSettings(restaurant),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(false);
    try {
      await save(restaurant.id, draft);
      await onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError(true);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-muted)]">
          <Printer className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text-1)]">
            Printing &amp; Receipts
          </h1>
          <p className="text-sm text-[var(--text-3)]">
            Set your printer paper size once — it applies everywhere: bills,
            kitchen tickets (KOT) and bar tickets (BOT).
          </p>
        </div>
      </div>

      {/* Counter printer */}
      <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-sm font-extrabold text-[var(--text-1)]">
            Counter printer
          </h2>
        </div>
        <p className="text-[12px] text-[var(--text-3)] mb-4">
          Used for the customer bill and the POS counter receipt.
        </p>
        <WidthPicker
          value={draft.counterWidth}
          onChange={(counterWidth) => setDraft((d) => ({ ...d, counterWidth }))}
        />
      </div>

      {/* Kitchen printer */}
      <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5">
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-sm font-extrabold text-[var(--text-1)]">
            Kitchen printer
          </h2>
        </div>
        <p className="text-[12px] text-[var(--text-3)] mb-4">
          Used for the Kitchen Order Ticket (KOT) and Bar Order Ticket (BOT).
        </p>
        <WidthPicker
          value={draft.kitchenWidth}
          onChange={(kitchenWidth) => setDraft((d) => ({ ...d, kitchenWidth }))}
        />
      </div>

      {/* Customer bill options */}
      <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 space-y-3">
        <h2 className="text-sm font-extrabold text-[var(--text-1)]">
          Customer bill
        </h2>
        <Toggle
          icon={<ImageIcon className="h-5 w-5" />}
          label="Show logo"
          hint={
            restaurant.imageUrl
              ? "Prints your saved logo at the top of the bill"
              : "Upload a logo in your restaurant profile to use this"
          }
          checked={draft.showLogo}
          onChange={(showLogo) => setDraft((d) => ({ ...d, showLogo }))}
        />
        <Toggle
          icon={<QrCode className="h-5 w-5" />}
          label="Show feedback QR"
          hint="Guests scan it to rate their experience and read your replies"
          checked={draft.showFeedbackQR}
          onChange={(showFeedbackQR) =>
            setDraft((d) => ({ ...d, showFeedbackQR }))
          }
        />
      </div>

      {/* Automatic printing */}
      <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--canvas)] p-5 space-y-3">
        <h2 className="text-sm font-extrabold text-[var(--text-1)]">
          Automatic printing
        </h2>
        <Toggle
          icon={<Printer className="h-5 w-5" />}
          label="Auto-print receipt on payment"
          hint="As soon as a bill is settled, the customer receipt prints automatically — no extra tap."
          checked={draft.autoPrint}
          onChange={(autoPrint) => setDraft((d) => ({ ...d, autoPrint }))}
        />
        <Toggle
          icon={<ChefHat className="h-5 w-5" />}
          label="Auto-print kitchen ticket on accept"
          hint="When staff accepts a new order, the kitchen ticket (KOT) prints straight to the kitchen roll."
          checked={draft.autoPrintKOT}
          onChange={(autoPrintKOT) => setDraft((d) => ({ ...d, autoPrintKOT }))}
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors shadow-sm shadow-[var(--accent)]/20 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}
        </button>
        {error && (
          <span className="text-[13px] font-bold text-red-500">
            Couldn&rsquo;t save — please try again.
          </span>
        )}
      </div>
    </div>
  );
}

export default function PrintingSettingsTab() {
  const { selectedRestaurant, fetchRestaurants } = useRestaurant();

  if (!selectedRestaurant) {
    return null;
  }

  return (
    <PrintingForm
      key={selectedRestaurant.id}
      restaurant={selectedRestaurant}
      onSaved={fetchRestaurants}
    />
  );
}
