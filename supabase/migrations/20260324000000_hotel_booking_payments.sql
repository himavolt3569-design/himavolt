-- Migration: Add hotel booking payment fields and advance config
-- Date: 2026-03-24

-- ─── Room: add bed details ──────────────────────────────────────────
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS "bedType"   TEXT,
  ADD COLUMN IF NOT EXISTS "bedCount"  INTEGER NOT NULL DEFAULT 1;

-- ─── RoomBooking: add payment tracking ─────────────────────────────
ALTER TABLE room_bookings
  ADD COLUMN IF NOT EXISTS "paymentMethod"  TEXT,
  ADD COLUMN IF NOT EXISTS "paymentStatus"  TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "transactionId"  TEXT,
  ADD COLUMN IF NOT EXISTS "pidx"           TEXT,
  ADD COLUMN IF NOT EXISTS "refId"          TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt"         TIMESTAMPTZ;

-- ─── Restaurant: hotel advance booking config ───────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS "hotelAdvanceType"   TEXT NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN IF NOT EXISTS "hotelAdvanceValue"  DOUBLE PRECISION NOT NULL DEFAULT 30;

-- ─── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS room_bookings_payment_status_idx ON room_bookings ("paymentStatus");
CREATE INDEX IF NOT EXISTS room_bookings_restaurant_status_idx ON room_bookings ("restaurantId", status);
