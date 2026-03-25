-- Add operational status fields to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS "isOpen" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false;
