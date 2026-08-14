import "server-only";

import { db } from "@/lib/db";
import { parseKitchenStatus } from "./kitchen-status";
import { CUSTOMER_STATUS_LABELS } from "@/lib/delivery/transitions";
import type {
  DeliveryStatus,
  KitchenStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PrepStation,
} from "@/generated/prisma";

/**
 * One composed view over the four lifecycles an order actually has.
 *
 * The system deliberately does NOT collapse these into a single column:
 *   · `Payment.status`        — did the money arrive
 *   · `Order.status`          — did the restaurant accept it
 *   · `Order.kitchenStatus`   — is the food made (per station, via prep groups)
 *   · `Delivery.status`       — where is the rider
 *
 * Each has a different owner and a different failure mode; merging them would
 * mean one column that four subsystems race to write. Instead every UI reads
 * THIS, and nothing derives a headline status by hand.
 */

export interface StationProgress {
  station: PrepStation;
  status: KitchenStatus;
  complete: boolean;
}

export interface FulfilmentState {
  orderId: string;
  orderNo: string;
  type: OrderType;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
  paid: boolean;
  kitchenStatus: KitchenStatus | null;
  stations: StationProgress[];
  /** True when every station has finished (or the order predates prep groups). */
  allStationsReady: boolean;
  deliveryStatus: DeliveryStatus | null;
  /** Single line the customer sees. */
  headline: string;
  /**
   * True when a prepaid order is still waiting on money and must NOT reach the
   * kitchen. The anti-fraud gate for night-time delivery from strangers.
   */
  blockedOnPayment: boolean;
}

const PAID_STATUSES: readonly PaymentStatus[] = ["COMPLETED"];

function headlineFor(args: {
  type: OrderType;
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  kitchenStatus: KitchenStatus | null;
  blockedOnPayment: boolean;
}): string {
  if (args.blockedOnPayment) return "Waiting for payment";
  if (args.orderStatus === "REJECTED") return "Rejected by the restaurant";
  if (args.orderStatus === "PENDING") return "Waiting for the restaurant";

  if (args.type === "DELIVERY" && args.deliveryStatus) {
    return CUSTOMER_STATUS_LABELS[args.deliveryStatus];
  }

  switch (args.kitchenStatus) {
    case "PREPARING":
      return "Being prepared";
    case "READY":
      return args.type === "TAKEAWAY" ? "Ready for pickup" : "Ready";
    case "SERVED":
      return "Served";
    default:
      return "Accepted";
  }
}

export async function getOrderFulfilmentState(
  orderId: string,
  restaurantId: string,
): Promise<FulfilmentState | null> {
  const order = await db.order.findFirst({
    // Tenant scope in the query — no RLS backstop exists.
    where: { id: orderId, restaurantId },
    select: {
      id: true,
      orderNo: true,
      type: true,
      status: true,
      kitchenStatus: true,
      isPrepaid: true,
      payment: { select: { status: true } },
      delivery: { select: { status: true } },
      prepGroups: { select: { station: true, status: true } },
    },
  });

  if (!order) return null;

  const paymentStatus = order.payment?.status ?? null;
  const paid = paymentStatus != null && PAID_STATUSES.includes(paymentStatus);
  const blockedOnPayment = order.isPrepaid && !paid;

  const stations: StationProgress[] = order.prepGroups.map((g) => ({
    station: g.station,
    status: g.status,
    complete: g.status === "READY" || g.status === "SERVED",
  }));

  const allStationsReady =
    stations.length === 0 || stations.every((s) => s.complete);

  const kitchenStatus = parseKitchenStatus(order.kitchenStatus);
  const deliveryStatus = order.delivery?.status ?? null;

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    type: order.type,
    orderStatus: order.status,
    paymentStatus,
    paid,
    kitchenStatus,
    stations,
    allStationsReady,
    deliveryStatus,
    blockedOnPayment,
    headline: headlineFor({
      type: order.type,
      orderStatus: order.status,
      deliveryStatus,
      kitchenStatus,
      blockedOnPayment,
    }),
  };
}
