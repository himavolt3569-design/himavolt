# 03 — Auth & Access Control

> **Read this before touching any route.** The system runs **four independent
> authentication mechanisms** side by side. They do not share a session store, a
> cookie, or a user table lookup. Knowing which one guards a given route is
> essential.

## The four mechanisms

| # | Mechanism | Identity | Cookie | Verified by | Guards |
| --- | --- | --- | --- | --- | --- |
| 1 | **Supabase Auth** | `User` row | `sb-*` (set by `@supabase/ssr`) | `getAuthUser()` / `getOrCreateUser()` | `/dashboard`, `/profile`, `/orders`, `/api/me/*`, `/api/restaurants` |
| 2 | **Staff JWT** | `StaffMember` row | `staff_session` | `getStaffSession()` (jose) | `/kitchen`, `/counter`, `/pos/staff`, `/pos/cfd`, many `/api/restaurants/[id]/*` |
| 3 | **Master admin JWT** | env credentials only | `master_admin_session` | `requireAdmin()` (jose) | `/admin`, `/api/admin/*` |
| 4 | **Order track cookie** | none (guest) | `track_<orderId>` | `canAccessOrder()` (HMAC) | `/api/order-track/*`, `/api/orders/[id]/bill`, cancel |

All three JWT-ish mechanisms sign with the **same** `JWT_SECRET`. There is no
per-mechanism key separation.

---

## 1. Supabase Auth (customers & owners)

`src/lib/auth.ts`, `src/lib/supabase-server.ts`, `src/lib/supabase-browser.ts`.

### `getAuthUser()` — read-only, `react.cache`-wrapped

1. `supabase.auth.getUser()` → Supabase user or null.
2. Look up `User` by `id`.
3. **Fallback**: if not found by id, look up by `email`. This handles account
   linking where the Supabase id changed.
4. If `user.isDeleted` → **hard-delete the row** and return null. (Cleanup for
   leftovers from a retired "scheduled deletion" feature.)
5. If `user.isBlacklisted` → return null. Blacklisting is a hard lockout.

### `getOrCreateUser()` — provisioning path

Same as above, plus:

- **Role auto-upgrade**: if `role === CUSTOMER` and the user owns ≥1 restaurant,
  update to `OWNER`. Runs on both the by-id and by-email paths.
- **Metadata sync**: if email/name/imageUrl/phone drifted from Supabase, update.
- **Provisioning for new users**, with role resolved by this priority:
  1. `supabaseUser.user_metadata.intended_role` (email sign-up)
  2. the `intended-role` cookie (`src/lib/intended-role.ts`) — set client-side
     right before an OAuth redirect, because the query param is dropped across
     the round-trip
  3. `CUSTOMER`

  The comment is explicit that `/auth/callback` is the *primary* creator and this
  is a **safety net** so an account is never left role-less (which the client
  would treat as CUSTOMER).

### Role is server-authoritative

`src/context/AuthContext.tsx` fetches the role from `GET /api/me`, never from
`user_metadata`. The comment states the reason plainly: *"we deliberately do NOT
consult user_metadata.intended_role since that field is user-writable; the server
is the source of truth for role."*

Caching rules in `AuthContext`:
- Cached in `sessionStorage` under `hh_me_cache_<uid>` for 5 minutes.
- **Only a resolved role is cached.** A `null` role is never persisted — it would
  pin a genuine OWNER to the customer experience for the TTL.
- Unresolved roles retry twice with 1.5s / 3s backoff.

### Helpers

```ts
requireAuth()   // throws "Unauthorized" if no user
requireOwner()  // throws "Forbidden: Owner access required" unless OWNER or ADMIN
```

---

## 2. Staff JWT (PIN login)

`src/lib/staff-auth.ts`, `src/lib/staff-roles.ts`, `src/lib/pin.ts`,
`src/lib/staff-shifts.ts`.

### Login flow

`POST /api/staff-login` with `{ restaurantCode, pin, rememberMe }`
(`staffLoginSchema`, `src/lib/validations.ts`). PIN is exactly 4 numeric digits.
`POST /api/staff-login/qr` is the QR-badge alternative, matching `StaffMember.qrToken`.

Rate limited to 5 attempts / 15 min.

### PIN storage

`src/lib/pin.ts`:

```ts
verifyPin(inputPin, storedPin)
  → storedPin.startsWith("$2")  → bcrypt.compare        (hashed)
  → otherwise                   → timingSafeEqual        (legacy plaintext)
```

Legacy plaintext PINs are **transparently rehashed on next successful login**.
The plaintext comparison is constant-time so it doesn't leak length or position.

### Session payload

```ts
interface StaffPayload {
  staffId: string;
  restaurantId: string;   // ← the tenant binding
  role: string;
  userId: string;
  name: string;
}
```

`getSecret()` returns `null` and logs a warning when `JWT_SECRET` is unset —
verification then fails, which is the **safe default**. There is no fallback secret.

### Shift enforcement

`checkStaffShift()` gates POS access:

- `FULL_TIME` staff → always allowed (no schedule).
- `SUPER_ADMIN` / `MANAGER` → always allowed, even without a scheduled shift
  (they may need to cover unplanned gaps).
- `SHIFT_BASED` others → must have a `Shift` whose window contains `now`.
  Midnight-crossing shifts supported. `actualEndTime` (early clock-out) overrides
  the scheduled end.

Refusal reasons: `NO_SHIFT_TODAY`, `NOT_YET_STARTED`, `ALREADY_ENDED`,
`CLOCKED_OUT` — each mapped to a user-facing string by `shiftReasonToMessage()`.

### Staff role groups

`src/lib/staff-roles.ts`:

| Group | Roles |
| --- | --- |
| `STAFF_MANAGER_ROLES` | SUPER_ADMIN, MANAGER |
| `STAFF_BILLING_ROLES` | SUPER_ADMIN, MANAGER, CASHIER |
| `STAFF_ORDER_CREATE_ROLES` | SUPER_ADMIN, MANAGER, CASHIER, WAITER |
| `STAFF_KITCHEN_ROLES` | CHEF, WAITER |
| `STAFF_PREPAID_TOKEN_ROLES` | SUPER_ADMIN, MANAGER, CASHIER |
| `STAFF_TABLE_MANAGE_ROLES` | SUPER_ADMIN, MANAGER, WAITER |

`KITCHEN_VISIBLE_FEATURES` is a separate set of 12 feature ids the kitchen
surface may show.

---

## 3. Master admin JWT

`src/lib/require-admin.ts`, `src/app/api/admin/login/route.ts`.

**There is no admin user table.** Credentials are `MASTER_ADMIN_ID` and
`MASTER_ADMIN_PASSWORD` environment variables.

The login route is worth reading for its comparison technique:

```ts
const digest = (s: string) => createHash("sha256").update(s).digest();
const idMatch = timingSafeEqual(digest(adminId), digest(expectedId));
const pwMatch = timingSafeEqual(digest(password), digest(expectedPassword));
```

Hashing first normalises every input to 32 bytes. The comment explains why:
`timingSafeEqual` **throws** on length mismatch, which would both leak the
expected length and break constant-time behaviour for mismatched inputs.

- Rate limit: 5 attempts / 15 min.
- JWT payload `{ role: "MASTER_ADMIN" }`, 12h expiry.
- Cookie: `httpOnly`, `secure` in production, `sameSite: lax`, `maxAge: 12h`.

`requireAdmin()` returns `{ role: "MASTER_ADMIN", id: "master_admin" }` or `null`.

---

## 4. Order track cookie (guests)

`src/lib/order-access.ts`.

Guests who place an order need to track, bill and cancel it without an account.
The token is `HMAC-SHA256(orderId, JWT_SECRET)` — **not stored in the database**,
recomputed and verified on each request.

```ts
makeOrderTrackToken(orderId)  // HMAC hex
trackCookieName(orderId)      // "track_<orderId>"
setOrderTrackCookie(res, id)  // httpOnly, sameSite lax, 24h maxAge
```

`canAccessOrder(req, order)` accepts, in order:

1. A staff session bound to the order's restaurant (fastest path — deliberately
   checked first to avoid the `getOrCreateUser` DB lookup).
2. The authenticated owner of the order (`order.userId === user.id`), **or** the
   owner of the restaurant.
3. A `track_<orderId>` cookie matching the recomputed HMAC, compared with
   `timingSafeEqual` on equal-length buffers.

---

## Middleware

`src/middleware.ts`. Order of operations:

```
1. Body-size guard
   POST/PUT/PATCH with Content-Length > 1 MB → 413
   Exempt: /api/upload (handles its own limits)

2. isStaffRoute(pathname)?
   → verify staff_session; on failure redirect /staff-login AND delete the cookie
   STAFF_ONLY_ROUTES: /kitchen, /counter, /pos/staff, /pos/cfd

3. isPublicRoute(pathname)?
   → refreshSupabaseSession(req) and pass through
   (skips entirely if no sb-* cookies present)
   Also: a signed-in user hitting /sign-in or /sign-up is redirected to /dashboard

4. Otherwise, try in order:
   master_admin_session JWT → allow
   staff_session JWT        → allow
   Supabase user            → allow
   none                     → /api/*: 401 JSON ; else redirect /sign-in
```

### The cookie-mirroring subtlety

Both `middleware()` and `refreshSupabaseSession()` write refreshed tokens onto
**both** the request and the response. The comment explains why this matters:

> Request: so the downstream route handler (`getSupabaseServerClient`) reads the
> NEW access token instead of re-refreshing with a refresh token this middleware
> already rotated — which would fail and 401.
> Response: so the browser persists the rotated session.

If you touch this, keep both writes.

### Matcher

```ts
matcher: [
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  "/(api|trpc)(.*)",
]
```

### Public route list

Notable entries in `PUBLIC_ROUTES` (the full list is 50+ regexes):

- Pages: `/`, `/food`, `/menu`, `/scan`, `/bill`, `/contact`, `/legal`,
  `/order-track`, `/guide`, `/orders`, `/offers`, `/hotel`, `/feedback`,
  `/hardware`, `/sign-in`, `/sign-up`, `/auth`, `/staff-login`, `/admin`,
  `/pos/(?!staff)`
- APIs: all `/api/public/*`, `/api/geocode`, `/api/geoip`, `/api/contact`,
  `/api/order-track/*`, `/api/track/*`, `/api/cron/*`, `/api/chat/*`,
  `/api/staff-login/*`, `/api/staff-session/*`, `/api/upload`,
  `/api/admin/login|verify|logout`, all payment callbacks and initiate

Two things to note:

- `/admin` is **public at the middleware layer** — the page itself renders a
  login form and every `/api/admin/*` route (except login/verify/logout) calls
  `requireAdmin()` internally.
- `/api/restaurants/[id]/orders` (POST — order creation) is public by design;
  the route handler does its own access resolution.

---

## Access-control helpers

`src/lib/access-control.ts` is where per-restaurant authorisation actually lives.

```ts
type AccessContext =
  | { kind: "owner"; userId: string }
  | { kind: "staff"; staff: StaffPayload };
```

| Function | Allows |
| --- | --- |
| `getRestaurantAccess(req, id)` | staff bound to this restaurant, else the owner |
| `requireOwnerOrStaffManager(req, id)` | + staff role in SUPER_ADMIN/MANAGER |
| `requireOwnerOrStaffBilling(req, id)` | + staff role in SUPER_ADMIN/MANAGER/CASHIER (front-desk / cashier surface; waiters and chefs rejected) |
| `requireOwnerOnly(req, id)` | owner only |

### The owner-fallback pattern

Every role-gated helper contains this fallback:

```ts
if (!(STAFF_MANAGER_ROLES).includes(access.staff.role)) {
  // Staff role is too low — but the caller might be the OWNER carrying a
  // stray POS staff cookie. Fall back to an ownership check before denying.
  return getOwnerAccess(restaurantId);
}
```

This exists because an owner who logs into the POS as staff picks up a
`staff_session` cookie which then shadows their owner identity on subsequent
requests. Without the fallback they'd be locked out of their own dashboard. If
you add a new access helper, replicate this pattern.

---

## API-layer defences

### Rate limiting

`src/lib/rate-limit.ts`. Upstash Redis sliding window when
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set; per-instance
in-memory sliding window otherwise.

`rateLimit()` is **async** — always `await` it. (A prior migration to async
silently broke all 12 call sites because a Promise is always truthy, so limits
never fired. Every call site now awaits.)

The in-memory fallback logs a loud one-time `console.error` in production
explaining that per-instance limits reset on cold starts and don't enforce across
serverless instances.

`clientKey(req, prefix)` derives `<prefix>:<ip>` from `x-forwarded-for` →
`x-real-ip` → `"unknown"`.

Also exported: `claimOnce(key, ttl)` / `releaseClaim(key)` — a one-shot idempotency
claim (Redis `SET NX EX`, in-memory fallback) used for operations without a
durable DB unique constraint, e.g. add-items-to-order.

Known limits in use: admin login 5/15min, staff login 5/15min, staff PIN change
5/15min, payment initiate 20/15min, bank proof 10/15min.

### Validation

Zod throughout, centralised in `src/lib/validations.ts`. `safeHandler()` in
`src/lib/api-helpers.ts` wraps a handler with try/catch, optional schema parsing,
and a consistent error shape. It never leaks stack traces — in production the
500 body is always `{ error: "Internal server error" }`.

Note: `ZodError` exposes `.issues`, not `.errors`, in Zod v4.

### Server-side price authority

`createOrderSchema` accepts `name`, `quantity`, `menuItemId` and `addOns` from the
client but **not `price`**. The comment is explicit:

> Server is the source of truth for prices. We accept name/menuItemId/quantity
> from the client, but `price` is always re-derived from the menu (or rejected
> for ad-hoc lines). `prepTime` was dropped — server reads it from menu metadata.

Similarly `autoAccept` (Fast Pay) is only honoured when a staff session is present
for the restaurant — customer-direct callers cannot bypass the PENDING queue.

### Encryption at rest

`src/lib/encryption.ts` — AES-256-GCM, format `iv:tag:ciphertext` (all hex). The
key is derived by SHA-256 over `ENCRYPTION_KEY` (falling back to `JWT_SECRET`).
Used for per-restaurant gateway credentials in `PaymentConfig`.

---

## Auth surface map

| Route pattern | Guard |
| --- | --- |
| `/`, `/features`, `/features/*`, `/hardware`, `/hardware/*`, `/guide`, `/contact`, `/legal/*` | none |
| `/api/public/hardware/*` | none — account-less marketplace; token possession authorises seller/buyer status |
| `/api/admin/hardware/*` | `requireAdmin()` |
| `/menu/*`, `/food/*`, `/scan`, `/offers`, `/hotels`, `/hotel/*` | none |
| `/track/*`, `/order-track/*`, `/bill/*`, `/feedback/*` | track cookie or session |
| `/sign-in`, `/auth/*`, `/register` | none (redirects if already signed in) |
| `/dashboard/*`, `/profile`, `/orders` | Supabase user |
| `/kitchen`, `/counter`, `/pos/staff`, `/pos/cfd` | staff JWT (middleware) |
| `/pos/[slug]` (kiosk) | none — public per `PUBLIC_ROUTES` `/pos/(?!staff)` |
| `/admin` | page-level login; APIs call `requireAdmin()` |
| `/api/public/*` | none |
| `/api/me/*` | Supabase user |
| `/api/restaurants/[id]/*` | `access-control.ts` helper per route |
| `/api/admin/*` | `requireAdmin()` |
| `/api/cron/*` | public route — **see the note in [09](09-operations.md)** |
