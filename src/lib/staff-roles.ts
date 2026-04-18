export const STAFF_MANAGER_ROLES = ["SUPER_ADMIN", "MANAGER"] as const;

export const STAFF_BILLING_ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "CASHIER",
] as const;

export const STAFF_ORDER_CREATE_ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "CASHIER",
  "WAITER",
] as const;

export const STAFF_KITCHEN_ROLES = ["CHEF", "WAITER"] as const;

export const STAFF_PREPAID_TOKEN_ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "CASHIER",
] as const;

export const STAFF_TABLE_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "WAITER",
] as const;

export function isManagerRole(role: string): boolean {
  return (STAFF_MANAGER_ROLES as readonly string[]).includes(role);
}

export function isBillingRole(role: string): boolean {
  return (STAFF_BILLING_ROLES as readonly string[]).includes(role);
}

export function canCreateOrders(role: string): boolean {
  return (STAFF_ORDER_CREATE_ROLES as readonly string[]).includes(role);
}

export function isKitchenRole(role: string): boolean {
  return (STAFF_KITCHEN_ROLES as readonly string[]).includes(role);
}

export const KITCHEN_VISIBLE_FEATURES = new Set<string>([
  "quick-counter",
  "display-counter",
  "room-service",
  "buffet-manager",
  "waitlist",
  "takeaway",
  "package-tracking",
  "pre-orders",
  "daily-specials",
  "custom-cakes",
  "multi-outlet",
  "cocktail-menu",
]);
