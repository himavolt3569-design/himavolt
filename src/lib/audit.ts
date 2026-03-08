import { db } from "./db";

export type AuditAction =
  // Orders
  | "ORDER_CREATED"
  | "ORDER_ACCEPTED"
  | "ORDER_PREPARING"
  | "ORDER_READY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_REJECTED"
  // Menu
  | "MENU_ITEM_CREATED"
  | "MENU_ITEM_UPDATED"
  | "MENU_ITEM_DELETED"
  | "CATEGORY_CREATED"
  // Staff
  | "STAFF_ADDED"
  | "STAFF_REMOVED"
  | "STAFF_UPDATED"
  | "STAFF_LOGIN"
  | "STAFF_LOGOUT"
  | "STAFF_CHECKIN"
  | "STAFF_CHECKOUT"
  // Billing & Payments
  | "PAYMENT_INITIATED"
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "BILL_CREATED"
  | "DISCOUNT_APPLIED"
  | "PAYMENT_COLLECTED"
  // Restaurant
  | "RESTAURANT_CREATED"
  | "RESTAURANT_UPDATED"
  | "RESTAURANT_DELETED"
  // Inventory
  | "INVENTORY_ADDED"
  | "INVENTORY_UPDATED"
  | "INVENTORY_DELETED"
  // Delivery
  | "DELIVERY_ASSIGNED"
  | "DELIVERY_STATUS_UPDATED"
  // System
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED";

interface AuditEntry {
  action: AuditAction;
  entity: string;
  entityId?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  restaurantId?: string;
  ipAddress?: string;
}

/**
 * Log an auditable action. Fire-and-forget — never throws to callers.
 */
export function logAudit(entry: AuditEntry): void {
  db.auditLog
    .create({
      data: {
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        detail: entry.detail ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        userId: entry.userId ?? null,
        restaurantId: entry.restaurantId ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    })
    .catch((err: unknown) => {
      console.error("[Audit] Failed to write audit log:", err);
    });
}

/**
 * Extract client IP from request headers (works behind proxies).
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    undefined
  );
}
