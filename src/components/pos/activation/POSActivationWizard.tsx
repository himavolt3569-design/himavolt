"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Zap,
  Monitor,
  Receipt,
  Banknote,
  MonitorSmartphone,
  Sparkles,
  Copy,
  ExternalLink,
} from "lucide-react";

interface Props {
  restaurantId: string;
  restaurantSlug: string;
  restaurantCode: string | null;
  restaurantName: string;
  initial?: {
    terminalName?: string | null;
    openingCash?: number;
    taxRate?: number;
    taxEnabled?: boolean;
    serviceChargeRate?: number;
    serviceChargeEnabled?: boolean;
    customerModeEnabled?: boolean;
    customerExitCombo?: {
      ctrl: boolean;
      shift: boolean;
      alt: boolean;
      key: string;
    } | null;
  };
  alreadyActive?: boolean;
  onClose: () => void;
  onActivated: (result: {
    slug: string;
    terminalName: string;
    alreadyActive: boolean;
  }) => void;
}

type StepId = "terminal" | "charges" | "cash" | "review" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "terminal", label: "Terminal" },
  { id: "charges", label: "Charges" },
  { id: "cash", label: "Cash drawer" },
  { id: "review", label: "Review" },
];

export default function POSActivationWizard({
  restaurantId,
  restaurantSlug,
  restaurantCode,
  restaurantName,
  initial,
  alreadyActive,
  onClose,
  onActivated,
}: Props) {
  const [stepIdx, setStepIdx] = useState(0);

  const [terminalName, setTerminalName] = useState(
    initial?.terminalName?.trim() || "Front Counter",
  );
  const [customerModeEnabled, setCustomerModeEnabled] = useState(
    initial?.customerModeEnabled ?? true,
  );
  const [taxEnabled, setTaxEnabled] = useState(initial?.taxEnabled ?? true);
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 13);
  const [serviceEnabled, setServiceEnabled] = useState(
    initial?.serviceChargeEnabled ?? true,
  );
  const [serviceRate, setServiceRate] = useState(initial?.serviceChargeRate ?? 10);
  const [openingCash, setOpeningCash] = useState(initial?.openingCash ?? 2000);
  const [exitCombo, setExitCombo] = useState(
    initial?.customerExitCombo ?? {
      ctrl: true,
      shift: true,
      alt: false,
      key: "x",
    },
  );
  const [capturing, setCapturing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const current = stepIdx < STEPS.length ? STEPS[stepIdx].id : ("done" as StepId);

  function next() {
    setError(null);
    if (current === "terminal" && !terminalName.trim()) {
      setError("Give the terminal a short name, e.g. “Front Counter”.");
      return;
    }
    if (current === "charges" && (taxRate < 0 || taxRate > 100)) {
      setError("Tax rate must be between 0 and 100.");
      return;
    }
    if (current === "charges" && (serviceRate < 0 || serviceRate > 100)) {
      setError("Service charge must be between 0 and 100.");
      return;
    }
    if (current === "cash" && (openingCash < 0 || openingCash > 10_000_000)) {
      setError("Opening cash looks off. Enter a realistic amount.");
      return;
    }
    setStepIdx((i) => Math.min(STEPS.length, i + 1));
  }

  function back() {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/pos/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          terminalName: terminalName.trim(),
          openingCash,
          taxRate,
          taxEnabled,
          serviceChargeRate: serviceRate,
          serviceChargeEnabled: serviceEnabled,
          customerModeEnabled,
          customerExitCombo: customerModeEnabled ? exitCombo : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to activate POS");
      }
      setStepIdx(STEPS.length); // move to "done"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!restaurantCode) return;
    navigator.clipboard.writeText(restaurantCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1600);
  }

  if (typeof document === "undefined") return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--canvas)] shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[var(--text-3)] transition-colors hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-[var(--border)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)]">
              <Zap className="h-5 w-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-[var(--text-1)]">
                {alreadyActive ? "Update POS settings" : "Activate your POS"}
              </h2>
              <p className="text-xs text-[var(--text-3)]">
                {restaurantName}
              </p>
            </div>
          </div>

          {current !== "done" && (
            <div className="mt-5 flex items-center gap-1.5">
              {STEPS.map((s, i) => {
                const active = i === stepIdx;
                const done = i < stepIdx;
                return (
                  <div key={s.id} className="flex flex-1 items-center gap-1.5">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                        done || active
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface-alt)] text-[var(--text-3)]"
                      }`}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <div
                      className={`hidden truncate text-[11px] font-semibold sm:block ${
                        active ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
                      }`}
                    >
                      {s.label}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`h-px flex-1 transition-colors ${
                          done ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-h-[280px] px-6 py-6">
          <AnimatePresence mode="wait">
            {current === "terminal" && (
              <motion.div
                key="terminal"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <Monitor className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      Name this terminal
                    </p>
                    <p className="text-xs text-[var(--text-3)]">
                      Shows on the POS header and on bills. Use the location
                      (e.g. &ldquo;Front Counter&rdquo; or &ldquo;Bar&rdquo;).
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value.slice(0, 40))}
                  placeholder="Front Counter"
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium focus:border-[var(--accent-border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                />

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-4 transition-colors hover:bg-[var(--surface)]">
                  <input
                    type="checkbox"
                    checked={customerModeEnabled}
                    onChange={(e) => setCustomerModeEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-1)]">
                      <MonitorSmartphone className="h-4 w-4 text-[var(--accent)]" />
                      Allow customer-facing mode
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-3)]">
                      Staff can hand the screen to a customer so they can
                      browse the menu in 3D. Billing totals stay hidden from
                      them.
                    </p>
                  </div>
                </label>

                {customerModeEnabled && (
                  <ExitComboCapture
                    combo={exitCombo}
                    capturing={capturing}
                    onStartCapture={() => setCapturing(true)}
                    onCancelCapture={() => setCapturing(false)}
                    onCapture={(combo) => {
                      setExitCombo(combo);
                      setCapturing(false);
                    }}
                    onReset={() =>
                      setExitCombo({
                        ctrl: true,
                        shift: true,
                        alt: false,
                        key: "x",
                      })
                    }
                  />
                )}
              </motion.div>
            )}

            {current === "charges" && (
              <motion.div
                key="charges"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <Receipt className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      Confirm tax &amp; service charge
                    </p>
                    <p className="text-xs text-[var(--text-3)]">
                      These apply to every POS bill. You can change them
                      anytime from Dashboard → Tax &amp; Charges.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    label="Tax (VAT)"
                    enabled={taxEnabled}
                    onToggle={setTaxEnabled}
                    value={taxRate}
                    onChange={setTaxRate}
                  />
                  <ToggleRow
                    label="Service charge"
                    enabled={serviceEnabled}
                    onToggle={setServiceEnabled}
                    value={serviceRate}
                    onChange={setServiceRate}
                  />
                </div>
              </motion.div>
            )}

            {current === "cash" && (
              <motion.div
                key="cash"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="space-y-5"
              >
                <div className="flex items-start gap-3">
                  <Banknote className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      Opening cash drawer
                    </p>
                    <p className="text-xs text-[var(--text-3)]">
                      How much cash (NPR) is in the drawer at the start of
                      each shift? Used for end-of-day reconciliation.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--text-2)]">
                    Opening balance
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-3)]">
                      Rs.
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={openingCash}
                      onChange={(e) => setOpeningCash(Number(e.target.value))}
                      className="w-full rounded-xl border border-[var(--border)] py-3 pl-12 pr-4 text-sm font-semibold focus:border-[var(--accent-border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)]"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-3)]">
                    Common values: 1,000 &middot; 2,000 &middot; 5,000
                  </p>
                </div>
              </motion.div>
            )}

            {current === "review" && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      Ready to {alreadyActive ? "save" : "activate"}?
                    </p>
                    <p className="text-xs text-[var(--text-3)]">
                      Review the settings. You can change these later.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] text-sm">
                  <ReviewRow label="Terminal" value={terminalName} />
                  <ReviewRow
                    label="Customer mode"
                    value={customerModeEnabled ? "Enabled" : "Disabled"}
                  />
                  {customerModeEnabled && (
                    <ReviewRow
                      label="Exit combo"
                      value={comboLabel(exitCombo)}
                    />
                  )}
                  <ReviewRow
                    label="Tax"
                    value={taxEnabled ? `${taxRate}%` : "Off"}
                  />
                  <ReviewRow
                    label="Service charge"
                    value={serviceEnabled ? `${serviceRate}%` : "Off"}
                  />
                  <ReviewRow
                    label="Opening cash"
                    value={`Rs. ${openingCash.toLocaleString()}`}
                  />
                </div>
              </motion.div>
            )}

            {current === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col items-center gap-4 py-4 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 ring-2 ring-green-500/30">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-1)]">
                    POS is live
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-[var(--text-2)]">
                    Staff can now sign in at the POS terminal. Share your
                    restaurant code with your team.
                  </p>
                </div>

                {restaurantCode && (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-2.5">
                    <span className="text-xs font-semibold text-[var(--accent-text)]">
                      Restaurant code
                    </span>
                    <code className="rounded-md bg-[var(--canvas)] px-2 py-1 text-sm font-bold tracking-wider text-[var(--text-1)]">
                      {restaurantCode}
                    </code>
                    <button
                      onClick={copyCode}
                      className="rounded-md p-1 text-[var(--accent)] transition-colors hover:bg-[var(--canvas)]"
                      aria-label="Copy code"
                    >
                      {codeCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                )}

                <div className="flex w-full flex-col gap-2 pt-2">
                  <button
                    onClick={() =>
                      onActivated({
                        slug: restaurantSlug,
                        terminalName,
                        alreadyActive: !!alreadyActive,
                      })
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
                  >
                    Open POS terminal
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
                  >
                    Back to dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && current !== "done" && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {current !== "done" && (
          <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--canvas-sub)] px-6 py-4">
            <button
              onClick={stepIdx === 0 ? onClose : back}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--canvas)] disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              {stepIdx === 0 ? "Cancel" : "Back"}
            </button>

            {current === "review" ? (
              <button
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-[var(--accent)]/25 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {alreadyActive ? "Save changes" : "Activate POS"}
              </button>
            ) : (
              <button
                onClick={next}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}

function ToggleRow({
  label,
  enabled,
  onToggle,
  value,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-3">
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-[var(--accent)]" : "bg-[var(--surface-alt)]"
        }`}
        aria-pressed={enabled}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-1)]">{label}</p>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={value}
          disabled={!enabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-2 py-1 text-right text-sm font-semibold focus:border-[var(--accent-border)] focus:outline-none disabled:opacity-50"
        />
        <span className="text-sm font-semibold text-[var(--text-3)]">%</span>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
        {label}
      </span>
      <span className="text-sm font-semibold text-[var(--text-1)]">{value}</span>
    </div>
  );
}

interface ExitCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

function comboLabel(c: ExitCombo): string {
  const parts: string[] = [];
  if (c.ctrl) parts.push("Ctrl");
  if (c.shift) parts.push("Shift");
  if (c.alt) parts.push("Alt");
  parts.push(c.key.toUpperCase());
  return parts.join(" + ");
}

function isValidCombo(c: ExitCombo): boolean {
  // Require at least one modifier so a customer can't accidentally exit by
  // tapping a single letter on a touch keyboard.
  if (!c.ctrl && !c.shift && !c.alt) return false;
  if (!c.key) return false;
  return /^[a-z0-9]$/i.test(c.key);
}

function ExitComboCapture({
  combo,
  capturing,
  onStartCapture,
  onCancelCapture,
  onCapture,
  onReset,
}: {
  combo: ExitCombo;
  capturing: boolean;
  onStartCapture: () => void;
  onCancelCapture: () => void;
  onCapture: (c: ExitCombo) => void;
  onReset: () => void;
}) {
  const valid = isValidCombo(combo);

  // Listen for the next valid keypress while capturing.
  useCaptureKey(capturing, (e) => {
    if (e.key === "Escape") {
      onCancelCapture();
      return;
    }
    const k = e.key.toLowerCase();
    if (!/^[a-z0-9]$/.test(k)) return; // wait for a "key" key, ignore modifiers alone
    onCapture({
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
      key: k,
    });
  });

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-3)]">
          Hardware-button exit
        </p>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-semibold text-[var(--text-3)] hover:text-[var(--accent)]"
        >
          Reset to default
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-3 text-sm font-bold tracking-wide transition-colors ${
            capturing
              ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent-text)]"
              : valid
              ? "border-[var(--border)] bg-[var(--canvas)] text-[var(--text-1)]"
              : "border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
          }`}
        >
          {capturing ? (
            <span className="animate-pulse">Press any key combination…</span>
          ) : (
            <span>{comboLabel(combo)}</span>
          )}
        </div>

        {capturing ? (
          <button
            type="button"
            onClick={onCancelCapture}
            className="rounded-lg border border-[var(--border)] px-3 py-3 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--canvas)]"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartCapture}
            className="rounded-lg bg-[var(--accent)] px-3 py-3 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
          >
            Set new
          </button>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-3)]">
        Pair this combo with a foot pedal, stream-deck, or stick a sticker on
        the keyboard. Customer mode will only exit when this exact key
        combination fires. Esc, F-keys and Ctrl+W are always blocked.
      </p>
      {!valid && !capturing && (
        <p className="mt-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
          Pick a combo with at least one modifier (Ctrl, Shift or Alt).
        </p>
      )}
    </div>
  );
}

/**
 * Subscribe to keydown events while `active` is true. The handler is
 * stored in a ref so callers don't need to memoize it. Captured at the
 * window level so the wizard's focused inputs don't swallow keystrokes.
 */
function useCaptureKey(active: boolean, handler: (e: KeyboardEvent) => void) {
  const handlerRef = useRef(handler);

  // Keep the latest handler in the ref without re-subscribing the listener.
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!active) return;
    function listener(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      handlerRef.current(e);
    }
    window.addEventListener("keydown", listener, { capture: true });
    return () => {
      window.removeEventListener("keydown", listener, { capture: true });
    };
  }, [active]);
}
