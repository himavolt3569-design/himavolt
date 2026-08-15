import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { getSupabaseServerClient } from "./supabase-server";
import { INTENDED_ROLE_COOKIE, normalizeIntendedRole } from "./intended-role";
import { generateUniqueUsername } from "./username";
import { getImpersonatedOwner } from "./impersonation";

/**
 * Both resolvers below check for a platform-admin impersonation session first.
 *
 * This is what lets the master admin open the *real* owner dashboard for any
 * business: every owner route and server component already resolves the caller
 * through these two functions, so returning the owner here makes the entire
 * dashboard work without touching the ~50 routes behind it.
 *
 * It requires BOTH a signed impersonation cookie and a live `master_admin_session`
 * whose identity matches it, expires after an hour, and fails closed — with no
 * impersonation cookie this costs one cookie read and the normal Supabase path
 * runs exactly as before. See `src/lib/impersonation.ts`.
 */

export const getAuthUser = cache(async () => {
  const impersonatedOwner = await getImpersonatedOwner();
  if (impersonatedOwner) return impersonatedOwner;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  // Check by Supabase ID first
  let user = await db.user.findUnique({ where: { id: supabaseUser.id } });

  // If not found by ID, try email (handles account linking cases where Supabase ID changed)
  if (!user && supabaseUser.email) {
    user = await db.user.findFirst({ where: { email: supabaseUser.email } });
  }

  if (user && user.isDeleted) {
    // Deleted accounts are gone for good. (This only ever matches leftover
    // records from the old "scheduled deletion" behaviour — clean them up.)
    try {
      await db.user.delete({ where: { id: user.id } });
    } catch {}
    return null;
  }

  if (user && user.isBlacklisted) {
    return null;
  }

  return user;
});

export const getOrCreateUser = cache(async () => {
  // An impersonated owner always already exists — never provision from this path.
  const impersonatedOwner = await getImpersonatedOwner();
  if (impersonatedOwner) return impersonatedOwner;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  const email = supabaseUser.email ?? "";
  const name =
    supabaseUser.user_metadata?.full_name ??
    supabaseUser.user_metadata?.name ??
    email.split("@")[0] ??
    "User";
  const imageUrl =
    supabaseUser.user_metadata?.avatar_url ??
    supabaseUser.user_metadata?.picture ??
    null;
  const phone = supabaseUser.user_metadata?.phone ?? supabaseUser.phone ?? null;
  const username = supabaseUser.user_metadata?.username as string | undefined;

  // Determine the role to use when provisioning a NEW account. Priority:
  // Supabase metadata (email sign-up) > first-party intended-role cookie
  // (set before OAuth, survives the redirect when the query param is dropped)
  // > default CUSTOMER. Existing accounts keep their DB role (handled below).
  const cookieRole = await readIntendedRoleCookie();
  const metadataRole = normalizeIntendedRole(
    supabaseUser.user_metadata?.intended_role,
  );
  const intendedRole: "OWNER" | "CUSTOMER" =
    metadataRole ?? cookieRole ?? "CUSTOMER";

  let dbUser = await db.user.findUnique({ where: { id: supabaseUser.id } });

  // If already found by exact ID, check deletion and sync metadata
  if (dbUser) {
    if (dbUser.isDeleted) {
      // Leftover record from the old "scheduled deletion" flow — remove it and
      // provision a fresh account below, as if this were a brand-new sign-up.
      try { await db.user.delete({ where: { id: dbUser.id } }); } catch {}
      dbUser = null;
    }

    if (dbUser) {
      // Check for role upgrade if they own restaurants but are still CUSTOMER
      if (dbUser.role === "CUSTOMER") {
        const ownsRestaurants = await db.restaurant.count({ where: { ownerId: dbUser.id } });
        if (ownsRestaurants > 0) {
          dbUser = await db.user.update({
            where: { id: dbUser.id },
            data: { role: "OWNER" },
          });
        }
      }

      // Sync basic info if changed
      if (dbUser.email !== email || dbUser.name !== name || dbUser.imageUrl !== imageUrl || dbUser.phone !== phone) {
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: { email, name, imageUrl, phone },
        });
      }
      return dbUser;
    }
  }

  // Not found by ID — check by email for linking
  let userByEmail = email ? await db.user.findFirst({ where: { email } }) : null;

  if (userByEmail) {
    if (userByEmail.isBlacklisted) return null;

    if (userByEmail.isDeleted) {
      // Leftover record from the old "scheduled deletion" flow — remove it so
      // this email is treated as a clean, brand-new sign-up below.
      try { await db.user.delete({ where: { id: userByEmail.id } }); } catch {}
      userByEmail = null;
    }

    if (userByEmail) {

    // Link the new Supabase ID to the existing account IF AND ONLY IF the existing account
    // isn't already using a different Supabase ID that has active data (rare edge case).
    // For now, we update the ID to the latest Supabase ID to keep lookups fast.
    // BUT we must also update all relations. 
    // SAFEST: Just use the existing user record and don't change its ID.
    // NEXT REQUEST will hit the "findFirst by email" path again.

    // Auto-upgrade if they are an owner
    let safeRole = userByEmail.role;
    if (safeRole === "CUSTOMER") {
      const ownsRestaurants = await db.restaurant.count({ where: { ownerId: userByEmail.id } });
      if (ownsRestaurants > 0) safeRole = "OWNER";
    }

      dbUser = await db.user.update({
        where: { id: userByEmail.id },
        data: { name, imageUrl, phone, role: safeRole },
      });
      return dbUser;
    }
  }

  // Truly new user. Provision them here as a safety net so an account is NEVER
  // left role-less (which the client would then treat as CUSTOMER). The
  // /auth/callback route is the primary creator for OAuth, but if the role/code
  // round-trip ever misses it, this guarantees the user still gets the role
  // they intended (from metadata or the intended-role cookie).
  dbUser = await db.user.create({
    data: {
      id: supabaseUser.id,
      email,
      name,
      imageUrl,
      phone,
      role: intendedRole,
      username: username ?? (await generateUniqueUsername(name || email)),
      hasPassword: false,
    },
  });

  return dbUser;
});

/**
 * Read the short-lived intended-role cookie set by the client right before an
 * OAuth redirect. Returns undefined if absent/unreadable.
 */
async function readIntendedRoleCookie(): Promise<"OWNER" | "CUSTOMER" | undefined> {
  try {
    const store = await cookies();
    return normalizeIntendedRole(store.get(INTENDED_ROLE_COOKIE)?.value);
  } catch {
    return undefined;
  }
}
export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOwner() {
  const user = await requireAuth();
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    throw new Error("Forbidden: Owner access required");
  }
  return user;
}
