# 02 — Data Model

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma) (1,290 lines,
50 models, 12 enums). Provider: PostgreSQL. Generated client output:
`src/generated/prisma` (gitignored).

Every model uses `@@map` to a snake_case table name. IDs are `cuid()` except
`User.id`, which is supplied externally (it mirrors the Supabase auth user id).

## Model map by domain

```
User ──┬── Restaurant (owner)          ← the tenant root
       ├── StaffMember ── Shift, StaffAttendance
       ├── Order, Review, FCMToken, AuditLog
       ├── MenuItemRating, Favourite, LoyaltyAccount
       └── (CustomerCheckIn by userId, not a relation)

Restaurant ──┬── MenuCategory (self-nesting) ── MenuItem ──┬── MenuItemSize
             │                                             ├── MenuItemAddOn
             │                                             ├── MenuItemIngredient ── InventoryItem
             │                                             └── MenuItemRating
             ├── Order ──┬── OrderItem
             │           ├── Payment
             │           ├── Bill ── PrintJob
             │           ├── ChatRoom ── ChatMessage
             │           ├── Delivery ── DeliveryDriver
             │           ├── TableSession
             │           ├── PrepaidToken
             │           └── Feedback
             ├── Room ── RoomBooking
             ├── Table, TableSession, GuestCheckIn
             ├── Coupon, ComboMeal ── ComboMealItem
             ├── HappyHour ── HappyHourItem
             ├── RushHourConfig ── RushHourSlot
             ├── DisplayCounterConfig, DisplayCounterItem
             ├── LoyaltyConfig, LoyaltyReward, LoyaltyAccount
             ├── Reservation, DeliveryZone, PaymentQR, PaymentConfig
             ├── HeroSlide, Story, Media, Feedback
             └── FeatureConfig            ← generic JSON blob per feature tab

Standalone (no restaurant FK): ContactSubmission, WebhookLog, SiteSetting,
                               CustomerCheckIn, DeliveryDriver
```

---

## Core identity

### `User` → `users`

Bridges Supabase Auth to application data. `id` is **not** generated — it is the
Supabase user id, set at creation time.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | String @id | Supabase auth user id |
| `email` | String @unique | |
| `name` | String | |
| `username` | String? @unique | auto-generated via `src/lib/username.ts` |
| `phone`, `imageUrl` | String? | synced from Supabase user_metadata |
| `role` | UserRole | `CUSTOMER` (default) / `OWNER` / `ADMIN` |
| `hasPassword` | Boolean @default(true) | false for OAuth-provisioned accounts |
| `isDeleted`, `deletedAt` | Boolean / DateTime? | legacy soft-delete; `getAuthUser` now hard-deletes any row it finds with this set |
| `isBlacklisted` | Boolean | blacklisted users resolve to `null` in `getAuthUser` — a hard lockout |

`enum UserRole { CUSTOMER, OWNER, ADMIN }`

Note: `role` auto-upgrades `CUSTOMER` → `OWNER` in `getOrCreateUser()` whenever
the user is found to own ≥1 restaurant.

### `Restaurant` → `restaurants`

The tenant root for **every** business type, hotels included. The widest model in
the schema — configuration for tax, printing, POS, prepaid, hotel advances,
theming and feature overrides all live here as columns.

| Group | Fields |
| --- | --- |
| Identity | `id`, `name`, `slug` @unique, `restaurantCode` @unique (staff login, e.g. `HH-1A2B`), `type`, `ownerId` |
| Contact / location | `phone`, `countryCode` (`+977`), `address`, `city` (`Kathmandu`), `latitude`, `longitude` |
| Media | `imageUrl`, `coverUrl` |
| Ops | `isActive`, `isOpen`, `tableCount` (8), `roomCount` (0), `openingTime` (`09:00`), `closingTime` (`23:00`), `deliveryEnabled` |
| Stats | `rating`, `totalOrders` |
| WiFi | `wifiName`, `wifiPassword` — surfaced on the customer menu |
| Money | `currency` (`NPR`), `taxRate` (13), `taxEnabled`, `serviceChargeRate` (10), `serviceChargeEnabled` |
| Printing | `printCounterWidth` (80mm), `printKitchenWidth` (80mm), `printShowLogo`, `printShowFeedbackQR`, `printAutoReceipt`, `printAutoKOT` |
| Prepaid | `prepaidEnabled`, `counterPayEnabled` (true), `directPayEnabled` |
| POS | `posEnabled`, `posActivatedAt`, `posTerminalName`, `posOpeningCash`, `posWelcomeSeenAt`, `posCustomerModeEnabled`, `posCustomerExitCombo` (Json, default Ctrl+Shift+X applied at API layer when null) |
| Hotel | `hotelAdvanceType` (`PERCENTAGE`\|`FIXED`), `hotelAdvanceValue` (30), `roomServiceEnabled`, `roomServiceCharge` |
| Feature overrides | `featuresEnabled: String[]`, `featuresDisabled: String[]` — see [07](07-features-and-tenancy.md) |
| Theme | `primaryColor`, `secondaryColor`, `accentColor`, `fontFamily`, `menuLayout` (`grid`\|`list`\|`compact`), `footerText`, `showStories`, `showReviews` |

Indexes: `[ownerId]`, `[slug]`.

`enum RestaurantType { FAST_FOOD, RESORT, HOTEL, BAKERY, CLOUD_KITCHEN, BAR,
CAFE, RESTAURANT, MO_MO_SHOP, TANDOORI, GUEST_HOUSE, SWEETS }` — 12 types.

### `StaffMember` → `staff_members`

| Field | Notes |
| --- | --- |
| `pin` | bcrypt hash; legacy plaintext supported and transparently rehashed on next login (`src/lib/pin.ts`) |
| `qrToken` | String? @unique — QR badge login |
| `role` | StaffRole |
| `staffType` | `FULL_TIME` \| `SHIFT_BASED` (default) |
| `isActive` | Boolean |

`@@unique([userId, restaurantId])` — one membership per user per restaurant.

`enum StaffRole { SUPER_ADMIN, MANAGER, CHEF, WAITER, CASHIER }`
`enum StaffType { FULL_TIME, SHIFT_BASED }`

### `Shift` → `shifts` / `StaffAttendance` → `staff_attendance`

`Shift` has `date` (@db.Date), `startTime`/`endTime` as `"HH:mm"` strings, and
`actualEndTime` for early clock-out. Shifts crossing midnight are supported —
`src/lib/staff-shifts.ts` bumps the end date forward when `end <= start`.

`StaffAttendance` is `@@unique([staffId, date])` with `checkIn` / `checkOut`.

---

## Menu

### `MenuCategory` → `menu_categories`

Self-referencing hierarchy via `parentId` / `children` (relation
`"CategoryHierarchy"`, cascade delete). `@@unique([restaurantId, slug])`.

### `MenuItem` → `menu_items`

| Group | Fields |
| --- | --- |
| Core | `name`, `description`, `price`, `imageUrl`, `rating`, `prepTime` (`"15-20 min"`), `isAvailable`, `sortOrder` |
| Dietary | `isVeg`, `hasEgg`, `hasOnionGarlic` (default **true**), `spiceLevel` (0–4), `calories`, `allergens: String[]` |
| Merchandising | `badge`, `tags: String[]`, `isFeatured`, `discount` (%), `discountLabel`, `offerStartedAt`, `offerExpiresAt` |
| Drinks | `isDrink`, `drinkCategory` (`COLD`\|`HOT`\|`ALCOHOL`), `stockEnabled`, `stockQuantity`, `bottleCount`, `volumeMl` |

Six indexes, four of them composite and explicitly commented as serving the
hottest queries:

- `[restaurantId, isAvailable]` — menu listing
- `[categoryId, isAvailable]` — food-detail "related items"
- `[restaurantId, isFeatured]` — food-detail "trending"
- `[restaurantId, rating]` — landing-page top-rated

Children: `MenuItemSize` (label, grams, priceAdd), `MenuItemAddOn` (name, price),
`MenuItemIngredient` (→ InventoryItem, `quantityUsed` per serving).

### `InventoryItem` → `inventory_items`

Raw stock. `unit` (kg default), `quantity`, `minStock` (alert threshold, 5),
`costPerUnit`, `category`. Drink-specific: `isDrink`, `drinkCategory`
(`"Soft Drinks"` / `"Hard Drinks"` / `"Alcohol"` — note: **different vocabulary**
from `MenuItem.drinkCategory`), `sellingPrice`. `showOnMenu` links stock directly
onto the customer menu.

---

## Orders

### `Order` → `orders`

The most heavily evolved model. Contains an explicit "Phase 2.5" additive block.

| Group | Fields |
| --- | --- |
| Identity | `orderNo` @unique (`HH-<base36 timestamp>`), `tableNo`, `roomNo`, `guestName` |
| State | `status` (OrderStatus), `acceptedAt`, `rejectReason`, `rejectedAt` |
| Money | `subtotal`, `tax`, `total`, `deliveryFee`, `couponId`, `couponDiscount` |
| Meta | `note`, `type` (OrderType) |
| Delivery | `deliveryAddress`, `deliveryLat`, `deliveryLng`, `deliveryPhone`, `deliveryNote` |
| Attribution | `userId?`, `restaurantId`, `processedByStaffId?` (from JWT session) |
| Prepaid | `isPrepaid`, `prepaidTokenId` @unique |
| POS | `isHeld`, `heldAt` |
| Phase 2.5 | `sourceType`, `trackToken` @unique, `idempotencyKey`, `kitchenStatus`, `printedAt`, `roomBookingId` |

`sourceType` values: `TABLE_QR` \| `HOTEL_ROOM_QR` \| `POS` \| `STAFF`.
`kitchenStatus` values: `PENDING|ACCEPTED|REJECTED|PREPARING|READY|SERVED` —
a **string layered on top of** the `status` enum, not a replacement.

**Critical constraint:** `@@unique([restaurantId, idempotencyKey])`. Idempotency
is restaurant-scoped, not global. NULLs are distinct in Postgres, so pre-existing
all-NULL rows never collide. `createOrder()` catches P2002 on this constraint and
resolves to the winner's order.

Indexes include two hot composites:
- `[restaurantId, status, createdAt]` — kitchen / live-orders SSE stream
- `[userId, createdAt]` — customer "my orders"

`enum OrderStatus { PENDING, ACCEPTED, REJECTED }` — **only three values.** The
build script (`scripts/vercel-build.mjs`) contains a data migration that collapsed
legacy `PREPARING`/`READY`/`DELIVERED` → `ACCEPTED` and `CANCELLED` → `REJECTED`.
Finer-grained state now lives in the `kitchenStatus` string.

`enum OrderType { DINE_IN, DELIVERY, TAKEAWAY }`

### `OrderItem` → `order_items`

`name`, `quantity`, `price`, `addOns` (String, JSON-encoded).

`createdAt` doubles as a **round marker** — every item submitted in one batch
(the initial order, or one add-on round) shares a timestamp set explicitly in
code. This is how the kitchen board reconstructs "rounds" and surfaces a new
add-on batch distinctly. The `@default(now())` only backfills legacy rows.

Per-item Phase 2.5 fields: `kitchenStatus`, `rejectedReason`, `preparedAt`,
`servedAt`, and `prepTimeSnapshot` — a snapshot of `MenuItem.prepTime` at order
time so a later menu edit cannot retroactively change an existing order's
displayed prep time.

### `TableSession` → `table_sessions` / `Table` → `tables`

`TableSession` tracks a live QR dine-in session: `tableNo`, `sessionToken`
@unique @default(cuid()), `isActive`, `startedAt`/`endedAt`, optional `orderId`.
`@@unique([restaurantId, tableNo, isActive])`.

`Table` is the physical table record: `tableNo`, `qrToken` @unique (explicitly
commented as *"unguessable token encoded in the table QR so the table identity
can't be spoofed via the URL"*), `label`, `capacity`.

---

## Money

### `Payment` → `payments`

One-to-one with Order (`orderId` @unique). `method`, `status`, `amount`,
`transactionId`, `pidx` (Khalti), `refId` (eSewa/bank), `metadata` (JSON string),
`paidAt`.

Bank verification block: `proofUrl`, `proofUploadedAt`, `verifiedBy` (staff id),
`verifiedAt`, `rejectionNote`.

`enum PaymentMethod { ESEWA, KHALTI, BANK, CASH, COUNTER, DIRECT }`

`enum PaymentStatus { PENDING, AWAITING_VERIFICATION, COMPLETED, FAILED,
CANCELLED, REFUNDED, EXPIRED }`

### `PaymentConfig` → `payment_configs`

Per-restaurant, `restaurantId` @unique. Toggles (`cashEnabled` default true,
`esewaEnabled`, `khaltiEnabled`, `bankEnabled`) plus **encrypted** credentials:
`esewaMerchantCode`, `esewaSecretKey`, `khaltiSecretKey` (AES-256-GCM via
`src/lib/encryption.ts`), and plaintext bank details.

### `PaymentQR` → `payment_qrs`

Uploaded static QR images (eSewa / Khalti / Fonepay / bank QR) with `label`,
`imageUrl`, `isActive`, `sortOrder`.

### `Bill` → `bills`

`billNo` @unique (`INV-<orderNo minus HH- prefix>`), `subtotal`, `tax`,
`serviceCharge`, `discount`, `total`, `paidVia`. One-to-one with Order.

### `PrepaidToken` → `prepaid_tokens`

`token` @unique @default(cuid()), `status` (`ACTIVE`/`USED`/`EXPIRED`), `amount`.
Created inside the order transaction when `restaurant.prepaidEnabled`.

### `Coupon` → `coupons`

`code`, `type` (`PERCENTAGE`/`FIXED`), `value`, `minOrder`, `maxDiscount` (cap for
percentage), `maxUses`, `usedCount`, `startsAt`, `expiresAt`.
`@@unique([restaurantId, code])`. `usedCount` is incremented **inside** the
order-create transaction so a rollback can never mark a coupon used without an order.

### `WebhookLog` → `webhook_logs`

`gateway`, `event`, `orderId`, `rawPayload`, `httpStatus`,
`idempotencyKey` @unique (double-processing guard).

### `Expense` → `expenses`

The **cost side of the Profit & Loss** (revenue is derived from paid orders;
this is what the owner spends). `category` (`ExpenseCategory` enum:
`INGREDIENTS`/`SALARIES`/`RENT`/`UTILITIES`/`MARKETING`/`EQUIPMENT`/
`MAINTENANCE`/`SUPPLIES`/`OTHER`), `amount`, `note?`, `incurredAt` (owner-set
date the expense applies to — P&L buckets by this, not `createdAt`).
`@@index([restaurantId, incurredAt])`. Owner-only: created/read/deleted through
`/api/restaurants/[id]/expenses*`; the P&L (`/api/restaurants/[id]/pnl`,
`/api/me/pnl`) reads it. **Added 2026-07-19** — needs an additive schema deploy
(`ADDITIVE_SCHEMA_SYNC=true`) before the P&L code goes live.

---

## Print outbox

### `PrintJob` → `print_jobs`

Durable KOT/BILL queue so printing survives a closed kitchen tab.

| Field | Notes |
| --- | --- |
| `type` | `KOT` \| `BILL` |
| `status` | `PENDING`\|`PRINTING`\|`PRINTED`\|`FAILED`\|`RETRYING` |
| `payload` | Json |
| `attempts`, `lastError` | |
| `claimedBy`, `claimedAt`, `lockedUntil` | claim lease — a dead client's job is reclaimable after expiry |

The claim protocol (`src/lib/orders/print-jobs.ts`) uses an atomic `updateMany`
with a status condition, so exactly one client can move a job to `PRINTING`.
Lease is 30s.

---

## Hospitality

### `Room` → `rooms`

`roomNumber`, `name`, `type` (`STANDARD`/`DELUXE`/`SUITE`/`DORMITORY`…), `floor`,
`price` (per night), `maxGuests`, `bedType`, `bedCount`, `amenities: String[]`,
`offerings: String[]`, `locationNote`, `imageUrls: String[]`, `videoUrl`,
`isAvailable`, `isActive` (soft delete), `qrUrl`.
`@@unique([restaurantId, roomNumber])`.

### `RoomBooking` → `room_bookings`

| Group | Fields |
| --- | --- |
| Guest | `guestName`, `guestPhone`, `guestEmail`, `guestAddress`, `guestIdType`, `guestIdNumber`, `guestIdImageUrl` (OCR source), `adults`, `children` |
| Dates | `checkIn`, `checkOut`, `nights` |
| Money | `totalPrice`, `roomServiceSelected`, `advanceAmount`, `advancePaid` |
| Payment | `paymentMethod`, `paymentStatus` (`UNPAID`/`PAID`/`FAILED`), `transactionId`, `pidx`, `refId`, `receiptUrl`, `paidAt` |
| State | `status`: `PENDING` (reserved, unpaid — auto-expires) → `CONFIRMED` → `CHECKED_IN` → `CHECKED_OUT`, or `CANCELLED` |
| Cancellation | `cancelReason`, `cancelRequestedAt`, `cancelledBy` (`CUSTOMER`/`HOTEL`), `refundStatus` (`NONE`/`REQUESTED`/`REFUNDED`) |

Note `userId` is a bare String? with **no relation** — bookings are guest-first.

### `GuestCheckIn` → `guest_check_ins`

Front-desk register, independent of `RoomBooking`. Captures `idType`
(`CITIZENSHIP`/`PASSPORT`/`DRIVING_LICENSE`/`VOTER_ID`), `idNumber`, `idImageUrl`,
`dob`, `nationality` (default `"Nepali"`), `roomNo`, `adults`/`children`,
`checkInAt`/`checkOutAt`, `status` (`CHECKED_IN`/`CHECKED_OUT`).

---

## Engagement & content

| Model | Table | Purpose |
| --- | --- | --- |
| `Review` | `reviews` | restaurant-level rating + comment |
| `MenuItemRating` | `menu_item_ratings` | per-item 1–5, `@@unique([userId, menuItemId])` |
| `Feedback` | `feedbacks` | post-payment; supports anonymous + owner `reply`/`repliedAt`/`repliedBy` |
| `Story` | `stories` | Instagram-style, `expiresAt` (24h), `viewCount`, IMAGE/VIDEO |
| `Media` | `media_library` | staff-uploaded assets, reuses `StoryType` enum |
| `HeroSlide` | `hero_slides` | menu carousel, optional `linkItemId` → MenuItem |
| `Favourite` | `favourites` | user ⇄ restaurant, `@@unique([userId, restaurantId])` |
| `CustomerCheckIn` | `customer_check_ins` | daily streak, `@@unique([userId, date])` where date is `"YYYY-MM-DD"` string |
| `ContactSubmission` | `contact_submissions` | marketing contact form |

`enum StoryType { IMAGE, VIDEO }`

### Chat

`ChatRoom` → `chat_rooms`: `type` (ChatRoomType), optional `orderId` @unique
(null for internal/broadcast), optional `tableNo`/`roomNo` for pre-order chat.

`enum ChatRoomType { CUSTOMER, BROADCAST, TABLE_CHAT }`
`enum ChatSender { CUSTOMER, KITCHEN, BILLING, ADMIN, MANAGER }`

`ChatMessage` → `chat_messages`: `content`, `sender`, `senderName`, `userId?`.

---

## Delivery

`DeliveryDriver` → `delivery_drivers`: **platform-level, not per-restaurant.**
`phone` @unique, `vehicleType` (`BIKE`/`SCOOTER`/`CAR`/`BICYCLE`), `vehicleNo`,
`licenseNo`, `isOnline`, `currentLat`/`currentLng`, `rating` (5.0), `totalTrips`.

`Delivery` → `deliveries`: one-to-one with Order. `status`, pickup/dropoff coords,
`distanceKm`, `estimatedMins`, `actualMins`, `fee`, and the timestamp chain
`assignedAt` → `pickedUpAt` → `deliveredAt` / `cancelledAt`.

`enum DeliveryStatus { PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED }`

`DeliveryZone` → `delivery_zones`: per-restaurant. `baseFee` (50), `perKmFee` (15),
`freeAbove`, `maxRadiusKm` (10).

---

## Type-specific feature models

| Model | Table | For type |
| --- | --- | --- |
| `ComboMeal` + `ComboMealItem` | `combo_meals`, `combo_meal_items` | FAST_FOOD |
| `HappyHour` + `HappyHourItem` | `happy_hours`, `happy_hour_items` | BAR |
| `RushHourConfig` + `RushHourSlot` | `rush_hour_configs`, `rush_hour_slots` | FAST_FOOD, MO_MO_SHOP |
| `DisplayCounterConfig` + `DisplayCounterItem` | `display_counter_configs`, `display_counter_items` | most types |
| `Reservation` | `reservations` | RESTAURANT |
| `LoyaltyConfig` / `LoyaltyReward` / `LoyaltyAccount` | `loyalty_config`, `loyalty_rewards`, `loyalty_accounts` | CAFE, SWEETS |

`Reservation.status`: `PENDING|CONFIRMED|SEATED|CANCELLED|NO_SHOW|COMPLETED`.
`LoyaltyAccount.tier`: `BRONZE|SILVER|GOLD|PLATINUM`.

### `FeatureConfig` → `feature_configs`

The escape hatch. A generic per-restaurant, per-feature JSON store:

```prisma
model FeatureConfig {
  restaurantId String
  featureId    String   // stable slug, e.g. "brunch-mode", "happy-hours"
  data         Json     // the feature tab's whole saved state
  @@unique([restaurantId, featureId])
}
```

Every dashboard feature tab that doesn't have a bespoke table persists its entire
editable state here as one blob. This is why ~30 feature tabs exist with only ~6
dedicated tables. See [07-features-and-tenancy.md](07-features-and-tenancy.md).

### `SiteSetting` → `site_settings`

Global key/value store (`key` is the @id). Backs the master admin's landing-page,
hero and footer CMS.

---

## Audit

### `AuditLog` → `audit_logs`

`action`, `entity`, `entityId`, `detail`, `metadata` (JSON string), `ipAddress`,
plus nullable `userId` / `restaurantId` (both `onDelete: SetNull` so logs survive
deletion of the actor).

Written fire-and-forget by `logAudit()` in `src/lib/audit.ts` — it never throws
into the request path. The `AuditAction` union in that file enumerates ~45 action
types spanning orders, menu, staff, payments, bookings, POS, inventory, delivery
and users.

This is the only table with an explicit RLS migration:
`supabase/migrations/20260316000000_enable_rls_audit_logs.sql`.

---

## Enum quick reference

| Enum | Values |
| --- | --- |
| `UserRole` | CUSTOMER, OWNER, ADMIN |
| `RestaurantType` | FAST_FOOD, RESORT, HOTEL, BAKERY, CLOUD_KITCHEN, BAR, CAFE, RESTAURANT, MO_MO_SHOP, TANDOORI, GUEST_HOUSE, SWEETS |
| `StaffRole` | SUPER_ADMIN, MANAGER, CHEF, WAITER, CASHIER |
| `StaffType` | FULL_TIME, SHIFT_BASED |
| `OrderStatus` | PENDING, ACCEPTED, REJECTED |
| `OrderType` | DINE_IN, DELIVERY, TAKEAWAY |
| `PaymentMethod` | ESEWA, KHALTI, BANK, CASH, COUNTER, DIRECT |
| `PaymentStatus` | PENDING, AWAITING_VERIFICATION, COMPLETED, FAILED, CANCELLED, REFUNDED, EXPIRED |
| `DeliveryStatus` | PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED |
| `ChatRoomType` | CUSTOMER, BROADCAST, TABLE_CHAT |
| `ChatSender` | CUSTOMER, KITCHEN, BILLING, ADMIN, MANAGER |
| `StoryType` | IMAGE, VIDEO |
| `HardwareListingStatus` | PENDING_REVIEW, APPROVED, REJECTED, ARCHIVED |
| `HardwareOrderStatus` | PENDING, AWAITING_VERIFICATION, CONFIRMED, CANCELLED |

## Hardware marketplace models

Three **standalone** models (no `Restaurant`/`User` relation) power the
account-less hardware marketplace. Sellers and buyers are identified by contact
details + an opaque token, mirroring the order-track model.

| Model | Purpose |
| --- | --- |
| `HardwareListing` | A product for sale. `isPlatformListing` = HimaVolt's own stock (auto-approved, no commission). Third-party submissions arrive `PENDING_REVIEW`. `manageToken` keys the seller's account-less status page. `sellerPayoutNote` tells buyers how to pay; `sellerPaymentQr` is an uploaded payment-QR image the buyer can scan. Seller phone **and** email are required at submission (Zod), nullable in the DB only so platform rows need no backfill. |
| `HardwareOrder` | A buyer's order against a listing. `unitPrice`/`total`/`commissionAmount` are **snapshotted server-side** from the listing (client never sends price). `trackToken` keys the buyer's status page. `proofUrl` is the buyer's payment proof (they pay the seller directly). |
| `HardwareCommissionSettlement` | A record that a seller remitted some commission. Owed = Σ `commissionAmount` over `CONFIRMED` orders − Σ settlement `amount`, computed on read. |

The master admin's payout method lives in `site_settings` under
`hardware_commission_payout` (not a model). See
[08-payments-and-billing.md](08-payments-and-billing.md#hardware-marketplace).

Note that many status fields are **plain strings, not enums** — `Order.kitchenStatus`,
`Order.sourceType`, `RoomBooking.status`, `Reservation.status`, `PrintJob.status`,
`PrintJob.type`, `GuestCheckIn.status`, `PrepaidToken.status`, `Coupon.type`,
`HappyHour.discountType`, `LoyaltyAccount.tier`, `Restaurant.hotelAdvanceType`.
Their valid values are documented only in schema comments and enforced only in
application code.
