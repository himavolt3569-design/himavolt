let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  if (swRegistration) return swRegistration;

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    swRegistration.addEventListener("updatefound", () => {
      const newWorker = swRegistration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "activated" &&
          navigator.serviceWorker.controller
        ) {
          // New SW activated; could prompt user to refresh
        }
      });
    });

    return swRegistration;
  } catch {
    return null;
  }
}

export function getServiceWorkerRegistration() {
  return swRegistration;
}
