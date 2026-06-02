import { cache } from "react";
import { db } from "./db";
import { getSupabaseServerClient } from "./supabase-server";

export const getAuthUser = cache(async () => {
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

  if (user && (user.isDeleted || user.isBlacklisted)) {
    return null;
  }

  return user;
});

export const getOrCreateUser = cache(async () => {
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

  // Determine role: metadata > existing DB role
  const metadataRole = supabaseUser.user_metadata?.intended_role?.toUpperCase();
  const intendedRole = metadataRole === "OWNER" ? "OWNER" : "CUSTOMER";

  let dbUser = await db.user.findUnique({ where: { id: supabaseUser.id } });

  // If already found by exact ID, just sync metadata and return
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

  // Not found by ID — check by email for linking
  const userByEmail = email ? await db.user.findFirst({ where: { email } }) : null;

  if (userByEmail) {
    if (userByEmail.isDeleted || userByEmail.isBlacklisted) return null;

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

  // Truly new user
  dbUser = await db.user.create({
    data: {
      id: supabaseUser.id,
      email,
      name,
      imageUrl,
      phone,
      role: intendedRole === "OWNER" ? "OWNER" : "CUSTOMER",
      username: username ?? null,
    },
  });

  return dbUser;
});
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
