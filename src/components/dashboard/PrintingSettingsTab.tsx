"use client";

import { useState } from "react";
import {
  Printer,
  Receipt,
  ChefHat,
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
      {/* Flex-based track, not absolute positioning. The knob used to be
          `absolute` with no `left`, so its origin was its static position —
          which sits after the button's default UA padding. `translate-x-[22px]`
          then pushed it past the 44px track and it clipped out of sight. With
          inline-flex the knob simply slides inside the padding box, so no
          browser's button padding can misalign it.
          Geometry: 44px track − 2px padding each side = 40px; 20px knob;
          translate-x-5 (20px) lands it flush right with 2px to spare. */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--text-3)]/35"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
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
            Set your printer paper size once. It applies everywhere: bills,
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
          hint="As soon as a bill is settled, the customer receipt prints automatically, no extra tap."
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
        <Toggle
          icon={<Receipt className="h-5 w-5" />}
          label="Auto-print bill on accept"
          hint="Counter, takeaway and delivery orders print an unpaid bill the moment staff accepts. Dine-in tables print a kitchen ticket instead — a table is billed once at the end, not once per round."
          checked={draft.autoPrintBillOnAccept}
          onChange={(autoPrintBillOnAccept) =>
            setDraft((d) => ({ ...d, autoPrintBillOnAccept }))
          }
        />
        {/* Say the two-slip consequence out loud. Owners switch both on assuming
            one printout and then wonder why every order prints twice. */}
        {draft.autoPrintBillOnAccept && draft.autoPrint && (
          <div className="rounded-2xl bg-[var(--accent-muted)] px-4 py-3 text-[12px] font-semibold leading-snug text-[var(--accent-text)]">
            Both are on, so a counter order prints{" "}
            <strong>two slips</strong>: an unpaid bill when it is accepted, then
            the paid receipt when it is settled. Switch one off if you only want
            one.
          </div>
        )}
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
            Couldn&rsquo;t save, please try again.
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
