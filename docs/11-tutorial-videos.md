# 11 — Tutorial Videos

Platform-authored product walkthroughs: the `/demo` page, the "Watch video"
control in the dashboard, and the post-signup prompt.

> **Ships with a schema change.** Two new tables and two new enums. Deploy the
> schema before the code — see [Deploying](#deploying) at the bottom.

## Shape

| Piece | Path |
| --- | --- |
| Models | `TutorialCategory`, `TutorialVideo` in [`prisma/schema.prisma`](../prisma/schema.prisma) |
| Domain helpers | [`src/lib/tutorials.ts`](../src/lib/tutorials.ts) |
| Browser compression | [`src/lib/video-compress.ts`](../src/lib/video-compress.ts) |
| Admin authoring | [`src/components/admin/TutorialVideosTab.tsx`](../src/components/admin/TutorialVideosTab.tsx) — admin tab `tutorials`, labelled "Demo Videos" |
| Public gallery | [`src/components/tutorials/TutorialGallery.tsx`](../src/components/tutorials/TutorialGallery.tsx) |
| Player | [`src/components/tutorials/VideoPlayer.tsx`](../src/components/tutorials/VideoPlayer.tsx) |
| Post-signup prompt | [`src/components/tutorials/DemoPromptModal.tsx`](../src/components/tutorials/DemoPromptModal.tsx) |
| Dashboard entry point | [`src/components/tutorials/WatchDemoButton.tsx`](../src/components/tutorials/WatchDemoButton.tsx) |
| Public page | [`src/app/demo/page.tsx`](../src/app/demo/page.tsx) |

## The `/demo` route was already taken

`/demo` previously held a **"Book a Demo"** lead-generation stub that pointed at
`/contact`. Two live CTAs drove traffic to it —
[`CTASection.tsx`](../src/components/home/CTASection.tsx) ("Book a Live Demo")
and [`features/[id]/page.tsx`](../src/app/features/[id]/page.tsx).

Resolution, so no funnel was silently repurposed:

| Route | Holds | Linked from |
| --- | --- | --- |
| `/demo` | Video walkthroughs | Landing nav "Demo Videos", dashboard "Watch video", post-signup prompt, feature pages ("Watch the Demo") |
| `/demo/book` | The original booking stub | Landing CTA section ("Book a Live Demo") |

The landing hero's "Book a Demo" button already pointed at `/contact` and was
left alone. The two pages cross-link.

## Access control

Authoring is **MASTER_ADMIN only**. This is the first surface in the codebase to
need that distinction, because `requireAdmin()` deliberately also admits
`PLATFORM_STAFF`. `requireMasterAdmin()` in
[`src/lib/require-admin.ts`](../src/lib/require-admin.ts) is the stricter guard,
and every `/api/admin/tutorials/*` route uses it.

Viewing is per video, via `TutorialVideo.audience`:

| Value | Who sees it |
| --- | --- |
| `PUBLIC` | Everyone can watch it, including logged-out visitors |
| `AUTHENTICATED` | Everyone can *see* it; only a signed-in identity can play it |

`GET /api/tutorials` resolves the viewer against all four auth systems, then
lists every active video but blanks `videoUrl` and `embedId` on anything the
viewer cannot play, flagging it `locked: true`. The row still carries title,
poster, duration and section — enough to advertise the video, nothing with
which to fetch it. **The boundary is that blanking, not the padlock overlay**:
the media never reaches the client, so reading the network response or deleting
a class in devtools yields nothing.

Members-only videos are listed rather than hidden because seeing that a POS
walkthrough exists is the argument for signing up; a filtered-out row persuades
nobody. Their card is a link to `/sign-in` rather than a button, so it behaves
like a link — middle-click, status bar preview, keyboard focus.

`featured` is chosen only from playable videos, so the post-signup prompt can
never nominate one the viewer would be blocked from watching.

## Two source types

`TutorialVideo.sourceType` decides how the player renders.

### `UPLOAD`

Goes through the existing signed-URL flow — `POST /api/upload` mints a Supabase
upload URL and the browser `PUT`s the file directly, never through Vercel. The
route already allowed video and caps it at **50MB**.

`videoUrl` is validated on write to start with `NEXT_PUBLIC_SUPABASE_URL` +
`/storage/`. Without that check the column would accept any URL and the player
could be pointed at an arbitrary third-party host.

### `EMBED`

A pasted YouTube or Vimeo link, parsed by `parseEmbedUrl()` into
`provider` + `embedId`. Preferred for anything long: the providers stream
adaptively, which self-hosting a single MP4 cannot do.

The player renders a **click-to-load facade** rather than an iframe on mount —
the provider's ~1MB of player JS and its cookies only load after an explicit
play.

> **CSP:** `next.config.ts` had no `frame-src`, so `default-src 'self'` applied
> and provider iframes were blocked outright. A `frame-src` allowing
> `youtube-nocookie.com`, `youtube.com` and `player.vimeo.com` was added with
> this feature. Adding a third provider means editing that directive too.

## Why compression runs in the browser

Vercel Hobby gives a serverless function a 4.5MB request body and a 60s ceiling.
Server-side transcoding is not possible on this plan at any file size worth
compressing. Uploads already bypass Vercel entirely, so the only place a large
file can shrink is before it leaves the machine.

`compressVideo()` decodes the source into a `<video>`, draws each frame to a
canvas at the target resolution, captures that canvas as a `MediaStream`, and
re-encodes it through `MediaRecorder` at a bitrate derived from the size budget.
Audio is lifted off the source element's own captured stream.

Three honest limits, all surfaced in the UI rather than hidden:

1. **It is a re-encode, not lossless.** "Compress without losing quality" is not
   physically achievable. What this targets is *visually* lossless for
   screen-recorded content. The admin sees projected size, actual before/after
   numbers, and an inline preview of the result before publishing, and can
   reject it and pick another preset.
2. **It runs in real time.** `MediaRecorder` follows the wall clock, so a 6-minute
   video takes ~6 minutes. Raising `playbackRate` desynchronises the output
   timestamps, so it is deliberately not done. The UI states the expected wait.
3. **It needs `canvas.captureStream` + `MediaRecorder`.** Feature-detected via
   `isCompressionSupported()`. Where absent, the UI directs the admin to a
   smaller file or the Link tab.

Codec preference is VP9 → VP8 → WebM → MP4, picked by
`MediaRecorder.isTypeSupported`. Safari only offers MP4/H.264 and lands on the
last entry.

## Onboarding sequence

`DemoPromptModal` is the closing beat of **setup**, not of signup, mounted in
[`src/app/providers.tsx`](../src/app/providers.tsx) inside `RestaurantProvider`.

Two gates, neither of which couples it to the other onboarding component:

1. `AccountSetupModal` claims the screen while `hasPassword === false`, so this
   waits for `hasPassword !== false`.
2. **The operator must already own a restaurant** — `hasFetched &&
   restaurants.length > 0` from `RestaurantContext`, which is why it is mounted
   inside that provider rather than beside `AccountSetupModal`. Both halves
   matter: an empty list mid-load looks identical to a genuinely empty account,
   and prompting on that guess is the original bug.

It previously fired on the first signed-in page load, which put a tour of the
product in front of someone who had not yet created the thing being toured, and
stacked an overlay onto a screen still mid-setup.

### Why it was visible but unclickable

The prompt used to render on top of `CreateRestaurantModal` and ignore every
click. The cause is `@radix-ui/react-dialog`: an open Radix modal sets
**`pointer-events: none` on `<body>`** and re-enables them only inside its own
content. `DemoPromptModal` is portalled to `document.body`, so it inherited
that and every click fell straight through.

Measured on `/nearby`, opening the header's location picker:

| | `[role="dialog"][data-state="open"]` | `body` pointer-events |
| --- | --- | --- |
| closed | absent | `auto` |
| open | present | **`none`** |
| after Escape | absent | `auto` |

Two defences, in that order of importance:

1. **Never open on top of another dialog.** The prompt polls until no
   `[role="dialog"][data-state="open"]` is on screen. This is also just correct
   sequencing — a dialog titled "New Restaurant" *is* setup in progress.
2. **`pointer-events-auto` on the overlay root**, so a dialog that slips past
   the first defence cannot render the prompt inert.

The modal is also portalled to `document.body` like every other modal here,
which is what put it in body's scope in the first place — worth keeping, but it
is not on its own sufficient.

It opens the video flagged `isFeatured` (deep-linked as `/demo?v=<id>`), and is
shown **once per account, permanently** — dismissing writes `hv_demo_prompt_seen`
to `localStorage` and it never returns. An onboarding nudge that keeps
reappearing stops being helpful; the durable entry point is the "Watch video"
control in the dashboard header, which appears on every dashboard page.

Only one video can be featured. Both the create and update paths clear the
previous flag rather than relying on a constraint.

## Editing after publish

Every field is editable from the pencil on each row, in a portalled modal
(`TutorialEditModal`): title, section, description, order, audience, published
and featured flags, the poster, and the media itself.

Authoring and editing are separate components on purpose. Authoring is a funnel
— pick a file, get it under the limit, publish. Editing is the opposite shape:
everything is already set and any single field may be the only thing changing.
An earlier attempt to serve both from one form left half the controls inert half
the time.

**Replacing the media** swaps every field that describes it — duration, size,
dimensions, mime type, provider, embed id — because a new file inheriting the
old numbers makes the player render against stale metadata. The PATCH route
enforces this: passing `sourceType` without `videoUrl` is rejected.

**Trimming** sets an in and out point, applied during the same real-time pass as
compression. This is nearly free: the encoder already replays the file through a
canvas, so a clip costs a seek and an early stop, and a 20s selection out of a
10min source encodes in 20s rather than 10min. Bitrate is budgeted against what
is kept, so trimming buys quality as well as size. `clipWindow()` clamps stale
or inverted values and refuses anything under `MIN_CLIP_SECONDS`, below which
MediaRecorder emits an unplayable stub.

**What trimming is not.** There is no multi-clip assembly — no joining takes,
no cutting a section out of the middle, no reordering. That needs a frame-
accurate timeline and a second encoder pass, and doing it over MediaRecorder
means hot-swapping the source mid-recording, which drops audio sync and records
the load gap as frozen frames. Cut footage together in a real editor and upload
the result, or put the long version on YouTube via the Link tab.

## Operational notes

- **Storage budget.** Supabase free tier is ~1GB total. At a compressed ~20MB
  per video that is roughly 50 walkthroughs. Long videos belong on YouTube via
  the Link tab, not in the bucket.
- **Deleting a video does not delete the stored object.** Orphaned objects are
  cheap next to the risk of stranding another row that references the same URL.
- **Deleting a section is refused while it still holds videos.** The schema
  cascades, so an unguarded delete would silently take every video with it.
- **View counts** are incremented at 5s of playback (or ⅓ through a short clip),
  rate limited to 5/hour per client. It is a vanity metric — a miss is fine.

## Deploying

> **Already applied on 2026-08-17.** `tutorial_categories` and
> `tutorial_videos` exist in the production database. The steps below are kept
> as the record of what ran, and as the pattern for the next schema change.

This adds `tutorial_categories` and `tutorial_videos`, plus the `TutorialSource`
and `TutorialAudience` enums. All additive — no existing column is altered.

Normally that means Mode 2: set `ADDITIVE_SCHEMA_SYNC=true` in Vercel, deploy,
confirm both tables, then **unset the flag**.

That route was unavailable when this shipped: the Supavisor pooler was refusing
connections, and Vercel's `DIRECT_URL` points at the pooler, so a build-time
`prisma db push` would have failed. The generated SQL was reviewed
(`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
--script`), confirmed to contain no `ALTER`/`DROP` against existing objects, and
applied in a single transaction over the direct connection. Row counts before
and after were identical; `public` tables went 71 → 73.

Until the tables exist, every `/api/tutorials` call throws. The public `/demo`
page degrades to its "coming soon" empty state rather than erroring, and
`DemoPromptModal` renders nothing, but the admin tab shows a load failure —
which is exactly what "Could not load tutorial videos." means.

### Prisma CLI and `.env.local`

`prisma.config.ts` originally did `import "dotenv/config"`, which loads **only**
`.env`. Next.js loads `.env.local` first, so on a `.env.local`-only setup — what
`vercel env pull` produces — every Prisma CLI command failed with `P4003 No URL
defined in the configured datasource` while the app itself ran fine. It now
loads `[".env.local", ".env"]` in Next's precedence order.

After deploying, open **Admin → System → Demo Videos** and use "Create the six
default sections" once to seed the section list.
