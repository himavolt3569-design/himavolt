/**
 * Fulfilment vocabulary.
 *
 * `Order.type` IS the fulfilment type — it predates the name and is already
 * written by checkout, the POS, the counter, `create-order.ts` and the admin
 * tables on a live production table. Renaming the column would be a destructive
 * migration for zero behavioural gain, so the names are reconciled here instead.
 *
 * `TAKEAWAY` ≡ `PICKUP`. The database says TAKEAWAY; product and UI say Pickup.
 */

import type { OrderType } from "@/generated/prisma";
import type { ServiceTypeValue } from "./hours";

export type FulfilmentType = OrderType;

export const FULFILMENT = {
  DINE_IN: "DINE_IN",
  DELIVERY: "DELIVERY",
  /** The DB spelling of Pickup. */
  PICKUP: "TAKEAWAY",
} as const satisfies Record<string, OrderType>;

/**
 * Only a DELIVERY order may own a `Delivery` row. Enforced in `create-order.ts`
 * so the delivery pipeline can never be populated by a dine-in ticket.
 */
export function requiresDelivery(type: OrderType): boolean {
  return type === "DELIVERY";
}

/** Which schedule governs this fulfilment type. */
export function serviceTypeFor(type: OrderType): ServiceTypeValue {
  switch (type) {
    case "DELIVERY":
      return "DELIVERY";
    case "TAKEAWAY":
      return "PICKUP";
    default:
      return "DINE_IN";
  }
}

const LABELS: Record<OrderType, string> = {
  DINE_IN: "Dine-in",
  DELIVERY: "Delivery",
  TAKEAWAY: "Pickup",
};

export function fulfilmentLabel(type: OrderType): string {
  return LABELS[type] ?? type;
}
