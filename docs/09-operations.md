# 09 — Operations & Deployment

> **This application is live in production on Vercel with real users.** The
> sections on schema sync and payment env vars below are the two places where a
> careless change causes immediate, visible damage.

## Deployment

Hosted on Vercel. `.vercel/` exists locally; `vercel.json` declares one cron.

```json
{ "crons": [{ "path": "/api/cron/expire-payments", "schedule": "0 0 * * *" }] }
```

## Build pipeline

`package.json` scripts:

| Script | Command |
| --- | --- |
| `dev` | `next dev` |
| `build` | `node scripts/vercel-build.mjs` ← **the real entrypoint** |
| `build:local` | `prisma generate && next build` |
| `db:push` | `prisma db push --accept-data-loss` |
| `start` | `next start` |
| `lint` | `eslint` |

### The three schema-sync modes

[`scripts/vercel-build.mjs`](../scripts/vercel-build.mjs) is the single most
important operational file in the repo. Schema sync mutates the live database, so
it is **off by default** and split into three explicit modes:

| Mode | Trigger | Behaviour |
| --- | --- | --- |
| **1. Normal build** | *(default, no flags)* | `prisma generate` + `next build` only. **No DB writes.** Safe for any non-schema deploy and for an accidental local `npm run build` |
| **2. Additive sync** | `ADDITIVE_SCHEMA_SYNC=true` | `prisma db push` **without** `--accept-data-loss`. Applies additive changes (new optional columns/tables/indexes/enum values) and **refuses** if any destructive change would be required — so it can never drop data |
| **3. Destructive sync** | `ALLOW_PRISMA_ACCEPT_DATA_LOSS=true` | Runs the legacy `OrderStatus` data migration + `prisma db push --accept-data-loss`. **CAN drop columns/tables/enum variants.** Only for a single, reviewed, deliberate deploy |

All sync modes use `DIRECT_URL` (non-pooled, port 5432) to avoid PgBouncer's
`MaxClientsInSessionMode`. The app itself uses `DATABASE_URL` (pooled, 6543) at
runtime.

**Rules of engagement:**

- Default to Mode 1. Most deploys need no schema sync.
- Use Mode 2 when you've added optional columns/tables. It is safe by
  construction — if it errors, a non-additive change was detected and needs review.
- Mode 3 requires a human decision and a reviewed diff. Turn it **off again**
  immediately after.
- Add columns as **optional/nullable** so Mode 2 can ship them.

### Why the code is written defensively around schema

Because sync is opt-in, **code can ship ahead of columns.** This is why you see,
throughout the codebase:

- Explicit Prisma `select` clauses instead of `include: true`
- `SAFE_ORDER_SELECT` in `src/lib/billing.ts`
- `couponDiscount` read through a `Record<string, unknown>` cast with a typeof check
- Comments like *"avoid pulling columns that may not exist in the production
  database yet (schema drift protection)"*

Deploy order for a schema change: **schema first (Mode 2), then the code that
uses it.** `createOrder()` explicitly refuses to degrade silently if the Phase 2.5
columns are missing — that is intentional.

---

## Environment variables

From `.env.example`. `.env` is gitignored (`.env*`).

### Required

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase **pooled** (port 6543, `?pgbouncer=true`). Runtime queries |
| `DIRECT_URL` | Supabase **direct** (port 5432). Schema sync only |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL — payment callbacks build off this |
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Realtime broadcast |
| `SUPABASE_STORAGE_BUCKET` | e.g. `food-images` |
| `JWT_SECRET` | Signs staff + master-admin JWTs **and** order track HMACs. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ENCRYPTION_KEY` | AES-256-GCM for gateway credentials. Falls back to `JWT_SECRET` if unset. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `MASTER_ADMIN_ID` | Admin login |
| `MASTER_ADMIN_PASSWORD` | Admin login |

### Payment gateways — check these

| Var | Production value |
| --- | --- |
| `ESEWA_GATEWAY_URL` | `https://epay.esewa.com.np/api/epay/main/v2/form` |
| `ESEWA_VERIFY_URL` | live eSewa status endpoint |
| `KHALTI_GATEWAY_URL` | live Khalti initiate |
| `KHALTI_VERIFY_URL` | live Khalti lookup |

The `.env.example` **defaults are sandbox** (`rc-epay.esewa.com.np`,
`uat.esewa.com.np`, `a.khalti.com`). If unset in production, real payments
silently verify against a test environment. Both modules log a
`console.error` at startup when this happens — grep production logs for
`falling back to SANDBOX` to confirm.

### Optional

| Var | Effect if absent |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting falls back to per-instance in-memory, resets on cold start, does **not** enforce across serverless instances. Logs a one-time `console.error` in production |
| `ANTHROPIC_API_KEY` | ID OCR (`/api/id-ocr`) disabled |
| `PEXELS_API_KEY` | Image search falls back to Openverse (lower quality) |
| Firebase (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) | Push notifications no-op. **Note:** the README lists these but `.env.example` does not — verify against the live Vercel config |

### Env-driven behaviour flags

| Var | Effect |
| --- | --- |
| `ADDITIVE_SCHEMA_SYNC=true` | Build mode 2 |
| `ALLOW_PRISMA_ACCEPT_DATA_LOSS=true` | Build mode 3 |
| `VERCEL` / `NODE_ENV=production` | Smaller pg pool (3), SSL, production error messages, sandbox warnings |

---

## Connection pool sizing

`src/lib/db.ts`:

```
serverless:  max 3, idleTimeout 10s, ssl { rejectUnauthorized: false }
local:       max 5, idleTimeout 30s
both:        connectionTimeout 3s, statement_timeout 15s, query_timeout 15s,
             keepAlive true
```

Total backend connections ≈ `concurrent_lambdas × 3`. The comment records that
`max: 1` was over-conservative and serialised every multi-query request; 3 is the
tuned value. Do not raise it without understanding Supavisor's client limit.

`keepAlive: true` matters for the long-lived SSE handlers.

Client-side timeouts are matched: `apiFetch` aborts at 20s (server dies at 15s),
and retries 502/503/504 twice.

---

## Migrations

Two parallel mechanisms — know which applies:

1. **Prisma `db push`** via the build script. Schema-driven, no migration files.
   This is the primary mechanism.
2. **Raw SQL** in `supabase/migrations/` — applied out-of-band:

| File | Purpose |
| --- | --- |
| `20260316000000_enable_rls_audit_logs.sql` | RLS on `audit_logs` |
| `20260324000000_hotel_booking_payments.sql` | booking payment fields |
| `20260325000000_combo_meals_rush_hour.sql` | combo + rush-hour tables |
| `20260325000001_restaurant_status_fields.sql` | restaurant status |

`prisma/enable-rls.sql` is a separate RLS bootstrap.

Seeds: `prisma/seed-discounts.ts`, `prisma/seed-hotel-gautam.ts` (run with `npx tsx`).

---

## Supabase configuration

- **Auth** — cookie sessions via `@supabase/ssr`; OAuth + email/password
- **Storage** — bucket from `SUPABASE_STORAGE_BUCKET`; direct browser upload via
  signed URLs from `POST /api/upload`
- **Realtime** — HTTP broadcast endpoint, service-role key
- **Email templates** — `supabase/email-templates/`: `confirm-signup.html`,
  `magic-link.html`, `reset-password.html`, `change-email.html`,
  `invite-user.html`, `reauthentication.html`. These must be pasted into the
  Supabase dashboard — they are not deployed by this repo.

---

## Local development

```bash
npm install                        # package-lock.json is committed → npm, not pnpm
cp .env.example .env               # then fill in real values
npx prisma generate                # required — src/generated/prisma is gitignored
npx prisma db push                 # only against a local/dev DB, never production
npm run dev
```

> The README says `pnpm`. The repo commits `package-lock.json`, so **use `npm`**.

`npm run build` locally runs the Vercel build script — which is safe: with no
flags it defaults to Mode 1 and writes nothing to the database. That safety is
deliberate.

---

## Monitoring

- `@vercel/speed-insights` and `@vercel/analytics` are mounted in
  `src/app/layout.tsx`
- `botid` ^1.5.11 is a dependency — verify where/whether it's wired up
- `AuditLog` is the in-app audit trail; the admin panel streams it live at
  `/api/admin/audit/stream`
- Presence (`/api/admin/presence`) is **in-memory and per-instance** — with
  multiple warm Vercel instances the admin sees whichever one their request lands
  on. The module documents this and suggests Redis as the fix.

---

## Known risks & rough edges

Found during the codebase read. None are asserted as bugs — each needs a decision.

### Security / correctness

1. **`/api/cron/*` is in `PUBLIC_ROUTES`.** `/api/cron/expire-payments` appears
   reachable by anyone. Vercel sends an `Authorization: Bearer $CRON_SECRET`
   header for cron invocations — confirm the route verifies it. If it doesn't,
   anyone can trigger payment/booking expiry at will.

2. **One `JWT_SECRET` for four purposes** — staff sessions, master-admin
   sessions, order track HMACs, and (by fallback) `ENCRYPTION_KEY`. A rotation
   invalidates all four at once, and a leak compromises all four. Consider
   separate secrets.

3. **`ENCRYPTION_KEY` falls back to `JWT_SECRET`.** If `ENCRYPTION_KEY` was never
   set, gateway credentials are encrypted under the JWT secret — rotating
   `JWT_SECRET` would render them undecryptable. Check which key production is
   actually using **before** any rotation.

4. **No database RLS except `audit_logs`.** Tenant isolation is entirely
   application-enforced. A query missing `where: { restaurantId }` is a
   cross-tenant leak with no backstop.

5. **`img-src https: http:`** in the CSP allows images from any host, including
   plaintext HTTP. Needed for the Openverse/Pexels search feature; worth
   tightening to `https:` at minimum.

6. **`PATCH /api/public/restaurants/[slug]/cover`** is a mutation on a public
   path. It pairs with `can-edit`; verify the authorisation actually holds.

### Operational

7. **Sandbox payment defaults** — covered above. The single highest-impact
   env-var risk.

8. **In-memory rate limiting without Upstash** — per-instance, resets on cold
   start. On Vercel with any concurrency this means the "5 attempts / 15 min"
   login limits are effectively `5 × instances`.

9. **In-memory presence** — same class of problem; cosmetic rather than dangerous.

### Code health

10. **Duplicate prepaid API surface.** `/api/restaurants/[id]/prepaid/config` +
    `/prepaid/tokens` and `/api/restaurants/[id]/prepaid-config` +
    `/prepaid-tokens` are two live route trees for one concept. Determine which
    the UI calls before removing either.

11. **Repeated enum values in `where` clauses** — e.g.
    `{ status: { in: ["ACCEPTED", "ACCEPTED", "ACCEPTED"] } }` in the live-orders
    route, and `{ notIn: ["REJECTED", "REJECTED"] }` in `billing.ts`. Residue
    from the `OrderStatus` collapse. Harmless, but the surrounding logic deserves
    a careful re-read.

12. **`batchAt` computed but unused** in both `createOrder()` and
    `appendToOrder()`. The round-marker comment on `OrderItem.createdAt` says the
    timestamp is *"set explicitly in code per batch"* — but the `createMany` calls
    don't pass `createdAt`, so rows fall back to `@default(now())`. Round
    reconstruction may be relying on near-identical timestamps rather than exact
    ones. Worth verifying against the kitchen board's behaviour.

13. **`notifyCustomerOrderUpdate` keys on dead enum values** —
    `PREPARING`/`READY`/`DELIVERED`/`CANCELLED` are no longer in `OrderStatus`.
    They now arrive as `kitchenStatus` strings. Confirm callers pass the right one.

14. **Two button components** — `components/ui/button.tsx` and
    `components/design-system/primitives/Button.tsx`. The design system is only
    partially adopted.

15. **`TYPE_FEATURES` vs `TYPE_FEATURE_TABS` drift** — marketing copy and actual
    tabs are separate lists, not synced. HOTEL advertises "24/7 Room Service" and
    "Conference Catering" but only gets the `hotel-hub` tab.

16. **`user.isDeleted` handling deletes rows.** `getAuthUser()` **hard-deletes**
    any user row it finds with `isDeleted: true`. It's described as cleanup for a
    retired feature, but it means a read path performs a destructive write.

17. **Six loose `any` types** in `dashboard-nav.ts` (`icon: any`,
    `FEATURE_ICONS: Record<FeatureTabId, any>`) and the tab dispatcher
    (`React.ComponentType<any>`, `props: any`). The `Record<FeatureTabId, any>`
    shape is load-bearing — it's what fails the build when a feature id is added
    without an icon.

### Housekeeping

18. `src/app/pos/[slug]/page.tsx.out` — a parked file committed to git. Inert
    (Next.js only reads `page.tsx`) but confusing. Delete or move it out of `app/`.
19. `checkcols.mjs` at repo root — an ad-hoc column-checking script.
20. `public/WhatsApp Image 2026-04-27 at 8.50.50 PM.jpeg` — a filename with
    spaces committed to `public/`. Also `public/stuck.png`, `public/image.png`.
21. Default Next.js SVGs still present: `next.svg`, `vercel.svg`, `file.svg`,
    `globe.svg`, `window.svg`.
22. `.gitignore` has duplicate `.vscode` entries and ignores `scripts/` — yet
    `scripts/vercel-build.mjs` is force-tracked and is the build entrypoint. That
    combination is fragile: a fresh clone with a clean checkout could plausibly
    lose it. Worth un-ignoring `scripts/`.
23. `tsconfig.json` excludes `antigravity-awesome-skills` — a directory that no
    longer exists.
24. `AGENTS.md` and `CLAUDE.md` are gitignored (local-only agent instructions).

---

## Runbook

| Task | Action |
| --- | --- |
| Deploy code, no schema change | Push. Default Mode 1 — no DB writes |
| Deploy an additive schema change | Set `ADDITIVE_SCHEMA_SYNC=true`, deploy, **unset it** |
| Deploy a destructive schema change | Review the diff. Set `ALLOW_PRISMA_ACCEPT_DATA_LOSS=true`, deploy, **unset it immediately** |
| Rotate `JWT_SECRET` | Invalidates all staff sessions, admin sessions, and guest track cookies at once. Confirm `ENCRYPTION_KEY` is set independently first, or gateway credentials become undecryptable |
| Add a payment gateway | `PaymentConfig` columns, `src/lib/payments/<gw>.ts`, initiate + callback routes, `PaymentMethod` enum, `form-action` in the CSP |
| Enable distributed rate limiting | Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. No code change — the library auto-detects at runtime |
| Debug a stuck order | `AuditLog` → `/api/admin/audit`; check `Payment.status`, `Order.kitchenStatus`, `PrintJob.status` |
| Debug a missing KOT | `PrintJob` where `status` is `PENDING`/`RETRYING`, or `PRINTING` with an expired `lockedUntil` (30s lease) |
| Verify payments are live, not sandbox | Grep production logs for `falling back to SANDBOX` |
