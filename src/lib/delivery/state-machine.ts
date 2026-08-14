import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { isPrepComplete } from "@/lib/orders/kitchen-status";
import {
  type DeliveryActor,
  canTransition,
  timestampsFor,
} from "./transitions";
import type { DeliveryStatus, Prisma } from "@/generated/prisma";

/**
 * The ONLY writer of `Delivery.status`.
 *
 * No route, component or script may assign the column directly. Every change
 * flows through here so that the edge is legal, the actor is entitled, the
 * timestamps are stamped, and an audit row exists. A status column that anything
 * can set is not a state machine, it is a suggestion.
 *
 * Tenancy: `restaurantId` is REQUIRED and matched inside the query. There is no
 * RLS backstop in this database, so the scope check has to be in the `where`.
 */

type Client = Prisma.TransactionClient | typeof db;

export interface TransitionInput {
  deliveryId: string;
  to: DeliveryStatus;
  actor: DeliveryActor;
  /** Tenant scope. The delivery must belong to this restaurant. */
  restaurantId: string;
  /**
   * Required when `actor` is DRIVER: the driver id proved by the rider token.
   * The transition is refused unless it matches the assigned driver, so a leaked
   * link can never advance somebody else's delivery.
   */
  driverId?: string | null;
  /** Assigns the rider as part of a transition to ASSIGNED. */
  assignDriverId?: string | null;
  reason?: string | null;
  userId?: string | null;
  /** Pass the transaction client when composing with other writes. */
  tx?: Client;
}

export type TransitionResult =
  | { ok: true; from: DeliveryStatus; to: DeliveryStatus }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "TERMINAL"
        | "ILLEGAL_EDGE"
        | "FORBIDDEN_ACTOR"
        | "NOT_ASSIGNED_DRIVER"
        | "PREP_INCOMPLETE"
        | "NO_DRIVER"
        | "DRIVER_NOT_YOURS";
      message: string;
    };

export async function transitionDeliveryStatus(
  input: TransitionInput,
): Promise<TransitionResult> {
  const client = input.tx ?? db;

  const delivery = await client.delivery.findFirst({
    where: {
      id: input.deliveryId,
      // Tenant scope lives in the query, not in a caller's memory.
      order: { restaurantId: input.restaurantId },
    },
    select: {
      id: true,
      status: true,
      driverId: true,
      orderId: true,
      order: {
        select: {
          id: true,
          orderNo: true,
          prepGroups: { select: { status: true } },
        },
      },
    },
  });

  if (!delivery) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Delivery not found for this restaurant.",
    };
  }

  const from = delivery.status;

  const check = canTransition(from, input.to, input.actor);
  if (!check.allowed) {
    return { ok: false, code: check.code, message: check.message };
  }

  // A rider token proves scope to ONE delivery. Re-verify against the assignment
  // rather than trusting that the caller resolved the right one.
  if (input.actor === "DRIVER") {
    if (!delivery.driverId || delivery.driverId !== input.driverId) {
      return {
        ok: false,
        code: "NOT_ASSIGNED_DRIVER",
        message: "You are not the rider assigned to this delivery.",
      };
    }
  }

  // The burger-and-Coke gate: an order is only collectable when EVERY station
  // has finished. Enforced here, never in a component, so no dashboard button
  // can ship a half-made order. Orders with no groups (legacy rows) are exempt.
  if (input.to === "READY_FOR_PICKUP") {
    const groups = delivery.order.prepGroups;
    if (groups.length > 0 && !groups.every((g) => isPrepComplete(g.status))) {
      return {
        ok: false,
        code: "PREP_INCOMPLETE",
        message: "Every station must finish before this order can be collected.",
      };
    }
  }

  if (input.to === "ASSIGNED") {
    const driverId = input.assignDriverId ?? delivery.driverId;
    if (!driverId) {
      return {
        ok: false,
        code: "NO_DRIVER",
        message: "Choose a rider before assigning this delivery.",
      };
    }

    // TENANCY: a rider id arrives from the client, so it must be proved to belong
    // to THIS restaurant. Without this check a caller could assign another
    // restaurant's rider by id — and thereby hand them a rider link carrying the
    // customer's address and phone. There is no RLS backstop to catch it.
    const driver = await client.deliveryDriver.findFirst({
      where: { id: driverId, restaurantId: input.restaurantId, isActive: true },
      select: { id: true },
    });
    if (!driver) {
      return {
        ok: false,
        code: "DRIVER_NOT_YOURS",
        message: "That rider does not belong to this restaurant.",
      };
    }
  }

  const data: Prisma.DeliveryUpdateInput = {
    status: input.to,
    ...timestampsFor(input.to),
  };

  if (input.to === "ASSIGNED" && input.assignDriverId) {
    data.driver = { connect: { id: input.assignDriverId } };
  }
  // Unassigning is an explicit part of going back to READY_FOR_PICKUP.
  if (input.to === "READY_FOR_PICKUP" && from === "ASSIGNED") {
    data.driver = { disconnect: true };
  }
  if (input.reason && (input.to === "CANCELLED" || input.to === "FAILED")) {
    data.cancelReason = input.reason;
  }

  await client.delivery.update({ where: { id: delivery.id }, data });

  // Fire-and-forget on the global client, matching the codebase convention. When
  // a caller passes `tx` and that transaction later rolls back, this row survives
  // — an audit entry for a transition that did not commit. That is the right way
  // round: a spurious forensic row is recoverable, a missing one is not.
  logAudit({
    action:
      input.to === "ASSIGNED" ? "DELIVERY_ASSIGNED" : "DELIVERY_STATUS_UPDATED",
    entity: "Delivery",
    entityId: delivery.id,
    detail: `${from} → ${input.to} by ${input.actor}${input.reason ? ` (${input.reason})` : ""}`,
    metadata: {
      orderId: delivery.orderId,
      orderNo: delivery.order.orderNo,
      from,
      to: input.to,
      actor: input.actor,
      driverId: input.assignDriverId ?? delivery.driverId ?? null,
    },
    userId: input.userId ?? undefined,
    restaurantId: input.restaurantId,
  });

  return { ok: true, from, to: input.to };
}

/**
 * Promote a delivery to READY_FOR_PICKUP once every preparation group is done.
 * Safe to call after any station update — it no-ops unless the gate is satisfied
 * and the delivery is still PENDING.
 */
export async function maybeMarkReadyForPickup(
  orderId: string,
  restaurantId: string,
  tx?: Client,
): Promise<boolean> {
  const client = tx ?? db;

  const order = await client.order.findFirst({
    where: { id: orderId, restaurantId },
    select: {
      delivery: { select: { id: true, status: true } },
      prepGroups: { select: { status: true } },
    },
  });

  if (!order?.delivery || order.delivery.status !== "PENDING") return false;
  if (order.prepGroups.length === 0) return false;
  if (!order.prepGroups.every((g) => isPrepComplete(g.status))) return false;

  const result = await transitionDeliveryStatus({
    deliveryId: order.delivery.id,
    to: "READY_FOR_PICKUP",
    actor: "SYSTEM",
    restaurantId,
    tx,
  });

  return result.ok;
}
