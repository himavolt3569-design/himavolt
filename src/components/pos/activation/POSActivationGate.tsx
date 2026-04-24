"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import POSWelcomeTour from "./POSWelcomeTour";
import POSActivationWizard from "./POSActivationWizard";
import type { Restaurant } from "@/context/RestaurantContext";

interface Props {
  restaurant: Restaurant | null;
  /** When true (from a parent trigger) open the wizard directly. */
  openWizard?: boolean;
  /** Called after the wizard closes (success or cancel) so parent can reset its trigger. */
  onWizardClose?: () => void;
  /** Called after successful activation so parent can refresh restaurants. */
  onActivated?: () => void;
}

type LocalFlow = "idle" | "welcome-dismissed" | "welcome-accepted";

export default function POSActivationGate({
  restaurant,
  openWizard,
  onWizardClose,
  onActivated,
}: Props) {
  const router = useRouter();
  const [flow, setFlow] = useState<LocalFlow>("idle");
  const [dismissedRestaurantId, setDismissedRestaurantId] = useState<string | null>(null);

  const markSeen = useCallback(async (id: string) => {
    try {
      await fetch(`/api/restaurants/${id}/pos/welcome-seen`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // non-fatal
    }
  }, []);

  if (!restaurant) return null;

  // Reset local flow when the active restaurant changes.
  const localFlowForRestaurant =
    dismissedRestaurantId === restaurant.id ? flow : "idle";

  const welcomeAlreadySeen = !!restaurant.posWelcomeSeenAt;
  const shouldShowWelcome =
    !openWizard &&
    !welcomeAlreadySeen &&
    localFlowForRestaurant === "idle";

  const shouldShowWizard =
    openWizard || localFlowForRestaurant === "welcome-accepted";

  if (shouldShowWelcome) {
    return (
      <POSWelcomeTour
        restaurantName={restaurant.name}
        onDismiss={() => {
          setDismissedRestaurantId(restaurant.id);
          setFlow("welcome-dismissed");
          markSeen(restaurant.id);
        }}
        onActivatePOS={() => {
          setDismissedRestaurantId(restaurant.id);
          setFlow("welcome-accepted");
          markSeen(restaurant.id);
        }}
        onSkipPOS={() => {
          setDismissedRestaurantId(restaurant.id);
          setFlow("welcome-dismissed");
          markSeen(restaurant.id);
        }}
      />
    );
  }

  if (shouldShowWizard) {
    return (
      <POSActivationWizard
        restaurantId={restaurant.id}
        restaurantSlug={restaurant.slug}
        restaurantCode={restaurant.restaurantCode}
        restaurantName={restaurant.name}
        alreadyActive={restaurant.posEnabled}
        initial={{
          terminalName: restaurant.posTerminalName ?? null,
          openingCash: restaurant.posOpeningCash ?? 2000,
          taxRate: restaurant.taxRate,
          taxEnabled: restaurant.taxEnabled,
          serviceChargeRate: restaurant.serviceChargeRate ?? 10,
          serviceChargeEnabled: restaurant.serviceChargeEnabled ?? true,
          customerModeEnabled: restaurant.posCustomerModeEnabled ?? true,
        }}
        onClose={() => {
          setDismissedRestaurantId(restaurant.id);
          setFlow("welcome-dismissed");
          onWizardClose?.();
        }}
        onActivated={() => {
          setDismissedRestaurantId(restaurant.id);
          setFlow("welcome-dismissed");
          onWizardClose?.();
          onActivated?.();
          router.push("/pos/staff");
        }}
      />
    );
  }

  return null;
}
