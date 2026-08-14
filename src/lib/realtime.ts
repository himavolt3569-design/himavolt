import "server-only";

/**
 * Supabase Realtime (WebSocket) broadcast helpers.
 *
 * We use Supabase Realtime *Broadcast* as an instant "something changed" signal
 * rather than streaming row data over the socket. The server fires a lightweight
 * broadcast on every order/payment/bill state change; subscribed clients react
 * by re-fetching through their existing access-checked API routes. This gives us
 * genuine WebSocket-driven realtime that works on Vercel serverless (the socket
 * server is hosted by Supabase) without exposing any DB rows over public channels
 * or wiring up table-level RLS.
 *
 * Sending happens via Supabase's serverless-friendly HTTP Broadcast endpoint, so
 * no long-lived connection is held inside the request handler. Everything here is
 * fire-and-forget and never throws into the request path — if Realtime is not
 * configured, calls simply no-op and the SSE fallback continues to work.
 */

import {
  REALTIME_EVENT,
  orderTopic,
  restaurantOrdersTopic,
  restaurantKitchenTopic,
  restaurantBillingTopic,
  restaurantBookingsTopic,
  restaurantDeliveryTopic,
  deliveryTopic,
  adminTopic,
} from "@/lib/realtime-topics";

export {
  REALTIME_EVENT,
  orderTopic,
  restaurantOrdersTopic,
  restaurantKitchenTopic,
  restaurantBillingTopic,
  restaurantBookingsTopic,
  adminTopic,
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function realtimeEnabled(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

type BroadcastMessage = {
  topic: string;
  event?: string;
  payload?: Record<string, unknown>;
};

/**
 * Low-level broadcast. Posts one or more messages to Supabase's HTTP broadcast
 * endpoint using the service role key. Never throws.
 */
export async function broadcast(
  messages: BroadcastMessage | BroadcastMessage[],
): Promise<void> {
  if (!realtimeEnabled()) return;
  const list = Array.isArray(messages) ? messages : [messages];
  if (list.length === 0) return;

  try {
    await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY as string,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        messages: list.map((m) => ({
          topic: m.topic,
          event: m.event ?? REALTIME_EVENT,
          payload: m.payload ?? {},
        })),
      }),
      // Realtime broadcast is best-effort; don't let it slow the response.
      cache: "no-store",
    });
  } catch (err) {
    console.error("[realtime] broadcast failed (non-fatal):", err);
  }
}

/**
 * Signal that a specific order changed. Notifies both the order's own channel
 * (customer tracking / bill) and the restaurant's live feed (kitchen/dashboard).
 * Fire-and-forget — safe to call without awaiting.
 */
export function notifyOrderChanged(
  orderId: string,
  restaurantId?: string | null,
  payload: Record<string, unknown> = {},
): void {
  const messages: BroadcastMessage[] = [
    { topic: orderTopic(orderId), payload: { orderId, ...payload } },
    { topic: adminTopic(), payload: { orderId, ...payload } },
  ];
  if (restaurantId) {
    // Legacy compatibility (keep sending broadly if needed, but narrow down logic)
    messages.push({
      topic: restaurantOrdersTopic(restaurantId),
      payload: { orderId, ...payload },
    });

    const hasPaymentChanges = "payment" in payload;
    const hasKitchenChanges = "status" in payload || "reason" in payload || "items" in payload;

    // Anything that moves a delivery, or changes what the kitchen has finished,
    // matters to the dispatch board — a station going READY is what makes an
    // order collectable.
    if ("delivery" in payload || hasKitchenChanges) {
      messages.push({
        topic: restaurantDeliveryTopic(restaurantId),
        payload: { orderId, ...payload },
      });
    }

    if (hasPaymentChanges || payload.reason === "bill-changed") {
      messages.push({
        topic: restaurantBillingTopic(restaurantId),
        payload: { orderId, ...payload },
      });
    }
    if (hasKitchenChanges) {
      messages.push({
        topic: restaurantKitchenTopic(restaurantId),
        payload: { orderId, ...payload },
      });
      // Billing also cares when new items are added or order is cancelled
      if (!hasPaymentChanges) {
        messages.push({
          topic: restaurantBillingTopic(restaurantId),
          payload: { orderId, ...payload },
        });
      }
    }
  }
  void broadcast(messages);
}

/**
 * Signal that a restaurant's order feed changed (e.g. a brand-new order). Used
 * to wake the kitchen/dashboard instantly. Fire-and-forget.
 */
export function notifyRestaurantOrders(
  restaurantId: string,
  payload: Record<string, unknown> = {},
): void {
  void broadcast([
    { topic: restaurantOrdersTopic(restaurantId), payload },
    { topic: adminTopic(), payload },
  ]);
}

/**
 * Signal that a restaurant's hotel bookings changed (new booking, cancellation
 * request, receipt upload, status/payment change). Wakes the Hotel Hub bookings
 * tab instantly. Fire-and-forget.
 */
export function notifyRestaurantBookings(
  restaurantId: string,
  payload: Record<string, unknown> = {},
): void {
  void broadcast([
    { topic: restaurantBookingsTopic(restaurantId), payload },
    { topic: adminTopic(), payload },
  ]);
}

/**
 * Signal that one delivery moved — assigned, picked up, in transit, delivered,
 * or a fresh rider location ping.
 *
 * Fans out to three audiences: the dispatch board, the customer's tracking page,
 * and the order topic the tracking page already subscribes to. Carries no row
 * data, like every other signal here — receivers re-fetch through the normal
 * access-checked APIs, so realtime never widens what anyone can read.
 */
export function notifyDeliveryChanged(
  deliveryId: string,
  restaurantId: string,
  orderId: string,
  payload: Record<string, unknown> = {},
): void {
  const body = { deliveryId, orderId, ...payload };
  void broadcast([
    { topic: deliveryTopic(deliveryId), payload: body },
    { topic: restaurantDeliveryTopic(restaurantId), payload: body },
    { topic: orderTopic(orderId), payload: body },
    { topic: adminTopic(), payload: body },
  ]);
}
