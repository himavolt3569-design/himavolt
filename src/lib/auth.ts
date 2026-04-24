import { cache } from "react";
import { db } from "./db";
import { getSupabaseServerClient } from "./supabase-server";

interface UserCacheEntry {
  user: {
    id: string;
    email: string;
    name: string;
    imageUrl: string | null;
    phone: string | null;
    role: string;
    [k: string]: unknown;
  };
  ts: number;
}
const USER_CACHE = new Map<string, UserCacheEntry>();
const USER_CACHE_TTL = 60_000;
const USER_CACHE_MAX = 200;

function getCachedUser(id: string): UserCacheEntry["user"] | null {
  const entry = USER_CACHE.get(id);
  if (!entry) return null;
  if (Date.now() - entry.ts > USER_CACHE_TTL) {
    USER_CACHE.delete(id);
    return null;
  }
  return entry.user;
}

function setCachedUser(user: UserCacheEntry["user"]) {
  USER_CACHE.set(user.id, { user, ts: Date.now() });
  if (USER_CACHE.size > USER_CACHE_MAX) {
    const oldest = USER_CACHE.keys().next().value;
    if (oldest) USER_CACHE.delete(oldest);
  }
}

export const getAuthUser = cache(async () => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  const cached = getCachedUser(supabaseUser.id);
  if (cached) return cached;

  const user =
    (await db.user.findUnique({ where: { id: supabaseUser.id } })) ??
    (supabaseUser.email
      ? await db.user.findFirst({ where: { email: supabaseUser.email } })
      : null);
  if (user) setCachedUser(user);
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
  const phone = supabaseUser.phone ?? null;

  const intendedRole = supabaseUser.user_metadata?.intended_role;
  const username = supabaseUser.user_metadata?.username as string | undefined;

  const cached = getCachedUser(supabaseUser.id);
  if (
    cached &&
    cached.email === email &&
    cached.name === name &&
    cached.imageUrl === imageUrl
  ) {
    return cached;
  }

  let dbUser = await db.user.findUnique({ where: { id: supabaseUser.id } });

  if (
    dbUser &&
    dbUser.email === email &&
    dbUser.name === name &&
    dbUser.imageUrl === imageUrl &&
    dbUser.phone === phone
  ) {
    const isGoogleUser = supabaseUser.app_metadata?.provider === "google";
    const needsRoleUpgrade =
      dbUser.role === "CUSTOMER" && (intendedRole === "OWNER" || isGoogleUser);
    if (!needsRoleUpgrade) {
      setCachedUser(dbUser);
      return dbUser;
    }
  }

  const userByEmail =
    !dbUser && email ? await db.user.findFirst({ where: { email } }) : null;

  const isGoogleUser = supabaseUser.app_metadata?.provider === "google";
  const existingRole = (dbUser ?? userByEmail)?.role;
  const safeRole =
    intendedRole === "OWNER" ||
    existingRole === "OWNER" ||
    existingRole === "ADMIN" ||
    isGoogleUser
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
      where: { email },
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

  if (dbUser?.role === "OWNER" && intendedRole !== "OWNER") {
    supabase.auth
      .updateUser({ data: { intended_role: "OWNER" } })
      .catch(() => {});
  }

  if (dbUser) setCachedUser(dbUser);
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
