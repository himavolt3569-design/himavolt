import { getMessaging } from "./firebase-admin";
import { db } from "./db";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
}

export async function sendNotificationToUser(
  userId: string,
  payload: NotificationPayload
) {
  const messaging = getMessaging();
  if (!messaging) return;

  const tokens = await db.fCMToken.findMany({
    where: { userId },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
    },
    data: payload.data || {},
    tokens: tokens.map((t) => t.token),
  };

  try {
    const response = await messaging.sendEachForMulticast(message);

    const tokensToRemove: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (
        !resp.success &&
        resp.error?.code &&
        [
          "messaging/invalid-registration-token",
          "messaging/registration-token-not-registered",
        ].includes(resp.error.code)
      ) {
        tokensToRemove.push(tokens[idx].token);
      }
    });

    if (tokensToRemove.length > 0) {
      await db.fCMToken.deleteMany({
        where: { token: { in: tokensToRemove } },
      });
    }
  } catch {
    // FCM send failed silently
  }
}

export async function sendNotificationToRestaurantStaff(
  restaurantId: string,
  payload: NotificationPayload
) {
  const staff = await db.staffMember.findMany({
    where: { restaurantId, isActive: true },
    select: { userId: true },
  });

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });

  const userIds = new Set([
    ...staff.map((s) => s.userId),
    ...(restaurant ? [restaurant.ownerId] : []),
  ]);

  await Promise.all(
    Array.from(userIds).map((uid) => sendNotificationToUser(uid, payload))
  );
}

export async function notifyKitchenNewOrder(
  restaurantId: string,
  orderNo: string,
  total: number,
  tableNo: number | null
) {
  await sendNotificationToRestaurantStaff(restaurantId, {
    title: "New Order Received!",
    body: `Order #${orderNo}${tableNo ? ` (Table ${tableNo})` : ""} — Rs. ${total}`,
    data: {
      type: "NEW_ORDER",
      orderNo,
      restaurantId,
    },
  });
}

export async function notifyCustomerOrderUpdate(
  userId: string,
  orderNo: string,
  status: string,
  restaurantName: string
) {
  const statusMessages: Record<string, { title: string; body: string }> = {
    ACCEPTED: {
      title: "Order Accepted!",
      body: `${restaurantName} has accepted your order #${orderNo}`,
    },
    PREPARING: {
      title: "Your Food is Being Prepared",
      body: `The chef is working on your order #${orderNo}`,
    },
    READY: {
      title: "Order Ready!",
      body: `Your order #${orderNo} is ready for pickup`,
    },
    DELIVERED: {
      title: "Enjoy Your Meal!",
      body: `Order #${orderNo} has been delivered. Bon appétit!`,
    },
    REJECTED: {
      title: "Order Rejected",
      body: `Sorry, ${restaurantName} couldn't fulfill order #${orderNo}`,
    },
    CANCELLED: {
      title: "Order Cancelled",
      body: `Your order #${orderNo} has been cancelled`,
    },
  };

  const msg = statusMessages[status];
  if (!msg) return;

  await sendNotificationToUser(userId, {
    ...msg,
    data: { type: "ORDER_UPDATE", orderNo, status },
  });
}
