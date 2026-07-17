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
