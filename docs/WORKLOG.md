# WORKLOG — living state of the project

**Read this first if you are an AI assistant or a new contributor picking this
project up.** It is the running record of what has been changed, why, what was
deliberately *not* changed, and what to do next. It is maintained by hand and
must be updated in the same change as any structural work.

- **Project**: HimalHub / HimaVolt — multi-tenant hospitality SaaS for Nepal
- **Status**: **LIVE IN PRODUCTION** on Vercel, real users, real payments
- **Stack**: Next.js 16 App Router · React 19 · Prisma 7 · PostgreSQL/Supabase · TypeScript strict
- **Reference docs**: [`docs/README.md`](README.md) indexes nine documents
- **Last updated**: 2026-07-19

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
