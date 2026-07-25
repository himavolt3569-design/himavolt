/**
 * The delivery-leg state machine, as data.
 *
 * Pure and side-effect free so every edge and every actor rule can be exercised
 * without a database. `state-machine.ts` is the only thing that applies these.
 *
 * Scope note: this governs the DELIVERY LEG only. Payment lives in
 * `Payment.status`, acceptance in `Order.status`, kitchen progress in
 * `Order.kitchenStatus`. Re-encoding those here would create competing sources
 * of truth — `getOrderFulfilmentState()` composes them instead.
 */

import type { DeliveryStatus } from "@/generated/prisma";

/**
 * Who is attempting the transition.
 *
 * `DRIVER` is only ever granted after the caller's rider token has been matched
 * to *this* delivery — the role alone is not authority, it is the result of
 * having proved scope.
 */
export type DeliveryActor =
  | "RESTAURANT" // owner or staff manager
  | "STAFF" // kitchen / floor staff
  | "DRIVER" // the assigned rider, token-scoped
  | "CUSTOMER" // the person who ordered
  | "ADMIN" // master admin
  | "SYSTEM"; // automated, e.g. all prep groups completing

export const TERMINAL_STATUSES: readonly DeliveryStatus[] = [
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
] as const;

export function isTerminal(status: DeliveryStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

interface Edge {
  to: DeliveryStatus;
  actors: readonly DeliveryActor[];
  /** Human reason, surfaced when the transition is refused. */
  note: string;
}

/**
 * Every legal edge. Anything absent is illegal by construction — the machine is
 * a whitelist, so a new status cannot silently become reachable from everywhere.
 */
const EDGES: Record<DeliveryStatus, readonly Edge[]> = {
  PENDING: [
    {
      to: "READY_FOR_PICKUP",
      actors: ["RESTAURANT", "STAFF", "SYSTEM"],
      note: "Kitchen finished every preparation group",
    },
    {
      to: "CANCELLED",
      actors: ["RESTAURANT", "ADMIN", "CUSTOMER"],
      note: "Cancelled before dispatch",
    },
  ],
  READY_FOR_PICKUP: [
    {
      to: "ASSIGNED",
      actors: ["RESTAURANT", "STAFF", "ADMIN"],
      note: "Rider assigned",
    },
    {
      to: "CANCELLED",
      // The customer's window closes here: once a rider is holding the food it
      // is the restaurant's call, not a self-service action.
      actors: ["RESTAURANT", "ADMIN", "CUSTOMER"],
      note: "Cancelled before dispatch",
    },
  ],
  ASSIGNED: [
    { to: "PICKED_UP", actors: ["DRIVER"], note: "Rider collected the order" },
    {
      to: "READY_FOR_PICKUP",
      actors: ["RESTAURANT", "ADMIN"],
      note: "Rider unassigned",
    },
    { to: "CANCELLED", actors: ["RESTAURANT", "ADMIN"], note: "Cancelled after assignment" },
  ],
  PICKED_UP: [
    { to: "IN_TRANSIT", actors: ["DRIVER"], note: "On the way to the customer" },
    {
      to: "FAILED",
      actors: ["DRIVER", "RESTAURANT", "ADMIN"],
      note: "Could not be delivered",
    },
  ],
  IN_TRANSIT: [
    { to: "DELIVERED", actors: ["DRIVER"], note: "Handed to the customer" },
    {
      to: "FAILED",
      actors: ["DRIVER", "RESTAURANT", "ADMIN"],
      note: "Customer unreachable or address wrong",
    },
  ],
  FAILED: [
    {
      to: "RETURNED",
      actors: ["DRIVER", "RESTAURANT", "ADMIN"],
      note: "Order returned to the restaurant",
    },
  ],
  // Terminal.
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export type TransitionCheck =
  | { allowed: true; note: string }
  | { allowed: false; code: "TERMINAL"; message: string }
  | { allowed: false; code: "ILLEGAL_EDGE"; message: string }
  | { allowed: false; code: "FORBIDDEN_ACTOR"; message: string };

/** Can `actor` move a delivery from `from` to `to`? */
export function canTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
  actor: DeliveryActor,
): TransitionCheck {
  if (isTerminal(from)) {
    return {
      allowed: false,
      code: "TERMINAL",
      message: `This delivery is already ${from.toLowerCase()} and cannot change.`,
    };
  }

  const edge = EDGES[from]?.find((e) => e.to === to);
  if (!edge) {
    return {
      allowed: false,
      code: "ILLEGAL_EDGE",
      message: `Cannot go from ${from} to ${to}.`,
    };
  }

  if (!edge.actors.includes(actor)) {
    return {
      allowed: false,
      code: "FORBIDDEN_ACTOR",
      message: `A ${actor.toLowerCase()} cannot mark this delivery ${to.toLowerCase()}.`,
    };
  }

  return { allowed: true, note: edge.note };
}

/** Every status reachable from `from` by `actor` — drives which buttons render. */
export function allowedTransitions(
  from: DeliveryStatus,
  actor: DeliveryActor,
): DeliveryStatus[] {
  if (isTerminal(from)) return [];
  return (EDGES[from] ?? [])
    .filter((e) => e.actors.includes(actor))
    .map((e) => e.to);
}

/**
 * Timestamp columns a transition stamps. Kept beside the edges so a new status
 * can't be added without deciding what it records.
 */
export function timestampsFor(to: DeliveryStatus): Record<string, Date> {
  const now = new Date();
  switch (to) {
    case "ASSIGNED":
      return { assignedAt: now };
    case "PICKED_UP":
      return { pickedUpAt: now };
    case "DELIVERED":
      return { deliveredAt: now };
    case "CANCELLED":
      return { cancelledAt: now };
    default:
      return {};
  }
}

/** Customer-facing progress copy. Never says "LIVE GPS" — see the rider page. */
export const CUSTOMER_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: "Preparing your order",
  READY_FOR_PICKUP: "Ready — waiting for a rider",
  ASSIGNED: "Rider on the way to the restaurant",
  PICKED_UP: "Rider has collected your order",
  IN_TRANSIT: "On the way to you",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  FAILED: "Delivery could not be completed",
  RETURNED: "Returned to the restaurant",
};

/** Ordered steps for the customer tracking timeline. Terminal states excluded. */
export const CUSTOMER_TIMELINE: readonly DeliveryStatus[] = [
  "PENDING",
  "READY_FOR_PICKUP",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
] as const;
