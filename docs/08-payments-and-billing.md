# 08 — Payments, Orders & Billing

The money paths. This is the highest-risk area of the codebase — it is live and
handling real transactions.

## Payment methods

`enum PaymentMethod { ESEWA, KHALTI, BANK, CASH, COUNTER, DIRECT }`

| Method | Flow |
| --- | --- |
| `CASH` | Physical cash, settled at counter |
| `COUNTER` | "Manual Pay" — pay at the counter, staff marks paid |
| `DIRECT` | "Fast Pay" — staff-initiated walk-in |
| `BANK` | Customer transfers, uploads proof, staff verifies |
| `ESEWA` | Nepal wallet — hosted form redirect |
| `KHALTI` | Nepal wallet — hosted redirect |

Availability per restaurant is driven by `PaymentConfig` (`cashEnabled`,
`esewaEnabled`, `khaltiEnabled`, `bankEnabled`) plus `Restaurant.counterPayEnabled`
and `Restaurant.directPayEnabled`.

`enum PaymentStatus { PENDING, AWAITING_VERIFICATION, COMPLETED, FAILED,
CANCELLED, REFUNDED, EXPIRED }`

---

## Order creation — the transactional core

[`src/lib/orders/create-order.ts`](../src/lib/orders/create-order.ts).

### The contract

> Everything that must succeed or fail together runs inside ONE interactive
> `$transaction`. **NO side effects** (realtime, SSE, FCM, printing) happen
> here — the caller fires those only AFTER commit succeeds.

Inside the transaction (20s timeout, 10s maxWait):

1. `Order` + `OrderItem[]` via `createMany`, each item `kitchenStatus: "PENDING"`
   and an optional `prepTimeSnapshot`
2. `PrepaidToken` if `restaurant.prepaidEnabled`, then link it to the order
3. `Delivery` record if `type === "DELIVERY"`
4. `Payment` — **always starts `PENDING`** (QR/online is verified by staff later)
5. Link `TableSession` via `updateMany` (not `update`) so a stale session id
   can't abort the transaction
6. `generateBill(orderId, { taxConfig, tx })`
7. `restaurant.totalOrders` increment
8. **Coupon `usedCount` increment** — deliberately inside the transaction so a
   rollback never leaves a coupon marked used without an order. Validation is
   read-only in the route; only the increment lives here.
9. `deductStock(items, tx)`
10. `PrintJob` (KOT) enqueue — inside the transaction so a rollback can never
    leave an orphaned print job, and a commit always leaves one

### Idempotency

Restaurant-scoped, three-layered:

1. **Fast path** — before the transaction, `findByIdempotencyKey(restaurantId,
   key)` returns the existing order with `deduped: true`.
2. **DB constraint** — `@@unique([restaurantId, idempotencyKey])`.
3. **Race resolution** — two simultaneous submits: the loser catches Prisma
   `P2002` and resolves to the winner's order rather than surfacing an error.

Client generates the key with `newIdempotencyKey()` (`crypto.randomUUID()` with a
timestamp+random fallback).

### Deliberate absence of a fallback

> This relies on the Phase 2.5b additive columns existing in the database. Deploy
> the schema first (`ADDITIVE_SCHEMA_SYNC=true`) — there is no silent "retry
> without new columns" fallback, **by design** (silent degradation would drop the
> idempotency/track-token guarantees).

Do not add one.

### Identifiers

- `orderNo` — `HH-${Date.now().toString(36).toUpperCase()}`
- `trackToken` — `randomBytes(24).toString("hex")` (48 hex chars), the opaque
  public tracking token for `/order-track/[trackToken]`
- `billNo` — `INV-${orderNo without "HH-"}`

### `appendToOrder()` — running tabs

Adds items to an open order. Same transactional discipline. Increments
`subtotal`/`tax`/`total` on the order, increments `payment.amount` via
`updateMany` (no-op if no payment), regenerates the bill, deducts stock, and
enqueues an **add-on KOT** (`isAddOn: true`, `batchLabel: "Add-on"`).

Note the note-merging cap: concatenated notes are `.slice(0, 500)` so many add-on
rounds can't grow the field unbounded.

Auth/ownership and idempotency are enforced by the **caller** (the orders route)
before this runs.

---

## Server-side price authority

`createOrderSchema` (`src/lib/validations.ts`) accepts from the client:

```ts
{ name, quantity, menuItemId, addOns }
```

It does **not** accept `price`. The server re-derives every price from the menu.
`prepTime` was likewise dropped — the server reads it from menu metadata to build
`prepTimeSnapshot`.

`autoAccept` (Fast Pay) is only honoured when a staff session is present for the
restaurant. Customer-direct callers cannot bypass the PENDING queue.

---

## Bill computation

[`src/lib/billing.ts`](../src/lib/billing.ts).

### `getTaxConfig(restaurantId, preloaded?)`

Defaults: `taxRate` 13%, `serviceChargeRate` 10%. Both gated by their `*Enabled`
flag — when disabled the rate resolves to 0. Pass `preloaded` (a restaurant row
you already fetched) to skip a DB round-trip.

### `generateBill(orderId, opts?)`

```
serviceCharge = round(subtotal × serviceChargeRate/100, 2)   [if enabled]
total = round(subtotal + tax + serviceCharge + deliveryFee − couponDiscount, 2)
```

Upserts: updates an existing bill (e.g. after items are added) or creates one.
Runs inside the order transaction when `opts.tx` is supplied.

Note the defensive read of `couponDiscount` — it's accessed through a
`Record<string, unknown>` cast with a `typeof === "number"` check, explicitly
because the column may not exist in production (schema drift).

### `applyDiscount(orderId, amount, reason?)`

Discount applies only to **food charges** — `subtotal + tax + serviceCharge`. The
delivery fee is excluded from the cap:

```
maxDiscount  = subtotal + tax + serviceCharge
safeDiscount = min(max(0, amount), maxDiscount)
newTotal     = subtotal + tax + serviceCharge + deliveryFee − safeDiscount
```

### `collectPayment(orderId, method, transactionId?)`

**Idempotent** — if `payment.status === "COMPLETED"` it returns the existing
payment rather than creating a duplicate. Uses `bill.total` when a bill exists
(it includes service charge), else `order.total`.

### `getDailySummary(restaurantId)`

Groups revenue three ways:

| Bucket | Methods |
| --- | --- |
| Cash | `CASH` |
| Digital | `ESEWA`, `KHALTI` |
| Counter | `COUNTER`, `DIRECT`, `BANK` |

`onlineRevenue` is an alias of `digitalRevenue`, kept for backward compatibility.
Also returns a per-method breakdown, `pendingAmount` and `totalDiscount`.

### `SAFE_ORDER_SELECT`

An explicit field list used by billing reads, commented:

> Explicit select for order fields to avoid pulling columns that may not exist in
> the production database (e.g. `isHeld`, `heldAt`, `couponId`, `couponDiscount`,
> `isPrepaid`, `prepaidTokenId`). Prevents "column does not exist" errors.

---

## eSewa

[`src/lib/payments/esewa.ts`](../src/lib/payments/esewa.ts). Per-restaurant
credentials (`esewaMerchantCode`, `esewaSecretKey`) decrypted from `PaymentConfig`.

### Initiate

Signature is HMAC-SHA256, base64:

```
signed string: total_amount=<x>,transaction_uuid=<y>,product_code=<z>
transaction_uuid = `${orderId}-${Date.now()}`
signed_field_names = "total_amount,transaction_uuid,product_code"
```

Returns a form POST target. Success/failure URLs default to
`/api/payments/esewa/callback?orderId=…`.

### Verify

`GET <ESEWA_VERIFY_URL>?product_code&total_amount&transaction_uuid` →
`status === "COMPLETE"` → `{ transactionId: data.ref_id ?? transaction_uuid }`.

### Sandbox guard

Both `esewa.ts` and `khalti.ts` log a loud `console.error` at module load if
running in production without the gateway env vars set:

> eSewa is falling back to SANDBOX endpoints in production. Set
> `ESEWA_GATEWAY_URL` and `ESEWA_VERIFY_URL` to the live eSewa URLs.

**This is a real production hazard.** The defaults are sandbox
(`rc-epay.esewa.com.np`, `uat.esewa.com.np`, `a.khalti.com`). Without the env
vars, real payments verify against a test environment with no visible symptom
other than that log line. Check these are set.

---

## Khalti

[`src/lib/payments/khalti.ts`](../src/lib/payments/khalti.ts). Per-restaurant
`khaltiSecretKey`.

- Amounts sent in **paisa**: `Math.round(amount * 100)`
- Auth header: `Key <secretKey>`
- Initiate → `{ payment_url, pidx }`; `pidx` stored on `Payment.pidx`
- Verify via lookup → `status === "Completed"` → `{ transaction_id, total_amount/100 }`
- Return URL: `/api/payments/khalti/callback?orderId=…`
- Order name: `HimaVolt Order #<orderNo>`

---

## Bank transfer

1. Customer transfers to the details in `PaymentConfig` (`bankName`,
   `bankAccountName`, `bankAccountNumber`, `bankBranch` — stored plaintext).
2. `POST /api/payments/bank-proof` — uploads a screenshot URL.
   Zod-validated, rate-limited 10/15min. Sets `Payment.proofUrl`,
   `proofUploadedAt`, status → `AWAITING_VERIFICATION`.
3. Staff review via `POST /api/restaurants/[id]/billing/verify-bank` (billing
   roles). Approve → `COMPLETED`, sets `verifiedBy`/`verifiedAt`. Reject → sets
   `rejectionNote`.
4. Customer is notified (`PAYMENT_VERIFIED` / `PAYMENT_REJECTED` FCM).

Audit actions: `BANK_PROOF_UPLOADED`, `BANK_PAYMENT_VERIFIED`,
`BANK_PAYMENT_REJECTED`.

---

## Payment QR

`PaymentQR` rows are uploaded static QR images (eSewa / Khalti / Fonepay / bank
QR) with a label and sort order. The customer scans, pays out-of-band, and staff
confirms. `POSPaymentQROverlay` shows them on the POS.

---

## Prepaid mode

When `Restaurant.prepaidEnabled`, orders are created with `isPrepaid: true` and a
`PrepaidToken` (status `ACTIVE`, `amount`) is minted inside the order
transaction. Staff redeem the token (`STAFF_PREPAID_TOKEN_ROLES`:
SUPER_ADMIN/MANAGER/CASHIER) via the prepaid-tokens routes.

---

## The payment gate — currently open

[`src/lib/payment-gate.ts`](../src/lib/payment-gate.ts) is 20 lines and returns
`{ allowed: true }` unconditionally:

> Currently a no-op: staff can accept any order regardless of payment status
> (cash-later, staff/counter orders, walk-ins, etc.). This is intentional product
> behaviour today.
>
> It is kept as a single choke point (rather than inlining `allowed: true` at the
> call sites) so a future "require payment before accept" policy can be
> re-enabled in one place. The previous implementation ran a DB query on every
> order-accept and then ignored the result — that query has been removed.

If you need to re-introduce a gate, change this function — do not re-scatter the
logic across call sites.

`PAYMENT_GATE_BLOCKED` still exists as an `AuditAction`.

---

## Kitchen queue visibility

`GET /api/restaurants/[id]/orders?live=1` builds a deliberately intricate `where`
clause. The rules:

- **Excluded entirely**: POS orders paid by `DIRECT` or `COUNTER` — so fast-pay
  walk-ins don't clog the kitchen queue.
- **Included**:
  - `PENDING` with `payment.status = COMPLETED` (all methods)
  - `PENDING` with no payment record (legacy orders)
  - `ACCEPTED` (already through the gate)
  - `ACCEPTED`/`REJECTED` within the last 2 hours (kitchen history)
  - `PENDING` with a physical payment method (`CASH`/`BANK`/`COUNTER`/`DIRECT`)
    still `PENDING`
  - When `prepaidEnabled === false`: `PENDING` + `payment.status = PENDING` +
    `type = DINE_IN` — i.e. dine-in skips the payment gate

Note that several `in` arrays in this route contain repeated values
(`{ status: { in: ["ACCEPTED", "ACCEPTED", "ACCEPTED"] } }`) — residue from the
`OrderStatus` enum collapse. Harmless, but a hint that this clause deserves a
careful simplification pass.

---

## Stock deduction

[`src/lib/stock.ts`](../src/lib/stock.ts).

`deductStock(items, client)` — accepts a transaction client so it commits
atomically with the order.

1. Batch-fetch drink metadata for all items in one query
2. Decrement drink `stockQuantity` **sequentially** (not `Promise.all`) — the
   comment says this is deliberate to stay easy on the small production
   connection pool. A drink hitting 0 is marked `isAvailable: false`.
3. Batch-fetch all ingredient links in one query
4. Compute net deduction per inventory item across all ordered items
5. Apply inventory updates sequentially
6. Find depleted inventory (`quantity <= 0`)
7. One query for all dependent menu items
8. One `updateMany` marking them `isAvailable: false`

`restoreStock(items)` reverses it on cancel/reject — this path uses `Promise.all`
since it's off the hot path. It re-enables **every** menu item depending on a
restored inventory item.

---

## Payment expiry cron

`GET /api/cron/expire-payments`, scheduled in `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/expire-payments", "schedule": "0 0 * * *" }] }
```

Daily at midnight UTC. Expires stale pending payments (`PaymentStatus.EXPIRED`)
and pending hotel booking holds. Audit actions: `PAYMENT_EXPIRED`,
`BOOKING_HOLD_EXPIRED`.

> `/api/cron/*` is in `PUBLIC_ROUTES`. See
> [09-operations.md](09-operations.md#known-risks--rough-edges).

---

## Hotel booking payments

Parallel to order payments, with their own routes and fields on `RoomBooking`
rather than a `Payment` row.

```
POST /api/public/hotel/[slug]/bookings     → RoomBooking { status: PENDING }
POST /api/payments/room-booking/initiate   → eSewa or Khalti
GET  /api/payments/room-booking/esewa/callback
GET  /api/payments/room-booking/khalti/callback
                                           → advancePaid, paymentStatus: PAID,
                                             status: CONFIRMED
```

Advance amount is computed from `Restaurant.hotelAdvanceType`
(`PERCENTAGE` | `FIXED`) and `hotelAdvanceValue` (default 30 → 30%). If
`roomServiceEnabled` and the guest opts in, `roomServiceCharge` is added flat to
the booking total.

Booking lifecycle:

```
PENDING (reserved, unpaid — auto-expires via cron)
   ↓ advance paid
CONFIRMED → CHECKED_IN → CHECKED_OUT
   ↓ cancellation
CANCELLED  (cancelReason, cancelledBy: CUSTOMER|HOTEL,
            refundStatus: NONE → REQUESTED → REFUNDED)
```

Guests can also upload a manual `receiptUrl` for QR/bank payment.

---

## Hardware marketplace

**Entirely separate from the restaurant Order/Payment pipeline above.** No money
flows through the platform — buyers pay sellers directly and HimaVolt tracks a
commission it is owed. Nothing here touches `Order`, `Payment`, `Bill`, realtime,
FCM or printing.

Models: `HardwareListing`, `HardwareOrder`, `HardwareCommissionSettlement`
(see [02-data-model.md](02-data-model.md#hardware-marketplace-models)). All
account-less — sellers/buyers are identified by contact details + an opaque
token, like order-track.

### Flow

```
Seller POST /api/public/hardware/listings   → HardwareListing { PENDING_REVIEW }
Admin  PATCH /api/admin/hardware/[id]        → APPROVED (live on /hardware)
Buyer  POST /api/public/hardware/orders      → HardwareOrder { PENDING }
                                               unitPrice/total/commissionAmount
                                               SNAPSHOTTED server-side from the
                                               listing (client never sends price)
Buyer  POST …/orders/[trackToken]/proof      → AWAITING_VERIFICATION (proofUrl)
Admin  PATCH /api/admin/hardware/orders/[id] → CONFIRMED  (commission now owed)
```

Buyers pay sellers using the seller's `sellerPayoutNote` **and/or a scannable
`sellerPaymentQr`** (both shown on the order status page), then upload a
screenshot as proof. Because `/api/upload` requires auth and buyers/sellers have
no account, images go through the public `POST /api/public/hardware/upload`
(signed-URL flow, images only, 5 MB, rate-limited, `hardware/` folder) — the
shared [`HardwareImageUpload`](../src/components/hardware/HardwareImageUpload.tsx)
component drives seller product photos, seller payment-QR images, and buyer
proof screenshots.

### Abuse controls (account-less submissions)

Since anyone can submit without an account, three layers keep it in check:

1. **Approval gate** — every third-party listing starts `PENDING_REVIEW` and is
   invisible on the public catalog until a master admin approves it. Nothing bad
   reaches buyers.
2. **Per-seller pending cap** — `POST /api/public/hardware/listings` rejects a
   submission (429) if the seller's phone already has ≥3 listings awaiting
   review, so one person can't flood the queue.
3. **Required, validated identity + rate limit** — phone (Nepal mobile) and
   email are both mandatory and validated; submissions are IP rate-limited
   (5 / 15 min).

### Commission (5%, ledger + manual settlement)

There is **no payment-splitting integration** (the app has none; wallet
gateways settle into each restaurant's own merchant account). Instead:

- Every confirmed **third-party** order accrues `commissionAmount = total × 5%`.
  Platform listings (`isPlatformListing: true`) owe nothing.
- **Owed** for a listing = Σ `commissionAmount` over `CONFIRMED` orders − Σ
  `HardwareCommissionSettlement.amount`. Computed on read; never stored.
- The master admin sets **how sellers pay the platform** — a `site_settings`
  JSON blob under `hardware_commission_payout` (`{ method, label, identifier,
  instructions }`), mirroring the gateway-settings pattern. Read/written via
  `GET/PATCH /api/admin/hardware/payout`.
- Settlements are recorded manually via
  `POST /api/admin/hardware/commission/settle` when a seller remits.

`GET /api/admin/hardware/commission` returns the per-seller ledger + totals.
Audit actions: `HARDWARE_LISTING_SUBMITTED/APPROVED/REJECTED/UPDATED`,
`HARDWARE_ORDER_PLACED/PROOF_UPLOADED/CONFIRMED/CANCELLED`,
`HARDWARE_COMMISSION_SETTLED`.

---

## Notifications on payment events

`src/lib/notifications.ts` → `notifyCustomerOrderUpdate(userId, orderNo, status,
restaurantName)` handles these statuses: `ACCEPTED`, `PREPARING`, `READY`,
`DELIVERED`, `REJECTED`, `CANCELLED`, `PAYMENT_VERIFIED`, `PAYMENT_REJECTED`,
`PAYMENT_CONFIRMED`.

Note it still keys on `PREPARING`/`READY`/`DELIVERED`/`CANCELLED` — values no
longer in the `OrderStatus` enum. Those now arrive from `kitchenStatus` strings.

Invalid FCM tokens (`messaging/invalid-registration-token`,
`messaging/registration-token-not-registered`) are pruned automatically.

---

## Realtime signalling after commit

Once the transaction commits, the route fires (never awaited):

```ts
notifyOrderChanged(orderId, restaurantId, payload)
  → order:<orderId>
  → admin:events
  → restaurant:<id>:orders
  → restaurant:<id>:billing   if payload has "payment" or reason "bill-changed"
  → restaurant:<id>:kitchen   if payload has "status" | "reason" | "items"
                              (+ billing too, when not a payment change)

notifyRestaurantOrders(restaurantId, payload)
  → restaurant:<id>:orders
  → admin:events
```

`touchOrderUpdatedAt(orderId)` (`src/lib/order-sync.ts`) must be called after
**any** payment status change (verify, collect, callback, proof upload, expiry) so
the SSE streams detect it.
