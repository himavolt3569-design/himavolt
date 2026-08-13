"use client";

import { useEffect, useState } from "react";
import { apiFetch, peekApiCache } from "@/lib/api-client";
import { useResolvedRestaurantId } from "@/context/RestaurantContext";

/**
 * Staff-workflow flags, read live from the capabilities endpoint.
 *
 * Deliberately NOT delivered through the staff-session JWT on the dashboard:
 * that snapshot is minted at login, so an owner flipping "Merge Orders &
 * Billing" at 7pm would not reach a device until someone logged out and back
 * in — which looks like the setting is broken. `apiFetch`'s GET cache keeps
 * this cheap, and `peekApiCache` seeds the first render so the nav does not
 * flicker between layouts.
 */
export interface WorkflowSettings {
  /** One unified "Orders & Billing" surface instead of two separate tabs. */
  mergeBillingOrders: boolean;
  /** Accept incoming orders the instant they land. */
  autoAcceptOrders: boolean;
  loading: boolean;
}

interface CapabilityResponse {
  capability?: {
    mergeBillingOrders?: boolean;
    autoAcceptOrders?: boolean;
  };
}

export function useWorkflowSettings(explicitRestaurantId?: string): WorkflowSettings {
  const restaurantId = useResolvedRestaurantId(explicitRestaurantId);
  const path = restaurantId
    ? `/api/restaurants/${restaurantId}/capabilities`
    : null;

  const seed = path ? peekApiCache<CapabilityResponse>(path) : null;
  const [settings, setSettings] = useState({
    mergeBillingOrders: seed?.capability?.mergeBillingOrders ?? false,
    autoAcceptOrders: seed?.capability?.autoAcceptOrders ?? false,
  });
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<CapabilityResponse>(path, {
          cacheTtl: 60_000,
        });
        if (cancelled) return;
        setSettings({
          mergeBillingOrders: data.capability?.mergeBillingOrders ?? false,
          autoAcceptOrders: data.capability?.autoAcceptOrders ?? false,
        });
      } catch {
        // Staff without manager access get a 403 here. Falling back to the
        // unmerged layout is the safe default — it is what they see today.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { ...settings, loading };
}
