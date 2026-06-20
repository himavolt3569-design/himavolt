import { db } from "./db";

export type AuditAction =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_ACCEPTED"
  | "ORDER_PREPARING"
  | "ORDER_READY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_REJECTED"
  | "ORDER_CLEANUP"
  | "MENU_ITEM_CREATED"
  | "MENU_ITEM_UPDATED"
  | "MENU_ITEM_DELETED"
  | "CATEGORY_CREATED"
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
  | "PAYMENT_GATE_BLOCKED"
  | "PAYMENT_EXPIRED"
  // Hotel bookings
  | "BOOKING_HOLD_EXPIRED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REFUNDED"
  | "BANK_PROOF_UPLOADED"
  | "BANK_PAYMENT_VERIFIED"
  | "BANK_PAYMENT_REJECTED"
  | "BILL_CREATED"
  | "DISCOUNT_APPLIED"
  | "PAYMENT_COLLECTED"
  | "RESTAURANT_CREATED"
  | "RESTAURANT_UPDATED"
  | "RESTAURANT_DELETED"
  | "POS_ACTIVATED"
  | "POS_UPDATED"
  | "POS_DEACTIVATED"
  | "INVENTORY_ADDED"
  | "INVENTORY_UPDATED"
  | "INVENTORY_DELETED"
  | "TABLE_CLEARED"
  | "DELIVERY_ASSIGNED"
  | "DELIVERY_STATUS_UPDATED"
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
