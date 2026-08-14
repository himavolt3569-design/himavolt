/**
 * Shared Realtime topic/event names used by BOTH the server broadcaster
 * (src/lib/realtime.ts) and the browser subscriber (src/hooks/useRealtimeSignal.ts).
 * Kept free of any server-only imports so it is safe in client components.
 */

/** A single broadcast event that all clients listen for on a given topic. */
export const REALTIME_EVENT = "changed";

/** Topic for a single order (customer order tracking / bill page). */
export const orderTopic = (orderId: string) => `order:${orderId}`;

/** Topic for a restaurant's live order feed (kitchen / dashboard / counter). */
export const restaurantOrdersTopic = (restaurantId: string) =>
  `restaurant:${restaurantId}:orders`;

/** Topic specifically for kitchen operations (KOT, prep status). */
export const restaurantKitchenTopic = (restaurantId: string) =>
  `restaurant:${restaurantId}:kitchen`;

/** Topic specifically for billing operations (payments, totals). */
export const restaurantBillingTopic = (restaurantId: string) =>
  `restaurant:${restaurantId}:billing`;

/** Topic for a restaurant's hotel booking feed (Hotel Hub bookings tab). */
export const restaurantBookingsTopic = (restaurantId: string) =>
  `restaurant:${restaurantId}:bookings`;

/** Topic for the delivery pipeline — dispatch, rider assignment, in-transit. */
export const restaurantDeliveryTopic = (restaurantId: string) =>
  `restaurant:${restaurantId}:delivery`;

/** Topic for one delivery, for the customer's tracking page and rider link. */
export const deliveryTopic = (deliveryId: string) => `delivery:${deliveryId}`;

/**
 * Global feed for the master-admin panel — every order/payment/booking change
 * across all restaurants also signals here so admins/superadmins see live
 * updates without subscribing to every restaurant topic.
 */
export const adminTopic = () => `admin:events`;
