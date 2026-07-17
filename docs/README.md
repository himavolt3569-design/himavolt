# HimalHub / HimaVolt — Documentation Index

Reference documentation for the HimalHub codebase (npm package name: `himavolt`,
public brand: **HimaVolt**, domain `himavolt.com`).

> **This is a live production application** deployed on Vercel with real users
> and real money moving through it. Read [09-operations.md](09-operations.md)
> before changing anything that touches the database schema, payments, or auth.

## What this is

A multi-tenant SaaS operating system for hospitality businesses in Nepal —
restaurants, cafés, bars, bakeries, cloud kitchens, momo shops, sweet shops,
hotels, resorts and guest houses. One codebase serves eight distinct user
surfaces (public marketing site, customer menu/ordering, owner dashboard, staff
POS, kitchen display, counter, customer-facing display, and a platform master
admin).

## Documents

| Doc | Covers |
| --- | --- |
| [01-architecture.md](01-architecture.md) | Tech stack, folder layout, request lifecycle, rendering strategy |
| [02-data-model.md](02-data-model.md) | Every Prisma model, enum, relation and index |
| [03-auth-and-access.md](03-auth-and-access.md) | The four parallel auth systems, middleware, roles, session cookies |
| [04-routes-pages.md](04-routes-pages.md) | Every page route and what renders on it |
| [05-api-reference.md](05-api-reference.md) | All 197 API route files with methods and access level |
| [06-components.md](06-components.md) | All 205 components by domain, plus contexts and hooks |
| [07-features-and-tenancy.md](07-features-and-tenancy.md) | Restaurant types, the feature-tab system, admin overrides |
| [08-payments-and-billing.md](08-payments-and-billing.md) | eSewa, Khalti, bank proof, prepaid, bills, tax, coupons |
| [09-operations.md](09-operations.md) | Deployment, build modes, env vars, cron, realtime, known risks |

## Fast orientation

If you are new to this codebase, read in this order:

1. **[01-architecture.md](01-architecture.md)** — the shape of the thing.
2. **[03-auth-and-access.md](03-auth-and-access.md)** — the single most
   surprising part of the system. There are four independent auth mechanisms.
3. **[07-features-and-tenancy.md](07-features-and-tenancy.md)** — why a "Bar"
   sees different dashboard tabs than a "Guest House".
4. **[02-data-model.md](02-data-model.md)** — as reference, not front to back.

## Scale of the codebase

| Metric | Count |
| --- | --- |
| Git-tracked files | 616 |
| Lines of code in `src/` | ~96,500 |
| Prisma models | 50 |
| Prisma enums | 12 |
| API route files | 197 |
| Page routes | 46 |
| React components | 205 |
| React contexts | 8 |
| Custom hooks | 11 |
| Library modules in `src/lib` | 47 |

## Conventions used in these docs

- Paths are relative to the repository root and clickable in most editors.
- "Owner" means a `User` with `role = OWNER` who owns a `Restaurant` row.
- "Staff" means a `StaffMember` row authenticated by PIN, holding a
  `staff_session` JWT — a **different** mechanism from Supabase user auth.
- "Master admin" means the single platform-operator account authenticated
  against environment variables, holding a `master_admin_session` JWT.
- "Restaurant" is the tenant entity for *every* business type, including hotels.
  A hotel is a `Restaurant` row with `type = HOTEL` and `Room` children.

## Keeping these docs current

These docs were generated from a full read of the codebase. When you change
something structural — a new model, a new auth path, a new restaurant type, a
new feature tab — update the corresponding document in the same pull request.
