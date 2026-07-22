# 04 — Page Routes

46 page routes across 8 surfaces. Route groups `(checkout)` and `(stays)` provide
layouts without adding a URL segment.

## Root files

| File | Purpose |
| --- | --- |
| [`src/app/layout.tsx`](../src/app/layout.tsx) | Root layout. Poppins font, metadata, OG/Twitter cards, PWA manifest link, pre-paint theme script, `<Providers>`, `<BottomNav>`, `<PWAInstallPrompt>`, Vercel `<SpeedInsights>` + `<Analytics>` |
| [`src/app/providers.tsx`](../src/app/providers.tsx) | The 8-deep provider tree |
| [`src/app/globals.css`](../src/app/globals.css) | Tailwind v4 entry + CSS custom properties. Every font token (`--font-sans/-serif/-display/-fraunces/-syne`) is remapped to Poppins |
| [`src/app/error.tsx`](../src/app/error.tsx) | Global error boundary |
| [`src/app/loading.tsx`](../src/app/loading.tsx) | Global suspense fallback |
| [`src/app/not-found.tsx`](../src/app/not-found.tsx) | 404 |
| [`src/app/robots.ts`](../src/app/robots.ts) | Generated robots.txt |
| [`src/app/sitemap.ts`](../src/app/sitemap.ts) | Generated sitemap.xml |
| `src/app/favicon.ico` | |

Branding note: the root layout's metadata uses **HimaVolt** and `himavolt.com`,
theme colour `#eaa94d`. The npm package is `himavolt`; the repo is `himalhub`.

---

## Marketing / public

| Route | File | Notes |
| --- | --- | --- |
| `/` | [`src/app/page.tsx`](../src/app/page.tsx) | Landing page. Composed from `src/components/home/*` — CMS-driven via `SiteSetting` |
| `/features` | `src/app/features/page.tsx` | Module grid — links to each `/features/[id]` (data from `src/lib/platform-modules.ts`) |
| `/features/[id]` | `src/app/features/[id]/page.tsx` | Per-module marketing detail (SSG, 9 ids). The 9 homepage tiles link here |
| `/hardware` | `src/app/hardware/page.tsx` | Hardware **marketplace** — APPROVED listings, Buy, "Sell on HimaVolt" |
| `/hardware/sell` | `src/app/hardware/sell/page.tsx` | Account-less seller submission form |
| `/hardware/sell/[token]` | `src/app/hardware/sell/[token]/page.tsx` | Seller's status page (keyed by `manageToken`) |
| `/hardware/checkout/[id]` | `src/app/hardware/checkout/[id]/page.tsx` | Buyer order form for a listing |
| `/hardware/orders/[trackToken]` | `src/app/hardware/orders/[trackToken]/page.tsx` | Buyer order status + payment-proof upload |
| `/guide` | `src/app/guide/page.tsx` | User guide |
| `/demo` | `src/app/demo/page.tsx` | Demo showcase |
| `/contact` | `src/app/contact/page.tsx` + `layout.tsx` | Contact form → `ContactSubmission` |
| `/legal/privacy` | `src/app/legal/privacy/page.tsx` | |
| `/legal/terms` | `src/app/legal/terms/page.tsx` | |
| `/legal/refund` | `src/app/legal/refund/page.tsx` | |
| `/offers` | `src/app/offers/page.tsx` | Cross-restaurant offers |

---

## Auth

| Route | File | Notes |
| --- | --- | --- |
| `/sign-in` | `src/app/sign-in/page.tsx` + `loading.tsx` | Middleware redirects signed-in users to `/dashboard` |
| `/sign-up` | — | **Redirect** → `/sign-in` (`next.config.ts`) |
| `/register` | `src/app/register/page.tsx` | **Redirect** → `/sign-in` (server `redirect()`; legacy invite-only stub removed) |
| `/auth/get-started` | `src/app/auth/get-started/page.tsx` | Role selection — sets the intended-role cookie before OAuth |
| `/auth/set-password` | `src/app/auth/set-password/page.tsx` | For OAuth users adding a password |
| `/auth/forgot-password` | `src/app/auth/forgot-password/page.tsx` | |
| `/auth/reset-password` | `src/app/auth/reset-password/page.tsx` | |
| `/auth/join-restaurant` | `src/app/auth/join-restaurant/page.tsx` | Staff self-join flow |
| `/auth/callback` | [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts) | **Route handler, not a page.** Primary OAuth user creator |
| `/auth/complete-profile` | — | **Redirect** → `/dashboard` (`next.config.ts`) |
| `/staff-login` | `src/app/staff-login/page.tsx` + `layout.tsx` | Restaurant code + 4-digit PIN, or QR badge |

---

## Customer ordering

| Route | File | Notes |
| --- | --- | --- |
| `/menu` | `src/app/menu/page.tsx` + `layout.tsx` | Restaurant browse |
| `/menu/[slug]` | [`page.tsx`](../src/app/menu/[slug]/page.tsx) + [`MenuPageClient.tsx`](../src/app/menu/[slug]/MenuPageClient.tsx) + `loading.tsx` | **The core customer surface.** Server page fetches, client component renders. Themed per restaurant. Accepts `?table=` / `?room=` from QR |
| `/menu/[slug]/reserve` | `src/app/menu/[slug]/reserve/page.tsx` | Table reservation (RESTAURANT type) |
| `/food/[id]` | `src/app/food/[id]/page.tsx` + `loading.tsx` | Item detail; related + trending |
| `/scan` | `src/app/scan/page.tsx` + `layout.tsx` | QR scanner (`jsqr`). Needs `Permissions-Policy: camera=(self)` |
| `/orders` | `src/app/orders/page.tsx` + `loading.tsx` | Signed-in order history |
| `/track/[orderId]` | `src/app/track/[orderId]/page.tsx` + `loading.tsx` | Live tracking by order id |
| `/order-track/[trackToken]` | `src/app/order-track/[trackToken]/page.tsx` | **Guest tracking by opaque token.** No account needed |
| `/bill/[orderId]` | `src/app/bill/[orderId]/page.tsx` + `loading.tsx` | Bill view / print |
| `/feedback/[restaurantId]` | `src/app/feedback/[restaurantId]/page.tsx` + `loading.tsx` | Post-payment feedback (reached via bill QR) |
| `/profile` | `src/app/profile/page.tsx` + `loading.tsx` | Customer profile |

---

## Stays — route group `(stays)`

Shared layout: `src/app/(stays)/layout.tsx`; error boundary
`src/app/(stays)/error.tsx`.

| Route | File | Components |
| --- | --- | --- |
| `/hotels` | `src/app/(stays)/hotels/page.tsx` | `HotelSearchHero`, `HotelsBrowser`, `HotelsMapView`, `HotelsCinematicBg` |
| `/hotel/[slug]` | `src/app/(stays)/hotel/[slug]/page.tsx` | `HotelHeroGallery`, `HotelBookingSidebar`, `HotelLocationMap` (+`Client`), `RoomCategoryCard`, `ReviewSection` |
| `/hotel/[slug]/room/[roomNumber]` | `src/app/(stays)/hotel/[slug]/room/[roomNumber]/page.tsx` | Room detail |
| `/hotel/booking/[bookingId]` | `src/app/hotel/booking/[bookingId]/page.tsx` | Booking confirmation — **outside** the `(stays)` group |

## Checkout — route group `(checkout)`

Shared layout: `src/app/(checkout)/layout.tsx`; `CheckoutBackButton`.

| Route | File | Notes |
| --- | --- | --- |
| `/book/[roomId]` | `src/app/(checkout)/book/[roomId]/page.tsx` | Room booking checkout. `CheckoutForm.tsx` + **`actions.ts`** — one of only two Server Action files in the codebase |

---

## Owner dashboard

| Route | File | Notes |
| --- | --- | --- |
| `/dashboard` | [`page.tsx`](../src/app/dashboard/page.tsx) | Entry |
| `/dashboard/[tab]` | [`[tab]/page.tsx`](../src/app/dashboard/[tab]/page.tsx) | **Dynamic tab dispatcher.** A `COMPONENTS` record maps ~60 tab ids to lazy components; `TAB_DATA` maps tab ids to the API paths to pre-warm on hover. Exports `preloadTab()` |
| — | [`layout.tsx`](../src/app/dashboard/layout.tsx) | Sidebar (drag-resizable, width persisted), header, breadcrumbs, notification bell, theme toggle, global chat button, POS activation gate, create-restaurant modal. Two-wave chunk pre-warming + data pre-warming |
| — | [`CustomerDashboard.tsx`](../src/app/dashboard/CustomerDashboard.tsx) | 1,790 lines. Rendered **instead of** the owner dashboard when `userRole === "CUSTOMER"` |
| — | `error.tsx`, `loading.tsx` | |

### Valid `[tab]` values

Core: `overview`, `orders`, `billing`, `menu`, `staff`, `shifts`, `qr`, `tables`,
`reports`, `chat`, `payment-qr`, `payment-settings`, `tax-charges`, `stock`,
`offers`, `hero-slides`, `media`, `coupons`, `hotel-hub`, `rooms`,
`owner-control`, `stories`, `drinks`, `manual-billing`, `feedback`, `printing`,
`settings`

Feature tabs (34): `quick-counter`, `combo-meals`, `rush-hour`, `takeaway`,
`room-service`, `multi-outlet`, `event-catering`, `guest-billing`,
`buffet-manager`, `pre-orders`, `custom-cakes`, `daily-specials`,
`display-counter`, `delivery-ops`, `multi-brand`, `delivery-zones`,
`package-tracking`, `happy-hours`, `tab-management`, `cocktail-menu`,
`live-events`, `loyalty-rewards`, `wifi-seating`, `seasonal-menu`, `brunch-mode`,
`table-reservations`, `waitlist`, `private-dining`, `wifi-settings`,
`guest-checkin`, `room-qr-codes`, `hotel-bookings`, `hotel-qr`, `hotel-hub`,
`rooms`

An unknown tab renders "Page not found". A tab that has an icon but is not in
`LIVE_FEATURES` renders "Coming Soon".

### Merge history (deep links still resolve)

Several tabs were consolidated; the old routes were kept as deep links:

| Old route | Now opens |
| --- | --- |
| `/dashboard/drinks` | Stock page, Drinks sub-tab (`initialStockTab: "drinks"`) |
| `/dashboard/coupons` | Offers & Coupons page, Coupons sub-tab (`initialTab: "coupons"`) |
| `/dashboard/shifts` | standalone, but Shifts is also a tab inside Staff |
| `/dashboard/rooms` | Hotel Hub |
| `/dashboard/payment-qr`, `/payment-settings`, `/tax-charges`, `/printing`, `/owner-control`, `/hero-slides`, `/media` | all still resolve, but are also sections inside Settings |

### Sidebar navigation (`src/lib/dashboard-nav.ts`)

| Group | Items |
| --- | --- |
| `NAV_MAIN` | Dashboard, Live Orders (badge `live`), Fast Payment, Billing, Tables, Chats |
| `NAV_CATALOG` | Menu, Stock, Offers & Coupons |
| `NAV_PEOPLE` | Staff |
| `HOTEL_HUB_NAV_ITEM` | Hotel Hub (only for HOTEL/RESORT/GUEST_HOUSE) |
| `NAV_MORE` | Reports, Feedback, Settings |

Keyboard shortcuts: `1`→overview, `2`→orders, `3`→menu, `4`→staff, `5`→reports.

---

## Staff surfaces

All guarded by `staff_session` JWT at the middleware layer.

| Route | File | Notes |
| --- | --- | --- |
| `/kitchen` | [`src/app/kitchen/page.tsx`](../src/app/kitchen/page.tsx) | 1,735 lines. KDS. + `layout.tsx`, `loading.tsx`. Uses `KitchenBoard`, `useCountdown`, `useKotPrintJobs` |
| `/counter` | [`src/app/counter/page.tsx`](../src/app/counter/page.tsx) | 1,932 lines — the largest page. Counter/cashier. + `layout.tsx`, `loading.tsx` |
| `/pos/staff` | `src/app/pos/staff/page.tsx` | POS terminal (staff mode) |
| `/pos/cfd` | `src/app/pos/cfd/page.tsx` | Customer-Facing Display — the second screen. Syncs via `useCFDSync` |
| `/pos/[slug]` | `src/app/pos/[slug]/page.tsx` | Kiosk (customer self-service). **Public** — `PUBLIC_ROUTES` has `/pos/(?!staff)` |

> `src/app/pos/[slug]/page.tsx.out` is a disabled/parked file kept in git. It has
> no effect on routing (Next.js only picks up `page.tsx`). See
> [09-operations.md](09-operations.md#housekeeping).

---

## Master admin

| Route | File | Notes |
| --- | --- | --- |
| `/admin` | [`src/app/admin/page.tsx`](../src/app/admin/page.tsx) | Single-page app with 18 tabs from `src/components/admin/*`. + `layout.tsx`, `loading.tsx`, `AdminThemeLock.tsx` (forces a fixed theme regardless of user preference) |

Admin tabs: Master Overview, All Restaurants, All Users, All Orders, All
Payments, All Bookings, All Deliveries, All Chats, All Contacts, Inactive Users,
Audit, Hardware, Hero Settings, Landing Settings, Footer Settings, Gateway
Settings, plus `RestaurantFeatureOverridesModal` and `DeleteConfirmDialog`.

---

## Server Actions

Only two files use Server Actions — the codebase is overwhelmingly API-route based:

- `src/app/(checkout)/book/[roomId]/actions.ts` — room booking submit
- `src/lib/actions/contact.ts`, `src/lib/actions/landing.ts`

`next.config.ts` sets `serverActions.bodySizeLimit: "50mb"` — note this is far
above the 1 MB middleware guard, which only applies to API routes.

---

## Redirects (`next.config.ts`)

| From | To | Permanent |
| --- | --- | --- |
| `/sign-up` | `/sign-in` | no |
| `/auth/complete-profile` | `/dashboard` | no |
