# 07 — Restaurant Types, Features & Multi-Tenancy

## The tenancy model

There is **one tenant entity: `Restaurant`**. Every business — a momo shop, a bar,
a five-star hotel — is a `Restaurant` row. What differentiates them is
`Restaurant.type`, one of 12 `RestaurantType` values.

There is no `Hotel` model. A hotel is `Restaurant { type: HOTEL }` with `Room` and
`RoomBooking` children. If you're looking for hotel logic, look for `type` checks
and `ROOM_ENABLED_TYPES`.

### Tenant isolation

Isolation is enforced **in application code, not by database RLS**. Almost every
query is scoped by `restaurantId`, and the access helpers in
`src/lib/access-control.ts` resolve whether the caller may touch that id.

The one table with explicit RLS is `audit_logs`
(`supabase/migrations/20260316000000_enable_rls_audit_logs.sql`). Everything else
relies on the code path. This is a deliberate consequence of the realtime design:
broadcasts carry no row data, so clients always re-read through access-checked
API routes and never query tables directly.

**Implication:** any new query that forgets `where: { restaurantId }` is a
cross-tenant leak. There is no database backstop.

---

## The 12 restaurant types

`src/lib/restaurant-types.ts` → `RESTAURANT_TYPE_OPTIONS`:

| Value | Label | Icon |
| --- | --- | --- |
| `FAST_FOOD` | Fast Food | Sandwich |
| `RESORT` | Resort | Sun |
| `HOTEL` | Hotel | Hotel |
| `BAKERY` | Bakery | Croissant |
| `CLOUD_KITCHEN` | Cloud Kitchen | ChefHat |
| `BAR` | Bar | Beer |
| `CAFE` | Cafe | Coffee |
| `RESTAURANT` | Restaurant | UtensilsCrossed |
| `MO_MO_SHOP` | Momo Shop | Soup |
| `TANDOORI` | Tandoori | Flame |
| `GUEST_HOUSE` | Guest House | Building2 |
| `SWEETS` | Sweets Shop | Candy |

The type is chosen at restaurant creation (`CreateRestaurantModal` →
`createRestaurantSchema`) and drives everything below.

---

## Two axes, and why they must not merge

There are **two independent per-restaurant switch systems**. Confusing them is the
easiest way to make this codebase incoherent, so the distinction is stated first.

| | **Feature tabs** (UI-navigation axis) | **Capabilities** (fulfilment axis) |
| --- | --- | --- |
| Question answered | *Which dashboard tabs does this operator see?* | *What can this business actually do for a customer?* |
| Stored in | `Restaurant.featuresEnabled[]` / `featuresDisabled[]`, and `FeatureConfig` JSON | `RestaurantCapability` (1:1 table, real columns) |
| Derived from | `Restaurant.type` via `TYPE_FEATURE_TABS`, plus admin overrides | Nothing. The owner sets it explicitly |
| Read by | The sidebar and the `[tab]` router | Public discovery, checkout, the delivery pipeline — **in SQL** |
| Wrong if | An operator sees a tab they can't use | A customer is offered delivery that doesn't exist |

**Capabilities are never derived from `RestaurantType`.** A Cafe, Bar, Hotel or
Bakery may all deliver; type describes what the business *is*, capability
describes what it *does*. There must be no `if (type === "BAR")` in fulfilment
code. Type-based defaults belong to the feature-tab axis only.

The practical reason they are separate tables rather than more booleans on
`Restaurant`: capabilities are filtered on in public proximity queries, so they
need to be columns Postgres can index — a JSON blob or a string array cannot serve
that. `FeatureConfig` remains the right home for per-feature UI state.

### `RestaurantCapability`

| Field | Meaning |
| --- | --- |
| `dineInEnabled` / `pickupEnabled` / `deliveryEnabled` | Which fulfilment types are offered |
| `codEnabled` / `codMaxAmount` | Cash on delivery, and the order-value ceiling for it |
| `liveTrackingEnabled` | Whether riders share GPS during a delivery |
| `deliveryRadiusKm` | Hard cap; an order beyond it is refused server-side |
| `deliveryPrepMins` | Kitchen time, feeding the customer ETA |
| `mergeBillingOrders` | Unified "Orders & Billing" staff workspace (see below) |
| `autoAcceptOrders` | Accept cash/counter orders the instant they land → [08](08-payments-and-billing.md#instant-auto-accept) |

The last two are **staff-workflow** flags rather than fulfilment ones. They live
here because they are per-restaurant owner switches with real columns, and
because `mergeBillingOrders` predates this distinction — not because a customer
ever sees them.

### The merged Orders & Billing workspace

`mergeBillingOrders` collapses order-taking and billing into one screen. It
exists because staff sat on Billing while new orders piled up unaccepted on Live
Orders — two screens for one job, so orders stranded in `PENDING`.

Honoured on the two POS-style surfaces. The dashboard deliberately does not:

| Surface | Behaviour when on |
| --- | --- |
| Dashboard | **Ignores the flag by design.** Billing stays its own nav entry and its own page — it holds split-bill, bank-proof verification, discounts and reports, and folding that into the order queue buries it. The dashboard solves the same problem by putting **Print bill on every order in the Live Orders board** instead, so staff never open Billing to print |
| `/counter` (POS) | `billing` and `board` tabs drop; `split` is relabelled "Orders & Billing" |
| `/kitchen` | Standalone `billing` tab drops; a segmented switch appears inside `orders` |

On the dashboard the goal — *never leave the orders screen to print* — is met
without merging anything:

- every order in [`TableOrderBoard`](../src/components/orders/TableOrderBoard.tsx)
  carries a **Print bill** action, always available
- accepting an order also surfaces
  [`AcceptedReceiptPanel`](../src/components/orders/AcceptedReceiptPanel.tsx)
  inline, with the same print action (gated on `printAutoBillOnAccept`)

This matches Restrox, where KOT prints at order placement and billing remains a
separate process with its own screen and split-bill flow.

`/counter` and `/kitchen` read the flag off the **staff session**
(`GET /api/staff-session` → `mergeBillingOrders`). That is a login-time snapshot,
so an owner toggling it mid-shift does not reach a terminal until the staff
member's session refreshes — worth knowing when a change appears not to apply.

`deliveryEnabled` cannot be switched on until the restaurant has `RestaurantHours`
rows — enforced in `PATCH /api/restaurants/[id]/status`, which returns
`409 HOURS_REQUIRED`. The gate is server-side because a UI-only gate is not a gate.

---

## The feature-tab system

This is the mechanism that makes one dashboard serve 12 business models.

### 1. `FeatureTabId` — the vocabulary

34 stable slugs (`src/lib/restaurant-types.ts`):

```
quick-counter, combo-meals, rush-hour, takeaway, room-service, multi-outlet,
event-catering, guest-billing, buffet-manager, pre-orders, custom-cakes,
daily-specials, display-counter, delivery-ops, multi-brand, delivery-zones,
package-tracking, happy-hours, tab-management, cocktail-menu, live-events,
loyalty-rewards, wifi-seating, seasonal-menu, brunch-mode, table-reservations,
waitlist, private-dining, guest-checkin, wifi-settings, room-qr-codes,
hotel-bookings, hotel-qr, hotel-hub, rooms
```

### 2. `TYPE_FEATURE_TABS` — type → features

Maps each type to its feature tabs. Examples:

| Type | Feature tabs |
| --- | --- |
| `FAST_FOOD` | quick-counter, combo-meals, rush-hour, takeaway, display-counter, wifi-settings |
| `BAR` | happy-hours, tab-management, cocktail-menu, live-events, display-counter, wifi-settings |
| `CAFE` | loyalty-rewards, wifi-seating, seasonal-menu, brunch-mode, display-counter |
| `BAKERY` | pre-orders, custom-cakes, daily-specials, display-counter, wifi-settings |
| `CLOUD_KITCHEN` | delivery-ops, multi-brand, delivery-zones, package-tracking, display-counter |
| `RESTAURANT` | table-reservations, waitlist, private-dining, display-counter, wifi-settings |
| `MO_MO_SHOP` | quick-counter, rush-hour, daily-specials, takeaway, display-counter, wifi-settings |
| `TANDOORI` | display-counter ("Live Counter"), pre-orders, daily-specials, takeaway, wifi-settings |
| `SWEETS` | display-counter, pre-orders, custom-cakes, daily-specials, seasonal-menu, loyalty-rewards, takeaway, quick-counter, wifi-settings — **9, the most** |
| `HOTEL`, `RESORT`, `GUEST_HOUSE` | **`hotel-hub` only** |

### 3. The Hotel Hub consolidation

Hotel-type venues get exactly one feature tab. Five previously-standalone
features were folded into it:

```ts
// src/lib/dashboard-nav.ts
export const HUB_FEATURE_IDS = new Set<FeatureTabId>([
  "rooms", "hotel-bookings", "hotel-qr", "room-qr-codes", "guest-checkin",
]);
```

For hotel-type venues these are **never shown as standalone nav items** — they
live inside `HotelHubTab`. The comment explicitly notes that `room-service` and
`guest-billing` are deliberately **not** in this set: they remain standalone
food-ops features.

`ROOM_ENABLED_TYPES = new Set(["HOTEL", "RESORT", "GUEST_HOUSE"])` gates the
Hotel Hub nav item.

### 4. Master-admin overrides

Two array columns on `Restaurant`:

- `featuresEnabled: String[]` — force-enable a feature the type doesn't include
- `featuresDisabled: String[]` — force-disable a feature the type does include

Resolution (`isFeatureAvailable`):

```ts
if (overrides?.featuresDisabled?.includes(featureId)) return false;  // disabled wins
if (overrides?.featuresEnabled?.includes(featureId)) return true;
return TYPE_FEATURE_TABS[restaurantType]?.some(f => f.id === featureId) ?? false;
```

**`featuresDisabled` always wins** when an id appears in both lists.

`getFeatureTabsForType()` returns type defaults minus force-disabled, plus
force-enabled (looked up from `FEATURE_CATALOG`, a flat map of every def across
every type — first definition wins on id collision).

Managed by the master admin via `RestaurantFeatureOverridesModal` →
`GET/PUT /api/admin/restaurants/[id]/features`.

### 5. `LIVE_FEATURES` — shipped vs. coming soon

`src/lib/dashboard-nav.ts` exports `LIVE_FEATURES`, a set of feature ids that are
actually implemented. In `src/app/dashboard/[tab]/page.tsx`:

```ts
if (FEATURE_ICONS[featureId] && !LIVE_FEATURES.has(featureId)) {
  return <ComingSoon />;   // "In Development" badge
}
```

Currently `LIVE_FEATURES` contains all 34 ids, so nothing renders "Coming Soon"
today. The gate remains as the mechanism for shipping a tab dark.

### 6. `KITCHEN_VISIBLE_FEATURES`

A separate 12-id set in `src/lib/staff-roles.ts` controlling which features the
kitchen surface may show: quick-counter, display-counter, room-service,
buffet-manager, waitlist, takeaway, package-tracking, pre-orders, daily-specials,
custom-cakes, multi-outlet, cocktail-menu.

---

## Feature persistence: `FeatureConfig`

The key design decision. Rather than a table per feature, most feature tabs
persist their **entire editable state as one JSON blob**:

```prisma
model FeatureConfig {
  restaurantId String
  featureId    String   // "brunch-mode", "happy-hours", …
  data         Json
  @@unique([restaurantId, featureId])
}
```

Accessed via `GET/PUT /api/restaurants/[id]/feature-config/[featureId]` and the
`useFeatureConfig()` hook.

**Trade-off:** ~30 feature tabs ship without schema migrations, but their data is
unqueryable, unvalidated at the DB layer, and unindexed. You cannot ask "which
restaurants have a Tuesday happy hour" through SQL.

Features that outgrew the blob got real tables: `ComboMeal`, `HappyHour`,
`RushHourConfig`, `DisplayCounterConfig`, `Reservation`, `LoyaltyConfig`. That is
the migration path when a feature needs querying.

`_NotPersistedBanner.tsx` marks tabs that are still UI-only.

---

## `TYPE_FEATURES` — marketing copy

Distinct from `TYPE_FEATURE_TABS`. `TYPE_FEATURES` is `Record<string,
{label, desc}[]>` used on marketing surfaces to describe what a type gets. The
two lists overlap but are **not** kept in sync automatically — `TYPE_FEATURES`
lists things like "24/7 Room Service" and "Conference Catering" for HOTEL, which
have no corresponding feature tab since HOTEL only gets `hotel-hub`.

If you add a feature, decide whether it belongs in one list, the other, or both.

---

## Other per-type behaviour

Beyond feature tabs, type influences:

| Area | Mechanism |
| --- | --- |
| Category seeding | `src/lib/category-templates.ts` — a default category tree per type, seeded inline by `POST /api/restaurants` |
| Room support | `Restaurant.roomCount`, `ROOM_ENABLED_TYPES` |
| Hotel advances | `hotelAdvanceType` / `hotelAdvanceValue` |
| Room service add-on | `roomServiceEnabled` / `roomServiceCharge` |
| Theming | `primaryColor`, `secondaryColor`, `accentColor`, `fontFamily`, `menuLayout` |
| Menu display | `showStories`, `showReviews`, `menuLayout` (grid/list/compact) |

---

## Adding a new feature tab — checklist

1. Add the slug to the `FeatureTabId` union — `src/lib/restaurant-types.ts`
2. Add a `FeatureTabDef` to `TYPE_FEATURE_TABS` for each type that should get it
3. Add an icon to `FEATURE_ICONS` — `src/lib/dashboard-nav.ts`
   (this is a `Record<FeatureTabId, any>`, so TypeScript will fail the build if
   you miss it — that has bitten this repo before)
4. Add the id to `LIVE_FEATURES` when it's ready to ship
5. Build the component in `src/components/dashboard/features/`
6. Register it in the `COMPONENTS` record — `src/app/dashboard/[tab]/page.tsx`
7. Add its primary GET paths to `TAB_DATA` in the same file so hover-prefetch warms it
8. Add its import to the wave-2 pre-warm list — `src/app/dashboard/layout.tsx`
9. Persist via `useFeatureConfig()` (JSON blob) **or** add a real model if it
   needs querying
10. If hotel-related, decide whether it goes in `HUB_FEATURE_IDS`
11. If kitchen-relevant, add to `KITCHEN_VISIBLE_FEATURES`
12. Consider whether it also needs a `TYPE_FEATURES` marketing entry

Steps 3, 6, 7 and 8 are all separate registries keyed by the same id. Missing any
one produces a different, non-obvious failure.

---

## Adding a new restaurant type — checklist

1. Add to the `RestaurantType` enum — `prisma/schema.prisma`
2. Deploy the schema with `ADDITIVE_SCHEMA_SYNC=true` (enum additions are
   additive — see [09](09-operations.md))
3. Add to `RESTAURANT_TYPE_OPTIONS` — `src/lib/restaurant-types.ts`
4. Add to the `type` enum in `createRestaurantSchema` — `src/lib/validations.ts`
5. Add a `TYPE_FEATURE_TABS[NEW_TYPE]` entry
6. Add a `TYPE_FEATURES[NEW_TYPE]` marketing entry
7. Add a category template — `src/lib/category-templates.ts`
8. If it has rooms, add to `ROOM_ENABLED_TYPES` — `src/lib/dashboard-nav.ts`
