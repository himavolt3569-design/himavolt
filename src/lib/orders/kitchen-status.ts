/**
 * Typing for `Order.kitchenStatus` / `OrderItem.kitchenStatus`.
 *
 * Those are `String?` columns on the hottest table in the system, carrying
 * exactly the `KitchenStatus` enum's values. Converting the columns is a
 * behaviour-neutral migration with real downside risk on a live table, so it is
 * sequenced as its own deploy (add enum column → backfill → switch reads → drop
 * the string). Until then this module is the type boundary: read through
 * `parseKitchenStatus`, write through `KITCHEN_STATUS` — never a bare string.
 *
 * New tables (`OrderPreparationGroup`) already use the real enum.
 */

import type { KitchenStatus, PrepStation } from "@/generated/prisma";

export const KITCHEN_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  PREPARING: "PREPARING",
  READY: "READY",
  SERVED: "SERVED",
} as const satisfies Record<KitchenStatus, KitchenStatus>;

const VALID = new Set<string>(Object.keys(KITCHEN_STATUS));

/** Narrow a free-form column value. Returns null for legacy/garbage values. */
export function parseKitchenStatus(
  value: string | null | undefined,
): KitchenStatus | null {
  if (!value) return null;
  return VALID.has(value) ? (value as KitchenStatus) : null;
}

/** A group is finished when it is READY or already SERVED. */
export function isPrepComplete(status: KitchenStatus): boolean {
  return status === "READY" || status === "SERVED";
}

/**
 * Which station prepares an item.
 *
 * Derived from the flags that already exist on `MenuItem` and are already carried
 * into the KOT payload — no new item-level schema. `drinkCategory` is a free-form
 * string in the database (documented as COLD | HOT | ALCOHOL), so ALCOHOL is
 * matched case-insensitively rather than trusted to be exact.
 */
export function stationForItem(item: {
  isDrink?: boolean | null;
  drinkCategory?: string | null;
}): PrepStation {
  if (!item.isDrink) return "FOOD";
  if ((item.drinkCategory ?? "").trim().toUpperCase() === "ALCOHOL") return "BAR";
  return "DRINKS";
}

export const STATION_LABELS: Record<PrepStation, string> = {
  FOOD: "Kitchen",
  DRINKS: "Drinks",
  BAR: "Bar",
  DESSERT: "Dessert",
};
