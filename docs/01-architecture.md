# 01 — Architecture

## Tech stack

| Layer | Choice | Version | Notes |
| --- | --- | --- | --- |
| Framework | Next.js App Router | 16.1.6 | Server Components by default; most interactive surfaces are `"use client"` |
| Runtime | React | 19.2.3 | |
| Language | TypeScript | ^5 | `strict: true`, `noEmit`, path alias `@/*` → `./src/*` |
| Database | PostgreSQL via Supabase | — | Accessed through Supavisor pooler (port 6543) at runtime |
| ORM | Prisma | ^7.4.2 | `prisma-client-js`, generated to `src/generated/prisma` (gitignored) |
| DB driver | `pg` + `@prisma/adapter-pg` | ^8.20 / ^7.4.2 | Explicit `Pool`, not Prisma's built-in connection handling |
| Auth (customers) | Supabase Auth | `@supabase/ssr` ^0.9 | Cookie sessions, OAuth + email |
| Auth (staff/admin) | Custom JWT | `jose` ^6.1.3 | Hand-rolled, separate from Supabase |
| Styling | Tailwind CSS | v4 | With Lightning CSS enabled |
| UI primitives | Radix UI | — | Dialog + Slot only; most components are hand-built |
| Animation | Framer Motion + GSAP | ^12.34 / ^3.14 | |
| 3D | three.js + React Three Fiber + drei | ^0.183 / ^9.5 / ^10.7 | Landing page and menu hero scenes |
| Data fetching | TanStack Query + custom `apiFetch` | ^5.101 | Both exist; `apiFetch` is dominant |
| Realtime | Supabase Realtime Broadcast + SSE | — | Dual mechanism, see below |
| Push | Firebase Cloud Messaging | ^12.13 / admin ^13.7 | |
| Validation | Zod | ^4.3.6 | |
| Rate limiting | Upstash Redis, in-memory fallback | ^2.0.8 | |
| Charts | Recharts | ^3.8.1 | |
| Maps | Leaflet | ^1.9.4 | OpenStreetMap tiles |
| OCR | Anthropic Claude + tesseract.js | ^0.80 / ^7.0 | Guest ID document extraction |
| PDF / capture | jsPDF + html2canvas | ^4.2 / ^1.4 | Bill printing |
| Hosting | Vercel | — | Serverless functions, cron |

## Repository layout

```
himalhub/
├── docs/                     ← you are here
├── prisma/
│   ├── schema.prisma         ← 50 models, single source of truth (1,290 lines)
│   ├── enable-rls.sql        ← row-level-security bootstrap
│   ├── seed-discounts.ts
│   └── seed-hotel-gautam.ts
├── public/
│   ├── icons/                ← 9 PWA icons (72px → 512px + maskable)
│   ├── manifest.json         ← PWA manifest
│   ├── sw.js                 ← service worker
│   └── offline.html          ← offline fallback page
├── scripts/
│   ├── vercel-build.mjs      ← the real build entrypoint (see 09-operations.md)
│   └── generate-icons.js
├── supabase/
│   ├── email-templates/      ← 6 branded auth emails
│   └── migrations/           ← 4 raw SQL migrations (RLS + additive changes)
├── src/
│   ├── app/                  ← App Router: 46 pages + 197 API routes
│   ├── components/           ← 205 components, grouped by domain
│   ├── context/              ← 8 React contexts
│   ├── hooks/                ← 11 custom hooks
│   ├── lib/                  ← 47 modules: db, auth, payments, billing, print…
│   ├── generated/prisma/     ← generated client (gitignored)
│   └── middleware.ts         ← route protection + body-size guard
├── next.config.ts            ← security headers, CSP, image config, redirects
├── vercel.json               ← cron schedule
└── package.json
```

## The eight surfaces

This is the single most important thing to understand: one Next.js app serves
eight very different products.

| Surface | Route | Audience | Auth |
| --- | --- | --- | --- |
| Marketing site | `/`, `/features`, `/hardware`, `/guide`, `/contact`, `/legal/*` | Public | None |
| Customer ordering | `/menu/[slug]`, `/food/[id]`, `/scan`, `/track`, `/bill`, `/order-track` | Public / guests | Optional Supabase; guests use track cookies |
| Stays (hotel browse/book) | `/hotels`, `/hotel/[slug]`, `/book/[roomId]` | Public | None to browse; none to book |
| Owner dashboard | `/dashboard/*` | Restaurant owners | Supabase (`role = OWNER`) |
| Staff POS | `/pos/staff`, `/pos/cfd` | Staff | Staff JWT (PIN login) |
| Kitchen display | `/kitchen` | Chefs / waiters | Staff JWT |
| Counter | `/counter` | Cashiers | Staff JWT |
| Master admin | `/admin` | Platform operator | Master-admin JWT (env credentials) |

## Request lifecycle

```
Browser
  │
  ▼
next.config.ts headers  ── HSTS, CSP, X-Frame-Options, Permissions-Policy
  │
  ▼
src/middleware.ts
  │  1. Reject POST/PUT/PATCH with Content-Length > 1 MB → 413
  │     (exempt: /api/upload)
  │  2. STAFF_ONLY_ROUTES  → verify staff_session JWT, else redirect /staff-login
  │  3. PUBLIC_ROUTES      → refresh Supabase session if sb-* cookies present, pass
  │  4. Everything else    → try master_admin JWT → staff JWT → Supabase user
  │                          no match: 401 (for /api/*) or redirect /sign-in
  ▼
Route handler (src/app/api/**/route.ts) or Page (src/app/**/page.tsx)
  │  • rateLimit(clientKey(req, "…"), windowMs, max)
  │  • Zod safeParse of body
  │  • Access check: getRestaurantAccess / requireOwnerOrStaffManager /
  │    requireOwnerOrStaffBilling / requireOwnerOnly / requireAdmin / canAccessOrder
  │  • db.<model>.<op>()  via the Proxy in src/lib/db.ts
  │  • logAudit({ … })    fire-and-forget
  │  • notifyOrderChanged / notifyRestaurantOrders  fire-and-forget
  ▼
Response
```

## Database access layer

`src/lib/db.ts` is deliberately unusual and worth reading in full. Three things
it does:

1. **Explicit `pg.Pool`, not Prisma's own pooling.** Max 3 connections when
   serverless (`VERCEL` or `NODE_ENV=production`), 5 locally. The comment
   explains the reasoning: Supabase's transaction-mode pooler multiplexes, so a
   small per-Lambda pool is safe and lets one request's queries overlap.
   `statement_timeout` and `query_timeout` are both 15s — a hard ceiling so a
   runaway query can't hog a slot. `connectionTimeoutMillis: 3000` fails fast
   under saturation rather than making saturation worse.

2. **A `$extends` retry wrapper.** Retries at most twice, only on genuinely
   transient errors (`P2024`, `P2010`, `fetch failed`, `Connection terminated`,
   `read ECONNRESET`), with exponential backoff capped at 1.5s.

3. **A lazy `Proxy` export.** `export const db = new Proxy({}, { get … })` means
   the client is constructed on first property access, not at module load. This
   keeps `DATABASE_URL` from being required at build time.

A recurring defensive pattern across the codebase: **explicit Prisma `select`
clauses instead of `include: true`**, specifically to survive schema drift
between the Prisma schema and the live production database. Several files carry
comments like *"avoid pulling columns that may not exist in the production
database yet"*. This is a symptom of the deploy model described in
[09-operations.md](09-operations.md) — schema sync is opt-in per deploy, so code
can ship ahead of columns.

## Realtime: two mechanisms in parallel

The app runs **both** Supabase Realtime Broadcast and Server-Sent Events, by
design, as a primary + fallback pair.

### Supabase Realtime Broadcast (primary)

- Server: `src/lib/realtime.ts` posts to Supabase's HTTP broadcast endpoint using
  the service-role key. Fire-and-forget; never throws into the request path; no-ops
  entirely if `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset.
- Client: `src/hooks/useRealtimeSignal.ts` subscribes to a topic.
- **Carries no row data.** It is a pure "something changed" ping. The client then
  re-fetches through its normal access-checked API. This is a deliberate security
  choice — no DB rows travel over public channels, so no table-level RLS is
  needed for the realtime path.

Topics (`src/lib/realtime-topics.ts`):

| Topic | Shape | Consumers |
| --- | --- | --- |
| `order:<orderId>` | single order | customer tracking, bill page |
| `restaurant:<id>:orders` | live order feed | kitchen, dashboard, counter |
| `restaurant:<id>:kitchen` | KOT / prep status | kitchen display |
| `restaurant:<id>:billing` | payments, totals | billing tab, counter |
| `restaurant:<id>:bookings` | hotel bookings | Hotel Hub bookings tab |
| `admin:events` | everything, globally | master admin panel |

All events use the single event name `changed`.

### Server-Sent Events (fallback)

Eight `stream/route.ts` endpoints poll the DB and push snapshots:

- `/api/admin/audit/stream`
- `/api/chat/[roomId]/stream`
- `/api/order-track/[trackToken]/stream`
- `/api/restaurants/[id]/billing/stream`
- `/api/restaurants/[id]/orders/stream`
- `/api/track/stream`

Client: `src/hooks/useSSE.ts` — exponential backoff from 2s to 30s with ±500ms
jitter. Note the explicit comment that the `visibilitychange` listener was
removed on request, so connections stay alive in background tabs (avoids a
"Connecting…" flash on tab switch, at the cost of holding connections open).

## Client-side data fetching: `apiFetch`

`src/lib/api-client.ts` is a hand-rolled fetch wrapper that most of the app uses
in preference to TanStack Query. Its behaviours:

- **In-memory GET cache**, 60s default TTL, 200-entry LRU (uses `Map` insertion
  order for O(1) eviction — the comment notes this replaced an O(n log n) sort).
- **In-flight deduplication** — concurrent GETs to the same path share one promise.
- **20s abort-based timeout** per attempt, matched to the server's 15s statement
  timeout.
- **Automatic GET retry** (2 retries, 300ms/600ms backoff) on 502/503/504 and
  network errors. Mutations are never auto-retried.
- **Automatic cache invalidation on mutation** — after a non-GET, it invalidates
  every cache key sharing the first 4 path segments.
- `peekApiCache(path)` lets a component paint instantly from cache on mount while
  revalidating behind it.

The invalidation-by-prefix rule has a known sharp edge, documented in comments in
`src/context/RestaurantContext.tsx`: a write to `/api/restaurants/:id/staff` busts
the `/api/restaurants/:id` prefix but **not** the `/api/restaurants` list key. The
context works around it by passing `cacheTtl: 0` on the list fetch and by applying
optimistic local patches.

## Rendering strategy

- Marketing and public pages are largely Server Components.
- Every operational surface (dashboard, POS, kitchen, counter, admin) is a
  client component tree rooted under `"use client"`.
- The dashboard aggressively code-splits: `src/app/dashboard/[tab]/page.tsx`
  lazy-loads ~60 tab components via `dynamic()`, then
  `src/app/dashboard/layout.tsx` deliberately **pre-warms** them in two waves
  (250ms for the 9 most-used tabs, 1200ms for the remaining ~50) and pre-warms
  their primary API data at 600ms. The `lazyTab()` helper attaches `.preload()`
  to each component so nav hover can warm a chunk before the click.

## Providers tree

`src/app/providers.tsx` — order matters, each depends on the one above:

```
QueryClientProvider
└── ThemeProvider          (dark/light, pre-paint script in layout.tsx head)
    └── ToastProvider
        └── AuthProvider           (Supabase session + server-authoritative role)
            └── RestaurantProvider (owner's restaurant list + selection)
                └── CartProvider   (per-restaurant localStorage carts)
                    └── OrderProvider
                        └── LiveOrdersProvider
                            ├── children
                            ├── NotificationSetup   ← deferred 8s, ssr: false
                            └── PresenceTracker     ← deferred 8s, ssr: false
```

Service worker registration is deferred 3s; background effects 8s. Both are
deliberate first-paint optimisations.

## PWA

- `public/manifest.json` + 9 icons including a maskable 512px.
- `public/sw.js` served with `Cache-Control: no-cache, no-store, must-revalidate`
  and `Service-Worker-Allowed: /` (see `next.config.ts` headers).
- `public/offline.html` offline fallback.
- `src/components/shared/PWAInstallPrompt.tsx` renders the install CTA.
- `src/lib/sw-registration.ts` registers, deferred 3s from `providers.tsx`.

## Security headers

Set globally in `next.config.ts` for `/(.*)`:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(), geolocation=(self)`
  — camera is `self` for QR scanning; geolocation `self` for delivery.
- A full CSP with `object-src 'none'`, `base-uri 'self'`,
  `frame-ancestors 'self'`, and `form-action` allow-listing only eSewa and
  Khalti domains.

Two CSP caveats worth knowing: `script-src` includes `'unsafe-inline'` and
`'unsafe-eval'` (Next.js hydration requires it), and `img-src` allows `https:`
and `http:` from any host (needed for the Openverse/Pexels image search feature).

`poweredByHeader: false` strips the `X-Powered-By` header.
