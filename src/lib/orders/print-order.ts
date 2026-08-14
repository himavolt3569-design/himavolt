/**
 * Print a live order's bill instantly, rendered from data already in memory.
 *
 * The old path pointed a hidden iframe at `/bill/[orderId]`, which booted the
 * whole Next app inside the frame, hydrated React, made two API calls, and then
 * sat on a hardcoded 600ms timer before printing. This renders the same receipt
 * from the order the dashboard is already holding and prints on the same tick.
 */

import { printReceiptInstant } from "@/lib/print-bill";
import { buildReceiptHtml, type ReceiptOrder } from "@/lib/receipt-html";
import { resolvePrintSettings } from "@/lib/print-settings";
import type { LiveOrder } from "@/context/LiveOrdersContext";

interface PrintableRestaurant {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  currency?: string | null;
  printCounterWidth?: number | null;
  printShowFeedbackQR?: boolean | null;
}

function toReceiptOrder(order: LiveOrder): ReceiptOrder {
  return {
    orderNo: order.orderNo,
    tableNo: order.tableNo,
    roomNo: order.roomNo,
    type: order.type,
    note: order.note,
    createdAt: order.createdAt,
    deliveryFee: order.deliveryFee ?? 0,
    guestName: order.guestName ?? order.user?.name ?? null,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    bill: order.bill ?? null,
    payment: order.payment ?? null,
    items: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    })),
  };
}

/**
 * Render + print. `provisional` selects the unpaid pre-bill (no invoice number,
 * "AMOUNT DUE") over the numbered receipt.
 *
 * Synchronous by design — it must run inside the click handler so the browser
 * treats the print as user-initiated. The feedback QR is deliberately omitted:
 * generating one costs a module load and the provisional bill never carries it
 * anyway. Receipts printed from the canonical `/bill/[orderId]` page still
 * include it.
 */
export function printReceiptFor(
  order: ReceiptOrder,
  restaurant: PrintableRestaurant | null | undefined,
  provisional: boolean,
): void {
  const settings = resolvePrintSettings(restaurant);
  const html = buildReceiptHtml(
    {
      name: restaurant?.name,
      address: restaurant?.address,
      phone: restaurant?.phone,
      currency: restaurant?.currency,
    },
    order,
    {
      provisional,
      width: settings.counterWidth,
    },
  );
  printReceiptInstant(html);
}

/** `printReceiptFor` for a dashboard `LiveOrder`. */
export function printOrderInstantly(
  order: LiveOrder,
  restaurant: PrintableRestaurant | null | undefined,
  provisional: boolean,
): void {
  printReceiptFor(toReceiptOrder(order), restaurant, provisional);
}
