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

/** Topic for a restaurant's hotel booking feed (Hotel Hub bookings tab). */
export const restaurantBookingsTopic = (restaurantId: string) =>
  `restaurant:${restaurantId}:bookings`;

/**
 * Global feed for the master-admin panel — every order/payment/booking change
 * across all restaurants also signals here so admins/superadmins see live
 * updates without subscribing to every restaurant topic.
 */
export const adminTopic = () => `admin:events`;
