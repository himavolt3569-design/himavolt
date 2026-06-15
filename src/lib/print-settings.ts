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
  /** show the venue logo on the customer bill */
  showLogo: boolean;
  /** show the feedback QR on the customer bill */
  showFeedbackQR: boolean;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  counterWidth: 80,
  kitchenWidth: 80,
  showLogo: true,
  showFeedbackQR: true,
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
  printShowLogo?: boolean | null;
  printShowFeedbackQR?: boolean | null;
} | null | undefined): PrintSettings {
  if (!src) return DEFAULT_PRINT_SETTINGS;
  return {
    counterWidth: coerceWidth(src.printCounterWidth ?? 80),
    kitchenWidth: coerceWidth(src.printKitchenWidth ?? 80),
    showLogo: src.printShowLogo ?? true,
    showFeedbackQR: src.printShowFeedbackQR ?? true,
  };
}
