# WORKLOG — living state of the project

**Read this first if you are an AI assistant or a new contributor picking this
project up.** It is the running record of what has been changed, why, what was
deliberately *not* changed, and what to do next. It is maintained by hand and
must be updated in the same change as any structural work.

- **Project**: HimalHub / HimaVolt — multi-tenant hospitality SaaS for Nepal
- **Status**: **LIVE IN PRODUCTION** on Vercel, real users, real payments
- **Stack**: Next.js 16 App Router · React 19 · Prisma 7 · PostgreSQL/Supabase · TypeScript strict
- **Reference docs**: [`docs/README.md`](README.md) indexes nine documents
- **Last updated**: 2026-07-17

> ⚠️ **The local `.env` points at the LIVE production database.**
> `NEXT_PUBLIC_APP_URL=https://www.himavolt.com`, and `DATABASE_URL` /
> `DIRECT_URL` target Supabase project `fmqtvtqbjoepcnctmdyk`. Running
> `npm run dev` locally reads and writes **real customer data**. Reads are safe;
> treat every write as production. There is currently no dev/staging database.

---

## How to use this file

**Starting a session?** Read this file top to bottom, then
[`docs/README.md`](README.md). Between them you'll know the shape of the system
and everything that's been touched.

**Finishing a change?** Add an entry to [Change log](#change-log) using the
template at the bottom. Move anything you resolved out of
[Open items](#open-items). Update the `Last updated` date. Do it in the same
commit as the change — a worklog that lags is worse than none.

---

## Current state

| Metric | Value |
| --- | --- |
| Tracked files | 593 |
| Lines in `src/` | ~92,600 |
| Prisma models | 50 |
| API route files | 191 |
| Page routes | 46 |
| Components | 178 |
| Branch of record | `main` |

### Ground rules for this codebase

These are the things that bite people. They are expanded in the numbered docs.

1. **Four independent auth systems** — Supabase (customers/owners), staff JWT
   (PIN), master-admin JWT (env credentials), HMAC order-track cookies (guests).
   → [`03-auth-and-access.md`](03-auth-and-access.md)
2. **Schema sync is opt-in per deploy.** `npm run build` writes nothing to the DB
   by default. Additive changes need `ADDITIVE_SCHEMA_SYNC=true`. Deploy schema
   *before* the code that uses it. → [`09-operations.md`](09-operations.md)
3. **No database RLS** except `audit_logs`. Tenant isolation is entirely
   application-enforced — a query missing `where: { restaurantId }` is a
   cross-tenant leak with no backstop.
4. **Server owns prices.** `createOrderSchema` deliberately does not accept
   `price` from the client. Don't add it.
5. **Order creation is one transaction with no side effects inside it.** Realtime,
   FCM and printing fire only after commit. → [`08-payments-and-billing.md`](08-payments-and-billing.md)
6. **One tenant entity: `Restaurant`.** A hotel is `Restaurant { type: HOTEL }`.
   There is no `Hotel` model.
7. Use **npm**, not pnpm. The root README is wrong about this.
8. `src/generated/prisma` is gitignored — run `npx prisma generate` after clone.

---

## Change log

Newest first.

### 2026-07-17 — Mobile/desktop UI cleanup: QR, staff, tables

**Branch**: `cleanup/dead-code` · **Commit**: `63348a4`

UI fixes from mobile + desktop screenshots. All verified live at 375px and
1280px (no clipping, no horizontal scroll), `tsc` clean, `next build` exit 0.

| Area | Fix |
| --- | --- |
| **QR card height** | QR box was fixed `w-[180px] h-[180px]` → stayed 180px tall in a 144px mobile card. Now `w-full aspect-square` (max 200) + tighter padding. |
| **QR card name** | Clipped to "Ta…" — a fixed number badge + full "Active" pill boxed it in. Name is now `flex-1`; status is a compact dot (every listed card is active). |
| **QR download button** | Clipped to "Downloa" in a 144px card. Label shows from `sm` up, icon-only on mobile. |
| **QR top bar** | Three uneven stretched boxes → full-width info banner + one balanced control row (style left, count right); dropped the redundant "X style selected" line. |
| **Staff card** | Login QR is now a live inline thumbnail (`react-qr-code`) that expands the badge modal on tap — replaces the hidden "QR Badge" text button. |
| **Staff tabs** | "Shifts" clipped off-screen on mobile → three tabs share full width on mobile, intrinsic on `sm+`. |
| **Staff default** | New staff now created `FULL_TIME` (was `SHIFT_BASED`). Owners can still flip individuals. |
| **Tables header** | "Add Table" clipped on mobile → header stacks; both buttons fit a 375px viewport. |
| **Rooms** | Removed `AnimatePresence mode="popLayout"` from the bookings list (the PopChild/PopChildMeasure reflow-jank flagged in devtools); cards still animate via `layout`. |

**Note**: the `FULL_TIME` default is server-side and applies to the *next*
staff created — not re-verified via the browser (would require a DB write to
the live database). See open item #25 pattern.

### 2026-07-17 — Fast Payment order panel: real width on desktop

**Branch**: `cleanup/dead-code` · **Commit**: `90acbb4`

**Reported**: The Manual/Fast Payment (`ManualBillingTab`) order panel looks
great on mobile but "very bad" on PC / large screens.

**Cause**: The panel was `lg:col-span-1` of a 3-col grid — a fixed one-third.
Full-width on a phone (good), but on desktop it stayed ~371px (mobile width)
while the menu column ate every extra pixel. Each order row holds 6 things
(thumb · name · editable price · stepper · line total · delete); in ~337px that
left ~61px for the name, which clipped to "NP…".

**Fix**: grid is now `minmax(0,1fr)` (menu) + `clamp(400px,34vw,500px)` (panel) —
a control surface with a real, roughly-constant width, not a viewport fraction.

**Tuned by measurement, not guessed.** A first pass at `clamp(380px,28vw,480px)`
was actually *narrower* than the old third at 1280px (28vw floored to 380 < old
~395). Probing the resolved grid column widths across 1024–1920px showed 34vw is
where the panel beats the old split everywhere in the laptop/desktop range:
panel +115–165px at 1024–1440, name column 61px → ~139px, capped at 500px on
ultrawide so the menu gets the surplus. Mobile stacks unchanged.

Bundled (same panel, staged earlier): panel spans viewport height on desktop
(`lg:sticky lg:max-h-[calc(100vh-7rem)]`) and the order list flexes into the room
instead of a fixed 35vh box with empty space below (`lg:max-h-none` + `min-h-0`).

**Verified**: the exact compiled Tailwind class resolves in the running app
(measured `540px 435px` at the 1280px pane); `tsc` clean. ⚠️ **Final logged-in
visual confirmation still pending** — the preview pane was signed out; needs a
screenshot of the real item rows once logged in.

**Process note**: this reused the lesson from the empty-state bug — the grid math
"looked fine" at 1440 but the probe caught that it regressed at 1280. Measure the
resolved output, don't trust the arithmetic.

### 2026-07-17 — Instant-paint pattern rolled across Menu, Stock, Staff, Billing

**Branch**: `cleanup/dead-code` · follows `d856388`

**Why**: `d856388` fixed `/tables` only. Items #31–32 flagged that the same
waterfall and the same ungated empty state almost certainly existed elsewhere.
They did — in three different disguises.

**New primitive**: [`src/hooks/useRestaurantResource.ts`](../src/hooks/useRestaurantResource.ts)
— the standard way to load a restaurant-scoped list. Encapsulates the honest
`isFirstLoad`, the snapshot persistence, and pairs with `useResolvedRestaurantId`
to kill the waterfall. Use it instead of hand-rolling a fetch.

**The audit — same bug, three disguises:**

| Tab | What was wrong |
| --- | --- |
| **Stock** | `if (!restaurant) return null` — a hard **blank screen** for the whole context-resolution window, then "No items yet" while fetching. **No loading variable at all.** |
| **Staff** | `AttendanceLogsView` *did* gate on `isLoading` — but React Query reports `isLoading: false` for a **disabled** query, so an unresolved id skipped the loader and rendered "No attendance records" over a venue with records. |
| **Menu** | Same disabled-query hole via `itemsQuery.isLoading \|\| catQuery.isLoading`. |
| **ManualBilling** | `restaurantId` typed `string`, but the tab dispatcher passes `selectedRestaurant?.id` through an `any` — undefined already reached it and TypeScript couldn't see it. |

**Billing deliberately does NOT snapshot.** It shows live payment state; a stale
first frame could show a settled order as unpaid and someone could collect twice.
It gets the waterfall fix only — `keepPreviousData` already covers in-session.

**Sign-out clears all snapshots** (`AuthContext`), so a shared device can't paint
the previous account's data for a frame.

**Measured** (Manohara Cafe — 20 tables, 3 menu items, 9 categories):

| Tab | Cold | Warm |
| --- | --- | --- |
| **Menu** | `/api/restaurants` 427ms, `/menu` **483ms** — now **parallel**, was ~1.5s sequential | **236ms**, 3-item snapshot replayed |
| **Tables** | `/tables` 474ms, exactly **1** request, 20 cards, no false empty | ~232ms |
| **Stock** | `/inventory` 982ms, no crash, correctly says "No items yet" (that venue genuinely has 0) | snapshot written |
| **Staff** | renders; `/staff` 200×3 | — |
| **Billing** | renders; confirmed **no** snapshot written | — |

**Two things went wrong during this work, worth recording:**

1. **I crashed StockTab.** Removing `if (!restaurant) return null` also removed
   the guard protecting every later `restaurant.id` / `restaurant.name` use →
   `TypeError: Cannot read properties of undefined`. TypeScript didn't catch it
   because `restaurants[0]` is typed `Restaurant`, not `Restaurant | undefined`
   (no `noUncheckedIndexedAccess`). Caught by driving the browser, not by `tsc`.
2. **`npm run build` while `next dev` is running corrupts `.next`.** They share
   the directory. Don't run a production build against a live dev server.

Also observed: `/staff` returned a one-off **503**, then 200×3 on retry —
transient pool pressure, i.e. exactly the failure class `32dd4cf`'s Retry-After
+ jitter targets.

### 2026-07-17 — Tables paint instantly, and stop lying about being empty

**Branch**: `cleanup/dead-code` · **Commit**: `d856388` · follows `32dd4cf`

**Why**: `32dd4cf` cut requests but **did not fix what the user sees**. They
reported it still blank/slow, and they were right. Three defects remained.

**1. The empty-state lie — the actual reported bug.**
`TablesTab` rendered "No tables configured" on `tables.length === 0` alone, with
**no loading gate at all** — `loading` was computed on line 189 and referenced
nowhere else. Every first load asserted the venue had no tables before a byte
arrived. Not slow-then-correct — *confidently wrong, then correct*. The header
did it too ("0 tables · 0 free"). `32dd4cf` made it worse: `isFirstLoad` returned
`false` while `restaurantId` was undefined, so the entire context-resolution
window rendered as "finished, found nothing".
→ An unknown restaurant now counts as loading; both call sites render a skeleton;
the empty state is only reachable once the list genuinely resolves.

**2. The waterfall — why it was slow.**
Cold-load timing: page interactive at **267ms**, `/tables` fetch didn't start
until **1,782ms**. 1.5s of dead time, because every screen waited on
`RestaurantContext`'s `/api/restaurants` round-trip just to learn which
restaurant it was on — a fact already sitting in localStorage, readable
synchronously.
→ `useResolvedRestaurantId` falls back to the persisted selection so dependent
queries start immediately; context still wins once loaded. The stored id is only
a *pointer* — routes still authorise against it, so a stale value yields 401/403,
not access.

**3. No persistence — why every refresh paid full price.**
React Query's cache is in-memory and dies on refresh, exactly when this screen
felt worst.
→ `useTables` mirrors each successful response to localStorage and feeds it back
as `initialData`, marked immediately stale so revalidation always follows.
Stale-while-revalidate, one screen, no new dependency.

**Measured** (Manohara Cafe, 20 tables, dev server → live DB):

| | before | cold | warm |
| --- | --- | --- | --- |
| time to tables | ~2,900ms | ~1,800ms | **~232ms** |
| `/tables` fetch starts | 1,782ms | 782ms | background only |
| false "No tables configured" | **yes** | no | no |

**Regression checked**: a restaurant with genuinely 0 tables still shows the
empty state and does not hang on a skeleton. `tsc` clean, `next build` exit 0.

**Lesson worth keeping**: `32dd4cf` optimised the network and declared victory
without checking the render path. The request count improved and the user saw no
difference, because the defect was a missing loading gate — three lines away from
the code being tuned. Measure what the user sees, not what the profiler likes.

### 2026-07-17 — Dashboard load: tables/QR flicker + retry amplification

**Branch**: `cleanup/dead-code` · **Commit**: `32dd4cf`

**Reported**: Opening Menu / QR / Tables showed empty lists for seconds to
minutes, refreshed repeatedly, and sometimes showed a populated QR grid next to
an empty table board **on the same screen**.

**Root cause — four interacting problems, not one:**

1. **Split-brain on one screen.** `TablesTab` renders the table board and the QR
   grid as sub-tabs. The board took `restaurantId` as a **prop**
   (`selectedRestaurant?.id`, undefined until `RestaurantContext` resolves, and
   its query gated on `enabled: !!rid`). The QR grid resolved the id **itself**
   from context with a `?? restaurants[0]` fallback *and* seeded synchronously
   from `peekApiCache`. So QR painted while tables spun.
2. **Retry amplification.** `GET /tables` returns 503 on pool exhaustion;
   `apiFetch` retries 503. The client's retry landed back on the pool that was
   already overloaded. The failure handler fed the failure.
3. **The burst.** The dashboard layout pre-warmed 8 endpoints 600ms after
   restaurant select, on *every* page, colliding with context/auth/tab fetches
   against a pool of 3.
4. **A ~5.5 min worst case.** `RestaurantContext` retried 5× on top of
   `apiFetch`'s own ~3×20s budget.

**Fixed:**

| Change | File |
| --- | --- |
| One shared React Query cache for `/tables` | **new** `src/hooks/useTables.ts` |
| One id resolution for every view | `useResolvedRestaurantId` in `RestaurantContext.tsx` |
| Both sub-tabs consume both of the above | `TablesTab.tsx`, `QRCodesTab.tsx` |
| `Retry-After` on 503; client honours it; retries 2→1; jittered backoff | `tables/route.ts`, `api-client.ts` |
| Blanket 8-endpoint pre-warm removed | `dashboard/layout.tsx` |
| `tables`/`qr` hover-prefetch removed (warmed a cache its consumer bypasses) | `dashboard/[tab]/page.tsx` |
| Retries 5→2 (~40s ceiling) + `loadError` state | `RestaurantContext.tsx` |
| Duplicate restaurant read removed; `ownerId` no longer echoed; qrToken backfill bounded to 5/request | `tables/route.ts` |

**Verified — measured on the real app** (dev server against the live DB,
"Manohara Cafe", 20 tables):

| Metric | Pre-fix | Post-fix |
| --- | --- | --- |
| `/tables` requests per load | **2** | **1** |
| Wasted pre-warm on the Tables page | 7 (`menu`×2, `categories`, `billing`, `billing/summary`, `attendance`, `inventory`) | **0** |
| Total API requests per load | 18 | 14–16 |
| QR sub-tab switch | 0 refetch *(warm cache only)* | 0 refetch, 120 QR cards, no loading state |
| `ownerId` in response | leaked | gone (`["slug","name"]`) |

Also: `tsc --noEmit` clean, `next build` exit 0, no new lint findings (9 problems
before, 9 after — all pre-existing).

**Honest limits of the verification:**

- The pre-fix sub-tab switch **also** fired 0 `/tables` requests, because the
  layout pre-warm had already populated `apiFetch`'s cache. On a *warm* cache the
  old code looked fine. The reported bug is a **race** that bites on a cold cache
  / hard refresh — which is what the request-count and burst reductions address.
  The split-brain fix is reasoned from the code, not reproduced on demand.
- Timings were taken from a local dev server against Supabase `ap-southeast-1`,
  so every DB round-trip pays WAN latency. `/tables` median **1.6s**, range
  **1.4–3.9s**. Production (co-located) will be faster; the *shape* (~4 sequential
  round-trips) holds. That variance is pool contention.
- No writes were performed — creating/deleting tables would have written to the
  live customer database. The create-then-reconcile path (the bug the original
  `cacheTtl: 0` guarded against) is therefore **not** re-verified. See open item
  #25.

### 2026-07-17 — Dead code removal

**Branch**: `cleanup/dead-code` · **Commits**: `d50a699`, `3ed8f11` · **Base**: `a3a9162`

**Why**: The repo had accumulated orphaned components, unreferenced assets and
stale tooling config. Goal was maintainability, not runtime performance (see
[Corrections](#corrections) below).

**Removed — 27 source files, ~3,944 lines**, each verified to have zero
importers via alias (`@/…`), relative, and dynamic-`import()` checks, followed by
a cascade re-scan:

| Group | Files |
| --- | --- |
| `components/home` | `Hero`, `FoodCategories`, `OffersCarousel`, `ScrollHowItWorks`, `StatsCounter` |
| `components/three` | `LandingScrollCanvas`, `MenuScrollCanvas`, `MenuStoryHero`, `StoryHero`, `StoryHowItWorks`, `StoryTransition`, `FloatingFoodShapes` |
| `components/ui` | `button`, `card`, `badge` (duplicated by `design-system/primitives`) |
| `components/shared` | `AuthGateModal`, `FloatingCart`, `LoadingClock`, `ScrollableRow` |
| `components/dashboard` | `IngredientMapper`, `ThemeSettingsTab`, `features/_NotPersistedBanner` |
| `components/pos` | `staff/POSTableView` |
| `hooks` / `lib` | `usePollWithBackoff`, `lib/actions/landing`, `lib/data` |

**Removed — assets & tooling**: 8 unreferenced `public/` assets (`next.svg`,
`vercel.svg`, `file.svg`, `globe.svg`, `window.svg`, `image.png`, `stuck.png`,
a stray WhatsApp jpeg — 1,043 KB); `src/app/pos/[slug]/page.tsx.out` (parked
file); `checkcols.mjs`; and three throwaway debug scripts (`fix-schema.js`,
`check-columns.js`, `test-query.js`).

`fix-schema.js` deserves a note: it truncated and rewrote `prisma/schema.prisma`
in place. It was a one-off UTF-16 encoding repair, and keeping it around was a
live hazard.

**Removed — dependencies**: `botid`, `@radix-ui/react-slot`,
`@tanstack/react-query-devtools`. All confirmed unreferenced repo-wide
(`react-slot` survived only as a comment in `design-system/primitives/Button.tsx`
reading *"If asChild is implemented via Radix Slot, it would go here"*).

**`.gitignore`**: removed the `scripts` ignore rule. `scripts/vercel-build.mjs`
is the **build entrypoint** and was surviving only as a force-tracked file under
an ignore rule — one clean checkout away from breaking deploys. Also removed a
duplicate `.vscode` entry and a stale `images-follow` rule.

**Near-miss worth knowing about**: the first pass deleted
`components/dashboard/reports/index.tsx`. `ReportsTab.tsx:3` imports it as
`import ReportsShell from "./reports"` — a **relative directory import**, which
the alias-based scan missed. It was caught during verification and restored. The
whole `reports/` tree is live. If you write a dead-code scan for this repo,
handle relative directory imports.

**Verified**: `tsc --noEmit` clean · `next build` exit 0 · all 46 routes present.

**Deliberately kept**:

| Kept | Because |
| --- | --- |
| All 9 `public/icons/*` | referenced by `manifest.json` and `sw.js`, not by JS |
| `public/offline.html` | `sw.js` `PRECACHE_URLS` |
| `scripts/backfill-has-password.ts` | documented one-time production migration — operational record |
| `scripts/check-ownership.ts`, `repair-ownership.ts` | production data-repair tooling |
| `scripts/generate-icons.js` | regenerates the PWA icon set |
| All `@types/*`, `@prisma/client` | ambient / required by the generated client; they look unused to a grep |

### 2026-07-17 — Documentation set + graphify removal

**Commit**: `d50a699`

Added the nine-document reference set under `docs/` from a full read of all 616
then-tracked files. Removed dangling `graphify-out/` instructions from
`AGENTS.md` and `.gitignore` (the folder never existed in this repo) and
repointed `CLAUDE.md` at `docs/`.

---

## Corrections

Things believed at some point that turned out to be wrong. Recorded so they
aren't re-litigated.

- **"Deleting unused files makes the site faster."** It does not. Next.js
  tree-shakes and code-splits; a component nothing imports already ships zero
  bytes to users. Dead-code removal improves *developer* speed and repo clarity,
  not page load. Real user-facing performance work is a separate, unstarted
  effort — see [Open items](#open-items).

---

## Open items

Ordered by consequence. None are started. Each is evidence-backed but needs a
decision — several may be intentional.

### Security / correctness — decide soon

| # | Item | Detail |
| --- | --- | --- |
| 1 | **`/api/cron/*` is in `PUBLIC_ROUTES`** | `/api/cron/expire-payments` looks reachable by anyone. Vercel sends `Authorization: Bearer $CRON_SECRET`; confirm the route verifies it. If not, anyone can trigger payment/booking expiry. |
| 2 | **One `JWT_SECRET` for four purposes** | staff sessions, admin sessions, order-track HMACs, and (by fallback) `ENCRYPTION_KEY`. One rotation invalidates all four; one leak compromises all four. |
| 3 | **`ENCRYPTION_KEY` falls back to `JWT_SECRET`** | If it was never set, gateway credentials are encrypted under the JWT secret and rotating it makes them undecryptable. **Check which key production uses before any rotation.** |
| 4 | **Sandbox payment defaults** | `esewa.ts` / `khalti.ts` default to *test* endpoints. Without `ESEWA_GATEWAY_URL`, `ESEWA_VERIFY_URL`, `KHALTI_GATEWAY_URL`, `KHALTI_VERIFY_URL` set in Vercel, real payments verify against sandbox. Grep production logs for `falling back to SANDBOX`. |
| 5 | **No RLS beyond `audit_logs`** | Application-only tenant isolation. |
| 6 | **`img-src https: http:`** in CSP | Any host, including plaintext HTTP. Needed for image search; tighten to `https:` at minimum. |
| 7 | **`PATCH /api/public/restaurants/[slug]/cover`** | A mutation on a public path. Pairs with `can-edit`; verify authorisation holds. |
| 8 | **`getAuthUser()` hard-deletes rows** | A read path performs a destructive write when it finds `isDeleted: true`. Described as cleanup for a retired feature. |

### Operational

| # | Item | Detail |
| --- | --- | --- |
| 9 | **In-memory rate limiting** | Without `UPSTASH_REDIS_REST_URL`/`_TOKEN`, limits are per-instance and reset on cold start — "5 per 15 min" becomes `5 × instances`. Fix is env-only, no code change. |
| 10 | **In-memory presence** | Same class of problem; cosmetic. |

### Code health

| # | Item | Detail |
| --- | --- | --- |
| 11 | **Duplicate prepaid API tree** | `/api/restaurants/[id]/prepaid/{config,tokens}` **and** `/prepaid-{config,tokens}` both exist. **Neither is called by any client code in this repo** — verified by grep. Prepaid itself is live (`prepaidEnabled`, `prepaidToken` on the track page). Left in place because an external caller can't be ruled out. 6 route files, deletable once confirmed. |
| 12 | **`batchAt` computed but unused** | In both `createOrder()` and `appendToOrder()`. `OrderItem.createdAt` is documented as a round marker *"set explicitly in code per batch"*, but the `createMany` calls don't pass `createdAt` — rows fall back to `@default(now())`. Round reconstruction may rely on near-identical rather than exact timestamps. Verify against the kitchen board. |
| 13 | **Repeated enum values in `where` clauses** | e.g. `{ status: { in: ["ACCEPTED","ACCEPTED","ACCEPTED"] } }` in the live-orders route; `{ notIn: ["REJECTED","REJECTED"] }` in `billing.ts`. Residue from the `OrderStatus` collapse. Harmless but the surrounding logic wants a careful re-read. |
| 14 | **`notifyCustomerOrderUpdate` keys on dead enum values** | `PREPARING`/`READY`/`DELIVERED`/`CANCELLED` are no longer in `OrderStatus`; they arrive as `kitchenStatus` strings. Confirm callers pass the right one. |
| 15 | **`TYPE_FEATURES` vs `TYPE_FEATURE_TABS` drift** | Marketing copy and actual tabs are separate unsynced lists. HOTEL advertises "24/7 Room Service" but only gets the `hotel-hub` tab. |
| 16 | **Partial design system** | `design-system/` and `components/ui/` are two half-adopted sets; most code styles with Tailwind + CSS vars directly. The duplicate `button`/`card`/`badge` in `ui/` were removed in this pass; the split remains. |
| 17 | **`tsconfig.json` excludes `antigravity-awesome-skills`** | A directory that no longer exists. |
| 18 | **README says pnpm** | Repo commits `package-lock.json`. README also predates several structural changes. |
| 19 | **40 npm vulnerabilities** | 2 low, 18 moderate, 17 high, 3 critical, per `npm install`. Not triaged. |

### Dashboard load — found while fixing the tables flicker (2026-07-17)

Measured on the real app. None of these were caused by that fix; all were
surfaced by instrumenting it. Ordered by waste.

| # | Item | Evidence |
| --- | --- | --- |
| 25 | **Create-then-reconcile is unverified.** The original `cacheTtl: 0` existed because a stale list clobbered a just-created table so it "vanished until refresh". The shared `useTables` cache preserves `cacheTtl: 0`, so the guard should hold — but it was **not** re-tested, because proving it requires writing to the live DB. Test on a throwaway table before trusting it. **Also re-check that a newly created table survives the localStorage snapshot** added in `d856388`. | reasoning only |
| ~~31~~ | ~~Waterfall fix scoped to /tables only~~ — **DONE**: Menu, Stock, Staff, Billing, ManualBilling now use `useResolvedRestaurantId`. | resolved |
| ~~32~~ | ~~Other tabs may share the empty-state lie~~ — **DONE**: they did, in three disguises. All gated on `isFirstLoad` now. | resolved |
| 33 | **~50 dashboard tabs still hand-roll their fetch.** Only the 5 daily drivers were converted. The remaining feature tabs (`features/*`, Feedback, Media, HeroSlides, Coupons, HotelHub, RoomManagement…) still hit the waterfall, and several share the `if (!restaurant) return null` blank-screen pattern (`RoomManagementTab:164`, `HotelMediaLibrary:136`, `FeedbackTab:404`). Convert with `useRestaurantResource` when touched. | code read |
| 34 | **`/dashboard/drinks` deep-link is broken.** `[tab]/page.tsx:280` sets `props.initialStockTab = "drinks"`, but `StockTab()` takes **no props** — it's silently ignored, so the deep-link opens the default Stock view. Pre-existing; `props: any` hides it. | code read |
| 35 | **`noUncheckedIndexedAccess` is off.** `restaurants[0]` types as `Restaurant`, not `Restaurant \| undefined` — which is exactly how the StockTab crash got past `tsc`. Turning it on would surface a class of latent null-deref bugs (and a lot of noise). | code read |
| 26 | **`/api/presence/ping` storms.** Fired **5×** for a single sub-tab click, and **2×** on a plain page load. It also returned **401** on first load. `PresenceTracker` looks like it re-fires on every render rather than on an interval. | measured |
| 27 | **`/api/chat` duplicated.** 4 calls per dashboard load — `?restaurantId=X` and `?restaurantId=X&type=BROADCAST`, each **twice**. Likely `GlobalChatButton` and `ChatTab` both mounting, or a `useEffect` with unstable deps. | measured |
| 28 | **`/api/me` fired 3×** per load (was 6× with aborts during navigation), despite `AuthContext`'s 5-min sessionStorage cache. Something is bypassing or racing it. | measured |
| 29 | **`/tables` makes ~4 sequential DB round-trips** and is polled every 30s by every open dashboard. Supabase Realtime already signals table changes — the poll may be redundant. Median 1.6s locally (WAN-inflated), range 1.4–3.9s; the variance is pool contention. | measured |
| 30 | **`db.ts` pool comments are stale.** Several routes carry comments saying *"prod runs a 1-connection Prisma pool"*; it is now `max: 3`. The sequential-query designs built for that constraint may now be over-conservative. | code read |

### Performance — not started

The user-facing "make it snappy" work, which dead-code removal did **not**
address:

| # | Item |
| --- | --- |
| 20 | No bundle analysis has been run. Start with `@next/bundle-analyzer`. |
| 21 | Very large client components ship as single chunks: `MenuManagementTab` (2,449 lines), `counter/page` (1,932), `BillingTab` (1,845), `CustomerDashboard` (1,790), `kitchen/page` (1,735). |
| 22 | `dashboard/layout.tsx` eagerly pre-warms ~60 lazy chunks in two waves (250ms / 1200ms) plus 8 API calls at 600ms. Deliberate, but worth measuring — it may be fighting the code-splitting it sits on top of. |
| 23 | three.js + R3F + drei are heavy. With the `three/` scene components now deleted, check whether the remaining usage (`POSTables3DView`) justifies the dependency weight on non-POS routes. |
| 24 | `useSSE` deliberately holds connections open in background tabs. Trade-off was accepted to avoid a "Connecting…" flash; revisit if connection count becomes an issue. |

---

## Entry template

```markdown
### YYYY-MM-DD — Short title

**Branch**: `x` · **Commits**: `abc1234` · **Base**: `def5678`

**Why**: one or two sentences.

**Changed**: what moved, with counts.

**Verified**: how you proved it works (typecheck / build / driven the flow).

**Deliberately not changed**: and why.
```

**Rules**: append to the top of [Change log](#change-log) · resolve items out of
[Open items](#open-items) rather than leaving them stale · if you learn something
that contradicts this file, fix the file and note it under
[Corrections](#corrections) · update `Last updated`.
