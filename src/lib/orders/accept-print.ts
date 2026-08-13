/**
 * What should print when staff accepts an order.
 *
 * The rule this file encodes: **a running table is billed once at the end, a
 * one-shot order is billed at accept.** Printing a bill on every accept means a
 * dine-in table that orders four rounds ends up holding four bills with four
 * different totals; waiting for a "final accept" instead means an order that
 * never gets a second round strands unbilled. Splitting by order type removes
 * the choice from staff entirely — there is no mode to remember and no button
 * that is wrong to press.
 *
 * Scope: this decides about the **bill only**. Kitchen tickets keep going
 * through `printAutoKOT` / `useKotPrintJobs`, so nothing here can double-print a
 * KOT.
 */

import { printBillForOrder, printPreBillForOrder } from "@/lib/print-bill";
import type { PrintSettings } from "@/lib/print-settings";

export type AcceptPrintAction =
  /** Unpaid provisional slip — no invoice number. */
  | "PRE_BILL"
  /** Already paid (online, or POS fast-pay) — print the numbered receipt. */
  | "RECEIPT"
  /** Dine-in tables, room-service folios, or the setting is off. */
  | "NONE";

export interface AcceptPrintInput {
  /** `OrderType` — DINE_IN | DELIVERY | TAKEAWAY. */
  type: string;
  /** Set for room service; those charges post to the room folio. */
  roomNo?: string | null;
  paymentStatus?: string | null;
}

export function resolveAcceptPrintAction(
  order: AcceptPrintInput,
  settings: Pick<PrintSettings, "autoPrintBillOnAccept">,
): AcceptPrintAction {
  if (!settings.autoPrintBillOnAccept) return "NONE";

  // A dine-in guest is still ordering. The bill is printed from the table's
  // "Print bill" action whenever they ask for it.
  if (order.type === "DINE_IN") return "NONE";

  // Room service is charged to the room at checkout, not paid per order — a
  // slip demanding payment would confuse the guest.
  if (order.roomNo) return "NONE";

  // Never hand an "UNPAID" slip to someone who already paid online. The live
  // queue genuinely contains PENDING orders with COMPLETED payments.
  if (order.paymentStatus === "COMPLETED") return "RECEIPT";

  return "PRE_BILL";
}

/* ── Per-device print opt-in ─────────────────────────────────────── */

const DEVICE_KEY = "himavolt:printOnThisDevice";

/**
 * Whether THIS device should send auto-prints to a printer.
 *
 * A manager accepting an order from their phone has no thermal printer
 * attached, and firing `window.print()` there just throws a dialog in their
 * face. Default is therefore on for tablets/desktops and off for phones, with
 * an explicit stored choice overriding it either way. Accepting always works —
 * only the printing is gated.
 */
export function canPrintOnThisDevice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(DEVICE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    /* privacy mode — fall through to the width heuristic */
  }
  return window.innerWidth >= 768;
}

export function setPrintOnThisDevice(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEVICE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/* ── Double-print guard ──────────────────────────────────────────── */

// Accept has to stay instant — no spinner, no disabled button — so a fast
// double-tap can fire the handler twice. Rather than block the UI, we drop the
// second PRINT for the same order. The window is short enough that a genuine
// reprint minutes later still works.
const recentlyPrinted = new Map<string, number>();
const REPRINT_WINDOW_MS = 8000;

function claimPrint(orderId: string): boolean {
  const now = Date.now();
  const last = recentlyPrinted.get(orderId);
  if (last !== undefined && now - last < REPRINT_WINDOW_MS) return false;
  recentlyPrinted.set(orderId, now);
  // Keep the map from growing across a long shift.
  if (recentlyPrinted.size > 200) {
    for (const [id, at] of recentlyPrinted) {
      if (now - at > REPRINT_WINDOW_MS) recentlyPrinted.delete(id);
    }
  }
  return true;
}

/**
 * Fire the accept-time printout.
 *
 * MUST be called only after the server has confirmed the accept — printing on
 * an optimistic update that later rolls back hands the guest a bill for an
 * order the kitchen never took.
 *
 * Returns what it printed, so callers can surface it (or nothing).
 */
export function runAcceptPrint(
  orderId: string,
  order: AcceptPrintInput,
  settings: Pick<PrintSettings, "autoPrintBillOnAccept">,
): AcceptPrintAction {
  const action = resolveAcceptPrintAction(order, settings);
  if (action === "NONE") return "NONE";
  if (!canPrintOnThisDevice()) return "NONE";
  if (!claimPrint(orderId)) return "NONE";

  if (action === "RECEIPT") printBillForOrder(orderId);
  else printPreBillForOrder(orderId);

  return action;
}
