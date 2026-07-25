/**
 * Customer-facing browse categories.
 *
 * A customer looking for "somewhere to eat" does not think in `RestaurantType`
 * enum values, they think "restaurants", "hotels", "somewhere for a drink".
 * This is the translation layer between the two, and it is the ONLY place that
 * mapping lives so the landing page, the nearby page and the API cannot drift.
 *
 * Pure, no db, no server imports, so the grid and the query share one source.
 */

import type { NearbyKind } from "./find-nearby";

export interface BrowseCategory {
  id: string;
  label: string;
  /** Lucide icon name, resolved by the renderer. */
  iconName: string;
  /** RestaurantType values this category covers. Empty = every type. */
  types: string[];
  /** Narrows to venues that actually sell drinks. */
  kind?: NearbyKind;
  /** Short line under the heading on the category page. */
  blurb: string;
}

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  {
    id: "restaurants",
    label: "Restaurants",
    iconName: "UtensilsCrossed",
    types: ["RESTAURANT", "TANDOORI", "MO_MO_SHOP"],
    blurb: "Sit-down meals, momo houses and tandoori kitchens near you",
  },
  {
    id: "hotels",
    label: "Hotels",
    iconName: "Building2",
    types: ["HOTEL", "RESORT", "GUEST_HOUSE"],
    blurb: "Rooms, resorts and guest houses with kitchens that deliver",
  },
  {
    id: "fast-food",
    label: "Fast Food",
    iconName: "Sandwich",
    types: ["FAST_FOOD", "CLOUD_KITCHEN"],
    blurb: "Quick bites and delivery-first kitchens",
  },
  {
    id: "drinks",
    label: "Drink Shops",
    iconName: "CupSoda",
    // Not a type filter: any venue with a drinks menu qualifies, which is what a
    // customer searching for a cold drink actually means.
    types: [],
    kind: "drinks",
    blurb: "Juice bars, cold drinks and everywhere with a drinks menu",
  },
  {
    id: "cafes",
    label: "Cafes",
    iconName: "Coffee",
    types: ["CAFE"],
    blurb: "Coffee, breakfast and somewhere to sit",
  },
  {
    id: "bakery",
    label: "Bakery",
    iconName: "Croissant",
    types: ["BAKERY"],
    blurb: "Fresh bread, pastries and cakes",
  },
  {
    id: "desserts",
    label: "Desserts",
    iconName: "Candy",
    types: ["SWEETS"],
    blurb: "Mithai, sweets and everything after the meal",
  },
  {
    id: "bars",
    label: "Bars",
    iconName: "Beer",
    types: ["BAR"],
    blurb: "Late-night bars and cocktail menus",
  },
];

const BY_ID = new Map(BROWSE_CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string | null | undefined): BrowseCategory | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/** The eight shown on the landing grid; the rest live behind "More". */
export const FEATURED_CATEGORIES = BROWSE_CATEGORIES.slice(0, 7);
