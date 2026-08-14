/**
 * Build a complete, self-contained thermal receipt as an HTML document string.
 *
 * WHY THIS EXISTS: printing used to point a hidden iframe at `/bill/[orderId]`,
 * which meant booting the whole Next app inside the iframe, hydrating React,
 * fetching the bill, fetching feedback, and then waiting a hardcoded 600ms
 * before calling `window.print()`. Seconds, for a document whose every value the
 * dashboard already had in memory.
 *
 * This renders the same receipt from in-memory data with no framework, no
 * network and no timers, so the print dialog opens on the same tick as the
 * click. The `/bill/[orderId]` page is untouched and remains the shareable,
 * linkable bill — this is purely the fast path for printing.
 */

export interface ReceiptRestaurant {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string | null;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  addOns?: string | null;
}

export interface ReceiptOrder {
  orderNo: string;
  tableNo?: number | null;
  roomNo?: string | null;
  type: string;
  note?: string | null;
  createdAt?: string | null;
  deliveryFee?: number | null;
  items: ReceiptItem[];
  guestName?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  /** Present once a Bill row exists — carries the authoritative figures. */
  bill?: {
    billNo?: string | null;
    subtotal?: number | null;
    tax?: number | null;
    serviceCharge?: number | null;
    discount?: number | null;
    total?: number | null;
  } | null;
  payment?: { method?: string | null; status?: string | null } | null;
}

export interface ReceiptOptions {
  /** Provisional pre-bill: no invoice number, "AMOUNT DUE", not a tax invoice. */
  provisional: boolean;
  /** 58 | 80 (mm). */
  width: number;
  /** Pre-rendered QR markup. Omitted on provisional bills. */
  qrSvg?: string | null;
}

const PAYMENT_LABELS: Record<string, string> = {
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  BANK: "Bank Transfer",
  CASH: "Cash",
  COUNTER: "Counter Pay",
  DIRECT: "Fast Pay",
};

/** Escape anything that reaches the HTML string — names and notes are user data. */
function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(amount: number, currency: string): string {
  const symbol = currency === "NPR" ? "Rs. " : `${currency} `;
  return `${symbol}${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

function formatDateTime(value?: string | null): string {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} at ${d.toLocaleTimeString("en-NP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function buildReceiptHtml(
  restaurant: ReceiptRestaurant,
  order: ReceiptOrder,
  opts: ReceiptOptions,
): string {
  const cur = restaurant.currency || "NPR";
  const b = order.bill;
  // Prefer the Bill's figures when it exists — it is the authoritative record
  // and includes service charge and discount, which the order row does not.
  const subtotal = b?.subtotal ?? order.subtotal;
  const tax = b?.tax ?? order.tax;
  const serviceCharge = b?.serviceCharge ?? 0;
  const discount = b?.discount ?? 0;
  const deliveryFee = order.deliveryFee ?? 0;
  const total = b?.total ?? order.total;

  const isPaid = order.payment?.status === "COMPLETED";
  const docLabel = opts.provisional
    ? "BILL"
    : order.payment && order.payment.method !== "CASH"
      ? "PAYMENT RECEIPT"
      : "INVOICE";

  const rows: string[] = [];
  const row = (label: string, amount: number, sign = "") =>
    `<div class="tr-row"><span>${esc(label)}</span><span>${sign}${money(amount, cur)}</span></div>`;

  rows.push(row("Subtotal", subtotal));
  if (tax > 0) rows.push(row("Tax", tax));
  if (serviceCharge > 0) rows.push(row("Service Charge", serviceCharge));
  if (deliveryFee > 0) rows.push(row("Delivery Fee", deliveryFee));
  if (discount > 0) rows.push(row("Discount", discount, "-"));

  const items = order.items
    .map(
      (it) => `
      <div class="tr-item">
        <div class="tr-item-name">${esc(it.name)}</div>
        ${it.addOns ? `<div class="tr-item-add">+ ${esc(it.addOns)}</div>` : ""}
        <div class="tr-item-line">
          <span>${money(it.price, cur)} &times; ${it.quantity}</span>
          <span>${money(it.price * it.quantity, cur)}</span>
        </div>
      </div>`,
    )
    .join("");

  const where = order.tableNo
    ? `Table ${esc(order.tableNo)}`
    : order.roomNo
      ? `Room ${esc(order.roomNo)}`
      : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(order.orderNo)}</title>
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: ${opts.width}mm;
    margin: 0 auto;
    padding: ${opts.width === 58 ? "4mm 3.5mm 6mm" : "5mm 5mm 7mm"};
    box-sizing: border-box;
    color: #000;
    font-family: "Cascadia Mono", "DejaVu Sans Mono", Consolas, "Courier New", monospace;
    font-size: ${opts.width === 58 ? "10.5px" : "12px"};
    line-height: ${opts.width === 58 ? "1.4" : "1.45"};
    -webkit-font-smoothing: none;
  }
  * { color: #000 !important; }
  .tr-center { text-align: center; }
  .tr-brand { font-size: ${opts.width === 58 ? "15px" : "19px"}; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 2px; }
  .tr-muted { font-size: ${opts.width === 58 ? "9.5px" : "11px"}; }
  .tr-doc { font-size: 12px; font-weight: 700; letter-spacing: 3px; margin-top: 3px; }
  .tr-billno { font-size: ${opts.width === 58 ? "13px" : "15px"}; font-weight: 800; letter-spacing: 1px; }
  .tr-provisional { font-size: 11px; font-weight: 800; letter-spacing: .5px; border: 1.5px solid #000; padding: 2px 4px; margin: 4px auto 2px; display: inline-block; }
  .tr-divider { border-top: 1px dashed #000; margin: 6px 0; }
  .tr-divider-bold { border-top: 2px solid #000; margin: 5px 0; }
  .tr-dots { border-top: 1px dotted #000; margin: 7px 0; }
  .tr-meta { display: flex; justify-content: space-between; gap: 8px; font-size: ${opts.width === 58 ? "9.5px" : "11px"}; margin-top: 1px; }
  .tr-item { margin-bottom: 5px; }
  .tr-item-name { font-weight: 700; font-size: ${opts.width === 58 ? "11px" : "12.5px"}; }
  .tr-item-add { font-size: 10.5px; padding-left: 8px; }
  .tr-item-line, .tr-row { display: flex; justify-content: space-between; gap: 8px; font-size: ${opts.width === 58 ? "10.5px" : "11.5px"}; }
  .tr-row { margin: 1px 0; }
  .tr-total { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: ${opts.width === 58 ? "14px" : "16px"}; font-weight: 800; margin: 3px 0; }
  .tr-pay { font-weight: 700; font-size: 12px; margin-top: 5px; }
  .tr-note { font-style: italic; font-size: 11px; margin-top: 5px; }
  .tr-thanks { font-size: 13px; font-weight: 700; margin: 4px 0 2px; }
  .tr-fine, .tr-power { font-size: 9.5px; margin-top: 3px; }
  .tr-qr { display: inline-block; padding: 2mm; background: #fff; }
  .tr-qr svg { display: block; width: ${opts.width === 58 ? "24mm" : "28mm"}; height: ${opts.width === 58 ? "24mm" : "28mm"}; }
  .tr-qr-cap { font-size: 10px; margin-top: 3px; }
</style>
</head>
<body>
  <div class="tr-center tr-brand">${esc(restaurant.name)}</div>
  ${restaurant.address ? `<div class="tr-center tr-muted">${esc(restaurant.address)}</div>` : ""}
  ${restaurant.phone ? `<div class="tr-center tr-muted">Tel: ${esc(restaurant.phone)}</div>` : ""}

  <div class="tr-divider"></div>

  <div class="tr-center tr-doc">${docLabel}</div>
  ${
    opts.provisional
      ? `<div class="tr-center"><span class="tr-provisional">PROVISIONAL &mdash; NOT A TAX INVOICE</span></div>`
      : b?.billNo
        ? `<div class="tr-center tr-billno">${esc(b.billNo)}</div>`
        : ""
  }
  <div class="tr-center tr-muted">${esc(formatDateTime(order.createdAt))}</div>

  <div class="tr-meta"><span>Order #${esc(order.orderNo)}</span><span>${where}</span></div>
  <div class="tr-meta"><span>${esc(order.type.replace("_", " "))}</span><span>${isPaid ? "PAID" : "UNPAID"}</span></div>
  ${order.guestName ? `<div class="tr-meta"><span>Guest</span><span>${esc(order.guestName)}</span></div>` : ""}

  <div class="tr-divider"></div>
  ${items}
  <div class="tr-divider"></div>
  ${rows.join("")}
  <div class="tr-divider tr-divider-bold"></div>
  <div class="tr-total"><span>${opts.provisional ? "AMOUNT DUE" : "GRAND TOTAL"}</span><span>${money(total, cur)}</span></div>
  <div class="tr-divider tr-divider-bold"></div>

  ${
    opts.provisional
      ? `<div class="tr-center tr-pay">Please pay at the counter</div>`
      : order.payment
        ? `<div class="tr-center tr-pay">Paid via ${esc(PAYMENT_LABELS[order.payment.method || ""] || order.payment.method)} &middot; ${esc(order.payment.status)}</div>`
        : ""
  }
  ${order.note ? `<div class="tr-center tr-note">&ldquo;${esc(order.note)}&rdquo;</div>` : ""}
  ${opts.qrSvg && !opts.provisional ? `<div class="tr-center" style="margin:8px 0 2px"><div class="tr-qr">${opts.qrSvg}</div><div class="tr-qr-cap">Scan to rate your experience</div></div>` : ""}

  <div class="tr-dots"></div>
  <div class="tr-center tr-thanks">${opts.provisional ? "Enjoy your meal!" : "&#9829; Thank you for dining with us! &#9829;"}</div>
  <div class="tr-center tr-muted tr-fine">${
    opts.provisional
      ? "Provisional bill &middot; Not a tax invoice &middot; A receipt is issued on payment"
      : "Computer-generated receipt &middot; No signature required"
  }</div>
  <div class="tr-center tr-muted tr-power">Powered by HimaVolt</div>
</body>
</html>`;
}
