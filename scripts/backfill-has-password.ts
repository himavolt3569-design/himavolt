// One-time manual backfill for User.hasPassword.
//
// Context: the column was added with `@default(true)` so the Vercel-build
// `prisma db push` backfills existing rows to `true` for free — correct for
// the common case (old email+password sign-up flow). This script corrects
// the minority: accounts that only ever authenticated via Google OAuth and
// never set a password, which must be flipped to `false` so the new
// mandatory "Set your Password" step (src/app/auth/set-password) actually
// shows for them.
//
// Run ONCE, by hand, against production, after the schema migration has
// deployed and BEFORE the new sign-in flow (Phase 6 of the rollout plan)
// ships. Not part of any automated build step.
//
// Usage: npx tsx scripts/backfill-has-password.ts

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function hasEmailIdentity(identities: { provider: string }[] | null | undefined) {
  return (identities ?? []).some((i) => i.provider === "email");
}

async function backfill() {
  console.log("--- Starting hasPassword backfill ---");

  let page = 1;
  const perPage = 200;
  let totalChecked = 0;
  let totalFlipped = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("Failed to list Supabase users:", error.message);
      break;
    }
    const users = data.users;
    if (!users.length) break;

    // Sequential — the prod DB pool only allows a single connection at a time.
    for (const authUser of users) {
      totalChecked++;
      if (hasEmailIdentity(authUser.identities)) continue; // has a real password identity, leave as true

      const dbUser = await prisma.user.findUnique({ where: { id: authUser.id } });
      if (!dbUser || dbUser.hasPassword === false) continue;

      await prisma.user.update({
        where: { id: authUser.id },
        data: { hasPassword: false },
      });
      totalFlipped++;
      console.log(`[FLIPPED] ${dbUser.email} (${authUser.id}) -> hasPassword: false`);
    }

    if (users.length < perPage) break;
    page++;
  }

  console.log(`--- Done. Checked ${totalChecked} auth users, flipped ${totalFlipped} to hasPassword:false ---`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect().then(() => pool.end()));
