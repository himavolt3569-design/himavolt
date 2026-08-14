/**
 * Print a ready-made receipt document instantly.
 *
 * The document is handed over as an HTML string and injected with `srcdoc`, so
 * there is NO navigation, no framework boot, no data fetch and no timer — the
 * browser parses one small document and the print dialog opens on the same
 * interaction tick.
 *
 * This exists because `printBillViaIframe` below points the iframe at
 * `/bill/[orderId]`, which loads the full Next app inside the frame, hydrates
 * React, fetches the bill, fetches feedback, then waits a hardcoded 600ms before
 * printing. That is seconds of latency for values the caller already has in
 * memory. Prefer this function wherever the order data is on hand.
 *
 * Must still be called in direct response to a user gesture.
 */
export function printReceiptInstant(html: string): void {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // Off-screen rather than display:none / 0×0 — the content has to lay out or
  // some browsers print a blank page.
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "420px";
  iframe.style.height = "600px";
  iframe.style.border = "0";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    try {
      win.addEventListener("afterprint", cleanup);
    } catch {
      /* same-origin, but stay safe */
    }
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
    }
    // Safety net in case afterprint never fires (some Linux/Chrome builds).
    setTimeout(cleanup, 60_000);
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

/**
 * Print a settled bill WITHOUT opening a visible tab or popup window. We mount
 * a hidden, same-origin iframe pointing at the canonical bill page with the
 * `?autoprint=1` flag. That page renders the print-settings-aware thermal
 * receipt and calls `window.print()` itself — from inside the iframe that opens
 * the browser's native print dialog for just the receipt. The iframe is torn
 * down once printing finishes (or is cancelled).
 *
 * Must be called in direct response to a user gesture (e.g. the click that
 * collects payment, or the Print button) so the browser allows printing.
 */
function printBillViaIframe(orderId: string, provisional = false): void {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // Render the iframe off-screen rather than display:none / 0×0 — the content
  // must actually lay out or some browsers print a blank page. Off-screen
  // positioning keeps it invisible while still being painted.
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "420px";
  iframe.style.height = "600px";
  iframe.style.border = "0";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    // Defer removal so the print dialog isn't cut off mid-render.
    setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    // The bill page self-prints (autoprint=1) once its data has painted. We
    // just listen for the iframe's own afterprint to know when to clean up.
    try {
      iframe.contentWindow?.addEventListener("afterprint", cleanup);
    } catch {
      /* cross-context guard — same-origin, but stay safe */
    }
    // Safety net: tear the iframe down even if afterprint never fires.
    setTimeout(cleanup, 60_000);
  };

  iframe.src = `/bill/${orderId}?autoprint=1${provisional ? "&mode=pre" : ""}`;
  document.body.appendChild(iframe);
}

/**
 * Open the canonical bill page. When `autoprint` is set the receipt prints
 * directly via a hidden iframe (no extra tab); otherwise the bill page is
 * opened in a small popup window for staff to review.
 */
export function openBillWindow(orderId: string, autoprint = false): void {
  if (typeof window === "undefined" || !orderId) return;
  if (autoprint) {
    printBillViaIframe(orderId);
    return;
  }
  // View-only: a small named popup keeps focus tidy and lets the bill page
  // self-close. No "noopener" so window.close() works on the same-origin window.
  window.open(`/bill/${orderId}`, "hv_receipt", "width=420,height=720");
}

export function autoPrintBill(orderId: string): void {
  printBillViaIframe(orderId);
}

/**
 * The merged "Printer" action on order rows. One click opens the browser's
 * print dialog with the proper thermal bill — it never opens a separate tab.
 *
 * Must be called in direct response to a user gesture so the browser allows
 * printing.
 */
export function printBillForOrder(orderId: string): void {
  printBillViaIframe(orderId);
}

/**
 * Print the PROVISIONAL bill — the unpaid slip handed to a guest before payment
 * is collected. Renders without the `INV-` number and stamped "not a tax
 * invoice", so the numbered receipt printed at settlement stays the single
 * numbered document for that sale.
 *
 * Same user-gesture requirement as the other print helpers.
 */
export function printPreBillForOrder(orderId: string): void {
  printBillViaIframe(orderId, true);
}
