# WORKLOG — living state of the project

**Read this first if you are an AI assistant or a new contributor picking this
project up.** It is the running record of what has been changed, why, what was
deliberately *not* changed, and what to do next. It is maintained by hand and
must be updated in the same change as any structural work.

- **Project**: HimalHub / HimaVolt — multi-tenant hospitality SaaS for Nepal
- **Status**: **LIVE IN PRODUCTION** on Vercel, real users, real payments
- **Stack**: Next.js 16 App Router · React 19 · Prisma 7 · PostgreSQL/Supabase · TypeScript strict
- **Reference docs**: [`docs/README.md`](README.md) indexes nine documents
- **Last updated**: 2026-08-17 (Demo prompt now waits for setup — it fires only once the operator owns a restaurant (`hasFetched && restaurants.length > 0`), not on the first signed-in page load, and moved inside `RestaurantProvider` to read that. Also portalled to `document.body`: it was the only modal in the codebase that was not, which is the likely cause of its buttons not responding. /demo verified in-browser this time — locked rows carry `videoUrl: ""` over the wire, the card modal opens portalled with PiP, and closing restores scroll.)
- **Previously**: 2026-08-17 (/demo rebuilt around the grid — the permanent hero stage is gone, cards open a modal player carrying the existing controls including PiP and fullscreen. Members-only videos are now listed rather than filtered out: they arrive with `videoUrl`/`embedId` blanked and `locked: true`, and their card is a real link to `/sign-in`. The gate is that blanking, not the overlay. `tsc` clean, eslint clean. **Not verified in-browser.**)
- **Previously**: 2026-08-17 (Tutorial videos are now editable after publish — a portalled edit modal over every field, media replacement that also replaces the metadata describing it, and trim in/out points applied during the existing compression pass. Multi-clip assembly deliberately not attempted; see docs/11. `tsc` clean, eslint clean. **Not verified in-browser — admin needs a password login.**)
- **Previously**: 2026-08-17 (Tutorial videos. A master-admin-authored walkthrough library at `/demo`, with in-browser compression for uploads, YouTube/Vimeo embeds, a "Watch video" control in the dashboard header, and a one-time post-signup prompt. Two additive tables — `tutorial_categories`, `tutorial_videos` — and two new enums. **Deploy schema before this code.** Note `/demo` previously held a "Book a Demo" stub, now moved to `/demo/book` with its CTAs repointed. `tsc` clean, eslint clean, `next build` compiles.)
- **Previously**: 2026-08-15 (**Restaurants tab rebuilt as an operator ledger** — chart and gradients out, every action always visible instead of behind an expand, ~3 businesses per screen to ~10, and system-speak copy ("Wipe Node") replaced with what people actually control. Signature: a trading spine splitting `isActive` from `isOpen`, two facts the old "Active" pill collapsed into one. Status filter was a dead control with no setter; now real. **Not verified visually — admin needs a password login.**)
- **Previously**: 2026-08-15 (**Platform roles rebuilt on one catalogue** — 27 permissions with plain-language descriptions and risk notes, in `src/lib/platform-permissions.ts`, read by both the role builder and the guards. Fixes two vocabularies that never matched, two permissions that could never be granted, and **24 admin routes that had no permission check at all** — a read-only role could delete payments and rewrite gateway credentials. Roles are now editable. **Existing platform-staff roles need reviewing after deploy; master admin is unaffected.** Resolves open item 46.)
- **Previously**: 2026-08-15 (**Share button could crash the browser** — it called `navigator.share()`, a native OS flyout, on desktop; a `try`/`catch` cannot protect against that, which is how the fault was located. Same handler also called `navigator.clipboard` unguarded, which throws on non-secure LAN origins. New `src/lib/share.ts`; fixed at all three call sites. See open item 48 for the 15 remaining unguarded clipboard sites.)
- **Previously**: 2026-08-15 (**Two public-marketplace bugs, both measured**: `/nearby` blocked every rail behind a 1906ms IP lookup — `coords` is now seeded synchronously so the nearby query starts at 663ms instead of 2215ms; and `menu/[slug]/loading.tsx` returned `null`, painting a blank white page for the ~2s the server spent on two prefetches. Also fixed a latent hang in `useNearby` that could pin the browse page on skeletons forever. No schema change. `tsc`/`build:local`/eslint clean.)
- **Previously**: 2026-08-14 (**Master admin opens the real owner dashboard for any business** — an impersonation session makes `getAuthUser()`/`getOrCreateUser()` resolve as that restaurant's owner, so the whole existing dashboard works unmodified. **This is a branch at the top of the app's main auth function** — read `docs/03-auth-and-access.md` before touching it. Two matching cookies required, 1h expiry, fails closed (proven in-browser), scoped restaurant list, permanent banner, audited start/stop. No schema change. `tsc`/`build:local`/eslint clean. **No real session was opened — local `.env` points at the live prod DB.**)
- **Same day, earlier**: 2026-08-14 (**Master-admin management console** — full CRUD over any business: profile/branding/slug/owner, menu, categories, tables, staff (incl. PIN reset) and rooms, behind one new guard that also closes a tenant-scope hole in the three pre-existing admin sub-routes. 12 admin routes, 1 new component, 1 new lib. No schema change. Also fixed a real layout bug: admin overlays were trapped in the tab wrapper's Framer Motion transform, so `position: fixed` resolved against it instead of the viewport — three modals now portal to `document.body`. `tsc` clean, `build:local` clean, eslint clean. **The authenticated console was not driven — local `.env` points at the live prod DB.** New open items 46 and 47.)
- **Earlier same day**: 2026-08-14 (Menu image search repaired — Openverse, Wikimedia and Pexels were all failing at once, so dish-photo suggestions and the picker's Web Search tab both returned nothing. Results are now restricted to food and drink, and suggestions no longer stop working when a dish is renamed. **`PEXELS_API_KEY` is rejected by the API and must be rotated — open item 45.** No schema change. `tsc` clean, `build:local` compiles, eslint clean.)
- **Before that**: 2026-08-13 (Unified Orders & Billing on the dashboard — the one surface that ignored the existing `mergeBillingOrders` flag — plus order-type-aware print-on-accept, a provisional pre-bill document, and instant auto-accept. Two additive `@default(false)` columns: `Restaurant.printAutoBillOnAccept`, `RestaurantCapability.autoAcceptOrders`. **Deploy schema before this code.** `tsc` clean, `build:local` compiles, eslint clean.)

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
| Prisma models | 53 |
| API route files | 209 |
| Page routes | 51 |
| Components | 183 |
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

### 2026-08-17 — Tutorial videos: /demo, master-admin authoring, browser compression

**Why**: Owners had no moving-picture explanation of the product. Written docs
exist at /guide, but a restaurant owner setting up a POS at 9am wants to watch
someone do it, not read about it.

**What**: A platform-wide video library authored by MASTER_ADMIN only, surfaced
in three places — the landing-page nav, a "Watch video" control in the dashboard
header on every page, and a one-time prompt at the end of signup.

Two source types: uploaded files (Supabase, 50MB cap, compressed in-browser) and
YouTube/Vimeo links (adaptive streaming, click-to-load facade). Per-video
audience: PUBLIC or AUTHENTICATED.

**Schema**: two additive tables (`tutorial_categories`, `tutorial_videos`) and
two new enums (`TutorialSource`, `TutorialAudience`). **Deploy schema first —
Mode 2 — then unset the flag.**

**Notable**:
- `requireMasterAdmin()` added. `requireAdmin()` also admits PLATFORM_STAFF,
  which is wrong for content published publicly under the HimaVolt name.
- `next.config.ts` had **no `frame-src`** directive, so `default-src 'self'`
  applied and any provider iframe was blocked outright. Added with this change.
  A third embed provider means editing that directive too.
- Compression is client-side because Vercel Hobby cannot transcode (4.5MB body
  limit, 60s ceiling). It is a re-encode, not lossless; it runs in real time;
  and the UI states both rather than hiding them.
- `DemoPromptModal` waits for `hasPassword !== false` so it queues *after*
  `AccountSetupModal` without the two components knowing about each other.

Full detail: [`11-tutorial-videos.md`](11-tutorial-videos.md). `tsc` clean,
eslint clean, `next build` compiles (119/119 pages).
### 2026-08-15 — Restaurants rebuilt as an operator ledger

**Branch**: `other-fixes` · **Base**: `d211729`

**Why**: the Restaurants tab was styled like a marketing page and worked like
one. Brief: no gradients, no charts, easy access to everything.

**What was wrong, beyond the decoration:**

- A **recharts bar chart** ("Market Presence") took the top third of the screen
  and answered no question an operator has.
- **Every action sat behind an expand-click.** Acting on a venue cost two
  interactions, and only one venue could be open at a time.
- **`rounded-[2.5rem]` cards fitted about three businesses on screen** out of a
  page of thirty.
- **Copy described the system, not the thing.** "Node Directory", "Wipe Node",
  "Initialize Node", "Physical Origin", "Catalog Size". A restaurant is not a
  node, and the owner reading a support call transcript is not helped by it.
- **A dead control**: `activeFilter` existed in state with **no setter**, so the
  status filter was wired to the API and could never be used.

**The one structural idea: the trading spine.** `isActive` (listed on the
platform) and `isOpen` (taking orders right now — the staff-controllable
override) are different facts that the old "Active" pill collapsed into one, so
*delisted* and *closed for the night* looked identical. They are now a single
colour-coded edge on each row — trading / closed now / delisted — which means
the health of the whole page reads in one vertical pass. `isOpen` was already in
the payload (the list route uses `include`, not `select`) and simply unused.

**Everything else is restraint**: existing tokens only, because this is one tab
of twenty and a bespoke palette would fight the rest of the panel;
`--accent` reserved for the single primary action per row so it means "this is
the button" rather than being ambient; monospaced tabular numerals for every
count so figures compare down the column without being read; a ledger with real
columns on desktop that reflows to stacked blocks below `lg`. **No entrance
animation** — thirty staggered rows is the thing that makes a list feel slow.

**Also**: status filter made real, "Clear filters" when any are active, an empty
state that says which case it is and offers the way out, errors surfaced instead
of swallowed (`catch {}` on delete previously failed silently), `aria-label` and
`title` on every icon button, and `focus-visible` rings throughout.

**Verified**: `tsc` clean · `build:local` clean · eslint clean (2 pre-existing
`exhaustive-deps` warnings). Confirmed no `gradient` and no chart import remain
in the file, and that recharts is still used by five other components so the
dependency stays. Grepped the **built CSS** to confirm every layout class was
actually generated — `lg:w-16/14/12/32`, `lg:contents`, `tabular-nums`,
`focus-visible:ring-2`.

> A Tailwind hazard caught during the build: `Metric` first composed its width
> as `` `lg:${width}` ``. Tailwind scans source for **whole** class names, so a
> class assembled from fragments is never generated and the columns would have
> silently collapsed. `width` is now passed as a complete literal (`"lg:w-16"`).

**Not verified visually.** The admin panel needs a password login, and a
throwaway preview route was redirected by middleware to `/sign-in`. Layout was
checked by measurement and by the generated-CSS grep, not by eye — **worth a
look on the real page.**

### 2026-08-15 — Platform roles: one catalogue, and 24 routes that finally check it

**Branch**: `other-fixes` · **Base**: `5789861`

**Why**: the role builder needed to cover everything master admin can now do.
Auditing what the routes actually enforce turned up three faults, each worse
than the last. **Resolves open item 46.**

**1. Two vocabularies that never matched.** `RolesTab` offered
`restaurants.view` / `restaurants.manage`; the API checked `tenants.view` /
`tenants.update` / `tenants.suspend`. A role granted "Manage Restaurants"
through the UI was rejected by the very routes it was meant to unlock.

**2. Two permissions could not be granted at all.** `attendance.manage` is
required by the attendance and leave-request routes, and `tenants.suspend` by
business deletion — neither appeared in the builder, so no role could ever hold
them. Those routes were unreachable for every platform staff member.

**3. The serious one: 24 admin routes had no permission check.** They called
bare `requireAdmin()`, which accepts **any** admin session including the
narrowest PLATFORM_STAFF role. A "read-only support" account could delete
payments, settle hardware commission, change the payout method money is sent
to, and rewrite the eSewa/Khalti gateway credentials.

**Changed**:

- **New [`src/lib/platform-permissions.ts`](../src/lib/platform-permissions.ts)** —
  **27 permissions across 6 groups**, each with a plain-language description of
  what the holder can *do*, plus a `danger` flag and a note explaining the risk.
  Both the UI and the guards read this file, so they cannot drift again.
  `permissionsInclude()` resolves legacy spellings, so roles stored with
  `restaurants.manage` keep working and are folded to canonical form when next
  edited.
- **`requireAdmin(permission?)`** now takes an optional permission (it reads
  `cookies()`, so this avoided changing 24 handler signatures) and re-checks
  `platformStaff.isActive` so deactivation takes effect immediately rather than
  whenever the 12h token expires. **All 24 routes now name a permission** —
  wired deterministically, GET and DELETE separately where they differ
  (`payments.view` vs `payments.manage`, `users.view` vs `users.manage`,
  `tenants.view` vs `tenants.features`, …).
- **New `tenants.impersonate`**, required by `POST /api/admin/impersonate`.
  Opening an owner's dashboard was riding on `tenants.update` — the same
  permission as editing a menu — despite being strictly more powerful.
- **`PATCH` and `DELETE /api/admin/platform-roles`.** Roles could previously
  only be created, never changed, so adding a new permission to an existing role
  meant rebuilding it and reassigning every staff member. Writes are validated
  against the catalogue: an unknown id is rejected rather than stored, since a
  permission nothing checks is worse than none — the role looks like it grants
  something and silently does not. DELETE refuses while staff are still assigned.
- **`RolesTab` rebuilt** from the catalogue: grouped by area, every permission
  showing its description, sensitive ones badged with their risk note,
  select-all per group, a live "n of 27 selected · n sensitive" counter, plus
  **edit and delete**. Role cards flag any stored id the catalogue no longer
  recognises.
- **`PlatformStaffTab`** now shows what each person can actually do, as labelled
  chips — a role name alone means nothing without opening another tab to decode
  it.

> ⚠️ **Read before deploying.** Tightening 24 routes means an existing
> PLATFORM_STAFF role that never held these permissions **will lose access to
> those screens**. MASTER_ADMIN is unaffected — it bypasses every check. Open
> Roles, edit each existing role, and tick what its holders actually need. The
> builder now lists everything, so this is a one-pass job.

**Verified**: `tsc --noEmit` clean · `build:local` clean · eslint clean on
changed files (the one `no-explicit-any` in `PlatformStaffTab` is pre-existing,
confirmed against the untouched file). Cross-checked that **every permission
string any route requires exists in the catalogue**, and that no bare
`requireAdmin()` remains under `src/app/api/admin`.

**Not exercised**: the role builder in a browser, and the effect of the new
checks on a real PLATFORM_STAFF account — both need a master-admin password
login against the live production database.

### 2026-08-15 — The share button could take the browser down with it

**Branch**: `other-fixes` · **Base**: `da5507c`

**Why**: reported as "clicked share, it crashed the entire site and closed the
browser" from the dish popup on desktop.

**The reasoning that located it.** The whole handler body was already wrapped in
`try { … } catch {}`. **No JavaScript error inside it can propagate** — so
whatever killed the tab could not have been our code throwing. That leaves the
one thing in the handler that is not JavaScript: the native call.

```ts
if (navigator.share) await navigator.share({ title, url });   // ← native OS call
```

On desktop Windows `navigator.share` exists and opens the **Windows share
flyout** — an OS surface outside the browser's control, and a known source of
renderer crashes. `try`/`catch` offers no protection against it. The Web Share
API is a phone affordance that was being invoked on every platform that merely
*had* the method.

**A second, provable bug in the same handler.** The non-share branch called
`navigator.clipboard.writeText(url)`, but **`navigator.clipboard` is `undefined`
outside a secure context** — which is how staff reach the dashboard over the
venue LAN (`http://192.168.x.x:3000`). Demonstrated live against a non-secure
origin:

```
isSecureContext=false  navigator.clipboard=undefined
OLD navigator.clipboard.writeText -> THREW: TypeError: Cannot read properties of undefined (reading 'writeText')
```

Swallowed by the empty `catch`, so the button was simply **dead and silent** on
those origins.

**Changed** — new [`src/lib/share.ts`](../src/lib/share.ts), one helper both
share buttons now use:

- `navigator.share` is called **only on a coarse-pointer, no-hover device** —
  a phone. Desktop never reaches the native path at all. Deliberately
  conservative: a false negative just copies the link, a false positive risks
  the crash.
- `copyToClipboard()` optional-chains `navigator.clipboard?.writeText` and falls
  back to an off-screen `<textarea>` + `execCommand("copy")`, which still works
  on `http://` LAN origins.
- Returns `"shared" | "copied" | "failed"` instead of throwing, so **no outcome
  is silent** — a failure now says "copy it from the address bar" rather than
  looking broken. A dismissed share sheet counts as `"shared"`, so cancelling
  does not dump the link on the clipboard uninvited.

Applied at **three** call sites — the reported one plus two that had the identical
defect:

| Site | Was |
| --- | --- |
| [`FoodDetailPopup`](../src/components/food/FoodDetailPopup.tsx) | the reported crash |
| [`food/[id]/page.tsx`](../src/app/food/[id]/page.tsx) | **a verbatim copy of the same handler** — and it is the page the share link points *to*, so the crash was one hop further along |
| [`QRCodesTab`](../src/components/dashboard/QRCodesTab.tsx) | bare unawaited `navigator.clipboard.writeText`, and it showed "link copied!" *before* attempting the copy — a toast that lied on every LAN-opened dashboard |

Also added the missing `type="button"` to the three share buttons; as bare
`<button>` elements they default to `type="submit"` and would post any enclosing
form.

**Verified**: `tsc --noEmit` clean · `build:local` clean · eslint clean on changed
files (one pre-existing `no-img-element` warning). In-browser on a genuinely
non-secure origin: the old call throws exactly as quoted above, and
`matchMedia("(hover: none) and (pointer: coarse)")` is `false` on desktop,
confirming the native share path is now unreachable there.

**Not reproduced**: the crash itself. The in-app browser has no `navigator.share`,
so the Windows flyout cannot be triggered from here. The fix removes the call on
desktop rather than proving the platform bug.

### 2026-08-15 — Browse waited on an IP lookup; tapping a restaurant showed nothing

**Branch**: `other-fixes` · **Base**: `da5507c`

**Why**: two reports on the public marketplace — `/nearby` sat on empty
skeleton cards, and tapping a restaurant showed a blank white page. Both turned
out to be real, both were measured rather than guessed, and neither was the
database being slow.

**1. `/nearby` — a serial waterfall behind geolocation.**

`LocationContext` started `coords` at `null` and only filled it after
`/api/geoip` answered. `useNearby` opens with `if (!coords) return`, so **every
rail on the marketplace was blocked behind an IP lookup**. Measured on the dev
server:

| | before | after |
| --- | --- | --- |
| `/api/geoip` | starts 297ms, takes **1906ms** | unchanged (no longer blocking) |
| `/api/public/nearby` | could not start until **2215ms** | starts **663ms** — *before* geoip returns |

`coords` is now **seeded synchronously** on the first render — from
`localStorage` for a returning visitor, otherwise Kathmandu, which is the city
the default `label` already claimed. The IP guess became a refinement that only
moves the origin if it lands >~5km away, so a correct guess no longer makes
every rail re-fetch to shift a few hundred metres. A saved location now skips
`/api/geoip` **entirely** (verified: the request is never issued).

> Only `coords` is seeded. `label`, `source` and `resolving` are all rendered, so
> seeding those from `localStorage` would make the client's first paint disagree
> with the server's and trip a hydration mismatch. They stay in the effect.

**A latent hang, fixed on the way past.** `useNearby` starts `loading: true` and
its early return never cleared it — so *any* path where `coords` stayed null
pinned the browse page on skeletons **forever**, with no error and no empty
state. That is what the report looked like. It now clears `loading`, so the
worst case is the real empty state ("Nothing matches here yet"), verified by
pointing a saved location at Pokhara, where there is no inventory.

**2. Tapping a restaurant — `loading.tsx` returned `null`.**

[`menu/[slug]/page.tsx`](../src/app/menu/[slug]/page.tsx) awaits two prefetches
(restaurant + menu) before it can render, each a round-trip to a remote database
(measured 1706ms and 1489ms). Its `loading.tsx` returned `null` — a deliberate
"no visible skeleton" — so that entire window painted **literally nothing**. A
blank white page for ~2s reads as a broken link, not as loading.

`loading.tsx` now renders the *same* spinner `MenuPageClient` shows for its own
loading state, so the handover is seamless rather than a second visual change.
Measured on a client-side tap from the browse grid: **"Loading menu…" at 408ms**,
content at ~2s. Previously: nothing at all until the HTML landed.

**Deliberately not changed**: the SSR prefetch itself. Removing it would ship
HTML instantly but push the menu to a client round-trip and lose the
server-rendered content — a bigger, riskier trade than the reported bug needs.
`StoreCard` already uses `next/link`, so production also gets route prefetch on
hover/viewport, which dev does not.

**Verified**: `tsc --noEmit` clean · `build:local` clean · eslint clean on the
changed files. In-browser against the running dev server, cold and returning
visitor, plus a far-away saved location for the empty-state path. **Note the one
pre-existing eslint error in `LocationContext` (`react-hooks/set-state-in-effect`,
the saved-location branch) — confirmed present on the untouched file, left
alone.** Fixing it properly means seeding rendered fields, which is the hydration
trade-off above.

**Known trade-off**: a first-time visitor outside the Kathmandu valley sees
Kathmandu results for the ~0.4–2s until the IP guess corrects the origin. The
header reads "Finding you…" throughout that window, so the UI is not claiming
otherwise, and the alternative was the blank-skeleton wait this entry fixes.

### 2026-08-14 — Master admin opens the real owner dashboard for any business

**Branch**: `other-fixes` · **Base**: `da5507c`

**Why**: the management console added earlier the same day covered profile, menu,
tables, staff and rooms — but that is a fraction of what an owner has. Support
needs the *whole* dashboard: analytics, reports, billing, POS, inventory,
coupons, hotel hub, every feature tab, exactly as the owner sees it. Rebuilding
~50 tabs inside the admin panel was never the answer.

**The one idea this rests on.** Every owner route and dashboard server component
resolves its caller through `getAuthUser()` / `getOrCreateUser()` and then checks
`restaurant.ownerId === user.id`. So instead of teaching ~50 routes about a
second kind of caller, **an impersonation session makes those two functions
return the owner of one specific restaurant**. The entire owner dashboard then
works with no changes to it at all.

> ⚠️ **This is a branch at the top of the app's main auth function.** It is the
> highest-blast-radius change in this log. Read
> [`03-auth-and-access.md`](03-auth-and-access.md#and-one-modifier-admin-impersonation)
> before touching `src/lib/auth.ts` or `src/lib/impersonation.ts`.

**Changed**:

- **New [`src/lib/impersonation.ts`](../src/lib/impersonation.ts)** — signs and
  verifies the session, and resolves the owner. `cache()`d, so one verify + one
  scope query per request however many times auth is resolved.
- **`src/lib/auth.ts`** — a three-line branch at the top of each resolver.
- **New [`GET/POST/DELETE /api/admin/impersonate`](../src/app/api/admin/impersonate/route.ts)** —
  start (through the same `requireAdminForRestaurant` guard as every other
  act-on-behalf route), describe, end. Both ends audited via two new
  `AuditAction`s.
- **`AuthContext`** — an impersonating admin has no Supabase session, so the
  identity effect now has two mutually exclusive paths: marker cookie present →
  resolve from `/api/me` and synthesise the user object the dashboard reads;
  otherwise → the existing Supabase path, untouched. `signOut()` during a
  session ends impersonation and returns to `/admin`. New `isImpersonating` on
  the context.
- **`GET /api/me`** now also returns `id` and `imageUrl` (both already visible to
  that caller) — what the synthesised user is built from.
- **`GET /api/restaurants` is scoped to the impersonated restaurant.** Without
  this the admin would get the owner's whole portfolio and could switch to a
  sibling business through the sidebar picker, outside the grant that was
  authorised and audited. It also guarantees the dashboard selects the business
  that was actually clicked rather than whatever `himavolt:selectedRestaurantId`
  holds in localStorage.
- **New [`ImpersonationBanner`](../src/components/admin/ImpersonationBanner.tsx)**,
  mounted in the **dashboard** layout (which became a flex column to seat it).
- **`AllRestaurantsTab`** — "Open Owner Dashboard" is now the primary action; the
  earlier console is kept as **"Quick Edit"**, which is genuinely faster for a
  one-field correction. Entering clears `clearAllResourceSnapshots()` and the
  stored restaurant id, so a leftover snapshot from another business can't paint
  for a frame.

**Two edge cases worth knowing**: an owner whose DB role is still `CUSTOMER`
(the `CUSTOMER → OWNER` upgrade happens on sign-in, which impersonation
short-circuits) is reported as `OWNER` **in memory only** — otherwise support
would land on the customer dashboard. And a deleted or blacklisted owner
resolves to `null`, so impersonation is never a route around a block.

**Verified**: `tsc --noEmit` clean · `build:local` clean, `/api/admin/impersonate`
compiled · eslint clean on new files (4 warnings, all pre-existing). In-browser
against the dev server:

- Both impersonation endpoints 401 unauthenticated.
- **Fails closed, proven**: with a forged `admin_impersonation_active=1` marker
  *and* a garbage `admin_impersonation` cookie, `/api/site-settings` and the
  server-rendered `/hotels` returned **byte-identical results** to a clean
  request (200/200), before and after. No server errors, no console errors. The
  marker cookie carries no authority, as designed.

**Not exercised**: an actual impersonation session. It requires the
`MASTER_ADMIN_PASSWORD` typed into the admin login, and the local `.env` points
at the **live production database** — so opening a session would mean acting as
a real owner on real data. **Before trusting this: sign in, open one throwaway
business, confirm the amber banner names the right venue, walk a few tabs, and
press Exit.** The security properties are proven; the happy path is not.

**Deliberately not changed**: which routes accept an impersonated identity. While
a session is live the admin *is* that owner everywhere, including the owner's
personal profile. Narrowing it would mean per-route work across the whole app and
would defeat the point of reusing the real dashboard. The mitigations are the
1-hour expiry, the permanent banner, the scoped restaurant list, and the audited
start/stop.

### 2026-08-14 — Master admin can now run any business end to end

**Branch**: `other-fixes` · **Base**: `da5507c`

**Why**: Master admin could *see* every business and *add* products to one, but
could not fix anything. A wrong restaurant name, a wrong logo, a mispriced dish,
a missing table, a staff member locked out of their PIN — all of it needed the
owner to log in and do it themselves, which is exactly the support call the
platform exists to absorb. Master admin is meant to be the universal guardian of
every owner; it was read-mostly.

**Changed — a full management console, plus the guard it stands on.**

**1. One guard for every act-on-behalf route.**
[`admin-restaurant-guard.ts`](../src/lib/admin-restaurant-guard.ts) —
`requireAdminForRestaurant(req, restaurantId, permissions)` verifies the admin
JWT, checks permissions, re-checks that a PLATFORM_STAFF account is still active
in the DB, enforces its **tenant scope**, and loads the restaurant row that the
handler and its audit line both need. It returns either the access context or
the `NextResponse` to return, so every handler is a two-line guard.

> ⚠️ **This closes a real hole.** The pre-existing admin sub-routes
> (`.../menu`, `.../categories`, `.../rooms`) called bare `requireAdmin()`, which
> accepts **PLATFORM_STAFF as well as MASTER_ADMIN** — so a scoped platform staff
> member could write to *any* restaurant. Scope was only ever enforced on
> `/api/admin/restaurants` (list/delete). Those three routes are migrated to the
> new guard; the eight new ones use it from the start.

**2. Twelve admin routes under `/api/admin/restaurants/[id]/…`**, each mirroring
the owner route it shadows so request shapes stay identical, and each audited
with `metadata.by` naming the actual actor (`master_admin` or
`platform_staff:<id>`) rather than the owner:

- **[`GET/PATCH /`](../src/app/api/admin/restaurants/[id]/route.ts)** — the
  business itself: name, slug, type, currency, phone, address, city, lat/lng,
  logo, cover, hours, WiFi, tax and service charge, pay modes, availability, and
  **owner reassignment**. Writable columns are an explicit allow-list; a slug
  change is collision-checked up front (409, not a raw P2002) because it breaks
  every printed QR; a blank name is rejected.
- **[`GET/POST .../menu`](../src/app/api/admin/restaurants/[id]/menu/route.ts)** —
  GET is new and deliberately returns *unavailable* dishes too, which the public
  owner-side GET hides; support has to see what it is fixing.
- **[`PATCH/DELETE .../menu/[itemId]`](../src/app/api/admin/restaurants/[id]/menu/[itemId]/route.ts)**
- **[`GET/POST/PATCH/DELETE .../categories`](../src/app/api/admin/restaurants/[id]/categories/route.ts)** —
  DELETE keeps the owner route's two-step contract: without `?confirm=true` it
  reports how many dishes and sub-categories would go with it.
- **[`GET/POST .../tables`](../src/app/api/admin/restaurants/[id]/tables/route.ts)**
  (bulk `count` for standing up a venue) and
  **[`PATCH/DELETE .../tables/[tableId]`](../src/app/api/admin/restaurants/[id]/tables/[tableId]/route.ts)**
- **[`GET/POST .../staff`](../src/app/api/admin/restaurants/[id]/staff/route.ts)**
  and **[`PATCH/DELETE .../staff/[staffId]`](../src/app/api/admin/restaurants/[id]/staff/[staffId]/route.ts)** —
  role, staff type, suspend, rename, regenerate QR badge, and **PIN reset**. PINs
  stay hashed and are returned exactly once, as on the owner route; the audit
  line records *that* a PIN was issued, never the PIN.
- **[`GET/POST .../rooms`](../src/app/api/admin/restaurants/[id]/rooms/route.ts)**
  and **[`PATCH/DELETE .../rooms/[roomId]`](../src/app/api/admin/restaurants/[id]/rooms/[roomId]/route.ts)** —
  delete is soft (`isActive: false`), matching the owner route, so booking
  history stays resolvable.

Two destructive edges refuse rather than break live service: deleting a table
with an **active session** returns 409, and removing a room with a
PENDING/CONFIRMED/CHECKED_IN **booking** returns 409.

Every admin sub-route re-reads the target row scoped to the restaurant in the
URL (`findFirst({ where: { id, restaurantId } })`) before writing. The owner
routes can skip this — their session *is* the tenant. An admin session is not,
so a mismatched pair would otherwise be an unguarded cross-tenant write.

**3. The console.**
[`RestaurantManagerModal`](../src/components/admin/RestaurantManagerModal.tsx),
opened by a new **"Manage Everything"** button on each row of
[`AllRestaurantsTab`](../src/components/admin/AllRestaurantsTab.tsx). Five
sections — Business, Menu, Tables, Staff, and Rooms (stays only, driven off the
live type field so switching a venue to HOTEL reveals it immediately). The
Business form batches into one PATCH with a dirty count and a discard; the list
sections write per row. Images upload through the existing `/api/upload` signer,
which already accepts the master-admin JWT.

**4. Nine audit actions added** to `AuditAction`: `CATEGORY_UPDATED`,
`CATEGORY_DELETED`, `TABLE_CREATED/UPDATED/DELETED`, `ROOM_CREATED/UPDATED/DELETED`.

**5. Every admin overlay is now portalled — a real layout bug, not a polish pass.**
The first run of the console rendered wrong: the top of the panel was clipped off
screen and the sidebar stayed undimmed behind it.

**Cause**: admin tab content is wrapped in a `motion.div` that animates `y`
([`admin/page.tsx:661`](../src/app/admin/page.tsx)). **Framer Motion leaves a
`transform` on that element even at rest**, and a transformed ancestor becomes
the containing block for `position: fixed`. So `fixed inset-0` resolved against
the tab wrapper, not the viewport.

Measured in the browser against the running app, reproducing the exact symptom:

| | backdrop rect | |
| --- | --- | --- |
| inside the transformed wrapper | `900×400 @ (287, 720)` | starts where the sidebar ends; top below the fold |
| portalled to `document.body` | `1265×720 @ (0, 0)` | full viewport |

Confirmed separately that a settled framer-motion element on the login page
carries `transform: matrix(1, 0, 0, 1, 0, 20)` — the transform is not cleared
when the animation finishes.

**Fixed** in `RestaurantManagerModal`, `RestaurantFeatureOverridesModal` and
`DeleteConfirmDialog` (all three are rendered from inside a tab, all three had
it) by portalling to `document.body` with the codebase's existing lint-clean
guard, `if (typeof document === "undefined") return null` — the same pattern as
`DashboardSidebar` and `AnchoredMenu`. Note that `useEffect(() => setMounted(true), [])`,
the other portal idiom in this repo (`FoodDetailPopup`), now **fails eslint**
under `react-hooks/set-state-in-effect`; use the `typeof document` guard.

Because the portal escapes the admin layout wrapper that sets the panel's text
colour inline, each portalled panel now carries an explicit
`text-[var(--text-1)]`. Overlay z-index moved to `z-[100]`/`z-[110]` so the
confirm dialog stacks above the console, and Escape now closes the console.

> ⚠️ **Anything `position: fixed` rendered from inside an admin tab must be
> portalled.** `HardwareTab` (2 overlays) and `PlatformStaffTab` (3) still have
> this bug — see open item 47.

**Verified**: `tsc --noEmit` clean · `build:local` clean, all **12** admin
restaurant routes compiled · eslint clean on the new files (the two warnings in
`AllRestaurantsTab` are pre-existing). Against the dev server, all **19**
endpoint/method pairs return 401 unauthenticated, and `/admin` renders with no
JS errors.

**Not exercised**: the authenticated console. Signing in needs the
`MASTER_ADMIN_PASSWORD` typed into the login form, and the local `.env` points at
the **live production database** — so no create, edit or delete was ever run
against a real business. The writes are proven by compilation and by mirroring
owner routes that are known to work, not by execution. **Drive one throwaway
business through all five sections before trusting this in support.**

**Deliberately not changed**: the owner and staff routes under
`/api/restaurants/[id]/…` — mirroring keeps the hot path untouched, which is the
existing convention for admin act-on-behalf routes. `requireAdmin()` and
`src/lib/require-admin.ts` still exist for the admin routes that are not
restaurant-scoped. The permission-id mismatch in `RolesTab` is worked around, not
fixed — see open item 46.

### 2026-08-14 — Menu image search: three dead providers, and a food-only filter

**Branch**: `other-fixes` · **Base**: `2fc48f3`

**Why**: Owners reported that the dish-photo suggestion strip never appeared and
that the picker's Web Search tab found nothing. Both call `/api/image-search`,
and **all three of its providers were failing at once**, for three unrelated
reasons — each of them silent.

**Found first — three separate faults, none of them logged loudly enough:**

- **Openverse — every request `401`.** `page_size` was `perPage * 2` = 48.
  Openverse caps anonymous requests at **20**; asking for 21 returns
  `401 {"detail":"page_size may not exceed 20 for anonymous requests"}` rather
  than clamping.
- **Wikimedia — every result discarded.** Commons now appends
  `?utm_source=…&utm_campaign=imageinfo` to imageinfo URLs. The photos-only test
  `/\.(jpe?g|png|webp)$/` is end-anchored against the *whole* URL, so all 24
  results failed it. The provider returned an empty array while reporting success.
- **Pexels — `401 Invalid API key`.** The key in `.env` is present but rejected.
  **Not fixable in code — rotate it** at <https://www.pexels.com/api/>. See open
  item 45.

With all three down the route returned `{ images: [] }`, and both UIs render
nothing at all on empty — which is why this looked like a dead feature rather
than a broken one.

**Changed**:

- Openverse `page_size` clamped to 20, as a named constant with a comment saying
  why it must not be raised without an API token.
- Extension test now runs against the URL *pathname*; tracking params are
  stripped so they are never persisted onto the dish record.
- Pexels `401/403` now reports a rotate-the-key message and the provider is
  skipped for the rest of that instance's life instead of being retried on
  every search.
- Response gained **`degraded`** — every provider erroring is an outage, not an
  empty result set. `ImagePicker` now says the sources are unavailable rather
  than telling the owner to reword a query that was never the problem.
- **Food-only results.** A bare dish name is a terrible image query: "momo"
  returned a shiba inu and a collectible doll, "mustang" returned Ford Mustangs,
  "coke" returned Christmas ornaments and a truck crash. Queries are now biased
  at the source ("momo food dish"), which does most of the work, backed by a
  noise-keyword reject. New optional **`type=food|drink`** param, inferred from
  the query text when absent; `ImagePicker`, `DishImageSuggestions` and
  `DrinksTab` all pass it.
- Biasing can over-narrow a rare dish name, so when the biased pass yields fewer
  than 8 results the route retries **unbiased** and admits only results that
  independently read as food. `sekuwa` recovers 6 → 18; `mustang` correctly
  stays at 1 instead of refilling with cars.
- **Suggestions no longer latch off after a rename.** `DishImageSuggestions`
  took `hasImage: boolean`, so the first picked photo hid the strip permanently
  — rename the dish and suggestions never returned. It now takes `imageUrl` and
  remembers the name the photo was attached for: renaming re-opens suggestions,
  picking re-hides them.

**Verified**: `tsc` clean, `npm run build:local` compiles, eslint 0 errors. The
route handler was invoked directly against the live providers across 8 queries
(24 results for common dishes, food-only). Driven in the real dashboard: New
Dish → typed "momo" → 12 food suggestions; Web Search tab → full grid of momo
photos. The rename cycle was checked in a temporary harness (since deleted):
suggest → attach → rename → suggestions return → pick → hide again. **No dish
was saved; TOTAL ITEMS was unchanged.**

**Deliberately not changed**: the suggestion strip still stores the provider's
remote URL directly on the dish, whereas the picker's web tab crops and
re-uploads. That hotlink predates this work, and changing it would turn a
one-tap pick into a crop dialog.

### 2026-08-13 — Unified Orders & Billing on the dashboard, print-on-accept, instant auto-accept

**Branch**: `cleanup/dead-code` · **Base**: `f2c5597`

**Why**: Owners reported orders stranding in `PENDING`. Root cause is workflow,
not code: staff sit on the Billing screen while new orders pile up unaccepted on
the Live Orders screen. Two screens for one job. Asks were (1) merge them behind
a setting, (2) print the bill when staff accepts.

**Found first — half of this already existed.** `RestaurantCapability.mergeBillingOrders`
is a real column with a toggle in Owner Controls, and **`/counter` and `/kitchen`
already honour it**. Only the dashboard ignored it. So no new merge column was
added; the existing flag was wired into the surface that was missing it.

**Changed**:

- **Schema — two additive booleans, both `@default(false)`**:
  `Restaurant.printAutoBillOnAccept` and `RestaurantCapability.autoAcceptOrders`.
  Existing tenants are byte-for-byte unchanged until they toggle something.
- **Dashboard merge REVERTED — billing stays its own page.** Two earlier attempts
  (a segmented switcher, then a one-page version with billing collapsed
  underneath) were both wrong: the owner's requirement is that **Billing is not
  merged into Orders at all.** Billing is the higher-risk surface — split-bill,
  bank-proof verification, discounts, daily summary, staff report — and folding
  it into the order queue buries it. Confirmed against Restrox, where KOT prints
  at order placement and billing is a separate process with its own screen.
  `OrdersBillingTab.tsx` and `useWorkflowSettings.ts` are deleted; `buildMainNav`,
  the sidebar and the `[tab]` router are back to their original form. `/counter`
  and `/kitchen` keep honouring `mergeBillingOrders` exactly as they always have
  — that behaviour predates this work and was never touched.
  **What the owner actually wanted was printing, not merging.** See the two
  entries below.
- **Print bill on every order, on the Live Orders page.** The board had only
  Accept/Reject — there was no way to print anything from the screen staff
  actually work on, which is what "we have to go to Billing to print" meant.
  [`TableOrderBoard`](../src/components/orders/TableOrderBoard.tsx) now takes
  `onPrintBill` and renders a **Print bill** row per order inside each table
  group (rejected orders excluded — nothing to bill). The archived table/card
  views gained a **Print** button beside the existing View. Paid orders print the
  numbered receipt, everything else the provisional bill, so the document never
  misstates payment. Available always, independent of any setting.
- **Instant printing.** Printing pointed a hidden iframe at `/bill/[orderId]`,
  which booted the whole Next app inside the frame, hydrated React, fetched the
  bill, fetched feedback, then sat on a **hardcoded 600ms timer** before calling
  `window.print()` — seconds of latency for values the dashboard already held.
  New [`receipt-html.ts`](../src/lib/receipt-html.ts) builds the thermal receipt
  as one self-contained HTML string and `printReceiptInstant()` injects it via
  `srcdoc`: no navigation, no framework, no fetch, no timer, so the dialog opens
  on the click's own tick. `Bill` figures (billNo, serviceCharge, discount) were
  added to the live-orders GET **and** SSE selects so the data is in memory.
  Applied to the board's Print, the accept panel, auto-print-on-accept and the
  POS counter. `/bill/[orderId]` is untouched and remains the shareable bill.
- **Logo removed from bills.** The "Show logo" option is gone from Printing &
  Receipts, and no printout renders a logo. `Restaurant.printShowLogo` is marked
  **LEGACY** and kept — dropping a column on the live DB is a destructive deploy,
  and nothing reads the field any more. Removing it also deleted the only
  external resource the instant receipt could load, so printing no longer waits
  on an image.
- **Inline receipt on accept**: new
  [`AcceptedReceiptPanel`](../src/components/orders/AcceptedReceiptPanel.tsx)
  appears at the top of the orders list the moment an order is accepted — items,
  totals, and a **Print bill / Print receipt** button. This is the point of the
  whole change: **printing never requires opening Billing.** Figures come off the
  in-memory live order so it paints with no fetch; the printed document is still
  rendered server-side from the `Bill` record and remains authoritative. Shown on
  both accept paths (board and dine-in modal), gated on `printAutoBillOnAccept`
  so nothing changes for tenants who have not opted in.
- **`ALL` filter fixed** in [`LiveOrdersTab`](../src/components/dashboard/LiveOrdersTab.tsx).
  "All Orders" excluded rejected orders *and* any accepted order whose payment
  had completed — so accepting an order made it **disappear from the list staff
  were looking at**. It now means all orders; status changes how a row looks, not
  whether it exists. `ACCEPTED` likewise no longer hides paid orders.
- `useWorkflowSettings` was written to read the flags live from `/capabilities`
  (rather than the login-time staff-session snapshot) and then **deleted along
  with the merge it existed to serve**. If a future change needs a workflow flag
  to apply mid-shift without re-authentication, that is the pattern to bring
  back — `/counter` and `/kitchen` still take theirs from the session JWT and so
  lag until it refreshes.
- **Print-on-accept**, [`src/lib/orders/accept-print.ts`](../src/lib/orders/accept-print.ts).
  The rule: **a running table is billed once at the end, a one-shot order is
  billed at accept.** Counter/takeaway/delivery print the bill on accept; dine-in
  prints nothing new (its KOT path is untouched) and is billed from the table's
  own action. This removes the decision from staff — there is no mode to
  remember and no button that is wrong to press. Also skips room-service (folio),
  and prints the **receipt** rather than an "UNPAID" slip when payment is already
  `COMPLETED`. Wired into the dashboard round-accept, `LiveOrdersContext.acceptOrder`,
  and `POSActiveOrders` (the counter, where the bill printer physically is).
  **Not** wired into the kitchen screen — a bill printing on the kitchen roll is
  wrong, and KOT already prints there.
- **Provisional pre-bill**: `/bill/[orderId]?mode=pre` renders **without the
  `INV-` number**, stamped "PROVISIONAL — NOT A TAX INVOICE", totalling to
  "AMOUNT DUE", no feedback QR. The numbered receipt at settlement stays the one
  numbered document per sale. New `printPreBillForOrder()`; existing print
  exports unchanged.
- **Instant auto-accept** (`autoAcceptOrders`): set at creation via the existing
  `accepted` decision rather than a post-commit update, so the order is never
  briefly `PENDING` and nothing new enters the transaction. **Restricted to
  CASH/COUNTER/DIRECT and non-prepaid venues** — auto-accepting an ESEWA/KHALTI/
  BANK order whose payment only completes on the gateway callback would send
  unpaid food to the kitchen. The kitchen push is gated on `isFastPayCounterSale`,
  not `accepted`, so auto-accepted orders still reach the kitchen.
- **Guardrails**: printing fires only after the server confirms the accept (never
  off the optimistic patch, which rolls back); an 8s per-order print claim so a
  double-tap can't print twice **without** adding a spinner (accept stays
  instant); and a per-device localStorage print opt-in defaulting **off** below
  768px, so a manager accepting from their phone doesn't fire a print dialog into
  the void.
- Settings copy states the two-slip consequence out loud when
  `autoPrintBillOnAccept` and `printAutoReceipt` are both on.

**Verified**: `npx tsc --noEmit` exit 0 (run at three checkpoints);
`npm run build:local` → **Compiled successfully in 29.4s**, full route table;
`npx eslint` clean on every new and changed file. **Not** driven against the live
DB — the columns do not exist there yet (see below).

**⚠️ Deploy order — schema FIRST.** Both columns need
`ADDITIVE_SCHEMA_SYNC=true` deployed **before** this code. `/api/restaurants`
reads `Restaurant` with `include`, so the moment the client knows about a column
the database lacks, the owner's restaurant list 500s. Nothing degrades gracefully
here by design.

**Deliberately not changed**:

- **No columns added to `Bill`.** `printedAt`/`printCount` were planned for a
  "bill changed since printing" warning, then dropped: `bill: true` appears in
  ~30 queries including order creation and the public track routes, so a column
  the DB lacks would break the live payment path. Not worth it for a warning.
- **`busyOrderIds` in [`LiveOrdersTab`](../src/components/dashboard/LiveOrdersTab.tsx)
  is still dead** — the setter is unused, so the set stays empty and the Accept
  button never disables. Left alone on purpose: the owner asked for accept to
  feel instant, and the print path is now guarded independently. See Open items.
- Kitchen/waiter role gating on the merged view. The billing half keeps
  `BillingTab`'s existing gating; adding new restrictions risked removing access
  people have today.

### 2026-08-09 — Repo-wide lint/type sweep: 441 → 171 findings, no behaviour change

**Branch**: `cleanup/dead-code` · **Base**: `39fb264`

**Why**: A full audit of every `.ts`/`.tsx` file under `src/`. Starting point:
`tsc --noEmit` was already **clean (0 errors)** — there were no TypeScript
errors. The 441 findings were all ESLint, across 163 files.

**Changed** (441 → 171 findings; errors 122 → 52):

- **Dead code removed**: `_TimeAgo`, `_OrderActions` and the orphaned
  `ActionButton` in [`LiveOrdersTab`](../src/components/dashboard/LiveOrdersTab.tsx)
  (~150 lines, unreferenced — they were also the only 4 `rules-of-hooks`
  errors); `STATUS_STYLES`/`PAY_STATUS_STYLES` (HotelBookingsTab), `STAFF`
  (PackageTrackingTab), `actionLabels` (POSActiveOrders), `TAG_LENGTH`
  (encryption), `emptyState` (CartContext), `RoomType`, `bestAccuracyRef`,
  and both unused `batchAt` timestamps in [`create-order.ts`](../src/lib/orders/create-order.ts).
- **111 unused imports** stripped across 73 files via a TypeScript-AST script
  (not regex), so multi-specifier imports were rebuilt correctly.
- **11 unused catch bindings** → `catch {}` (already the codebase's idiom).
- **23 `useState` pairs** narrowed (`[, setX]` / `[x]`) or removed where dead.
- **ESLint config**: added `argsIgnorePattern: "^_"` etc. The codebase already
  used `_req` / `_orderId` / `_fresh` to mean "deliberately unused" but the
  config never honoured it. Also added `src/generated/**` to `globalIgnores` —
  the generated Prisma client was being linted (~2,200 of the original noise).
- **Hook correctness**: `useSSE` no longer references `connect` before its
  declaration (routed through a ref) and no longer writes `urlRef` during
  render; `AuditTab`/`BillingTab`/`useFeatureConfig` moved latest-value ref
  writes into commit-time effects (each ref is only read from async callbacks,
  so this is behaviour-preserving); `food/[id]` switched from a ref to React's
  documented `useState` "adjust state on prop change" pattern.
- **`BillingTab`**: memoised `summaryQueryKey` so `loadSummary`'s dependency
  list is provably correct — this un-blocked React Compiler, which had been
  bailing out of the whole component.
- **30 `any`s typed**: `catch (e: any)` → `unknown` + the codebase's existing
  `e instanceof Error ? e.message : …` idiom; icon maps → `LucideIcon`; Prisma
  filters → `Prisma.OrderWhereInput`; and `trackToken` added to `UserOrder`
  in [`orders/page.tsx`](../src/app/orders/page.tsx), which removed 5 casts.
- Escaped entities, `prefer-const`, ternary-as-statement, `require()` →
  `import`, and the two `as Function` casts in the held-orders route (now a
  named `SchemaAheadQuery<R>` that documents the ships-ahead-of-columns intent).
- `GuestSelector` in `HotelSearchHero` took a numeric prop literally named
  `children`, shadowing React's reserved prop — renamed to `childrenCount`.

**Verified**: `npx tsc --noEmit` exit 0 after every step, and
`npm run build:local` → **Compiled successfully**, full route table, exit 0.
No `.env`/DB/schema changes.

**Deliberately not changed** — these are lint opinions, not defects, and
"fixing" them mechanically on a live system is the actual risk:

- **87 × `@next/next/no-img-element`.** Converting `<img>` → `next/image`
  requires every image host in `next.config` `remotePatterns` (Supabase
  storage, Unsplash, owner-supplied URLs). A missed host is a broken image on
  a live menu. Needs a deliberate, per-surface migration.
- **33 × `react-hooks/set-state-in-effect`.** Reviewed all 33 — every one is
  effect-based sync with an external system (localStorage, SSE, POS hardware,
  async fetch). `ThemeContext` in particular *must* read `localStorage` in an
  effect or SSR hydration mismatches. Restructuring these is behavioural churn
  with no correctness gain. Rule severity is a project decision, not something
  to silently downgrade.
- **24 × `react-hooks/exhaustive-deps`.** Mostly the fetch-on-mount pattern
  where adding the named dep (`fetchOrders`, `load`) re-creates it each render
  and causes a refetch loop. Fixing needs per-site memoisation, not a blanket
  dep-array edit.
- **8 unused bindings kept on purpose** — see Open items #31.

### 2026-08-03 — Master Admin revamp: live presence, full user access, add-products, OAuth setup popup

**Branch**: `cleanup/dead-code` · **Base**: `7ae5f29`

**Why**: Four asks against the production Master Admin, plus one account-hardening
popup. **No Prisma schema change** — `hasPassword`, `phone` and `isBlacklisted`
already exist, and presence identity is ephemeral (Redis/in-memory + Vercel geo
headers), never persisted. So there is nothing to deploy schema-wise.

**1. Real-time live presence with identities.** [`lib/presence.ts`](../src/lib/presence.ts)
was rewritten from a counts-only in-memory Map into an **async** store that uses
**Upstash Redis when configured** (single hash `presence:live`, self-expiring,
read-time pruned) and falls back to the in-memory Map otherwise — same
Upstash-or-memory shape as [`lib/rate-limit.ts`](../src/lib/rate-limit.ts). Each
entry now carries an ephemeral snapshot (name/email/phone/role/city/country/current
page, and the linked `userId` for staff). [`api/presence/ping`](../src/app/api/presence/ping/route.ts)
resolves the caller's scope (still server-authoritative — the client cannot claim
to be staff/owner), tags city/country from the Vercel edge headers, and takes the
current pathname from the body; [`PresenceTracker`](../src/components/shared/PresenceTracker.tsx)
now sends `{ path }`. New [`GET /api/admin/presence/live`](../src/app/api/admin/presence/live/route.ts)
returns the enriched entries (staff enriched with their restaurant name in one
lookup). New [`LiveUsersTab`](../src/components/admin/LiveUsersTab.tsx) shows
sections **Customers (signed-in + guests) · Owners · Staff · Admins**, auto-refreshing
every 12s, click-through to the detail drawer.

> ⚠️ Middleware fix caught during verification: **`/api/presence/ping` was never in
> `PUBLIC_ROUTES`**, so anonymous guests got a 401 from middleware before the
> handler ran — anonymous presence had silently never worked. Added
> `/^\/api\/presence\/ping$/`. The handler is the source of truth for scope and is
> IP rate-limited, so making it public is safe. Verified: anonymous POST now → 200
> `{ scope: "CUSTOMER" }`.

**2. Complete access to every user (view + act on behalf — no impersonation).** New
[`GET/PATCH /api/admin/users/[id]`](../src/app/api/admin/users/[id]/route.ts): GET
returns full profile + account status + activity (recent orders, owned businesses,
staff memberships, loyalty) plus the Supabase side (last sign-in, providers); PATCH
edits name/phone/username, changes role, and **blocks/unblocks via the existing
`isBlacklisted`** (already a hard lockout in `getAuthUser`). New
[`UserDetailDrawer`](../src/components/admin/UserDetailDrawer.tsx) is the shared
right-side drawer used by Live, Users and Staff — full profile, activity, and the
act-on-behalf actions, including an **"Add product"** shortcut on each owned
business that jumps to the Products tab preselected. `AllUsersTab` gained a
"View full profile" button (drawer) and an `onOpenUser` prop; everything existing
(bulk delete, role flip, pagination) is untouched.

**3. Dedicated Staff section.** Staff are `StaffMember` rows, not `User` rows, so
they never appeared in the users list. New [`GET /api/admin/staff`](../src/app/api/admin/staff/route.ts)
(list + search + paginate, joined to user + restaurant) and new
[`AllStaffTab`](../src/components/admin/AllStaffTab.tsx); clicking a staff member
opens the same drawer via their **linked user id** (carried on the presence entry
and the staff row).

**4. Add any product on behalf of a business (menu + rooms + hardware).** New
admin-guarded write routes that mirror the owner logic so the hot owner/staff paths
stay untouched: [`POST .../menu`](../src/app/api/admin/restaurants/[id]/menu/route.ts),
[`POST .../categories`](../src/app/api/admin/restaurants/[id]/categories/route.ts),
[`GET+POST .../rooms`](../src/app/api/admin/restaurants/[id]/rooms/route.ts) (all
`requireAdmin`, category writes scoped to the restaurant, audited). New
[`AdminProductsTab`](../src/components/admin/AdminProductsTab.tsx): search a business,
then add categories/menu items (image upload via the existing `/api/upload`, which
already accepts the master-admin JWT) and, for hotels, rooms; hardware links to the
existing Hardware tab. New "Add Products" and "Live Now" + "Staff" tabs wired into
[`admin/page.tsx`](../src/app/admin/page.tsx), which now also mounts the shared
drawer and holds the products-preselect state.

**CRUCIAL — OAuth account-setup popup.** New
[`AccountSetupModal`](../src/components/shared/AccountSetupModal.tsx), mounted in
[`providers.tsx`](../src/app/providers.tsx), is a **deferrable overlay** shown to a
signed-in account with `hasPassword === false` (Google/OAuth users). It sets a
Supabase password (so they can also log in with email + password) and captures a
**phone number** (and name if missing), then `PATCH /api/me { hasPassword: true, phone, name }`.
"Remind me later" defers it 24h (localStorage); it never appears on operator
surfaces (`/auth`, `/admin`, `/pos`, `/kitchen`, `/counter`, `/staff-login`,
`/rider`). `GET /api/me` now also returns `name`/`email`/`phone`. The existing
`/auth/set-password` page and the `/auth/callback` redirect are left as-is.

**Verified**: `tsc --noEmit` 0 · `build:local` 0 (all six new routes compiled; no DB
write during build). In-browser against the dev server: `/admin` login renders with
no console errors; the three new admin GETs return 401 unauthenticated (guards
wired); anonymous presence ping returns 200 after the middleware fix. **Not
exercised in-tool** (needs a master-admin env login and a real OAuth account, which
would hit the live prod DB): the authenticated Live/Users/Staff/Products dashboards,
the act-on-behalf writes, and the OAuth popup end-to-end. Cross-instance live
presence needs Upstash configured in prod; without it, counts are a per-instance
approximation (same caveat as rate-limit).

### 2026-07-25 — One bottom nav, cart points at the cart, scrollable categories

**Branch**: `cleanup/dead-code` · **Base**: `ede2f45`

**A regression I introduced, now fixed.** `MobileTabBar` was added a few commits
ago without noticing that [`BottomNav`](../src/components/layout/BottomNav.tsx)
is already mounted in the **root layout**, so mobile had **two stacked bottom
bars**. `MobileTabBar` is deleted. `BottomNav` survives because it is the better
component: role-aware (guest, customer, owner, admin, active table session) and
route-aware (hides on dashboard, admin, kitchen, counter).

Its links were wrong for a marketplace, so those are fixed too. **"Explore"
pointed at `/menu`, which redirects to `/`** — a dead link for every logged-out
visitor. Guests now get Home / Restaurants / Stays / Offers / Sign In; the staff
login is gone from the customer bar, since a diner will never use it. Page
bottom padding moved from `pb-16 lg:pb-0` to `pb-14 md:pb-0` to match
`BottomNav`'s own 56px height and `md:hidden` breakpoint.

**The cart icon pointed at `/orders`.** That is order *history*, so tapping a
full basket showed past orders instead of the basket. The cart is
**per-restaurant** (`CartContext` stores `restaurantSlug`) and there is no global
cart page, so it now links to `/menu/<slug>` where the cart and checkout live,
and to `/nearby` when empty, with an aria-label that says which.

**Categories scroll horizontally on phones.** Nine tiles wrapped into three rows
and pushed the actual restaurant results below the fold. Now one snap-scrolling
rail that bleeds to the screen edge so the cut-off tile signals it is swipeable;
unchanged grid from `sm` up.

**Verified**: `tsc` 0, `build:local` 0. In-browser at 375px: exactly one bottom
bar reading Home / Restaurants / Stays / Offers / Sign In, no horizontal
overflow. In fresh server HTML: the category rail carries the scroll classes and
the cart renders `aria-label="Cart is empty, browse restaurants"` pointing at
`/nearby`. The final visual pass was cut short when the dev server stopped, so
the rail's rendered scroll width has not been re-measured since the last edit.

### 2026-07-25 — Stays hero, upload auth fix, /hotels was behind sign-in

**Branch**: `cleanup/dead-code` · **Base**: `7b19477`

**Two real bugs found while doing UI work, both worth reading:**

1. **`/hotels` returned 307 to `/sign-in`.** The middleware pattern was
   `/^\/hotel(\/|$)/`, which matches `/hotel` and `/hotel/<slug>` but **not**
   `/hotels` — the `(\/|$)` requires a slash or end-of-string immediately after
   "hotel", and `/hotels` has an `s` there. The entire stays discovery page has
   been behind auth. Now `/^\/hotels?(\/|$)/`. Caught only because the nav link
   added in the previous commit pointed at it and a `curl` returned 307.
2. **Master Admin could not upload images (401).** `/api/upload` accepted a staff
   JWT or a Supabase session but **not the master-admin JWT** — the fourth auth
   system, which has no Supabase user. Every other role worked, so it looked like
   a storage problem. `requireAdmin()` added to the accept list. Verified a forged
   `master_admin_session` cookie still gets 401, so the guard is unchanged.

**Stays hero, same waterfall fix as the landing hero.** It eagerly pulled **five
1920px Unsplash photographs** cross-origin and drove them with GSAP, so first
paint waited on DNS, TLS, a large image and an animation bundle. Now:

- slides come from the server as a prop, so the first `<img src>` is in the
  initial HTML where the preload scanner finds it
- `<link rel="preconnect">` to the image origin plus `<link rel="preload">` for
  the first slide, both emitted server-side
- only the first slide is in the DOM initially; the rest mount on
  `requestIdleCallback` so they compete with nothing
- crossfade is CSS opacity, not GSAP, removing a library from the critical path
  of a decorative effect
- defaults trimmed from five 1920px slides to three at 1600px `q=65`

**Verified in the served HTML**: `rel="preconnect" href="https://images.unsplash.com"`
and `rel="preload" ... as="image" fetchPriority="high"` both present; first image
reports `complete: true` at `naturalWidth: 1600`.

**Master Admin control**: `staysHeroImages` (newline-separated, up to four),
`staysHeroTitle`, `staysHeroSubtitle` added to `SiteSettings`. The uploader in
Business Info now has a list mode that **appends** rather than replacing, with a
per-slide preview under the same scrim the live hero applies.
[`lib/stays-hero.ts`](../src/lib/stays-hero.ts) resolves settings to slides and
derives the origins to preconnect to.

**Removed**: the **Homepage Banner** and **Landing Pages** Master Admin tabs and
their components (`HeroSettingsTab`, `LandingSettingsTab`), per request. Their
API routes (`/api/admin/hero-settings`, `/api/admin/landing-settings`) are
**deliberately left in place** — the orphaned B2B landing components still read
from them, and deleting the routes would break those if they are ever revived on
a partner page. → open item 44.

### 2026-07-25 — Landing page rebuilt as a customer marketplace

**Branch**: `cleanup/dead-code` · **Base**: `6b4cb3f`

**Why**: The landing page was a B2B pitch — nine sections selling the platform to
restaurant owners, with no way for a hungry visitor to find food. The client's
mockup is a marketplace. This repositions the front door to the customer and
moves the partner path to a nav link and one promo card.

**Kept, as asked**: `Testimonials` and `Footer`. Everything else on the page is new.

**New shared plumbing** (this is the part that matters):

- **[`context/LocationContext`](../src/context/LocationContext.tsx)** — one answer
  to "where is the customer", shared by the header, hero and every rail. Four
  components each running their own geolocation would mean four permission
  prompts and four sets of results that disagree. Resolution is staged: a
  remembered choice → an IP guess (instant, no prompt) → precise GPS only on
  request. Nothing waits on GPS, because a blank screen behind a permission
  dialog is a bounce. Mounted above `CartProvider` in `providers.tsx`.
- **[`hooks/useNearby`](../src/hooks/useNearby.ts)** — one query shape with
  out-of-order protection, so the four rails on the landing page cannot each
  reinvent it.
- **[`lib/discovery/categories.ts`](../src/lib/discovery/categories.ts)** — the
  only place `RestaurantType` is translated into what a customer actually thinks
  ("Hotels", "Drink Shops"). Landing grid, `/nearby` chips and the API all read it.
- **[`marketplace/StoreCard`](../src/components/marketplace/StoreCard.tsx)** and
  **`StoreRail`** — one card and one rail everywhere.

**Discovery layer extended**: `types[]` filter, free-text `q`, and `deliveryOnly`
now defaults **false** — browsing "what's near me" must include the dine-in-only
hotel; delivery is a badge, not a precondition for existing. Search spans venue
name, address **and menu items**, so "momo" finds the cafe that sells them.
Sorting is delivery-first only on delivery-led rails; elsewhere distance alone,
because pushing a hotel below a burger place for not delivering is dishonest.

**Bug caught while writing it**: the `q` filter and the `deliveryOnly` filter were
both emitting a `WHERE OR` clause as sibling keys on one object — the second
silently overwrites the first in JS. Delivery filtering would have quietly
replaced search filtering and returned wrong results with no error anywhere. Both
now sit inside a single `AND` array.

**New pages/components**: `MarketplaceHeader` (location picker + search + cart,
replacing the B2B `Navbar` on `/` and `/nearby`), `MarketplaceHero`, `TrustBar`,
`CategoryGrid`, `PromoBanners`, `HowItWorksSteps`. `/nearby` rebuilt with
URL-driven filter state so a filtered view is shareable and the back button undoes
one filter rather than the whole visit.

**Verified in the browser against live data**: real venues with computed
distances, real delivery pricing (Manohara Cafe → Rs. 153 from its actual zone),
drinks detection, category filtering returning only hotel types, and dish search
surfacing venues whose *names* don't match. `tsc` 0 · `build:local` 0 · zero
console errors.

**Deliberately not deleted**: the orphaned B2B sections (`LandingHero`,
`PlatformModules`, `HardwareShowcase`, `CoreFeatures`, `BusinessMetrics`,
`FAQSection`, `CTASection`) are no longer imported anywhere but are left on disk —
they are real work and belong on a partner/marketing page. → open item 43.
`NearbySection` **was** deleted: it was mine from the previous commit and is fully
superseded by `StoreRail`.

### 2026-07-25 — Delivery platform Phases 1–6: hours UI, discovery, hub, rider, reliability

**Branch**: `cleanup/dead-code` · **Base**: `1142879`

**Why**: Phase 0 laid the foundations. This builds everything the client actually
sees, in the order the features depend on each other.

**Phase 1 — restaurant operations.**
Two new Settings sections: **Hours & Location**
([`settings/OperatingHoursTab`](../src/components/dashboard/settings/OperatingHoursTab.tsx))
— per-day, per-service hours with overnight windows handled implicitly (a closing
time at or before the opening time stores `closeMin + 1440` and shows a "next day"
badge), holidays/one-off closures, the visibility toggle, and **editable location**
(coordinates were frozen at signup and could never be corrected). And **Delivery &
Pickup** ([`settings/DeliverySettingsTab`](../src/components/dashboard/settings/DeliverySettingsTab.tsx))
— capabilities, radius, prep time, COD + cap, live-tracking opt-in, and real
`DeliveryZone` rows.

New APIs: `GET/PUT /hours`, `POST/DELETE /hours/special`, `GET/PATCH /capabilities`,
`PATCH/DELETE /delivery-zones/[zoneId]`. `latitude`/`longitude` added to the
`PATCH /restaurants/[id]` allow-list with range validation.

**The two toggles are gone from Menu Management** (`MenuManagementTab.tsx`), as
asked — they were business settings living in a menu editor.

**Phase 2 — customer discovery.**
[`lib/discovery/find-nearby.ts`](../src/lib/discovery/find-nearby.ts) is the only
place geometry lives: bounding box over the new index, exact haversine pass, then
sort by *"will they actually deliver here"* before distance. `POST /api/public/nearby`
(POST so coordinates never enter a URL, log or cache key; rate-limited 60/min;
radius clamped). `POST /api/public/restaurants/[slug]/delivery-quote` gives a
customer the real charge before checkout. New public `/nearby` page and an "Order
near you" block directly under the landing hero. Location resolves IP-first (no
prompt, instant) with precise GPS as an opt-in upgrade.

**Fixed:** `HotelsMapView` and `HotelLocationMap` were hitting
`tile.openstreetmap.org` directly — a breach of the OSM tile usage policy at real
traffic. Both now use [`lib/map-tiles.ts`](../src/lib/map-tiles.ts).

**Phase 3 — ordering.**
The delivery fee is now computed **server-side from the real distance** inside the
order path and **frozen** onto the `Delivery` row. It previously took whichever
active zone came back first, charged its flat base fee regardless of distance, and
fell back to a hardcoded 50. Out-of-range drop-offs are refused with a reason.
**COD is enforced server-side** (opt-in + value cap), not just hidden in the UI.

**Preparation groups** are created in the order transaction, routed from
`MenuItem.isDrink`/`drinkCategory`. Groups are created *before* the items so each
line carries its `prepGroupId` in the same `createMany`. `appendToOrder` upserts
groups too — a Coke added to a food-only order must reach the bar, and a station
that had already finished is reset to PENDING so the "all groups ready" gate cannot
pass with unmade items.

**Phase 4 — the delivery hub.** One nav item at `/dashboard/delivery`, appended to
`NAV_MORE` **after Settings**. Tabs: Live · Food · Drinks · Dispatch · Payments ·
Riders. Food and Drinks are *tabs, not separate dashboards* — an order with a
burger and a Coke belongs to both, and as separate pages it would appear twice and
risk being made twice. Hardware is deliberately absent: different business domain.
New `restaurant:{id}:delivery` and `delivery:{id}` realtime topics.

**Phase 5 — rider + tracking.** `/rider/[riderToken]` is account-less, mobile-first,
`noindex` + `no-referrer`. Customer PII is withheld until a rider is actually
assigned, so a link leaked before assignment exposes nothing. Location sharing is
opt-in, foreground-only, and stops automatically at a terminal state. The customer
sees a timeline plus a Leaflet map, labelled **"updated 15 seconds ago"** — never
"live", because a rider's phone sleeps and loses signal.

**Phase 6 — reliability.** Refund queue (`COMPLETED → REFUND_PENDING → REFUNDED`,
forward-only, owner/billing only, fully audited) — deliberately manual because
there is no eSewa/Khalti refund API here. Nightly cron purges
`DriverLocationPing` 7 days after a delivery reaches a terminal state.

**Also delivered**: [`scripts/backfill-delivery-foundations.mjs`](../scripts/backfill-delivery-foundations.mjs)
— idempotent, `--dry-run` first, prints the target database before writing.

**Verified**: `tsc --noEmit` 0 · `npm run verify:delivery` 100/100 ·
`npm run build:local` 0 with `/nearby` and `/rider/[token]` compiled · eslint clean
on new files apart from `react-hooks/set-state-in-effect`, which **28 pre-existing
files already trip** — it fires on any fetch-on-mount effect even when every
`setState` sits behind an `await`. No database was written to.

**Still not deployed.** The schema from Phase 0 plus this code needs
`ADDITIVE_SCHEMA_SYNC=true` and the backfill **before** the code ships. → open item 37.

### 2026-07-25 — Delivery platform Phase 0: capabilities, hours, state machines

**Branch**: `cleanup/dead-code` · **Base**: `6b8e218`

**Why**: The client wants scheduled opening days/hours, delivery gated behind
them, proximity discovery on the landing page, and a delivery dashboard split by
food/drinks. That chain rests on foundations this codebase did not have. Phase 0
builds only the foundations — **nothing customer-facing ships in this change**.

Three things forced the shape of it:

1. **`openingTime`/`closingTime` are two flat strings**, identical seven days a
   week. "Closed Tuesdays" and a bar running 18:00–02:00 are both unrepresentable,
   and a naive `open <= now <= close` returns **false all night** for the latter.
2. **There was no timezone handling anywhere.** Vercel runs UTC; Nepal is
   **UTC+05:45**. Any hand-rolled `getHours()` comparison is wrong by 5h45m in
   production and correct on a developer laptop — the worst possible failure mode.
3. **No distance maths existed at all.** No haversine, no PostGIS, no radius
   filter. Discovery was `city` string-equality.

**Changed — schema** (all additive; needs `ADDITIVE_SCHEMA_SYNC=true` **before**
the code that reads it):

- **`RestaurantCapability`** (1:1) — `dineInEnabled`, `pickupEnabled`,
  `deliveryEnabled`, `codEnabled`, `codMaxAmount`, `liveTrackingEnabled`,
  `deliveryRadiusKm`, `deliveryPrepMins`. **Fulfilment is now capability-based,
  never type-based** — a Cafe, Bar, Hotel or Bakery may all deliver. There must be
  no `if (type === "BAR")` in delivery code. Deliberately separate from
  `featuresEnabled`/`featuresDisabled`/`FeatureConfig`, which are the
  **UI-navigation** axis; this is the **fulfilment** axis, queried in SQL by
  public discovery. Keeping them apart is the whole point → `07-features-and-tenancy.md`.
- **`RestaurantHours`** keyed `[restaurantId, serviceType, dayOfWeek]` +
  **`ServiceType`** enum (DINE_IN/DELIVERY/PICKUP). Separate delivery hours are
  the common real case — kitchen till 23:00, delivery stops 21:30. `closeMin` may
  exceed 1440 to encode an overnight window in **one row** (18:00–02:00 = 1080 →
  1560); the schema.org/OSM convention of splitting at 23:59 is equally correct
  but miserable to render and edit.
- **`RestaurantSpecialHours`** — date-specific overrides (holiday, maintenance,
  private event). A service-specific override beats a blanket one.
- **`Restaurant.timezone`** (IANA, default `Asia/Kathmandu`) + indexes
  `[latitude, longitude]` and `[isActive, isOpen]` for the bounding-box prefilter.
- **`DeliveryStatus`** extended additively: `READY_FOR_PICKUP`, `FAILED`,
  `RETURNED`. Existing `ASSIGNED` ≡ ASSIGNED_TO_DRIVER, `IN_TRANSIT` ≡ ON_THE_WAY.
- **`Delivery`** gains the **pricing snapshot** (`baseFeeSnap`, `distanceFee`,
  `discountSnap`, `finalFee`, `pricingZoneId`, `pricedAt`) and `riderToken`.
- **`DriverLocationPing`** — per-delivery location *history*, not a single moving
  pointer on the driver. A driver runs many deliveries; `currentLat/Lng` alone
  loses history and makes retention unreasonable. **Purge 7 days after terminal.**
- **`OrderPreparationGroup`** + **`PrepStation`** + **`KitchenStatus`** enums.
- **`Payment.idempotencyKey`** (unique) and **`PaymentStatus.REFUND_PENDING`**.

**Changed — new pure modules** (no `db` import, so they run server-side,
client-side and in the verification script):

| File | Role |
| --- | --- |
| [`lib/hours.ts`](../src/lib/hours.ts) | Minutes-from-midnight maths, overnight windows, next-opening |
| [`lib/operational-status.ts`](../src/lib/operational-status.ts) | **`getRestaurantOperationalStatus()` — the single entry point** |
| [`lib/geo.ts`](../src/lib/geo.ts) | Haversine, bounding box, ETA |
| [`lib/delivery-pricing.ts`](../src/lib/delivery-pricing.ts) | **`computeDeliveryFee()` — the only producer of a fee** |
| [`lib/delivery/transitions.ts`](../src/lib/delivery/transitions.ts) | The state machine as data — edges + actor rules |
| [`lib/fulfilment.ts`](../src/lib/fulfilment.ts) | `Order.type` ↔ fulfilment vocabulary |
| [`lib/orders/kitchen-status.ts`](../src/lib/orders/kitchen-status.ts) | Type boundary over the free-form status columns; station routing |

Plus two server modules: [`lib/delivery/state-machine.ts`](../src/lib/delivery/state-machine.ts)
(`transitionDeliveryStatus()` — **the only writer of `Delivery.status`**, validating
edge + actor, stamping timestamps, writing audit) and
[`lib/orders/fulfilment-state.ts`](../src/lib/orders/fulfilment-state.ts)
(`getOrderFulfilmentState()` — the composed read model).

**Three security fixes, all pre-existing:**

1. **`DeliveryDriver` had no `restaurantId`** — the table was global. The moment
   restaurants create riders, Restaurant A reads Restaurant B's. Added + indexed.
2. **`GET /api/restaurants/[id]/delivery-zones` had no auth check whatsoever** —
   any caller could enumerate any restaurant's pricing by id. Now
   `requireOwnerOrStaffManager`. `POST` also took unvalidated money; a negative
   `perKmFee` would have produced a negative fee. Now Zod-bounded.
3. **Delivery enablement was UI-gated only.** `PATCH /api/restaurants/[id]/status`
   now returns `409 HOURS_REQUIRED` when no hours exist. A UI-only gate is not a gate.

**Verified**: `npx tsc --noEmit` exits 0. `npm run verify:delivery` — **82 checks,
0 failures** — covering the +05:45 date rollover against UTC, overnight windows,
*still-open-from-yesterday* at 00:30, exactly-at-open vs exactly-at-close, closed
days, special-date precedence, delivery-hours inheritance, legacy fallback,
haversine against an independent 1°-latitude benchmark and Kathmandu→Pokhara,
free-above boundary inclusivity, out-of-radius refusal, and every illegal state
edge and wrong actor. `npx eslint` on the touched files is clean. **No database
was written to** — the local `.env` points at production.

**Deliberately not changed:**

- **`Order.type` was NOT renamed to `fulfilmentType`.** It already *is* the
  fulfilment type (`DINE_IN | DELIVERY | TAKEAWAY`, where TAKEAWAY ≡ PICKUP) and is
  written by checkout, the POS, the counter, `create-order.ts` and the admin tables
  on a live table. The rename buys vocabulary at the cost of a destructive
  migration; `lib/fulfilment.ts` reconciles the names instead. The rule that
  mattered — **only `DELIVERY` creates a `Delivery` row** — is kept.
- **`Order.kitchenStatus` / `OrderItem.kitchenStatus` are still `String?`.**
  Converting the hottest table in the system is a behaviour-neutral migration with
  real downside, so it is sequenced as its own deploy. `kitchen-status.ts` is the
  type boundary meanwhile; new tables use the real enum. → open item 36.
- **No fourth status enum.** `PENDING_PAYMENT`/`CONFIRMED`/`PREPARING` already live
  in `Payment.status`, `Order.status` and `Order.kitchenStatus`. Re-encoding them on
  the delivery leg would give four subsystems one column to race on;
  `getOrderFulfilmentState()` composes instead.
- **No PostGIS or `earthdistance`.** Both need a DB extension, and schema sync here
  is opt-in per deploy with no staging database to rehearse on. Bounding box over
  the new index plus an exact haversine pass is accurate to metres and fast well
  past this dataset's size. `findNearbyRestaurants()` will be the only caller, so
  the swap stays a one-file change.
- **Legacy `openingTime`/`closingTime`/`deliveryEnabled` are still read.**
  `getRestaurantOperationalStatus` falls back to them so un-migrated restaurants
  keep working during rollout. Retire in a later destructive deploy.

**Corrected a planning assumption**: the plan flagged the eSewa and Khalti
callbacks as a possible payment-forgery hole (trusting redirect params). **They are
not.** Both call the provider server-to-server (`verifyEsewaPayment` /
`verifyKhaltiPayment`), check the amount against the stored order, and dedupe via
`webhookLog.idempotencyKey`. No fix was needed and none was made.

**Found and fixed in a self-audit pass, after the above was first written:**

1. **The delivery gate would have broken production.** The first version counted
   `RestaurantHours` rows. **Every live restaurant has zero** until the editor ships
   and the backfill runs — so `MenuManagementTab`'s existing "Enable Delivery"
   toggle would have `409`'d for every restaurant, telling owners to set hours in a
   screen that does not exist yet. The rule is now
   `hasResolvableSchedule()`: per-day rows **or** a parseable legacy
   `openingTime`/`closingTime` pair. It still refuses genuinely unknown schedules,
   and starts biting properly once owners can clear their hours. `GET` returns
   `hoursConfigured` and `canEnableDelivery` as **separate** facts so the UI cannot
   offer a toggle the server will reject.
2. **Cross-tenant rider assignment.** `transitionDeliveryStatus` accepted an
   `assignDriverId` from the caller and connected it without checking ownership —
   the exact hole `DeliveryDriver.restaurantId` was added to close. Assigning
   another restaurant's rider would also have handed them a rider link carrying the
   customer's address and phone. Now verified against `restaurantId` + `isActive`.
3. **Formatter thrash.** `toLocalMoment` built a fresh `Intl.DateTimeFormat` on
   every call, and `getRestaurantOperationalStatus` called it four times per
   restaurant — ~80 constructions for a 20-result proximity search. Formatters are
   now cached per timezone (bounded at 64), the moment is resolved once and passed
   down, and `nextOpening` is only computed when actually closed.
4. **Duplicated date-key logic.** `operational-status.ts` reimplemented the
   `@db.Date` → `YYYY-MM-DD` reduction inline. `normaliseDateKey` is now exported
   and shared, so the two cannot drift.
5. **Unvalidated legacy hours** produced a window nothing matched, reading as
   "permanently closed" with no explanation; now reported as `NO_HOURS_SET`.
6. **`PATCH /status` returned 500** on malformed JSON and on a missing restaurant
   (reachable via a staff JWT outliving its restaurant). Now 400 / 404 / 503.

**Test gap closed in the same pass**: special hours were only exercised with
string dates. Prisma returns `@db.Date` as a **Date object** — the actual
production path — which was untested. Added, along with 24-hour venues, the
formatter cache, and the enable-gate rules. Suite went 82 → **100 checks**.

**Production build verified**: `npm run build:local` (`prisma generate && next
build`) exits 0 — 51 routes compiled. `npm run build` was deliberately NOT run: it
invokes `scripts/vercel-build.mjs`, which can push schema to the live database.

### 2026-07-24 — Master Admin: site-wide Business Info settings + contact inbox

**Branch**: `cleanup/dead-code` · **Base**: `ea498c2`

**Why**: Two Master-Admin gaps. (1) The platform's own public contact details
(HimaVolt's phone, email, name, hours, address) were **hardcoded** on the
`/contact` page and only partially editable via the old "Footer Settings" tab —
which the public `Footer` fetched from `/api/admin/footer-settings`, a route
**not** on `PUBLIC_ROUTES`, so **anonymous visitors always saw defaults** (their
fetch 401'd). A non-technical operator had no single place to change the number.
(2) Contact-form messages already landed in `ContactSubmission` and showed in
the admin, but the only action was "Mark as Read" — no way to reply, and the
admin server actions had **no auth guard** (a customer-PII leak).

**Ask 1 — one source of truth for site-wide contact/brand info.**

- **New pure module** [`src/lib/site-settings.ts`](../src/lib/site-settings.ts) —
  `SiteSettings` shape + `SITE_SETTINGS_DEFAULTS` + `telHref`/`mailtoHref`
  helpers. Client-safe (no db import) so `Footer` and `/contact` can import it.
  Fields: `businessName`, `description`, `phone`, `email`, `supportPhone`,
  `partnerPhone`, `partnerEmail`, `address`, `addressNote`, `hours`.
- **New server store** [`src/lib/site-settings-store.ts`](../src/lib/site-settings-store.ts) —
  `readSiteSettings()` / `writeSiteSettings()` over the existing `site_settings`
  KV table (Prisma `SiteSetting`), defensive raw SQL (`CREATE TABLE IF NOT
  EXISTS` + upsert), reads never throw. **Backward-compat:** reads prefer
  `site_<field>` but fall back to the legacy `footer_<field>` key, so the
  client's existing production footer values (phone/email/address/description)
  carry over automatically. **Verified live:** the API returned the client's real
  saved `+977 974-3233361` / `Bagbazar Kathmandu` from the legacy keys.
- **New public route** `GET /api/site-settings` (added to middleware
  `PUBLIC_ROUTES`) — so logged-out visitors get real values. **New admin route**
  `PATCH /api/admin/site-settings` (`requireAdmin()`, GET+PATCH).
- **New admin tab** [`BusinessInfoTab`](../src/components/admin/BusinessInfoTab.tsx),
  wired into [`admin/page.tsx`](../src/app/admin/page.tsx) as `business-info`
  under **System** — it **replaces** the old `footer-settings` tab. Sectioned
  form (Brand / Primary Contact / optional Directory) with a Save + Reset.
- **Consumers repointed**: [`Footer`](../src/components/layout/Footer.tsx) now
  fetches `/api/site-settings`; [`/contact`](../src/app/contact/page.tsx) is now
  fully driven by settings (its `CONTACT_INFO` + `QUICK_CONTACTS` were hardcoded).
- **Deleted** (dead after repoint): `src/app/api/admin/footer-settings/route.ts`
  + `src/components/admin/FooterSettingsTab.tsx`. The persisted-tab initializer in
  `admin/page.tsx` now guards against retired ids (a stored `footer-settings`
  would have rendered blank).

**Ask 2 — contact messages become a reply-capable inbox.**

- [`AllContactsTab`](../src/components/admin/AllContactsTab.tsx) rewritten into an
  inbox: status filters (new/read/replied/archived) with counts, search, friendly
  subject labels, and per-message actions — **Reply**, mark read/unread, archive/
  unarchive, delete (inline confirm), with optimistic updates.
- **Reply** opens a composer prefilled with a greeting + the quoted original;
  "Open in email app" builds a `mailto:` addressed to that customer and marks the
  message `replied`. **There is no transactional email provider in the app** (only
  Supabase auth emails), so replying deliberately uses the admin's own mail
  client rather than inventing an email backend / new credentials.
- **Security fix**: the admin actions in
  [`lib/actions/contact.ts`](../src/lib/actions/contact.ts)
  (`getContactSubmissions`, `setContactStatus`, `deleteContactSubmission`) are now
  `requireAdmin()`-gated — they were reachable, unauthenticated, and expose PII.
  `submitContactForm` stays public. Uses the existing `status` string (values
  `new`/`read`/`replied`/`archived`) — **no schema change**.

**Tailwind source-scoping fix (blocker found during verification).** The
Turbopack **dev** server refused to boot: `globals.css … Parsing CSS source code
failed … var(--border*)`. Root cause (grep-confirmed): the token
`border-[var(--border*)]` exists **only in `docs/WORKLOG.md` prose**, and
Tailwind v4 auto-scans the whole repo — it regex-extracted that doc token and
emitted an invalid utility. Fixed durably by scoping content detection to the app
source: `@import "tailwindcss" source("../");` in
[`globals.css`](../src/app/globals.css). (Production `next build` had tolerated
it; only the stricter dev parser failed.)

**No schema deploy needed** — the `site_settings` table already exists in prod
(the old footer settings used it) and only new *rows* are added; the contact
inbox reuses the existing `status` column.

**Verified**: `tsc --noEmit` exit 0 · `next build` (`build:local`) exit 0, both
new routes emitted · dev server boots clean after the CSS fix · `GET
/api/site-settings` → 200 with real merged data (legacy fallback proven) · `GET`
+ `PATCH /api/admin/site-settings` unauthenticated → **401** · `/contact` renders
the live phone/office/directory from settings. ⚠️ **Not exercised**: the authed
Business Info save and the inbox actions need a master-admin login (env creds,
against the live prod DB) — not available in-tool. The `mailto:` reply opens the
OS mail client, which the preview can't complete.

### 2026-07-23 — Dark-mode sweep: hardcoded light palette converted to theme tokens

**Branch**: `cleanup/dead-code` · **Base**: `93d6091`

**Why**: Dark mode was broken on essentially every page. Two recurring bugs:
(1) hardcoded light surfaces (`bg-white`, `bg-slate-50`, `text-slate-900`,
`border-gray-200`…) sitting inside token-themed shells stayed light while
`var(--canvas)`/`var(--text-1)` flipped — white cards with near-white text;
(2) the "inverted button" idiom `bg-[var(--text-1)] text-white` became
white-on-white because `--text-1` flips to near-white in `.dark`.

**Changed** — ~100 files, className-only (no logic, no markup):

- **Inverted buttons everywhere**: on lines with `bg-[var(--text-1)]`,
  `text-white` → `text-[var(--canvas)]` and hardcoded dark hovers
  (`hover:bg-[#2d1508]`, `hover:bg-black`…) → `hover:bg-[var(--text-2)]`.
- **Token-bordered white cards** (`bg-white` + `border-[var(--border*)]`) →
  `bg-[var(--surface)]` across landing, features, hardware marketplace,
  contact, stays/checkout, hotel booking, tracking, dashboard.
- **Slate/gray/zinc idiom files converted wholesale** with a fixed mapping
  (900/800→`--text-1`, 700/600→`--text-2`, 500–300→`--text-3`,
  slate/gray-50/100→`--surface-alt`, gray-100/200 borders→`--border-soft`/
  `--border`, `bg-*-900`+white text→`--text-1`+`--canvas`): Navbar,
  staff-login, profile, master-admin shell + all `admin/*` tabs, dashboard
  tabs, POS staff/terminal components, menu page (`MenuPageClient`, incl.
  `#F7F8FA`/`#fbfbfb` shells), bill-page gradients, scan/offers
  `border-[#3e1e0c]` → `border-[var(--text-1)]`.
- **Deliberately static, NOT tokenized**: QR wrappers stay `bg-white`
  (scannability — StaffQrBadgeModal, WifiSettingsTab, TablesTab,
  StaffManagementTab, hardware order payment QR); white pills on the orange
  gradient (`InstallAppBar`/`InstallAppButton`) now use static `text-brand-700`
  instead of `--accent-text` (which flips pale in dark); toggle knobs;
  white-on-image overlays (`bg-white/10..20`); always-dark screens
  (`POSTables3DView`, `POSInactiveScreen`, `POSCFD`, `KitchenBoard` accents,
  CTASection's gradient section); menu-page brand greens + `--item-accent`
  pairings.

**Verified**: `tsc --noEmit` exit 0 · `next build` compiles (see below).

**Deliberately not changed**: no new tokens in `globals.css`; no `dark:`
variants added — everything rides the existing CSS-variable flip. Docs
untouched (no structural change).

### 2026-07-22 — Landing modules wired up + hardware marketplace with 5% commission

**Branch**: `cleanup/dead-code` · **Base**: `d019d80`

**Why**: The nine homepage module tiles (`PlatformModules`) all linked to
`/features/{id}`, which 404'd — only a static `/features` stub existed. The
landing "Get Started" CTA pointed at a stale `/register` page that wrongly
claimed signup was invite-only. And the ask was to let anyone sell hardware
(no account) with a 5% platform cut on each sale.

**Changed** — four workstreams:

1. **Landing modules.** New [`src/lib/platform-modules.ts`](../src/lib/platform-modules.ts)
   is the single registry (id, name, icon, colour, marketing copy) that
   [`PlatformModules`](../src/components/home/PlatformModules.tsx), the rewritten
   [`/features`](../src/app/features/page.tsx) index grid, and the new
   [`/features/[id]`](../src/app/features/[id]/page.tsx) detail page (SSG, 9
   paths) all read from. No more 404s.
2. **Signup funnel.** [`CTASection`](../src/components/home/CTASection.tsx) CTA
   now → `/sign-in` (matching the Navbar). [`/register`](../src/app/register/page.tsx)
   is now a server `redirect("/sign-in")` instead of an "invite-only" dead end.
   The real self-serve path (`/sign-in` → `/auth/get-started` → Create New
   Restaurant) was already working and is untouched.
3. **Hardware marketplace.** The old `/hardware` was a display-only catalog
   (one `site_settings` JSON blob, "Inquire" → `/contact`). It's now a real
   account-less marketplace:
   - **3 new Prisma models** — `HardwareListing`, `HardwareOrder`,
     `HardwareCommissionSettlement` (+ enums `HardwareListingStatus`,
     `HardwareOrderStatus`). Standalone; no `Restaurant`/`User` relation —
     sellers and buyers are identified by contact details + an opaque token
     (mirrors the order-track model).
   - **Commission ledger.** HimaVolt takes 5% on *confirmed third-party* sales
     only (platform listings owe nothing). Owed = Σ confirmed-order commissions
     − Σ settlements, computed on read. Master admin sets a payout method
     (`site_settings` key `hardware_commission_payout`) and records manual
     settlements. **Money never flows through the platform** — buyers pay
     sellers directly (proof-based), so this is entirely separate from the
     restaurant Order/Payment pipeline.
   - **Public API** (all under the existing `/api/public` middleware allowance):
     `GET /api/public/hardware`, `POST /api/public/hardware/listings`,
     `GET …/listings/[token]`, `POST /api/public/hardware/orders`,
     `GET …/orders/[trackToken]`, `POST …/orders/[trackToken]/proof`.
     Prices are server-derived from the listing; the client never sends price.
   - **Admin API** (`requireAdmin()`): `/api/admin/hardware` (list/create),
     `/api/admin/hardware/[id]` (approve/reject/edit/archive/delete),
     `/api/admin/hardware/orders` + `/orders/[id]` (verify/confirm/cancel),
     `/api/admin/hardware/commission` + `/commission/settle`,
     `/api/admin/hardware/payout`. The old blob-based `/api/admin/hardware`
     route was **replaced** by these DB-backed routes.
   - **Public pages**: `/hardware` (catalog + Buy + "Sell on HimaVolt"),
     `/hardware/sell` (submission form), `/hardware/sell/[token]` (seller
     status), `/hardware/checkout/[id]` (buyer form), `/hardware/orders/[trackToken]`
     (buyer status + proof upload).
   - **Admin UI**: [`HardwareTab`](../src/components/admin/HardwareTab.tsx)
     rewritten with 4 sub-views — Catalog, Pending review, Orders, Commission
     (with payout-method editor + per-seller ledger). Still the single existing
     "Hardware Nodes" admin tab; no new top-level `AdminTab`.
   - New Zod schemas in [`validations.ts`](../src/lib/validations.ts), helpers
     in new [`src/lib/hardware.ts`](../src/lib/hardware.ts), new hardware
     `AuditAction` strings.
4. **Middleware.** `/hardware` added to `PUBLIC_ROUTES` (it was NOT public
   before — an anonymous visitor was redirected to `/sign-in`).

**Migration**: [`scripts/migrate-hardware-catalog.ts`](../scripts/migrate-hardware-catalog.ts)
is a one-time, idempotent seed that converts any legacy `hardware_catalog` blob
into APPROVED platform listings. Optional; run by hand after the schema deploys.

**Verified**: `prisma generate` ok · `tsc --noEmit` exit 0 · `next build`
(`build:local`, no DB push) compiled successfully, 104 static pages,
`/features/[id]` SSG with 9 paths. ⚠️ **Schema not yet deployed** — the 3 new
tables need an **additive** deploy (`ADDITIVE_SCHEMA_SYNC=true`) before the
marketplace works against the live DB. Flows not exercised live (needs the
tables + a master-admin login).

**Image upload (follow-up).** Sellers, buyers and the admin all upload real
images via the new public [`POST /api/public/hardware/upload`](../src/app/api/public/hardware/upload/route.ts)
(signed-URL flow, images only, 5 MB, rate-limited, `hardware/` folder) —
`/api/upload` requires auth and marketplace users have none. Shared
[`HardwareImageUpload`](../src/components/hardware/HardwareImageUpload.tsx)
component powers the seller product photo, the admin product photo, and the
buyer's payment-proof screenshot (the proof is now an uploaded image, not a
pasted URL).

**Strictness + payment QR + required contact (follow-up).**
- Seller **and** buyer must now give a valid phone **and** email (both
  compulsory, Zod-validated) — `sellerEmail`/`buyerEmail` are no longer optional.
- New `HardwareListing.sellerPaymentQr` (additive column) — sellers upload a
  scannable payment QR (eSewa/Khalti/Fonepay/bank); the buyer's order page shows
  it ("Scan to pay") alongside the text payout note, and the admin review card
  links to it.
- **Anti-abuse**: nothing is public until admin-approved (already true), plus a
  new **per-seller pending cap** — `POST /api/public/hardware/listings` returns
  429 if that phone already has ≥3 listings `PENDING_REVIEW`. Combined with the
  existing IP rate limit (5/15min), this bounds queue flooding without blocking
  legitimate sellers.

**Homepage hardware showcase (follow-up).** New
[`HardwareShowcase`](../src/components/home/HardwareShowcase.tsx) section on the
landing page (added to [`page.tsx`](../src/app/page.tsx) right after
`PlatformModules`, which is **kept**) — a horizontal rail of real APPROVED
marketplace products (image, seller, price, Buy → checkout) with "View all" /
"Sell yours" CTAs. Renders nothing when the catalog is empty (no empty section).

**Navbar (follow-up, then redesigned).** [`Navbar`](../src/components/layout/Navbar.tsx)
rewritten with a mobile hamburger drawer; **Hardware** is a nav item for
everyone. Then redesigned to de-clutter the signed-in bar: nav links (Hotels,
Hardware) are grouped next to the logo behind a divider, and the loud inline red
"Sign Out" + shouty "Staff" are folded into an **avatar dropdown** (Profile /
Staff Login / Sign Out, with outside-click + Escape close). Signed-out keeps a
subtle Staff link + Log In + Get Started. On mobile only the primary CTA stays
outside the drawer — **Get Started** signed-out, **Dashboard** signed-in —
everything else lives in the drawer (now with a user header when signed in).

**Deliberately not changed**: no real payment-splitting integration (the app
has none; eSewa/Khalti settle into each restaurant's own merchant account) —
commission is a ledger + manual settlement, as agreed. Restaurant order/payment
code untouched.

### 2026-07-22 — Landing page: location bar replaced with a prominent install-app bar

**Branch**: `cleanup/dead-code` · **Base**: `e045a8e`

The sticky bar under the navbar (`Delivering to Kathmandu… Change / Detect my
location`) was replaced with **new** [`InstallAppBar`](../src/components/home/InstallAppBar.tsx) —
a bold white "INSTALL APP" pill on an accent gradient, with a small subtitle
underneath clarifying it saves the page to the home screen rather than
installing a native app (avoids over-promising on browsers that only support
`beforeinstallprompt`-style "add to home screen"). Same gating as
[`InstallAppButton`](../src/components/shared/InstallAppButton.tsx) — reads
`canInstall` from [`PwaInstallContext`](../src/context/PwaInstallContext.tsx)
and renders nothing until the browser offers install / once already installed.

**Deleted as dead code**: `LocationBar.tsx` and `LocationContext.tsx` — the
context had no other consumer, so removing the bar orphaned it. Delivery-area
selection was never wired into ordering/checkout; it only drove this display
string.

[`LandingHero`](../src/components/home/LandingHero.tsx) also dropped its own
"Nepal's Ultimate Hospitality OS" badge and subtle `InstallAppButton` nudge
below the CTAs — redundant now that the top bar is the single, prominent
install call-to-action. Cleaned up the now-unused `badgeRef` GSAP entry
alongside it.

`tsc --noEmit` exit 0. ⚠️ Not exercisable in-tool: the preview browser never
fires `beforeinstallprompt`, so the bar renders nothing there by design —
confirm on a real Chromium/Android device.

### 2026-07-19 — P&L tab: snappy (optimistic + cache-bust), no blanking, no negatives

**Branch**: `cleanup/dead-code` · **Base**: `58cfc98`

Reported: adding an expense needed a manual page refresh to show; "All
restaurants" flashed blank; filter changes felt slow; and negative amounts were
enterable. All in [`ProfitLossTab`](../src/components/dashboard/ProfitLossTab.tsx).

- **Add-expense needed a refresh — root cause found.** The expense POST/DELETE
  used raw `fetch()`, which does **not** invalidate `apiFetch`'s 60s GET cache —
  so the reload was served the *stale cached* P&L until a hard refresh cleared
  the in-memory cache. Now mutations `invalidateApiCache('/api/restaurants/{id}'
  + '/api/me/pnl')` and refetch with `cacheTtl:0` (fresh).
- **Instant feedback.** Add/delete are **optimistic** — the expense appears in
  the list and the headline numbers + category breakdown update immediately (via
  `bumpSingle`), then the background refetch reconciles exact figures + trend.
  Rolls back on error.
- **No more blanking.** Split `loading` into `firstLoad` (full skeleton only when
  there's nothing yet) + `refreshing` (a subtle header spinner). Filter/scope
  changes **keep the previous data on screen** and just refresh — no skeleton
  flash. "All restaurants" shows a skeleton (never blank) on first open, then
  content; a failed load shows a **tap-to-retry** button, not a blank. A short
  8s cache makes repeat filters instant.
- **No negatives.** The amount field is now sanitised on input (digits + one
  decimal point, no `-`/letters); the ≤0 guard and the server's `.positive()`
  Zod rule remain.

`tsc` exit 0 · `next build` exit 0. ⚠️ In-tab behaviour needs an owner login +
the deployed `expenses` table to see live; logic verified by reasoning + build.

### 2026-07-19 — Owner Control Panel mobile layout fix

**Branch**: `cleanup/dead-code` · **Base**: `067e93e`

Reported: the Owner Control Panel was badly cramped on mobile — the "Owner
Control Panel" title wrapped one word per line and the "Enable all features for
all staff" copy stacked one word per line behind the button. All three offending
rows used `flex items-center justify-between` with no mobile stacking, so the
text column got crushed. [`OwnerControlPanel`](../src/components/dashboard/OwnerControlPanel.tsx):

- **Header** → `flex-col` on mobile (`sm:flex-row`), title `text-xl sm:text-2xl`,
  Refresh button drops below the title instead of stealing its width.
- **Enable-all card** → icon+copy wrapped in a `min-w-0 flex-1` block; the card
  is `flex-col` on mobile with a **full-width** button below, `sm:flex-row` above.
- **Role-permissions legend** → label/description stack (block), and the role
  badges move below the text on mobile (`sm:justify-end`) instead of fighting it
  for width.

`tsc` exit 0 · `next build` exit 0.

**Not a code change (deploy note)**: "Profit & Loss" *is* in the sidebar code
(`NAV_MORE` → rendered by `DashboardSidebar` with no filter). If it's missing on
himavolt.com, that build predates commit `02217a2`; deploy the latest branch +
hard-refresh and it appears between Reports and Feedback. Its data still needs
the `expenses` table (`ADDITIVE_SCHEMA_SYNC=true`, see the P&L entry).

### 2026-07-19 — Dish photos: auto-suggest by name + multi-source search

**Branch**: `cleanup/dead-code` · **Base**: `d104d50`

**Why**: In the New/Edit Dish modal, typing a name (e.g. "MOMO") suggested no
photo — you had to open the picker — and the search was effectively **Pexels-only**
(Openverse was a fallback, never merged), so a Nepali dish with no Pexels match
showed nothing.

- **Multi-source, parallel search** —
  [`/api/image-search`](../src/app/api/image-search/route.ts) now queries **Pexels
  (if keyed) + Openverse + Wikimedia Commons in parallel** and round-robin
  interleaves the results (deduped, 6s per-provider timeout). It returns good
  royalty-free photos **without any API key** — verified upstream: `momo food`
  on Wikimedia returns "Buff Momo", "Steamed Momos - KOLKATA"; Openverse returns
  10 more. Wikimedia biases the query with "food" and filters to real photo
  extensions (no SVG/PDF) + the existing people/signage `forbidden` list.
- **Inline auto-suggestions** — **new**
  [`DishImageSuggestions`](../src/components/dashboard/DishImageSuggestions.tsx)
  in `MenuManagementTab`: as the dish name is typed it debounces (500ms), fetches
  suggestions, and shows a one-tap thumbnail row right under the name — no need to
  open the picker. Hidden once a photo is chosen or the name is < 3 chars; a
  "More" link opens the full picker (which still crops + uploads). This is a
  debounced, name-based suggest — **not** the per-keystroke feature removed in
  `ef09130`. Picking a suggestion sets the image URL directly (fast hotlink; the
  full picker remains for a cropped/uploaded copy).

`tsc` exit 0 · `next build` exit 0 · upstream providers verified to return
results for "momo". ⚠️ The in-modal experience needs an owner login to see live
(not reachable in-tool).

### 2026-07-19 — Install-button contrast + hideable sidebar POS card

**Branch**: `cleanup/dead-code` · **Base**: `a0c1788`

Two small polish fixes from screenshots.

- **"Install app" was invisible in the dashboard greeting.** The `tone="light"`
  variant of [`InstallAppButton`](../src/components/shared/InstallAppButton.tsx)
  was a translucent `bg-white/20` white-on-orange pill — unreadable on the
  greeting gradient. Now a **solid white pill with accent text + a ring/shadow**
  so it clearly stands out.
- **Sidebar POS card is now collapsible.** The "Set up POS / POS Link" block
  (`PosSection` in [`DashboardSidebar`](../src/components/dashboard/layout/DashboardSidebar.tsx))
  read as noise once POS was set up. It now collapses to a slim tappable **"POS"**
  header (chevron), persisted in `localStorage` (`himavolt:posSectionHidden`) —
  one tap hides the launcher + link, one tap brings them back.

`tsc` exit 0 · `next build` exit 0.

### 2026-07-19 — P&L home card + trend chart, mobile Dashboard button, PWA install

**Branch**: `cleanup/dead-code` · **Base**: `02217a2`

Three follow-ups from live-site feedback.

**1. P&L surfaced on the dashboard home + a trend chart in the P&L tab.**
- **new** [`PnlSnapshotCard`](../src/components/dashboard/PnlSnapshotCard.tsx) — a
  compact "this month" net-profit/revenue/expenses card in the OverviewTab
  *overview* segment, links to the P&L tab. It fetches
  `/api/restaurants/[id]/pnl` and **renders nothing until it has data**, so it
  stays invisible if the P&L data is unavailable (e.g. before the `expenses`
  table is deployed) and quietly appears once it is.
- [`ProfitLossTab`](../src/components/dashboard/ProfitLossTab.tsx) now draws a
  **Revenue vs Expenses** daily bar chart (recharts, matching OverviewTab) from
  the `trend` the P&L API already returned.

**2. "Dashboard" is now a top-nav button on phones too.**
Users were missing it in the bottom nav. [`Navbar`](../src/components/layout/Navbar.tsx):
the Dashboard button is `flex` at every width (was `hidden md:flex`); on phones
it **takes the profile-avatar's slot** (avatar → `hidden md:flex`, returns on
desktop, per request), and the **"Hotels" link steps aside on phones when signed
in** (`hidden sm:flex`) to make room. Measured at 360px: labeled "Dashboard"
shows, 3px logo→actions gap, no overlap, overflow 0; at 320px the logo's
`truncate` safety net engages (gap 0, still no overlap/scroll). Desktop unchanged
(Dashboard + avatar + Hotels all present).

**3. Subtle "Install app" on the landing page + dashboard greeting.**
The PWA install was only a floating popup driven by its own
`beforeinstallprompt` listener. Centralised it: **new**
[`PwaInstallContext`](../src/context/PwaInstallContext.tsx) (single listener,
`canInstall`/`installed`/`promptInstall`, mounted in `providers.tsx`) + **new**
[`InstallAppButton`](../src/components/shared/InstallAppButton.tsx) that renders
nothing unless the browser offers install and it's not already installed (so it's
silent on iOS Safari / once installed). Placed under the landing hero CTAs
(`tone="subtle"`) and in the dashboard greeting button row (`tone="light"`). The
floating [`PWAInstallPrompt`](../src/components/shared/PWAInstallPrompt.tsx) was
refactored to consume the same context (no more double-listener racing to consume
the one-shot deferred prompt); its 30-day dismiss behaviour is kept.

**Verified**: `tsc --noEmit` exit 0 · full `next build` exit 0 · landing renders
with no console errors; mobile navbar fit measured (above). ⚠️ Not exercisable
in-tool: the P&L card/chart (need an owner login + the deployed `expenses`
table), and the install buttons (the preview browser never fires
`beforeinstallprompt`, so `canInstall` is always false there — they correctly
render nothing). Confirm on a real device/login.

### 2026-07-19 — Profit & Loss (new feature: expense tracking + P&L)

**Branch**: `cleanup/dead-code` · **Base**: `537038e`

**Why**: The app tracked **revenue** richly (Reports tab) but had **no cost side
at all** — no expense/wage/purchase model — so there was no real profit/loss. (A
dead, unused `/financials` endpoint existed with a wrong "profit" = lifetime
revenue − *current* stock value; left as-is/unused.) The owner asked for a proper
per-restaurant P&L and an owner-wide one for multi-restaurant owners.

**Decision (confirmed with the user)**: capture costs by **owner-logged expenses
by category** (not recipe-based COGS, which needs per-item costs that don't
exist); **owner-only** access.

**New model** — `Expense` → `expenses` (+ `ExpenseCategory` enum), see
[02-data-model.md](02-data-model.md). Revenue stays cash-basis (collected, paid,
non-cancelled orders — `bill.total ?? order.total`) so it matches the Reports
tab's `collectedRevenue`. Net = revenue − expenses.

| Piece | File |
| --- | --- |
| P&L math (shared) | **new** [`src/lib/pnl.ts`](../src/lib/pnl.ts) — `summarizePnl`, `orderRevenue`, date helpers |
| Expense CRUD (owner-only) | **new** `api/restaurants/[id]/expenses/route.ts` (GET list + POST) & `expenses/[expenseId]/route.ts` (DELETE) |
| Per-restaurant P&L | **new** `api/restaurants/[id]/pnl/route.ts` |
| Owner-wide P&L | **new** `api/me/pnl/route.ts` — combined + per-restaurant breakdown across all the owner's venues, in 2 range-scoped reads (query count doesn't grow with restaurant count); flags `mixedCurrencies` |
| UI | **new** [`ProfitLossTab.tsx`](../src/components/dashboard/ProfitLossTab.tsx) — income statement, 4 stat tiles, category-breakdown bars, expense add/list/delete, date presets (7d/30d/month/year/custom), and a **"This restaurant / All restaurants"** toggle (shown only when the owner has >1) with a by-restaurant table |
| Nav | `dashboard-nav.ts` (new `profit-loss` tab in `NAV_MORE`, Wallet icon) + `[tab]/page.tsx` component map |
| Validation | `validations.ts` — `createExpenseSchema`, `EXPENSE_CATEGORIES` |

**Access model**: the owner console at `/dashboard` is only reachable by
owner/admin Supabase users (staff use PIN → different auth), and every P&L/expense
route independently enforces `restaurant.ownerId === user.id` (or, for
`/api/me/pnl`, `ownerId === user.id` across the owner's restaurants). Staff can't
reach it.

**⚠️ DEPLOY REQUIREMENT**: the `expenses` table is a new schema object. Per
[09-operations.md](09-operations.md) it must be deployed **with
`ADDITIVE_SCHEMA_SYNC=true` BEFORE this code serves** — otherwise `db.expense`
queries hit a missing table and the P&L/expense routes 500. Revenue-only figures
would still be wrong to ship without it, so treat schema-first as mandatory here.

**Verified**: `npx prisma generate` clean · `tsc --noEmit` exit 0 · full
`next build` exit 0 with all four new routes present. ⚠️ **Not exercised live** —
needs an owner login *and* the deployed `expenses` table (neither reachable
in-tool; preview also has no rate-limited auth/GPS/rAF). After deploying the
schema, verify: log an expense, watch the income statement + net profit update,
and (for a multi-restaurant owner) the All-restaurants view.

**Deliberately not built**: recipe-level COGS (no per-item cost data), an
Overview-tab P&L summary card, and a daily revenue-vs-expense time chart (kept to
stat tiles + income statement + category bars for v1). The old `/financials`
endpoint was left untouched (still unused).

### 2026-07-19 — Table clearing/idle-close, dish-image suggestion, email-limit message

**Branch**: `cleanup/dead-code` · **Base**: `0a5e609`

Four reported items from live-site screenshots.

**1. Any staff can clear a table (was billing/manager/owner only).**
[`table-session/clear/route.ts`](../src/app/api/restaurants/[id]/table-session/clear/route.ts)
dropped the `STAFF_BILLING_ROLES`/`STAFF_TABLE_MANAGE_ROLES` gate — any staff
bound to the restaurant (incl. CHEF/WAITER) or the owner may now clear a table.
Clearing only ends a session; it never touches money.
Also: **browse-only tables (occupied, no order yet) had no Clear button at all**
in [`TablesTab`](../src/components/dashboard/TablesTab.tsx) — the detail panel just
said "Session active but no order yet". Added a `handleClearByTable(tableNo)` (the
clear API already accepts `{ tableNo }`) and a Clear Table button in that branch,
so the 70h "Reading menu" table in the screenshot can be freed by hand.

**2. Idle browse sessions auto-close after 4h.**
[`tables/route.ts`](../src/app/api/restaurants/[id]/tables/route.ts) GET now
`deleteMany`s sessions with **no order** (`orderId: null`) whose `startedAt` is
older than 4h, before computing occupancy — so an abandoned scan stops showing
the table occupied. Delete (not deactivate) sidesteps the
`@@unique([restaurantId, tableNo, isActive])` constraint and matches the
guest-side `browse/clear` route; a browse-only session carries no data worth
keeping. It's a bounded write on the read path (like the qrToken backfill) and
`.catch`es so it never fails the read. Sessions **with** an order are untouched.
Fires whenever the board is polled (every ~30s while a dashboard is open).

**3. Dish-image picker now suggests from the dish name.**
[`ImagePicker`](../src/components/shared/ImagePicker.tsx) gained an optional
`initialQuery`; on open it seeds the search and jumps to Web Search, so opening
the picker for "Momo" immediately shows Momo photos instead of a blank library.
[`MenuManagementTab`](../src/components/dashboard/MenuManagementTab.tsx) passes
`initialQuery={form.name}`. This is a single search on open — **not** the
per-keystroke dish-name suggestion removed in `ef09130`.

**4. "email rate limit exceeded" — friendlier message; real fix is config.**
New [`friendlyAuthError`](../src/lib/auth-errors.ts) maps that raw error to
"Too many email requests for now. Please wait a few minutes…", wired into
`sign-in` (OTP) and `forgot-password`. **The limit itself is Supabase's, not the
app's** — the client calls Supabase directly, so no code can raise it. To allow
more attempts / a shorter window (the "10 then 5 min" ask), the operator sets
Supabase → Authentication → **Rate Limits → "Rate limit for sending emails"**
(and configures **custom SMTP** for real production volume). The app's own
`account-check` limit is already 10/min and is not the cause.

**Verified**: `tsc --noEmit` exit 0; full `next build` exit 0. ⚠️ The live
behaviours (a non-manager staff clearing, the 4h auto-close, the picker
suggesting, the friendlier email message) need an owner/staff login + real data
to exercise — not reachable in-tool. Item #4's core change is the Supabase
setting above.

### 2026-07-19 — OAuth landing fix, instant location, code-based password reset

**Branch**: `cleanup/dead-code` · **Base**: `7ce05fd`

Three reported fixes. **Two carry a Supabase-dashboard dependency that only the
operator can set** — flagged inline and in [09-operations.md](09-operations.md).

**1. Google OAuth landed on `/` instead of `/dashboard`.**
The `/auth/callback` code is correct and can *never* return `/` — so a `/`
landing means OAuth skipped the callback entirely (Supabase bounced the browser
to the **Site URL** because the app redirect URL wasn't honoured; the
`intended-role.ts` comment already notes this class of drop). Added a client
safety net: [`OAuthLandingRedirect`](../src/components/shared/OAuthLandingRedirect.tsx)
(mounted in `providers.tsx`, inside `AuthProvider`). The sign-in Google handler
now sets a per-tab `sessionStorage` marker `hh_oauth_pending` right before
`signInWithOAuth`; on return, if we're signed in with the marker still set and
*not* already on `/dashboard` or `/auth/*`, we `router.replace("/dashboard")`.
sessionStorage survives the same-tab round-trip, the marker is single-use, and
provisioning still happens via `getOrCreateUser`. **Proper long-term fix (config,
operator):** add `https://www.himavolt.com/auth/callback` (and any other origins)
to Supabase → Auth → URL Configuration → **Redirect URLs**, so OAuth reaches the
callback directly.

**2. "Finding your location…" was slow on the restaurant location picker.**
[`LocationPickerModal`](../src/components/modals/LocationPickerModal.tsx) waited
on `getCurrentPosition` alone (up to ~8s, plus a 9s IP fallback on top). Now IP
+ GPS run **in parallel**: the quick `/api/geoip` guess paints an approximate
pin almost instantly, and the precise GPS fix silently upgrades it when it lands
(`maximumAge: 60000` also returns a recent cached fix immediately). Refactored
`detectByIp` to *return* the location instead of applying it as a side effect,
and the caller applies the IP fix only when GPS hasn't already won and the user
hasn't dragged/searched — otherwise the late IP result would clobber a precise
pin. No config dependency.

**3. Forgot-password sent a magic link that auto-signed-in; now it's a code.**
[`/auth/forgot-password`](../src/app/auth/forgot-password/page.tsx) rewritten to
a two-step code flow: email → `resetPasswordForEmail` → enter the **6-digit
code** + a new password → `verifyOtp({ type: "recovery" })` then
`updateUser({ password })` (no current password needed) → `PATCH /api/me
{ hasPassword: true }` → `/dashboard`. No link is clicked, so nobody is silently
connected. Magic link stays the sign-up path only. **Required config
(operator):** the Supabase **"Reset Password" email template must include
`{{ .Token }}`** (the 6-digit code) — the default template only renders a link,
so without this change users receive no code. The old link-landing page
(`/auth/reset-password`) is left in place as a harmless fallback.

**Verified**: `tsc --noEmit` exit 0; full `next build` exit 0 (all routes,
incl. `/auth/forgot-password`). Forgot-password email step renders (email input
+ "Send Reset Code"). ⚠️ The live flows (real Google OAuth, GPS on a device,
a real reset code) can't be exercised in-tool — preview has no rAF (framer
`mode="wait"` transitions + screenshots dead) and no auth/GPS — so those need a
real device/login check once the two Supabase settings above are in place.

### 2026-07-19 — Navbar: hide top-nav Dashboard on mobile + fix logo/Hotels overlap

**Branch**: `cleanup/dead-code` · **Base**: `e264488`

**Why**: Reported on the live site (signed-in owner, 360px). The top-nav
**Dashboard** button (added Batch 1.1) is redundant on phones — the bottom nav
already has Home/Dashboard/Orders/Account — and its width pushed the signed-in
action row wide enough that the logo wordmark visually **collided with the
"Hotels" link**. It only matters on tablet/desktop, where there's no bottom nav.

**Fix** — [`src/components/layout/Navbar.tsx`](../src/components/layout/Navbar.tsx):

- Dashboard button is now `hidden md:flex` (gone below 768px, shown with its
  label at `md+`, which is exactly where the bottom nav (`md:hidden`) disappears).
- Logo wordmark got `min-w-0 truncate` so it can **never overflow into the
  actions** — worst case it ellipsizes cleanly instead of overlapping.

**Root-cause note for next time:** the overlap slipped through the earlier
overflow fix because that was verified with `scrollWidth − clientWidth` (which
stayed 0 — the shrunk logo's text overflowed *within* the nav's width, no page
scroll). Overlap needs an **element-vs-element** check. Verified here by measuring
`logo.right` vs `actions.left`:

| Width | State | Dashboard | logo→actions gap | overflow |
| --- | --- | --- | --- | --- |
| 360 | signed-in | `none` | **22px** (was overlapping) | 0 |
| 320 | signed-in | `none` | 0 (touching, not overlapping; wordmark ellipsizes) | 0 |
| 768 | signed-in | `flex` + "Dashboard" label | — | 0 |
| 360 | signed-out | — | 3px | 0 |

`tsc --noEmit` exit 0. (Screenshots still time out in-preview — dead rAF — so this
was verified by measurement, authoritative for overlap/overflow.)

### 2026-07-19 — Batch 1.2: desktop layout for the customer dashboard

**Branch**: `cleanup/dead-code` · **Base**: `5ed9abe`

**Why**: `CustomerDashboard` (what a CUSTOMER sees at `/dashboard`) was built
mobile-first — a sticky `max-w-lg` header, a ~512px content column, and its own
fixed bottom-tab bar. On a laptop/desktop that rendered as a stranded narrow
column with a phone-style bottom bar. Follow-up to Batch 1.1, which started
routing customers *to* this dashboard.

**Change** — [`src/app/dashboard/CustomerDashboard.tsx`](../src/app/dashboard/CustomerDashboard.tsx),
responsive shell only; **mobile is untouched**:

- **`lg+` left sidebar** (`w-60`, fixed) carrying brand, the same `TABS` the
  mobile bar uses (Home/Orders/Rewards/Saved/Account, with the live badges),
  Explore, and a mini identity block with Sign out. Root gets `lg:pl-60`.
- **Mobile header + bottom tab bar are now `lg:hidden`** — the sidebar takes over
  on desktop. Below `lg` everything renders exactly as before.
- **Content column** widens from `max-w-lg` to `lg:max-w-3xl` (~768px), centered
  in the post-sidebar space with balanced margins, and the loading skeleton moved
  *inside* `<main>` so the shell (sidebar) no longer pops in after load.

Width is `lg:max-w-3xl` (~768px), not 5xl — at 768 a 2-col card grid gives two
~378px cards (measured: `grid-template-columns: 378px 378px`), a good width, while
single-column tabs still read well.

**Density pass (same batch):** the uniform-height card lists — Home's Recent
Orders + Delivery History, the Saved list, and the Rewards list — now go
**2-column on `lg`** (`lg:grid lg:grid-cols-2 lg:gap-* lg:space-y-0`), so the
desktop column fills instead of running one card wide. **Orders and Reviews are
deliberately left single-column** because their cards expand in place (2-col +
expand = ragged rows). The grid mechanism was verified generically (the exact
classes resolve to `display:grid` / two 378px tracks at 768px); the *visual*
result still wants a real-login look.

**Verified (structural — measured on the real app, dev `:3007`):**

- Desktop 1280px: sidebar renders (`display:flex`, 240px, left 0, 5 nav
  buttons); main centered at 768px; **page overflow 0**.
- Mobile 375px: sidebar `display:none`; mobile header + bottom nav visible;
  content full-width; **overflow 0** — i.e. mobile unchanged.
- Sidebar nav wiring proven: each click flips `tab` state (the active-pill moves
  Home→Orders→Saved… correctly).
- `tsc --noEmit` exit 0 **and a full `next build` exit 0** (all routes compiled,
  `/dashboard` present).

**⚠️ NOT verified here — needs a real customer login:** the actual tab-content
swap and any visual polish. **Root cause of that gap, worth recording:** the
in-app preview browser does **not run `requestAnimationFrame`** (a `rAF` probe
hard-times-out; screenshots/zoom on any page also time out for the same reason).
`CustomerDashboard` switches tabs with framer-motion `AnimatePresence mode="wait"`,
which holds the outgoing panel until its **exit animation completes** — and that
completion is driven by rAF. With rAF frozen, the exit never finishes, so the
panel appears "stuck" on Home in the preview even though `setTab` fires and state
updates. This is a **preview-environment artifact, not a code bug and not a
regression** — the `AnimatePresence` block is byte-for-byte the pre-existing code
(only wrapped in the loading ternary), real browsers run rAF, and the swap
completes in ~180ms. Confirm the tab swap + look on a real `/dashboard` login.

**Process note (for the next person fighting this repo's dev server):** Turbopack
dev-cache staleness on Windows is real and persistent this session — HMR served
old classNames after edits (fixed only by a fresh browser tab or reload), `.next`
had `[externals]_node:crypto` files with a Windows-illegal `:` that `rm`/`Remove-Item`
can't delete, and a *stale* SWC "Unterminated regexp literal" error lingered in
the browser console from a mid-edit state long after the file was valid. When in
doubt, trust `next build` (clean SWC compile) and server-side `preview_logs` over
the browser console, and re-open a fresh tab to shake off stale HMR.

**Temporary scaffolding used and removed:** a public `/preview-cust` route +
page rendering `<CustomerDashboard/>` (so the layout could be inspected without a
customer session) and a `reactStrictMode: false` toggle (to rule StrictMode out
as the swap cause — it wasn't). Both reverted; `git status` clean of them;
`next.config.ts`/`middleware.ts` unmodified in the final diff.

### 2026-07-19 — Batch 1.1 follow-up: mobile navbar horizontal overflow

**Branch**: `cleanup/dead-code` · **Base**: `5ed9abe`

**Why**: Reported with a Galaxy S8+ (360px) screenshot — the top `Navbar`
overflowed horizontally: "Get Started Free" was clipped and the whole page
scrolled sideways.

**Root cause** (measured, not guessed): the `<nav>` itself was 420px wide in a
360px viewport (`scrollWidth 420` vs `clientWidth 360`). The signed-out actions
row — `Hotels` (full padding) + the `Get Started Free` pill (`px-5`, ✦ sparkle,
full label) — plus the logo simply didn't fit. The bottom nav measuring 420px
was a *downstream* symptom (a `fixed inset-x` element sizing to the overflowed
document), not an independent cause.

**Fix** — [`src/components/layout/Navbar.tsx`](../src/components/layout/Navbar.tsx),
responsive compaction, nothing removed on desktop:

| Element | Mobile (`< sm`) | `sm+` |
| --- | --- | --- |
| Logo mark | `h-8 w-8`, wordmark `text-lg`, `gap-2` | `h-9 w-9`, `text-xl`, `gap-2.5` |
| Hotels link | `px-2.5`, `text-[13px]` | `px-3`, `text-sm` |
| Get Started CTA | `px-3.5`, label **"Get Started"** (✦ + " Free" hidden) | `px-5`, full **"✦ Get Started Free"** |

**Verified on the real app (dev `:3007`, live DB), measured not eyeballed:**

- Page/nav overflow = **0** at **320 / 360 / 375**px (signed-out).
- **Signed-in** state (Dashboard + avatar + Sign Out) simulated by injecting the
  markup into the live layout at 360px → overflow **0** too.
- Desktop 1280px: CTA restored to full "✦ Get Started Free", overflow 0.
- Fresh-tab load console: **clean** (no errors/warnings).
- `tsc --noEmit` exit 0.

**Note on a red herring**: while editing with the dev server warm, the console
showed a `hydration-mismatch` on these exact classNames (server = pre-edit
classes, client = post-edit). It was a Turbopack dev incremental-compile
staleness artifact — the raw SSR HTML (`curl`) contained only the new classes,
and a brand-new browser tab loaded with **no** hydration error. className strings
are static constants, identical on server and client in any single production
build, so this cannot occur in prod. Recorded so it isn't mistaken for a real
bug next time. (Screenshots/zoom on `/` time out in this environment — the
landing page's continuous framer-motion + marquee animations never let the
compositor settle; overflow was verified by measurement instead, which is the
authoritative signal for this class of bug.)

### 2026-07-19 — Batch 1.1: land users in the dashboard after login

**Branch**: `cleanup/dead-code` · **Base**: `5ed9abe`

**Why**: Reported — after signing in (email or Google OAuth) users were dropped
on the public marketing homepage. On mobile the bottom nav rescued them, but on
desktop/laptop the top nav only showed a profile avatar + "Hotels", so a
just-signed-in user had no obvious way into their account and got stuck.

**Two-part fix:**

| Part | Change |
| --- | --- |
| **Post-login destination** | Every sign-in path now lands the user *inside* `/dashboard` instead of `/`. `/dashboard` already renders the right surface per role — owner console for OWNER/ADMIN, `CustomerDashboard` (orders / rewards / saved / reviews / account) for CUSTOMER — so one destination serves both. |
| **Visible "Dashboard" nav link** | `Navbar` now shows an explicit accent-filled **Dashboard** button (icon + label from `sm` up, icon-only on mobile) for signed-in users, pointing at `/dashboard`. The avatar next to it now consistently goes to `/profile` (account) for every role, since the Dashboard button covers the "go to my dashboard" intent. |

**Files:**

- [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts) — OAuth /
  magic-link callback. Added `postLoginHome = next && next !== "/" ? next :
  "/dashboard"`; returning customers and new customer-intent accounts now use it
  instead of the bare `next` (which was always `/`). Owner/admin/Google paths
  were already `/dashboard`. A returning customer without a password now skips
  the set-password nag and lands straight in the dashboard (same precedent the
  owner path already set); a *new* customer still passes through set-password,
  but with `next=/dashboard` so they finish inside the dashboard, not on `/`.
- [`src/app/sign-in/page.tsx`](../src/app/sign-in/page.tsx) — the email+password
  branch previously sent CUSTOMER to `/` and only OWNER/ADMIN to `/dashboard`;
  now all roles go to `/dashboard`, and the (unreachable-here) set-password
  branch carries `next=/dashboard`.
- [`src/components/layout/Navbar.tsx`](../src/components/layout/Navbar.tsx) —
  added the Dashboard button; dropped the role-based `profileHref` (avatar →
  `/profile` for all).

**A genuine return URL still wins.** `postLoginHome` only defaults to
`/dashboard` when `next` is absent or `/`. Today nothing sets a non-root `next`
(both OTP `emailRedirectTo` and OAuth `redirectTo` point at `/auth/callback`
with no `next`), so this is future-proofing for a real "you were gated out of
page X" return flow, not current behaviour.

**No new customer pages were needed** — the "voucher list / favourite food /
ratings given" shortcuts the request worried about already exist as tabs inside
`CustomerDashboard` (Orders, Rewards, Saved, Reviews, Account). This batch just
routes customers *to* that dashboard.

**Verified**: `tsc --noEmit` exit 0. Dev server (`:3007`, live DB) renders `/`
with no console errors; signed-out navbar intact (Log In / Get Started). ⚠️
**Logged-in visual + the actual post-login redirect were NOT exercised** — that
needs a real Supabase account against the live production DB, which wasn't
available. The signed-in navbar branch (Dashboard button) is a pure JSX addition
inside the existing `isSignedIn` conditional and is type-checked; the redirect
changes are server-side string destinations reasoned against the existing flow.
Confirm end-to-end with one real customer and one real owner login before trusting.

**Deliberately not changed**: the middleware rule that already redirects a
signed-in user hitting `/sign-in` → `/dashboard`; the new-owner-with-no-intent
path (still `/auth/get-started`); the set-password model; `CustomerDashboard`'s
internal layout (it's mobile-first / `max-w-lg` and renders as a narrow centered
column on desktop — a candidate for a later desktop-width pass, out of scope here).

### 2026-07-17 — Menu perf, Stock drinks tab, WiFi revamp, cleanups

**Branch**: `cleanup/dead-code` · **Commit**: `ef09130`

Batch from screenshot feedback. All verified live (logged in), tsc + build clean.

| Area | Change |
| --- | --- |
| **Menu — slow load** | Menu data used to not START until ~2.4s: every tab waited on the `/api/restaurants` round-trip to learn the selected restaurant, because the auto-selection was never persisted (only explicit select/create wrote it). `RestaurantContext` now persists the auto-selection → `useResolvedRestaurantId` resolves synchronously. **Measured: menu data start 2422ms → 931ms, API calls 16 → 12.** |
| **Chat burst** | `GlobalChatButton` fetched rooms+broadcast+messages on mount on *every* dashboard page (2–4 calls, StrictMode doubles in dev), clogging the pool. Init deferred ~2.5s. **Chat calls in the initial burst 4 → 0.** |
| **Menu — suggestions** | Removed the dish-name image-suggestion feature (fired `/api/image-search` per keystroke). |
| **Stock — Drinks tab** | `StockTab` now has an Inventory/Drinks switcher rendering the existing `DrinksTab`; also fixes the dead `/dashboard/drinks` deep-link (resolves old item #34). |
| **WiFi** | Revamped + centered; new **auto-connect QR** (standard `WIFI:` payload) + Download-PNG + copy buttons; the "Remove WiFi" button now **persists** (it only cleared local state before). |
| **Rooms** | Removed Location Note + Offerings fields from the room form. |
| **Sidebar** | Removed the "Customer POS Link" block from the restaurant switcher dropdown. |

**Perf note**: the `RestaurantContext` persist-selection fix is global — it
breaks the same waterfall on *every* dashboard tab, not just Menu. The chat defer
helps every page too. This partially addresses open items #27–28 (duplicate
`/api/chat` and `/api/me`): the remaining duplication is React StrictMode in dev +
`/api/me` retries, which is dev-inflated and lower-impact now that chat is off the
critical path.

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
| 47 | **Five admin overlays are still trapped in the tab wrapper's transform** | Same bug fixed in the three restaurant modals: `HardwareTab` (`fixed inset-0` at lines ~139 and ~902) and `PlatformStaffTab` (lines ~167, ~205, ~236) render `position: fixed` layers from inside the `motion.div` at `admin/page.tsx:661`, which carries a transform and therefore becomes their containing block. Their backdrops cover only the content column and the dialogs centre on it instead of the screen. Fix is mechanical — `createPortal(…, document.body)` behind `if (typeof document === "undefined") return null`. Measured evidence in the 2026-08-14 change-log entry. |
| 48 | **15 more `navigator.clipboard.*` call sites are unguarded** | The share fix introduced `copyToClipboard()` in [`src/lib/share.ts`](../src/lib/share.ts) and applied it to the three share buttons, but a survey found **15 other direct `navigator.clipboard` calls** across the app. `navigator.clipboard` is `undefined` outside a secure context, so every one of them throws a `TypeError` when the page is opened over the venue LAN (`http://192.168.x.x`) — which is exactly how staff open the dashboard on a tablet. Several sit behind a "copied!" toast that fires regardless, so they lie rather than fail. Route them all through `copyToClipboard()`. Mechanical, but touches many files, so it was kept out of the crash fix. |
| 5 | **No RLS beyond `audit_logs`** | Application-only tenant isolation. |
| 6 | **`img-src https: http:`** in CSP | Any host, including plaintext HTTP. Needed for image search; tighten to `https:` at minimum. |
| 7 | **`busyOrderIds` is dead in `LiveOrdersTab`** | The `useState` setter is unused (`_setBusyOrderIds`), so the set is always empty, `busy` is always false, and the Accept button never disables — a double-click sends two round PATCHes. `KitchenBoard` does this correctly. Print-on-accept is separately guarded by an 8s per-order claim, so it cannot double-print, but the duplicate request is still real. Fixing it must not add a visible spinner — the owner explicitly wants accept to feel instant. |
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
| 12 | **`batchAt` computed but unused** | In both `createOrder()` and `appendToOrder()`. `OrderItem.createdAt` is documented as a round marker *"set explicitly in code per batch"*, but the `createMany` calls don't pass `createdAt` — rows fall back to `@default(now())`. Round reconstruction may rely on near-identical rather than exact timestamps. Verify against the kitchen board. **2026-08-09**: the two dead `const batchAt = new Date()` declarations were removed (provably unreferenced). The *question* is unchanged — if per-batch round markers are wanted, `createdAt: batchAt` still needs to be passed to `createMany`. |
| 13 | **Repeated enum values in `where` clauses** | e.g. `{ status: { in: ["ACCEPTED","ACCEPTED","ACCEPTED"] } }` in the live-orders route; `{ notIn: ["REJECTED","REJECTED"] }` in `billing.ts`. Residue from the `OrderStatus` collapse. Harmless but the surrounding logic wants a careful re-read. |
| 14 | **`notifyCustomerOrderUpdate` keys on dead enum values** | `PREPARING`/`READY`/`DELIVERED`/`CANCELLED` are no longer in `OrderStatus`; they arrive as `kitchenStatus` strings. Confirm callers pass the right one. |
| 15 | **`TYPE_FEATURES` vs `TYPE_FEATURE_TABS` drift** | Marketing copy and actual tabs are separate unsynced lists. HOTEL advertises "24/7 Room Service" but only gets the `hotel-hub` tab. |
| 16 | **Partial design system** | `design-system/` and `components/ui/` are two half-adopted sets; most code styles with Tailwind + CSS vars directly. The duplicate `button`/`card`/`badge` in `ui/` were removed in this pass; the split remains. |
| 17 | **`tsconfig.json` excludes `antigravity-awesome-skills`** | A directory that no longer exists. |
| 18 | **README says pnpm** | Repo commits `package-lock.json`. README also predates several structural changes. |
| 19 | **40 npm vulnerabilities** | 2 low, 18 moderate, 17 high, 3 critical, per `npm install`. Not triaged. |
| 31 | **8 unused bindings kept on purpose — each marks unwired UI** | Found during the 2026-08-09 lint sweep and **deliberately not deleted**, because deleting them erases the evidence rather than fixing anything. Each needs a product decision: **(a)** `AllOrdersTab` defines `handleDelete`, `handleBulkDelete`, `allSelected` and imports `DeleteConfirmDialog`, but **none is rendered** — admin order delete/bulk-delete is written but not wired to any control. **(b)** `DineInRequestModal` defines `handlePrint` (and pulls `selectedRestaurant`) that nothing calls — no print button. **(c)** `ComboMealsTab` defines a `load` callback that is never invoked. **(d)** `CheckoutSheet` computes `isOnlinePayment` and never reads it — worth confirming no payment branch was meant to hang off it. Either wire them up or delete them. |
| 32 | **Platform-staff MFA is disabled in production** | Not new, but confirmed and now annotated in code: the entire MFA verify/enrol block in [`api/admin/login`](../src/app/api/admin/login/route.ts) is commented out with *"TEMPORARILY DISABLED … to allow seamless QR/Password logins"*. `mfaCode` is still accepted by the request schema and silently ignored, and `otplib`/`qrcode` are imported only for the dead block. Platform staff currently authenticate with email + password alone. |
| 33 | **`/api/admin/orders` does not validate `status`/`type`** | Both come straight off the query string into the Prisma `where`. Typing the filter as `Prisma.OrderWhereInput` exposed this; a cast was used to keep behaviour identical (an unknown value still reaches Prisma and surfaces as a query error). Validate against the enums and return 400 instead. |

### Delivery platform — opened by Phase 0 (2026-07-25)

| # | Item | Detail |
| --- | --- | --- |
| 36 | **`Order.kitchenStatus` / `OrderItem.kitchenStatus` are still `String?`** | They carry exactly the `KitchenStatus` enum values. Convert in a dedicated deploy: add enum column → backfill → switch reads → drop the string. Until then everything must go through `lib/orders/kitchen-status.ts`. |
| 37 | **Schema is written but NOT deployed** | Phase 0 added 5 models, 3 enums and ~20 columns to `schema.prisma`. Nothing has been pushed. Deploy with `ADDITIVE_SCHEMA_SYNC=true` and backfill `RestaurantCapability` (from `Restaurant.deliveryEnabled`) + `RestaurantHours` (from `openingTime`/`closingTime`) **before** shipping code that reads them. |
| 38 | **`features/DeliveryZonesTab.tsx` / `DeliveryOpsTab.tsx` are still fake** | Pure local `useState` and mock orders. The real equivalents now live in Settings → Delivery & Pickup and `/dashboard/delivery`. **Delete both and drop their feature ids** — left in place only to avoid touching `getFeatureTabsForType` in the same change. |
| ~~39~~ | ~~`HotelsMapView` hits `tile.openstreetmap.org`~~ — **DONE**: both hotel maps now use `lib/map-tiles.ts` (CartoDB). | resolved |
| 45 | **`PEXELS_API_KEY` is rejected — rotate it** | The key in `.env` is present but the API answers `401 {"code":"Unauthorized","message":"Invalid API key"}`, so the best food-photo source has been silently absent from every menu image search. Generate a new free key at <https://www.pexels.com/api/> and set it in `.env` **and in Vercel**. Nothing in code can fix this. Search still works on Openverse + Wikimedia meanwhile, and the route now logs the reason once and stops retrying until redeploy. |
| 41 | **CRON_SECRET must be set in Vercel** | `/api/cron/purge-location-pings` refuses to run without it — by design, since it deletes rows. If the env var is missing the retention job silently never runs and rider location history accumulates indefinitely. Verify after deploy. |
| 44 | **Two admin API routes now have no UI** | `/api/admin/hero-settings` and `/api/admin/landing-settings` survive after their Master Admin tabs were removed, because the orphaned B2B landing components still read from them. Resolve together with item 43: if those components are deleted, delete these routes too. |
| 43 | **Seven B2B landing sections are now orphaned** | `LandingHero`, `PlatformModules`, `HardwareShowcase`, `CoreFeatures`, `BusinessMetrics`, `FAQSection`, `CTASection` are no longer imported by anything. They are good components with no home. Either build a `/partners` page from them or delete them — leaving them is how dead code accumulates. |
| 42 | **Checkout does not yet call the delivery-quote endpoint** | The order path prices delivery correctly server-side and refuses out-of-range drop-offs, and `POST /api/public/restaurants/[slug]/delivery-quote` exists — but `CheckoutSheet` still shows the old flat estimate. Wire it so the customer sees the real charge *before* paying rather than at the order-rejected step. |
| 40 | **eSewa defaults to SANDBOX endpoints** | `ESEWA_GATEWAY_URL` falls back to `rc-epay` and `ESEWA_VERIFY_URL` to `uat.esewa.com.np`. There is already a loud `console.error` when these are unset in production, but confirm the live values are actually set in Vercel. |

### Dashboard load — found while fixing the tables flicker (2026-07-17)

Measured on the real app. None of these were caused by that fix; all were
surfaced by instrumenting it. Ordered by waste.

| # | Item | Evidence |
| --- | --- | --- |
| 25 | **Create-then-reconcile is unverified.** The original `cacheTtl: 0` existed because a stale list clobbered a just-created table so it "vanished until refresh". The shared `useTables` cache preserves `cacheTtl: 0`, so the guard should hold — but it was **not** re-tested, because proving it requires writing to the live DB. Test on a throwaway table before trusting it. **Also re-check that a newly created table survives the localStorage snapshot** added in `d856388`. | reasoning only |
| ~~31~~ | ~~Waterfall fix scoped to /tables only~~ — **DONE**: Menu, Stock, Staff, Billing, ManualBilling now use `useResolvedRestaurantId`. | resolved |
| ~~32~~ | ~~Other tabs may share the empty-state lie~~ — **DONE**: they did, in three disguises. All gated on `isFirstLoad` now. | resolved |
| 33 | **~50 dashboard tabs still hand-roll their fetch.** Only the 5 daily drivers were converted. The remaining feature tabs (`features/*`, Feedback, Media, HeroSlides, Coupons, HotelHub, RoomManagement…) still hit the waterfall, and several share the `if (!restaurant) return null` blank-screen pattern (`RoomManagementTab:164`, `HotelMediaLibrary:136`, `FeedbackTab:404`). Convert with `useRestaurantResource` when touched. | code read |
| ~~34~~ | ~~`/dashboard/drinks` deep-link broken~~ — **DONE** (`ef09130`): StockTab now takes `initialStockTab` and opens the Drinks tab. | resolved |
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
