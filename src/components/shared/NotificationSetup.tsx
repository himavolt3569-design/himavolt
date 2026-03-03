"use client";

import { useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";

export default function NotificationSetup() {
  const { permission, requestPermission } = useNotifications();

  useEffect(() => {
    if (permission === "default") {
      const timer = setTimeout(() => {
        requestPermission();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [permission, requestPermission]);

  return null;
}
