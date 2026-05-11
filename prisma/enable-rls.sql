-- Enable Row Level Security on every application table.
--
-- HOW IT WORKS IN THIS STACK:
--   All database access goes through Prisma, which connects as the
--   `postgres` superuser (DIRECT_URL) or via the pooler with a role
--   that has BYPASSRLS. Both bypass RLS automatically — so this change
--   has zero impact on existing API behaviour.
--
--   What it DOES protect against: any accidental direct Supabase client
--   query using an `anon` or `authenticated` JWT will be denied by
--   default (no permissive policies = deny all). Every row of every
--   table is now invisible to browser clients that somehow bypass the
--   API layer.
--
-- HOW TO RUN:
--   Option A — Supabase SQL editor (recommended):
--     Paste this file into https://supabase.com/dashboard/project/<ref>/sql
--     and click Run.
--
--   Option B — CLI (requires DIRECT_URL in your environment):
--     npx prisma db execute --url "$DIRECT_URL" --file prisma/enable-rls.sql
--
-- This is idempotent — safe to run multiple times.

ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_qrs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_sizes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_addons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_drivers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_slides             ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_ingredients   ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_check_ins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_check_ins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepaid_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_meals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_meal_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_counter_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE display_counter_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rush_hour_configs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE rush_hour_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hour_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings           ENABLE ROW LEVEL SECURITY;
