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
  /**
   * Tile colour. A distinct hue per category makes the grid scannable by shape
   * and colour rather than by reading eight labels, which matters most on a
   * phone where the labels are tiny. Tailwind classes rather than raw hex so
   * both themes stay coherent.
   */
  tile: string;
  iconColor: string;
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
    tile: "bg-orange-100 dark:bg-orange-500/15",
    iconColor: "text-orange-600 dark:text-orange-400",
    types: ["RESTAURANT", "TANDOORI", "MO_MO_SHOP"],
    blurb: "Sit-down meals, momo houses and tandoori kitchens near you",
  },
  {
    id: "hotels",
    label: "Stays",
    iconName: "Building2",
    tile: "bg-blue-100 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    types: ["HOTEL", "RESORT", "GUEST_HOUSE"],
    blurb: "Hotels, lodges, guest houses and resorts to sleep in",
  },
  {
    id: "fast-food",
    label: "Fast Food",
    iconName: "Sandwich",
    tile: "bg-amber-100 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
    types: ["FAST_FOOD", "CLOUD_KITCHEN"],
    blurb: "Quick bites and delivery-first kitchens",
  },
  {
    id: "drinks",
    label: "Drink Shops",
    iconName: "CupSoda",
    tile: "bg-rose-100 dark:bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
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
    tile: "bg-yellow-100 dark:bg-yellow-500/15",
    iconColor: "text-yellow-700 dark:text-yellow-400",
    types: ["CAFE"],
    blurb: "Coffee, breakfast and somewhere to sit",
  },
  {
    id: "bakery",
    label: "Bakery",
    iconName: "Croissant",
    tile: "bg-lime-100 dark:bg-lime-500/15",
    iconColor: "text-lime-700 dark:text-lime-400",
    types: ["BAKERY"],
    blurb: "Fresh bread, pastries and cakes",
  },
  {
    id: "desserts",
    label: "Desserts",
    iconName: "Candy",
    tile: "bg-pink-100 dark:bg-pink-500/15",
    iconColor: "text-pink-600 dark:text-pink-400",
    types: ["SWEETS"],
    blurb: "Mithai, sweets and everything after the meal",
  },
  {
    id: "bars",
    label: "Bars",
    iconName: "Beer",
    tile: "bg-violet-100 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
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
