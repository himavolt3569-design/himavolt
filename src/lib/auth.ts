import { cache } from "react";
import { db } from "./db";
import { getSupabaseServerClient } from "./supabase-server";

export const getAuthUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  const user =
    (await db.user.findUnique({ where: { id: supabaseUser.id } })) ??
    (supabaseUser.email
      ? await db.user.findFirst({ where: { email: supabaseUser.email } })
      : null);
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

  // Role discovery: metadata > provider default (default to CUSTOMER)
  const metadataRole = supabaseUser.user_metadata?.intended_role?.toUpperCase();
  
  // Default to CUSTOMER unless explicitly requested as OWNER in metadata
  const intendedRole = metadataRole === "OWNER" ? "OWNER" : "CUSTOMER";

  let dbUser = await db.user.findUnique({ where: { id: supabaseUser.id } });

  // Early return if user exists and hasn't changed
  if (
    dbUser &&
    dbUser.email === email &&
    dbUser.name === name &&
    dbUser.imageUrl === imageUrl &&
    dbUser.phone === phone &&
    (dbUser.role !== "CUSTOMER" || intendedRole === "CUSTOMER")
  ) {
    return dbUser;
  }

  const userByEmail =
    !dbUser && email ? await db.user.findFirst({ where: { email } }) : null;

  const existingRole = (dbUser ?? userByEmail)?.role;
  const safeRole =
    existingRole === "OWNER" || existingRole === "ADMIN" || intendedRole === "OWNER"
      ? "OWNER"
      : "CUSTOMER";

  if (!dbUser && !userByEmail) {
    dbUser = await db.user.create({
      data: {
        id: supabaseUser.id,
        email,
        name,
        imageUrl,
        phone,
        role: safeRole,
        username: username ?? null,
      },
    });
  } else if (!dbUser && userByEmail) {
    if (userByEmail.role === "OWNER" || userByEmail.role === "ADMIN") {
      console.warn(
        `[AUTH] Refused email-based link to privileged account (email=${email}, existingId=${userByEmail.id}, newSupabaseId=${supabaseUser.id})`,
      );
      return null;
    }

    dbUser = await db.user.update({
      where: { id: userByEmail.id },
      data: { name, imageUrl, phone },
    });
  } else if (dbUser) {
    if (dbUser.role === "CUSTOMER" && safeRole === "OWNER") {
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: { role: "OWNER", email, name, imageUrl, phone },
      });
    } else {
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: { email, name, imageUrl, phone },
      });
    }
  }

  if (dbUser && dbUser.role === "CUSTOMER") {
    const ownsRestaurants = await db.restaurant.count({
      where: { ownerId: dbUser.id },
    });
    if (ownsRestaurants > 0) {
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: { role: "OWNER" },
      });
    }
  }

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
