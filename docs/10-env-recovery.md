# 10 — Environment Recovery

> Written 2026-08-16 after a Windows reset destroyed the only local copy of the
> environment files. Everything below was verified against the live Vercel
> project (`himavolt`, `prj_FSkWEntTzb9oFWvkfz2sSmcsT8jW`) and the running
> production site, not recalled from memory.

## Read this first

**Production is not broken and nothing is at risk right now.** Vercel still
holds all 24 production environment variables and is still injecting them into
every deployment. The live site serves traffic, payments still verify, and the
per-restaurant gateway credentials are intact in the database.

What was lost is *your local copy*. That is a developer-workstation problem, not
an outage. Do not "fix" it by rotating secrets in production — that is the one
action that would turn a recoverable situation into a real incident.

## Why `vercel env pull` returns `[SENSITIVE]`

Every one of the 24 variables on this project is flagged **Sensitive** in
Vercel:

```
 name                     value     type         environments
 DATABASE_URL             Hidden    Sensitive    Production, Preview
 JWT_SECRET               Hidden    Sensitive    Production, Preview
 ...
```

Sensitive variables in Vercel are **write-only by design**. They can be set and
replaced, but never read back — not through `vercel env pull`, not through the
dashboard, not through the REST API. `[SENSITIVE]` is not a bug or a permissions
problem, and no CLI flag reveals the value.

That is a deliberate security property and it is working as intended. It also
means Vercel is not a backup. Recovery has to come from each value's original
source.

One consequence worth internalising: `.env.local` as pulled is **not usable as
an env file**. Its values are the literal string `[SENSITIVE]`. Booting against
it gives `DATABASE_URL="[SENSITIVE]"`, which fails immediately.

## Recovery status per variable

Legend — **Recovered**: value is in hand. **Sourceable**: fetch it from a
dashboard you control. **Gone**: unrecoverable, must be regenerated.

### Recovered

| Var | Value | How |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://www.himavolt.com` | Recorded in [WORKLOG.md](WORKLOG.md) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fmqtvtqbjoepcnctmdyk.supabase.co` | Read from the production HTML |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(in `.env.local.recovered`)* | Extracted from the production JS bundle |
| `SUPABASE_STORAGE_BUCKET` | `food-images` | Code default in `src/lib/supabase.ts` |

`NEXT_PUBLIC_*` variables are inlined into the client bundle at build time,
so the live site hands them to every visitor already. Reading them back out of
your own production bundle is a legitimate recovery route, and it is why these
four cost nothing to restore.

The anon key recovered this way is a valid `anon`-role JWT for project ref
`fmqtvtqbjoepcnctmdyk`, issued 2025-11-12, expiring 2036-03-08.

### Sourceable

| Var | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string → **Transaction** | Port **6543**, must keep `?pgbouncer=true` |
| `DIRECT_URL` | Same page → **Session** | Port **5432**, schema sync only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | Server-only, bypasses RLS |
| `NEXT_PUBLIC_FIREBASE_*` (7) | Firebase console → Project settings → General → Your apps → SDK setup | Public config, safe to expose |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Firebase console → Cloud Messaging → Web Push certificates | |
| `PEXELS_API_KEY` | pexels.com/api dashboard | Readable |
| `MASTER_ADMIN_ID` / `MASTER_ADMIN_PASSWORD` | Your own records | These are the credentials you type at `/admin` |

If the database password itself is lost, Supabase can reset it — but that
**rotates the password inside both connection strings**, so you must update
`DATABASE_URL` and `DIRECT_URL` in Vercel in the same sitting or production
loses its database.

### Gone — regenerate, never rotate blind

| Var | Consequence of a mismatch |
| --- | --- |
| `JWT_SECRET` | Every staff PIN session, master-admin session, and guest order-track cookie invalidates at once |
| `ENCRYPTION_KEY` | **Every restaurant's payment credentials become undecryptable** |

These are random values that only ever existed in Vercel. There is no source to
recover them from. See the next section before touching either.

## The `ENCRYPTION_KEY` trap

`ENCRYPTION_KEY` is the AES-256-GCM key protecting per-restaurant payment
credentials **at rest in the database**:

- `PaymentConfig.esewaMerchantCode`, `esewaSecretKey`
- `PaymentConfig.khaltiSecretKey`
- `PaymentConfig.bankName`, `bankAccountName`, `bankAccountNumber`, `bankBranch`

Those are the real production merchant credentials, and they are **safe** —
sitting encrypted in Supabase, decrypted on demand by the deployment that still
holds the matching key.

Two things make this fragile:

1. `getEncryptionKey()` falls back to `JWT_SECRET` when `ENCRYPTION_KEY` is
   unset. On this project `ENCRYPTION_KEY` **is** set (16 days ago, same batch
   as everything else), so the rows are encrypted under `ENCRYPTION_KEY` — but
   that also means rotating `JWT_SECRET` is safe for encryption while rotating
   `ENCRYPTION_KEY` is not.

2. `decryptIfPresent()` **swallows failures and returns `null`**:

   ```ts
   export function decryptIfPresent(value) {
     if (!value || value.trim() === "") return null;
     try { return decrypt(value); } catch { return null; }
   }
   ```

   A wrong key does not throw a loud error. Gateway config simply reads back as
   empty, and the failure looks like "the restaurant never configured eSewa"
   rather than "the key is wrong".

### The footgun that actually matters for local development

`docs/WORKLOG.md` records that **local development points at the live
production database**. There is no staging DB. Combine that with a locally
generated `ENCRYPTION_KEY` and you get this:

- **Reading** a restaurant's payment config locally → decrypt fails → the UI
  shows blank gateway fields. Harmless.
- **Saving** that form locally → `encryptIfPresent()` re-encrypts under *your
  local key* and writes it to the **production** row → that restaurant's live
  payments break, and the original credentials are overwritten and gone.

So: generate a fresh `ENCRYPTION_KEY` for local work if you like, but **never
open and save the payment-config screen while running against production**.

If you later want a key you actually hold, the clean path is a deliberate
re-key performed *inside* a production deployment (decrypt with the old key,
re-encrypt with the new one, in one migration), not a swap in the Vercel UI.

## Rebuilding your local environment

1. `cp .env.example .env.local`
2. Copy the four recovered values in from `.env.local.recovered`.
3. Pull `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY` from Supabase
   and the Firebase block from the Firebase console.
4. Generate local-only secrets:

   ```bash
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
   ```

   ```bash
   node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Leave the four gateway URLs **blank** locally so payments stay on sandbox.
6. `npx prisma generate` — `src/generated/prisma` is gitignored.
7. `npm run dev`

Remember that step 2–3 point you at the live database. Reads are safe; treat
every write as production.

## Open production gaps found during this recovery

These are not consequences of the reset. They are pre-existing, and the audit
of what Vercel actually holds is what surfaced them.

### 1. `CRON_SECRET` is not set in production

Both cron routes read it, and they fail in **opposite** directions:

`src/app/api/cron/expire-payments/route.ts`
```ts
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
With `cronSecret` undefined the condition short-circuits and **the guard is
skipped entirely**. `/api/cron/expire-payments` is also in `PUBLIC_ROUTES`, so
anyone who knows the URL can expire pending payments and cancel `PENDING`
orders on demand.

`src/app/api/cron/purge-location-pings/route.ts`
```ts
if (!secret || auth !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```
This one fails closed — so it returns 401 to Vercel Cron every night and **the
job has never run**. `DriverLocationPing` rows, described in that file as "the
most sensitive data this platform holds about its own staff", are accumulating
indefinitely against a documented 7-day retention promise.

Setting `CRON_SECRET` in Vercel (Production + Preview) closes the open endpoint
and starts the retention job. Worth also making `expire-payments` fail closed to
match its sibling, so a missing secret can never silently disarm it again.

### 2. Push notifications are inert in production

The seven `NEXT_PUBLIC_FIREBASE_*` client variables are set, but
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` and
`NEXT_PUBLIC_FIREBASE_VAPID_KEY` are **not**. `getFirebaseAdmin()` returns
`null` without all three admin values, so `getMessaging()` returns `null` and
every send silently no-ops. Without the VAPID key no browser can register for a
token in the first place.

`docs/09-operations.md` previously flagged this as "verify against the live
Vercel config" — now verified: they are absent. Push notification code is
shipped but dead.

### 3. `ADDITIVE_SCHEMA_SYNC` is still set

It was added 4 days ago to Production **and Preview**. The runbook says to set
it for one deploy and unset it immediately. Its value is Sensitive so it cannot
be read back — if it is `true`, every production deploy is running
`prisma db push` against the live database. Confirm and remove it.

### 4. Rate limiting is per-instance

`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are not set, so the
documented "5 login attempts / 15 min" limit is really 5 × the number of warm
Lambdas, and it resets on every cold start. Adding both variables fixes it with
no code change.

## Preventing a third occurrence

`.gitignore` matched `.env*`, which silently swallowed `.env.example` as well.
That is why a machine reset left no committed record of what this app needs —
the template that `docs/09-operations.md` referenced had never actually been
tracked in git. Fixed with an explicit negation:

```gitignore
.env*
!.env.example
```

Beyond that: keep one offline copy of `JWT_SECRET` and `ENCRYPTION_KEY` in a
password manager. Sensitive-flagged Vercel variables are unreadable **to you**
as well as to an attacker, and this project has no other backup of them.
