/**
 * Auto-print a settled bill by opening the canonical bill page with the
 * `autoprint` flag. That page already renders a print-settings-aware thermal
 * receipt and triggers `window.print()` itself, so this is the one true
 * printout used everywhere (POS terminal + dashboard billing).
 *
 * Must be called in direct response to a user gesture (e.g. the click that
 * collects payment) so the browser allows the popup.
 */
export function autoPrintBill(orderId: string): void {
  if (typeof window === "undefined" || !orderId) return;
  // A small named popup keeps focus tidy and lets the bill page self-close
  // after printing. No "noopener" so window.close() reliably works on the
  // script-opened, same-origin receipt window.
  window.open(
    `/bill/${orderId}?autoprint=1`,
    "hv_receipt",
    "width=420,height=720",
  );
}
