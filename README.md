# HimalHub (Himavolt)

**HimalHub** is a comprehensive, multi-tenant SaaS operating system designed for restaurants, cafes, resorts, hotels, bakeries, and cloud kitchens. It provides an end-to-end digital ecosystem handling digital menus, POS (Point of Sale), KDS (Kitchen Display System), live table sessions, delivery tracking, payment gateway integrations, and hotel room booking.

---

## 🚀 Tech Stack & Architecture

- **Framework**: [Next.js 14/15+](https://nextjs.org/) (App Router)
- **Language**: TypeScript (`strict` mode)
- **Database**: PostgreSQL (managed via [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/) (with local edge client generation)
- **Authentication**: Custom Auth with Supabase (Session storage), Firebase Admin, custom PIN-based Staff login.
- **Styling**: Tailwind CSS v4, Framer Motion, GSAP, Radix UI (Shadcn UI patterns).
- **3D Integrations**: `react-three/fiber`, `@react-three/drei` (floating digital menus and scenes)
- **Live / Real-time**: Server-Sent Events (SSE) via Next.js API routes (`stream/route.ts`).
- **Payments**: Local Gateways (eSewa, Khalti), Bank Transfer (OCR based proof validation via `tesseract.js`).

---

## 📂 Core Folder Structure

```text
├── prisma/                  # Prisma schema, migrations, and seed scripts.
├── public/                  # Static assets, PWA manifest, offline fallbacks.
├── scripts/                 # Build tooling and deployment scripts.
├── src/
│   ├── app/                 # Next.js App Router (Multi-tenant multi-role routes).
│   │   ├── admin/           # Super-admin master dashboards.
│   │   ├── api/             # RESTful endpoints and SSE streams.
│   │   ├── dashboard/       # Restaurant owner/manager dashboard.
│   │   ├── hotel/           # Hotel booking & room management routes.
│   │   ├── kitchen/         # KDS (Kitchen Display System).
│   │   ├── menu/            # Customer-facing digital menu and table ordering.
│   │   ├── pos/             # Point of Sale terminal for cashiers/staff.
│   │   └── track/           # Live order tracking and delivery statuses.
│   ├── components/          # Reusable UI organized by domain.
│   │   ├── admin/           # Platform admin components.
│   │   ├── dashboard/       # Owner/Manager setting tabs.
│   │   ├── pos/             # POS Terminal, Kiosk mode, Split bill UIs.
│   │   ├── three/           # 3D canvas and Three.js particle components.
│   │   └── ui/              # Base primitive components (Buttons, Cards, Dialogs).
│   ├── context/             # Global React Contexts (Auth, LiveOrders, POS, Cart).
│   ├── hooks/               # Custom hooks (`useSSE`, `useActiveTableSession`).
│   └── lib/                 # Core utilities, API clients, DB access, Gateways.
└── supabase/                # Supabase SQL migrations and RLS policies.
```

---

## 🗄️ Domain Models (Prisma Schema Highlights)

The database captures advanced real-world restaurant & hospitality operations:

1. **User & Auth**: Distinguishes `CUSTOMER`, `OWNER`, `ADMIN`. Handles global profiles.
2. **Restaurant**: The core multi-tenant entity. Tracks configurations (Tax, WiFi, operational status, POS features, prepaid/postpaid flags, dynamic themes).
3. **StaffMember & Shift**: Staff login with `PIN`, roles (`MANAGER`, `CHEF`, `WAITER`), clock-ins, and shift reporting.
4. **Menu & Inventory**: Maps `MenuCategory` -> `MenuItem`. Links `InventoryItem` (Stock) to Food/Drinks, tracking raw material costs.
5. **Orders & Table Sessions**: Supports Table-based (QR) sessions, Kiosk self-checkout, Takeaway, and Delivery. Handles status transitions (Placed -> Prep -> Ready -> Billed).
6. **Payment & Billing**: `PaymentConfig` dictating cash/eSewa/Khalti/Bank logic. Validates bank receipts. Handles split bills and GST/Service Charges.
7. **Hospitality (Hotels)**: `Room` and `RoomBooking` models specific to resorts and guest houses. Maintains hotel advance types.
8. **Engagements**: Feedback loop, MenuItem ratings, Instagram-style Food `Stories`.

---

## ⚙️ Key Workflows & Features

### 1. Point of Sale (POS) & Kiosk

Accessible via `/pos/staff`. Managed by a master switch (`posEnabled`).
Supports dual-mode:

- **Staff Terminal Mode**: Cashier entry, active order panel, split billing, register reconciliation.
- **Kiosk Customer Mode**: Hardware-button locked, self-service tablet ordering.

### 2. Kitchen Display System (KDS)

Located at `/kitchen`. Staff with `CHEF` role view live orders ticking down (`useCountdown`), mark preparation states, and ping waiters when food is ready via Web Push Notifications (FCM).

### 3. Server-Sent Events (SSE) live-sync

Instead of heavy WebSockets, the app uses cheap Next.js API `stream` endpoints (e.g. `/api/restaurants/[id]/orders/stream`). `useSSE.ts` hook catches event payloads to automatically refresh the `LiveOrdersContext` without manual polling.

### 4. Dynamic Menu & 3D Interactive UI

Customers scan a QR and view themes customized by the restaurant owner (`primaryColor`, `fontFamily`). `FloatingFoodShapes` and `StoryHero` offer interactive menus replacing standard static pages.

---

## 🔐 Environment Variables

**[`.env.example`](.env.example) is the single source of truth.** It documents
every variable the code reads, what breaks when each is missing, and where to
source it.

```bash
cp .env.example .env.local
```

- Recovering values, or setting up a new machine → [`docs/10-env-recovery.md`](docs/10-env-recovery.md)
- Deployment, build modes and cron → [`docs/09-operations.md`](docs/09-operations.md)

Three things that are easy to get wrong:

- `DATABASE_URL` is the **pooled** connection (port 6543, `?pgbouncer=true`) and
  `DIRECT_URL` is the **direct** one (port 5432). Schema sync needs the second;
  runtime uses the first.
- eSewa and Khalti merchant codes and secret keys are **not** environment
  variables. They are per-restaurant, stored encrypted in `PaymentConfig`. Only
  the gateway *endpoint URLs* live in the environment — and if those are unset,
  the code silently falls back to sandbox.
- `ENCRYPTION_KEY` decrypts those stored payment credentials. Read
  [`docs/10-env-recovery.md`](docs/10-env-recovery.md) before changing it.

---

## 🛠️ Local Development Setup

> Use **npm**, not pnpm. `package-lock.json` is what this repo commits.

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Generate the Prisma client** — required after every clone, because
   `src/generated/prisma` is gitignored:
   ```bash
   npx prisma generate
   ```
3. **Run the dev server**:
   ```bash
   npm run dev
   ```

> ⚠️ **`.env.local` points at the live production database.** There is no
> staging database. Reads are safe; treat every write as production.
>
> Do **not** run `prisma db push` or the seed scripts unless `DATABASE_URL` and
> `DIRECT_URL` point somewhere you are willing to lose. `npm run build` locally
> is safe — it defaults to Mode 1 and writes nothing to the database.

---