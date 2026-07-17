# 05 — API Reference

197 route files under `src/app/api`. Access column legend:

| Tag | Meaning |
| --- | --- |
| 🌐 | Public — no auth (in `PUBLIC_ROUTES`) |
| 👤 | Supabase user session |
| 🏪 | Restaurant access — owner or bound staff (`access-control.ts`) |
| 👔 | Owner or manager-role staff |
| 💰 | Owner or billing-role staff (SUPER_ADMIN/MANAGER/CASHIER) |
| 🔑 | Owner only |
| 🧑‍🍳 | Staff JWT |
| 🛡️ | Master admin (`requireAdmin()`) |
| 🎟️ | Track cookie / order access (`canAccessOrder()`) |

Verify the exact guard in the route file before relying on this table — several
routes resolve access dynamically.

---

## Public — `/api/public/*` 🌐

### Restaurants

| Methods | Path |
| --- | --- |
| GET | `/api/public/restaurants` |
| GET | `/api/public/restaurants/[slug]` |
| GET | `/api/public/restaurants/[slug]/menu` |
| GET | `/api/public/restaurants/[slug]/hero-slides` |
| GET | `/api/public/restaurants/[slug]/stories` |
| POST | `/api/public/restaurants/[slug]/stories/view` |
| GET | `/api/public/restaurants/[slug]/specials` |
| GET | `/api/public/restaurants/[slug]/combo-meals` |
| GET | `/api/public/restaurants/[slug]/happy-hours` |
| GET | `/api/public/restaurants/[slug]/rush-hour` |
| GET | `/api/public/restaurants/[slug]/display-counter` |
| GET | `/api/public/restaurants/[slug]/coupons` |
| POST | `/api/public/restaurants/[slug]/coupons/validate` |
| GET | `/api/public/restaurants/[slug]/payment-methods` |
| GET | `/api/public/restaurants/[slug]/payment-qrs` |
| GET | `/api/public/restaurants/[slug]/delivery-zones` |
| GET | `/api/public/restaurants/[slug]/rewards` |
| GET, POST | `/api/public/restaurants/[slug]/reservations` |
| GET | `/api/public/restaurants/[slug]/rooms` |
| GET | `/api/public/restaurants/[slug]/rooms/[roomId]` |
| GET | `/api/public/restaurants/[slug]/can-edit` |
| PATCH | `/api/public/restaurants/[slug]/cover` |
| GET | `/api/public/restaurant/[restaurantId]` |

> `PATCH /api/public/restaurants/[slug]/cover` is a mutation on a public path —
> it pairs with `can-edit`, which resolves the caller's edit rights. Read both
> before changing either.

### Menu, hotels, misc

| Methods | Path |
| --- | --- |
| GET | `/api/public/menu-items` |
| GET | `/api/public/menu-items/[id]` |
| GET | `/api/public/menu-items/[id]/ratings` |
| GET | `/api/public/categories` |
| GET | `/api/public/hardware` |
| GET | `/api/public/feedback/[orderId]` |
| GET | `/api/public/hotels` |
| GET | `/api/public/hotel/[slug]` |
| GET | `/api/public/hotel/[slug]/room/[roomNumber]` |
| POST | `/api/public/hotel/[slug]/bookings` |
| GET, PATCH | `/api/public/hotel/booking/[bookingId]` |

---

## Auth & session

| Methods | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/account-check` | 🌐 | does this email exist / have a password |
| POST | `/api/staff-login` | 🌐 | code + PIN → `staff_session`. 5/15min |
| POST | `/api/staff-login/qr` | 🌐 | QR badge (`StaffMember.qrToken`) |
| GET, DELETE | `/api/staff-session` | 🌐 | read / clear staff session |
| POST | `/api/staff/join` | 👤 | staff self-join request |
| GET, POST | `/api/staff/attendance` | 🧑‍🍳 | clock in / out |
| PATCH | `/api/staff/profile/pin` | 🧑‍🍳 | change PIN — requires current PIN. 5/15min |
| POST | `/api/admin/login` | 🌐 | env credentials → `master_admin_session`. 5/15min |
| POST | `/api/admin/logout` | 🌐 | |
| GET | `/api/admin/verify` | 🌐 | is the admin cookie valid |

---

## Current user — `/api/me/*` 👤

| Methods | Path | Notes |
| --- | --- | --- |
| GET, PATCH, DELETE | `/api/me` | **The role source of truth** for `AuthContext` |
| GET | `/api/me/stats` | |
| GET | `/api/me/username-check` | availability |
| GET | `/api/me/orders/count` | |
| GET, POST, DELETE | `/api/me/favourites` | |
| GET, POST | `/api/me/reviews` | |
| GET, POST | `/api/me/ratings` | menu-item ratings |
| GET, POST | `/api/me/check-in` | daily streak |
| GET | `/api/me/loyalty` | across all restaurants |
| GET | `/api/me/loyalty/[slug]` | one restaurant |
| GET | `/api/me/hotel-bookings` | |

---

## Orders

| Methods | Path | Access | Notes |
| --- | --- | --- | --- |
| GET | `/api/orders` | 👤 | customer's own orders |
| GET | `/api/orders/[orderId]/bill` | 🎟️ | |
| POST | `/api/orders/[orderId]/cancel` | 🎟️ | restores stock |
| GET, POST | `/api/restaurants/[id]/orders` | 🌐→resolved | **Order creation.** Public path; handler resolves staff/owner/guest itself. `?live=1` for the kitchen queue |
| GET, PATCH | `/api/restaurants/[id]/orders/[orderId]` | 🏪 | accept / reject / status |
| PATCH | `/api/restaurants/[id]/orders/[orderId]/round` | 🏪 | per-round kitchen status |
| GET, PATCH | `/api/restaurants/[id]/orders/held` | 🏪 | POS hold / recall |
| GET, POST | `/api/restaurants/[id]/orders/cleanup` | 🏪 | |
| GET | `/api/restaurants/[id]/orders/stream` | 🏪 | **SSE** |

### Guest tracking 🎟️

| Methods | Path |
| --- | --- |
| GET | `/api/order-track/[trackToken]` |
| POST | `/api/order-track/[trackToken]/cancel` |
| GET | `/api/order-track/[trackToken]/stream` (**SSE**) |
| GET | `/api/track` |
| GET | `/api/track/lookup` |
| GET | `/api/track/stream` (**SSE**) |

---

## Payments

| Methods | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/api/payments/initiate` | 🌐 | 6 methods. 20/15min |
| GET | `/api/payments/[orderId]/status` | 🌐 | poll |
| POST | `/api/payments/bank-proof` | 🌐 | proof upload → `AWAITING_VERIFICATION`. Zod + 10/15min |
| GET | `/api/payments/esewa/callback` | 🌐 | gateway return |
| GET | `/api/payments/khalti/callback` | 🌐 | gateway return |
| POST | `/api/payments/room-booking/initiate` | 🌐 | hotel advance |
| GET | `/api/payments/room-booking/esewa/callback` | 🌐 | |
| GET | `/api/payments/room-booking/khalti/callback` | 🌐 | |
| GET | `/api/cron/expire-payments` | 🌐 | **Vercel cron, daily 00:00** |

---

## Restaurant management — `/api/restaurants/[id]/*`

### Core

| Methods | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/restaurants` | 👤 |
| GET, PATCH, DELETE | `/api/restaurants/[id]` | 🔑 |
| GET, PATCH | `/api/restaurants/[id]/status` | 🏪 |
| GET, PATCH | `/api/restaurants/[id]/theme` | 👔 |
| GET, PUT | `/api/restaurants/[id]/features` | 👔 |
| GET, PUT | `/api/restaurants/[id]/feature-config/[featureId]` | 👔 |
| GET | `/api/restaurants/[id]/financials` | 🔑 |

### Menu & stock

| Methods | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/restaurants/[id]/menu` | 👔 |
| PATCH, DELETE | `/api/restaurants/[id]/menu/[itemId]` | 👔 |
| PATCH, DELETE | `/api/restaurants/[id]/menu/[itemId]/offer` | 👔 |
| GET, POST, DELETE | `/api/restaurants/[id]/menu/[itemId]/ingredients` | 👔 |
| GET, POST | `/api/restaurants/[id]/menu/[itemId]/ratings` | 🌐/👤 |
| GET, POST, PATCH, DELETE | `/api/restaurants/[id]/categories` | 👔 |
| POST | `/api/restaurants/[id]/categories/seed` | 👔 |
| GET, POST | `/api/restaurants/[id]/categories/templates` | 👔 |
| GET, POST | `/api/restaurants/[id]/inventory` | 🏪 |
| PATCH, DELETE | `/api/restaurants/[id]/inventory/[itemId]` | 🏪 |

### Billing 💰

| Methods | Path | Notes |
| --- | --- | --- |
| GET | `/api/restaurants/[id]/billing` | `?filter=unpaid\|paid\|today` |
| GET | `/api/restaurants/[id]/billing/summary` | daily rollup |
| GET | `/api/restaurants/[id]/billing/stream` | **SSE** |
| POST | `/api/restaurants/[id]/billing/collect` | mark paid |
| POST | `/api/restaurants/[id]/billing/discount` | |
| POST | `/api/restaurants/[id]/billing/split` | split bill |
| POST | `/api/restaurants/[id]/billing/verify-bank` | approve/reject proof |
| GET | `/api/restaurants/[id]/billing/reconciliation` | drawer reconciliation |
| GET | `/api/restaurants/[id]/billing/staff-report` | per-staff takings |

### Payments config

| Methods | Path | Access |
| --- | --- | --- |
| GET, PATCH | `/api/restaurants/[id]/payment-config` | 🔑 |
| GET, POST | `/api/restaurants/[id]/payment-qrs` | 👔 |
| PATCH, DELETE | `/api/restaurants/[id]/payment-qrs/[qrId]` | 👔 |
| GET, PUT | `/api/restaurants/[id]/tax-config` | 🔑 |
| GET, PATCH | `/api/restaurants/[id]/prepaid/config` | 👔 |
| GET | `/api/restaurants/[id]/prepaid/tokens` | 💰 |
| PATCH | `/api/restaurants/[id]/prepaid/tokens/[tokenId]` | 💰 |
| GET, POST | `/api/restaurants/[id]/prepaid-config` | 👔 |
| GET, POST | `/api/restaurants/[id]/prepaid-tokens` | 💰 |
| PATCH | `/api/restaurants/[id]/prepaid-tokens/[tokenId]` | 💰 |

> **Duplicate surface.** `prepaid/config` + `prepaid/tokens` and
> `prepaid-config` + `prepaid-tokens` are two parallel route trees for the same
> concept. Both are live. Determine which the UI actually calls before deleting
> either — see [09-operations.md](09-operations.md#known-risks--rough-edges).

### Staff & shifts

| Methods | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/restaurants/[id]/staff` | 👔 |
| PATCH, DELETE | `/api/restaurants/[id]/staff/[staffId]` | 👔 |
| GET, POST | `/api/restaurants/[id]/shifts` | 👔 |
| PATCH, DELETE | `/api/restaurants/[id]/shifts/[shiftId]` | 👔 |
| GET | `/api/restaurants/[id]/shifts/now` | 🧑‍🍳 |
| GET | `/api/restaurants/[id]/shifts/report` | 👔 |
| GET | `/api/restaurants/[id]/attendance` | 👔 |
| GET | `/api/restaurants/[id]/reports/overview` | 👔 |
| GET | `/api/restaurants/[id]/reports/staff/[staffId]` | 👔 |

### Tables & sessions

| Methods | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/restaurants/[id]/tables` | 🏪 |
| PATCH, DELETE | `/api/restaurants/[id]/tables/[tableId]` | 🏪 |
| POST | `/api/restaurants/[id]/tables/bulk` | 🏪 |
| GET, POST | `/api/restaurants/[id]/table-session` | 🌐 |
| POST | `/api/restaurants/[id]/table-session/clear` | 🌐 |
| POST | `/api/restaurants/[id]/table-session/browse/clear` | 🌐 |
| POST | `/api/restaurants/[id]/table-session/bill` | 🌐 |

### Hotel

| Methods | Path | Access |
| --- | --- | --- |
| GET, POST | `/api/restaurants/[id]/rooms` | 💰 |
| GET, PATCH, DELETE | `/api/restaurants/[id]/rooms/[roomId]` | 💰 |
| GET, POST | `/api/restaurants/[id]/bookings` | 💰 |
| GET, PATCH, DELETE | `/api/restaurants/[id]/bookings/[bookingId]` | 💰 |
| GET, POST | `/api/restaurants/[id]/guest-checkins` | 💰 |
| PATCH, DELETE | `/api/restaurants/[id]/guest-checkins/[checkInId]` | 💰 |
| GET, PATCH | `/api/restaurants/[id]/hotel-config` | 👔 |

### Feature-specific

| Methods | Path | Feature |
| --- | --- | --- |
| GET, POST | `/api/restaurants/[id]/combo-meals` | FAST_FOOD |
| PATCH, DELETE | `/api/restaurants/[id]/combo-meals/[comboId]` | |
| GET, PATCH | `/api/restaurants/[id]/rush-hour` | FAST_FOOD, MO_MO_SHOP |
| POST | `/api/restaurants/[id]/rush-hour/slots` | |
| PATCH, DELETE | `/api/restaurants/[id]/rush-hour/slots/[slotId]` | |
| GET, POST | `/api/restaurants/[id]/happy-hours` | BAR |
| PATCH, DELETE | `/api/restaurants/[id]/happy-hours/[hourId]` | |
| GET, POST, PATCH, DELETE | `/api/restaurants/[id]/display-counter` | most |
| GET, POST | `/api/restaurants/[id]/reservations` | RESTAURANT |
| PATCH, DELETE | `/api/restaurants/[id]/reservations/[resId]` | |
| GET, PUT | `/api/restaurants/[id]/loyalty` | CAFE, SWEETS |
| POST | `/api/restaurants/[id]/loyalty/rewards` | |
| PATCH, DELETE | `/api/restaurants/[id]/loyalty/rewards/[rewardId]` | |
| GET, POST | `/api/restaurants/[id]/delivery-zones` | CLOUD_KITCHEN |
| GET, POST | `/api/restaurants/[id]/coupons` | all |
| PATCH, DELETE | `/api/restaurants/[id]/coupons/[couponId]` | |
| POST | `/api/restaurants/[id]/coupons/validate` | |

### Content

| Methods | Path |
| --- | --- |
| GET, POST, PATCH, DELETE | `/api/restaurants/[id]/hero-slides` |
| GET, POST, DELETE | `/api/restaurants/[id]/stories` |
| GET, POST, DELETE | `/api/restaurants/[id]/media` |
| GET, POST | `/api/restaurants/[id]/feedback` |
| PATCH, DELETE | `/api/restaurants/[id]/feedback/[feedbackId]` |

### POS & printing

| Methods | Path | Notes |
| --- | --- | --- |
| POST, DELETE | `/api/restaurants/[id]/pos/activate` | flips `posEnabled` |
| GET | `/api/restaurants/[id]/pos/status` | |
| POST | `/api/restaurants/[id]/pos/welcome-seen` | dismiss first-run tour |
| GET | `/api/restaurants/[id]/print-jobs` | claimable KOT queue |
| POST | `/api/restaurants/[id]/print-jobs/[jobId]` | claim / printed / failed |
| GET, PUT | `/api/restaurants/[id]/print-settings` | |

---

## Master admin — `/api/admin/*` 🛡️

| Methods | Path |
| --- | --- |
| GET | `/api/admin/stats` |
| GET | `/api/admin/presence` |
| GET, PATCH, DELETE | `/api/admin/restaurants` |
| GET, PUT | `/api/admin/restaurants/[id]/features` |
| GET, PATCH, DELETE | `/api/admin/users` |
| GET, PATCH | `/api/admin/inactive-users` |
| GET, PATCH, DELETE | `/api/admin/orders` |
| GET, DELETE | `/api/admin/payments` |
| GET, DELETE | `/api/admin/bookings` |
| GET, DELETE | `/api/admin/deliveries` |
| GET, DELETE | `/api/admin/chats` |
| GET | `/api/admin/audit` |
| GET | `/api/admin/audit/stream` (**SSE**) |
| GET, POST, PATCH, DELETE | `/api/admin/hardware` |
| GET, PATCH | `/api/admin/hero-settings` |
| GET, PATCH | `/api/admin/landing-settings` |
| GET, PATCH | `/api/admin/footer-settings` |
| GET, PATCH | `/api/admin/gateways` |

`/api/admin/orders` carries a two-tier fallback query strategy and uses a
`$queryRaw` tagged template (never `$queryRawUnsafe`) for the fallback path.

---

## Chat, delivery, utilities

| Methods | Path | Access | Notes |
| --- | --- | --- | --- |
| GET, POST | `/api/chat` | 🌐 | |
| GET, POST | `/api/chat/[roomId]/messages` | 🌐 | |
| GET | `/api/chat/[roomId]/stream` | 🌐 | **SSE** |
| GET, PATCH | `/api/deliveries/[orderId]` | 🏪 | |
| GET, POST | `/api/deliveries/drivers` | 🏪 | |
| POST, DELETE | `/api/fcm` | 👤 | register / drop push token |
| POST | `/api/presence/ping` | 🌐 | 4-tier: admin → staff → owner → anonymous |
| POST | `/api/contact` | 🌐 | |
| GET | `/api/geocode` | 🌐 | |
| GET | `/api/geoip` | 🌐 | |
| POST | `/api/upload` | 🌐 | signed Supabase Storage URL — exempt from the 1 MB middleware guard |
| POST | `/api/id-ocr` | 🏪 | Claude-based ID extraction. **SSRF-guarded** — `isAllowedImageUrl()` restricts to `NEXT_PUBLIC_SUPABASE_URL/storage/` + `lh3.googleusercontent.com`, max 1000 chars |
| GET | `/api/image-search` | 🏪 | Pexels, falls back to Openverse |

---

## Upload flow

`POST /api/upload` never receives the file. It returns a signed URL:

```
Client → POST /api/upload { fileName, fileType, fileSize, folder }
       ← { signedUrl, publicUrl }
Client → PUT signedUrl (raw binary, direct to Supabase Storage)
       → uses publicUrl
```

This bypasses Vercel's function body limits entirely. Client helper:
`src/lib/upload.ts` → `uploadFile(file, folder)`.

---

## SSE endpoints (6)

| Path | Feeds |
| --- | --- |
| `/api/restaurants/[id]/orders/stream` | kitchen, live orders |
| `/api/restaurants/[id]/billing/stream` | billing tab, counter |
| `/api/order-track/[trackToken]/stream` | guest tracking |
| `/api/track/stream` | order tracking |
| `/api/chat/[roomId]/stream` | chat |
| `/api/admin/audit/stream` | admin audit feed |

Client: `useSSE()` — 2s→30s exponential backoff with jitter. These are the
**fallback**; Supabase Realtime Broadcast is the primary push path. See
[01-architecture.md](01-architecture.md#realtime-two-mechanisms-in-parallel).
