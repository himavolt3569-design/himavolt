# 06 — Components, Contexts & Hooks

205 components, 8 contexts, 11 hooks, 47 lib modules.

## Component inventory by folder

| Folder | Count | Domain |
| --- | --- | --- |
| `components/dashboard` | 37 | Owner dashboard tabs |
| `components/dashboard/features` | 30 | Type-specific feature tabs |
| `components/dashboard/reports` | 8 | Reports sub-tabs |
| `components/dashboard/reports/charts` | 6 | Recharts wrappers |
| `components/dashboard/layout` | 1 | Sidebar |
| `components/dashboard/qr` | 1 | QR canvas util |
| `components/admin` | 18 | Master admin tabs |
| `components/home` | 14 | Landing page sections |
| `components/shared` | 13 | Cross-cutting UI |
| `components/pos/staff` | 10 | POS staff terminal |
| `components/pos/kiosk` | 9 | POS kiosk (customer) |
| `components/pos/terminal` | 7 | POS terminal shell + CFD |
| `components/pos/activation` | 4 | POS activation flow |
| `components/three` | 9 | three.js / R3F scenes |
| `components/menu` | 6 | Customer menu |
| `components/ui` | 6 | Base primitives |
| `components/design-system` | 5 | Tokens, primitives, composites |
| `components/layout` | 3 | Navbar, Footer, BottomNav |
| `components/modals` | 3 | |
| `components/chat` | 2 | |
| `components/checkout` | 2 | |
| `components/orders` | 2 | |
| `components/stories` | 2 | |
| `components/tracking` | 2 | |
| `components/billing` | 1 | BillingTab (1,845 lines) |
| `components/cart` | 1 | |
| `components/food` | 1 | FoodDetailPopup (1,558 lines) |
| `components/kitchen` | 1 | KitchenBoard |
| `components/maps` | 1 | OsmPinpointMap |

## Largest files

These are the ones that will hurt to change. Sizes are a fair proxy for risk.

| Lines | File |
| --- | --- |
| 2,449 | `components/dashboard/MenuManagementTab.tsx` |
| 1,932 | `app/counter/page.tsx` |
| 1,845 | `components/billing/BillingTab.tsx` |
| 1,790 | `app/dashboard/CustomerDashboard.tsx` |
| 1,735 | `app/kitchen/page.tsx` |
| 1,711 | `components/dashboard/RoomManagementTab.tsx` |
| 1,628 | `components/checkout/CheckoutSheet.tsx` |
| 1,558 | `components/food/FoodDetailPopup.tsx` |
| 1,212 | `components/dashboard/StaffManagementTab.tsx` |
| 973 | `components/dashboard/TablesTab.tsx` |
| 867 | `components/dashboard/LiveOrdersTab.tsx` |
| 861 | `components/dashboard/OwnerControlPanel.tsx` |
| 843 | `components/dashboard/HotelBookingsTab.tsx` |
| 825 | `components/dashboard/ManualBillingTab.tsx` |
| 821 | `components/dashboard/features/EventCateringTab.tsx` |
| 769 | `components/dashboard/layout/DashboardSidebar.tsx` |

---

## Contexts (`src/context`)

| Context | Lines | Responsibility |
| --- | --- | --- |
| [`AuthContext.tsx`](../src/context/AuthContext.tsx) | 156 | Supabase session + **server-authoritative role** from `/api/me`. 5-min sessionStorage cache keyed `hh_me_cache_<uid>`; never caches a null role; retries twice on unresolved |
| [`RestaurantContext.tsx`](../src/context/RestaurantContext.tsx) | 489 | Owner's restaurant list + selection. Persists selection to `himavolt:selectedRestaurantId`. **5 retries with exponential backoff** on list load; optimistic patch + rollback on every staff/restaurant mutation |
| [`CartContext.tsx`](../src/context/CartContext.tsx) | 292 | **Per-restaurant carts** in localStorage (`hh_cart_<restaurantId>`), plus a legacy global `hh_cart` key kept in sync. `getGlobalItemQty()` scans all carts |
| [`OrderContext.tsx`](../src/context/OrderContext.tsx) | 369 | Order placement state |
| [`LiveOrdersContext.tsx`](../src/context/LiveOrdersContext.tsx) | 239 | Live order feed for dashboard/kitchen; driven by realtime + SSE |
| [`LocationContext.tsx`](../src/context/LocationContext.tsx) | 125 | Geolocation / city selection |
| [`ThemeContext.tsx`](../src/context/ThemeContext.tsx) | 50 | Dark/light. Mirrored by the pre-paint script in `app/layout.tsx` |
| [`ToastContext.tsx`](../src/context/ToastContext.tsx) | 87 | Toasts |

### Notes worth carrying

**`RestaurantContext` retry logic** exists because the dashboard fetches the
restaurant list exactly once on hard refresh. If that single request fails
(pool saturation, a brief session race returning 401), the dashboard would
otherwise be permanently stranded showing "create your first restaurant" to an
owner who has ten. It keeps existing data on failure and only surfaces the empty
state once retries are spent.

**`useRestaurant()` has a side effect.** Calling the hook triggers
`fetchIfNeeded()` via a `useEffect`. `useOptionalRestaurant()` is the
null-tolerant variant for components that may render outside the provider.

**Cart currency default is `"NPR"`** everywhere, matching the Nepal focus.

---

## Hooks (`src/hooks`)

| Hook | Lines | Purpose |
| --- | --- | --- |
| [`useSSE.ts`](../src/hooks/useSSE.ts) | 91 | Generic SSE with 2s→30s backoff + jitter. Deliberately has **no** `visibilitychange` handling — connections stay alive in background tabs |
| [`useRealtimeSignal.ts`](../src/hooks/useRealtimeSignal.ts) | 41 | Supabase Broadcast subscribe. Carries no data — just calls `onSignal()`. No-ops if Supabase env is absent |
| [`useTableSession.ts`](../src/hooks/useTableSession.ts) | 155 | QR dine-in session lifecycle |
| [`useActiveTableSession.ts`](../src/hooks/useActiveTableSession.ts) | 55 | Read active session |
| [`useFeatureConfig.ts`](../src/hooks/useFeatureConfig.ts) | 98 | Read/write a feature tab's `FeatureConfig` JSON blob |
| [`usePOSOrders.ts`](../src/hooks/usePOSOrders.ts) | 85 | POS order list |
| [`useKotPrintJobs.ts`](../src/hooks/useKotPrintJobs.ts) | 82 | Poll + claim the KOT print outbox |
| [`useCFDSync.ts`](../src/hooks/useCFDSync.ts) | 38 | Sync POS terminal → customer-facing display |
| [`useNotifications.ts`](../src/hooks/useNotifications.ts) | 56 | FCM permission + token registration |
| [`usePollWithBackoff.ts`](../src/hooks/usePollWithBackoff.ts) | 42 | Generic polling |
| [`useCountdown.ts`](../src/hooks/useCountdown.ts) | 35 | Kitchen prep-time countdown |

---

## Library modules (`src/lib`)

### Data & infra

| Module | Lines | Purpose |
| --- | --- | --- |
| [`db.ts`](../src/lib/db.ts) | 90 | Prisma + explicit `pg.Pool` + retry extension + lazy Proxy |
| [`api-client.ts`](../src/lib/api-client.ts) | 190 | `apiFetch` — LRU GET cache, dedupe, timeout, retry, prefix invalidation |
| [`api-helpers.ts`](../src/lib/api-helpers.ts) | 68 | `safeHandler`, `unauthorized`, `forbidden`, `notFound` |
| [`query-client.ts`](../src/lib/query-client.ts) | 20 | TanStack Query factory |
| [`rate-limit.ts`](../src/lib/rate-limit.ts) | 147 | Upstash + in-memory; `claimOnce`/`releaseClaim`; `clientKey` |
| [`realtime.ts`](../src/lib/realtime.ts) | 149 | Server broadcast (`server-only`) |
| [`realtime-topics.ts`](../src/lib/realtime-topics.ts) | 27 | Shared topic names — **client-safe**, no server imports |
| [`presence.ts`](../src/lib/presence.ts) | 120 | In-memory presence, 5-min TTL, 100k cap. **Per-instance** — documented caveat |

### Auth & access

| Module | Lines | Purpose |
| --- | --- | --- |
| [`auth.ts`](../src/lib/auth.ts) | 162 | `getAuthUser`, `getOrCreateUser`, `requireAuth`, `requireOwner` |
| [`access-control.ts`](../src/lib/access-control.ts) | 79 | `getRestaurantAccess` + the 3 `require*` helpers with owner-fallback |
| [`staff-auth.ts`](../src/lib/staff-auth.ts) | 64 | `getStaffSession`, `requireStaffForRestaurant` |
| [`staff-roles.ts`](../src/lib/staff-roles.ts) | 49 | Role group constants + predicates |
| [`staff-shifts.ts`](../src/lib/staff-shifts.ts) | 119 | `checkStaffShift`, midnight-crossing aware |
| [`require-admin.ts`](../src/lib/require-admin.ts) | 20 | Master admin JWT verify |
| [`order-access.ts`](../src/lib/order-access.ts) | 98 | HMAC track cookies, `canAccessOrder` |
| [`pin.ts`](../src/lib/pin.ts) | 20 | bcrypt + constant-time legacy fallback |
| [`encryption.ts`](../src/lib/encryption.ts) | 51 | AES-256-GCM `iv:tag:ciphertext` |
| [`intended-role.ts`](../src/lib/intended-role.ts) | 36 | Pre-OAuth role cookie |
| [`username.ts`](../src/lib/username.ts) | 27 | `generateUniqueUsername` |

### Orders, billing, payments

| Module | Lines | Purpose |
| --- | --- | --- |
| [`orders/create-order.ts`](../src/lib/orders/create-order.ts) | 407 | **`createOrder()` + `appendToOrder()`** — the transactional heart. See [08](08-payments-and-billing.md) |
| [`orders/print-jobs.ts`](../src/lib/orders/print-jobs.ts) | 112 | Atomic claim protocol for the KOT outbox |
| [`billing.ts`](../src/lib/billing.ts) | 346 | `getTaxConfig`, `generateBill`, `applyDiscount`, `collectPayment`, `getOrdersForBilling`, `getDailySummary` |
| [`payment-gate.ts`](../src/lib/payment-gate.ts) | 20 | **Currently a no-op returning `{ allowed: true }`.** Kept as a single choke point so a future "require payment before accept" policy lands in one place |
| [`payments/esewa.ts`](../src/lib/payments/esewa.ts) | 93 | HMAC-SHA256 signature, form POST, status verify |
| [`payments/khalti.ts`](../src/lib/payments/khalti.ts) | 98 | Initiate (paisa), lookup |
| [`stock.ts`](../src/lib/stock.ts) | 158 | `deductStock` / `restoreStock` — batched reads, sequential writes |
| [`order-sync.ts`](../src/lib/order-sync.ts) | 11 | `touchOrderUpdatedAt` so SSE detects change |
| [`idempotency.ts`](../src/lib/idempotency.ts) | 12 | `newIdempotencyKey()` client-side |

### Printing

| Module | Lines |
| --- | --- |
| [`print-kot.ts`](../src/lib/print-kot.ts) | 152 |
| [`print-bill.ts`](../src/lib/print-bill.ts) | 73 |
| [`print-settings.ts`](../src/lib/print-settings.ts) | 54 |

### Domain config

| Module | Lines | Purpose |
| --- | --- | --- |
| [`restaurant-types.ts`](../src/lib/restaurant-types.ts) | 309 | 12 types, `TYPE_FEATURES`, `TYPE_FEATURE_TABS`, `isFeatureAvailable`, `getFeatureTabsForType`. See [07](07-features-and-tenancy.md) |
| [`dashboard-nav.ts`](../src/lib/dashboard-nav.ts) | 215 | Nav groups, `FEATURE_ICONS`, `LIVE_FEATURES`, `HUB_FEATURE_IDS`, `ROOM_ENABLED_TYPES`, shortcuts |
| [`category-templates.ts`](../src/lib/category-templates.ts) | 191 | Seed category trees per type |
| [`validations.ts`](../src/lib/validations.ts) | 242 | All Zod schemas |
| [`currency.ts`](../src/lib/currency.ts) | 28 | `formatPrice`, `getCurrencySymbol` |
| [`phone.ts`](../src/lib/phone.ts) | 19 | Nepal mobile normalise + validate (96/97/98 prefixes) |
| [`room-display.ts`](../src/lib/room-display.ts) | 26 | |
| [`food-images.ts`](../src/lib/food-images.ts) | 119 | Fallback imagery |
| [`food-descriptions.ts`](../src/lib/food-descriptions.ts) | 104 | Fallback copy |
| [`data.ts`](../src/lib/data.ts) | 165 | Static data |

### Integrations

| Module | Lines |
| --- | --- |
| [`supabase.ts`](../src/lib/supabase.ts) | 50 |
| [`supabase-server.ts`](../src/lib/supabase-server.ts) | 26 |
| [`supabase-browser.ts`](../src/lib/supabase-browser.ts) | 10 |
| [`firebase-admin.ts`](../src/lib/firebase-admin.ts) | 20 |
| [`firebase-client.ts`](../src/lib/firebase-client.ts) | 52 |
| [`notifications.ts`](../src/lib/notifications.ts) | 174 |
| [`upload.ts`](../src/lib/upload.ts) | 30 |
| [`sw-registration.ts`](../src/lib/sw-registration.ts) | 30 |
| [`audit.ts`](../src/lib/audit.ts) | 95 |
| [`sounds.ts`](../src/lib/sounds.ts) | 83 |
| [`utils.ts`](../src/lib/utils.ts) | 5 |

### Server Actions

- `actions/contact.ts`, `actions/landing.ts`

---

## Dashboard tabs (`components/dashboard`)

### Core (37)

`OverviewTab`, `LiveOrdersTab`, `MenuManagementTab`, `StaffManagementTab`,
`ShiftsTab`, `StockTab`, `DrinksTab`, `TablesTab`, `QRCodesTab`, `ReportsTab`,
`ChatTab`, `FeedbackTab`, `SettingsTab`, `ManualBillingTab`, `OffersTab`,
`OffersCouponsTab`, `CouponManagementTab`, `PaymentQRTab`, `PaymentSettingsTab`,
`TaxChargesTab`, `PrintingSettingsTab`, `MediaTab`, `HeroSlidesManager`,
`OwnerControlPanel`, `NotificationBell`, `OnShiftWidget`, `IngredientMapper`,
`StaffQrBadgeModal`, `GuestCheckInTab`, `HotelHubTab`, `HotelBookingsTab`,
`HotelMediaLibrary`, `HotelQRTab`, `RoomQRTab`, `RoomManagementTab`,
`WaiterOrderTab`

### Feature tabs (30, `components/dashboard/features`)

`QuickCounterTab`, `ComboMealsTab`, `RushHourTab`, `TakeawayTab`,
`RoomServiceTab`, `MultiOutletTab`, `EventCateringTab`, `GuestBillingTab`,
`BuffetManagerTab`, `PreOrdersTab`, `CustomCakesTab`, `DailySpecialsTab`,
`DisplayCounterTab`, `DeliveryOpsTab`, `MultiBrandTab`, `DeliveryZonesTab`,
`PackageTrackingTab`, `HappyHoursTab`, `TabManagementTab`, `CocktailMenuTab`,
`LiveEventsTab`, `LoyaltyRewardsTab`, `WifiSeatingTab`, `SeasonalMenuTab`,
`BrunchModeTab`, `TableReservationsTab`, `WaitlistTab`, `PrivateDiningTab`,
`WifiSettingsTab`, `_NotPersistedBanner`

`_NotPersistedBanner` is the tell for which feature tabs are UI-only shells
without persistence wired up.

### Reports (`components/dashboard/reports`)

`index.tsx`, `TodayTab`, `OverviewTab`, `StaffTab`, `ShiftsTab`,
`StaffDrillDownPanel`, `DateRangePicker`, `utils.ts`

Charts: `RevenueTrendChart`, `HourlyBarChart`, `OrderTypeDonut`,
`PaymentMethodDonut`, `StaffLeaderboardBar`, `ShiftPaidUnpaidBar`

---

## POS (`components/pos`)

**Activation** — `POSActivationGate`, `POSActivationWizard` (728 lines),
`POSLauncher`, `POSWelcomeTour`

**Terminal** — `POSTerminal`, `POSTerminalHeader`, `POSTerminalNav`,
`POSCustomerMode`, `POSCFD`, `POSPaymentQROverlay`, `POSTables3DView`
(three.js table layout)

**Staff** — `POSRegister`, `POSMenuGrid`, `POSOrderPanel`, `POSActiveOrders`,
`POSHeldOrders`, `POSBilling` (651), `POSSplitBill`, `POSTableView`,
`POSDailySummary`, `POSInactiveScreen`

**Kiosk** — `KioskWelcome`, `KioskOrderType`, `KioskCategoryBar`,
`KioskMenuGrid`, `KioskItemDetail`, `KioskCart`, `KioskSummary`,
`KioskConfirmation`, `KioskIdleOverlay`

---

## Admin (`components/admin`, 18)

`MasterOverview`, `AllRestaurantsTab`, `AllUsersTab`, `AllOrdersTab`,
`AllPaymentsTab`, `AllBookingsTab`, `AllDeliveriesTab`, `AllChatsTab`,
`AllContactsTab`, `InactiveUsersTab`, `AuditTab`, `HardwareTab`,
`HeroSettingsTab`, `LandingSettingsTab`, `FooterSettingsTab`,
`GatewaySettingsTab`, `RestaurantFeatureOverridesModal`, `DeleteConfirmDialog`

---

## Home / landing (14)

`Hero`, `LandingHero`, `CoreFeatures`, `PlatformModules`, `HowItWorks`,
`ScrollHowItWorks`, `BusinessMetrics`, `StatsCounter`, `Testimonials`,
`FAQSection`, `CTASection`, `FoodCategories`, `OffersCarousel`, `LocationBar`

---

## Three.js (9)

`LandingScrollCanvas`, `MenuScrollCanvas`, `StoryHero`, `MenuStoryHero`,
`StoryHowItWorks`, `ScrollStorySection`, `StoryTransition`,
`FloatingFoodShapes`, `FoodParticles`

---

## Shared (13)

`ImagePicker`, `ImageCropDialog`, `RichTextEditor`, `AnchoredMenu`,
`AuthGateModal`, `FloatingCart`, `LoadingClock`, `NotificationSetup`,
`PWAInstallPrompt`, `PresenceTracker`, `ScrollableRow`, `Skeleton`,
`ThemeToggle`

## Design system (5)

`tokens/theme.css`, `primitives/Button.tsx`, `primitives/Typography.tsx`,
`composites/ListingCard.tsx`, `SafeImage.tsx`

> The `design-system` folder is small and only partially adopted. Most components
> style with Tailwind + CSS custom properties (`var(--accent)`, `var(--text-1)`,
> `var(--canvas)`, `var(--surface)`, `var(--border)`) directly. `components/ui`
> holds a separate, also-partial set (`Toggle`, `avatar`, `badge`, `button`,
> `card`, `story-viewer`). Note `ui/button.tsx` and
> `design-system/primitives/Button.tsx` coexist.
