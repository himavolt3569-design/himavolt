/**
 * Account-wide printing & receipt settings, stored on the Restaurant and set
 * from the dashboard "Printing & Receipts" tab. One source of truth for every
 * printout: customer bill, POS counter receipt, KOT and BOT.
 */

export type PaperWidth = 58 | 80;

export interface PrintSettings {
  /** mm — customer bill + POS counter receipt */
  counterWidth: PaperWidth;
  /** mm — kitchen (KOT) and bar (BOT) tickets */
  kitchenWidth: PaperWidth;
  /** show the feedback QR on the customer bill */
  showFeedbackQR: boolean;
  /** print the customer receipt automatically as soon as a bill is settled */
  autoPrint: boolean;
  /** print the kitchen ticket (KOT) automatically when staff accepts an order */
  autoPrintKOT: boolean;
  /**
   * Print the PROVISIONAL bill automatically when staff accepts an order.
   *
   * Not the same thing as `autoPrint`, which fires at settlement and prints the
   * tax invoice. This fires at accept and prints an unpaid pre-bill, so both on
   * means two slips per order.
   *
   * Order-type aware at the call site (`resolveAcceptPrintAction`): a dine-in
   * table prints a KOT instead, because a running tab is billed once at the end
   * rather than once per round.
   */
  autoPrintBillOnAccept: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  counterWidth: 80,
  kitchenWidth: 80,
  showFeedbackQR: true,
  autoPrint: false,
  autoPrintKOT: false,
  autoPrintBillOnAccept: false,
};

function coerceWidth(v: unknown): PaperWidth {
  return Number(v) === 58 ? 58 : 80;
}

/**
 * Read print settings off any object that carries the raw `print*` columns
 * (a Restaurant row, the RestaurantContext object, the bill's restaurant, or
 * the POS staff session). Missing/invalid values fall back to defaults.
 */
export function resolvePrintSettings(src: {
  printCounterWidth?: number | null;
  printKitchenWidth?: number | null;
  printShowFeedbackQR?: boolean | null;
  printAutoReceipt?: boolean | null;
  printAutoKOT?: boolean | null;
  printAutoBillOnAccept?: boolean | null;
} | null | undefined): PrintSettings {
  if (!src) return DEFAULT_PRINT_SETTINGS;
  return {
    counterWidth: coerceWidth(src.printCounterWidth ?? 80),
    kitchenWidth: coerceWidth(src.printKitchenWidth ?? 80),
    showFeedbackQR: src.printShowFeedbackQR ?? true,
    autoPrint: src.printAutoReceipt ?? false,
    autoPrintKOT: src.printAutoKOT ?? false,
    autoPrintBillOnAccept: src.printAutoBillOnAccept ?? false,
  };
}
