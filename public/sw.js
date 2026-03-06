/* eslint-disable no-undef */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `himalhub-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `himalhub-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json"];

// ─── Firebase Cloud Messaging ───────────────────────────────────────────────
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

if (self.__FIREBASE_CONFIG__?.projectId) {
  firebase.initializeApp({
    apiKey: self.__FIREBASE_CONFIG__.apiKey || "",
    authDomain: self.__FIREBASE_CONFIG__.authDomain || "",
    projectId: self.__FIREBASE_CONFIG__.projectId,
    storageBucket: self.__FIREBASE_CONFIG__.storageBucket || "",
    messagingSenderId: self.__FIREBASE_CONFIG__.messagingSenderId || "",
    appId: self.__FIREBASE_CONFIG__.appId || "",
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};

    self.registration.showNotification(title || "HimalHub", {
      body: body || "You have a new notification",
      icon: icon || "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: payload.data,
      vibrate: [200, 100, 200],
      tag: payload.data?.type || "default",
    });
  });
}

// ─── PWA Caching ────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot)(\?.*)?$/.test(
    url,
  );
}

function isApiRequest(url) {
  return url.includes("/api/");
}

function isNextInternalRequest(url) {
  return url.includes("/_next/");
}

// Network-first for navigation, with offline fallback
function handleNavigationRequest(event) {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches
          .open(DYNAMIC_CACHE)
          .then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match(OFFLINE_URL)),
      ),
  );
}

// Cache-first for static assets (Next.js hashed bundles, images, fonts)
function handleStaticAsset(event) {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
}

// Stale-while-revalidate for Next.js internal chunks
function handleNextInternal(event) {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    }),
  );
}

// Network-first for API requests, serve cached if offline
function handleApiRequest(event) {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.redirected && !response.url.startsWith(self.location.origin)) {
          return response;
        }
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = event.request.url;

  if (isNavigationRequest(event.request)) {
    handleNavigationRequest(event);
  } else if (isApiRequest(url)) {
    handleApiRequest(event);
  } else if (isNextInternalRequest(url)) {
    handleNextInternal(event);
  } else if (isStaticAsset(url)) {
    handleStaticAsset(event);
  } else {
    // Default: network-first
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(DYNAMIC_CACHE)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) => cached || new Response("Offline", { status: 503 }),
          ),
        ),
    );
  }
});

// ─── Notification Click ─────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = "/";

  if (data?.type === "NEW_ORDER") {
    url = "/dashboard";
  } else if (data?.type === "ORDER_UPDATE") {
    url = `/track/${data.orderNo}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
