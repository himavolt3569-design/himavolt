"use client";

import { useState, useEffect, useCallback } from "react";
import {
  requestNotificationPermission,
  onForegroundMessage,
} from "@/lib/firebase-client";
import { apiFetch } from "@/lib/api-client";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setFcmToken(token);
      setPermission("granted");

      try {
        await apiFetch("/api/fcm", {
          method: "POST",
          body: {
            token,
            device: navigator.userAgent.includes("Mobile")
              ? "mobile"
              : "desktop",
          },
        });
      } catch {
        // silently fail token registration
      }
    }
    return token;
  }, []);

  useEffect(() => {
    if (permission === "granted" && !fcmToken) {
      requestPermission();
    }
  }, [permission, fcmToken, requestPermission]);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const notification = (payload as { notification?: { title?: string; body?: string } })
        .notification;
      if (notification && "Notification" in window) {
        new Notification(notification.title || "HimalHub", {
          body: notification.body,
          icon: "/icons/icon-192x192.png",
        });
      }
    });
    return unsubscribe;
  }, []);

  return { permission, fcmToken, requestPermission };
}
