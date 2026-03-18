import { db } from "./db";
import { getSupabaseServerClient } from "./supabase-server";

export async function getAuthUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  const user = await db.user.findUnique({ where: { id: supabaseUser.id } });
  return user;
}

export async function getOrCreateUser() {
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
  const safeRole = intendedRole === "OWNER" ? "OWNER" : "CUSTOMER";
  const username = supabaseUser.user_metadata?.username as string | undefined;

  let dbUser = await db.user.findUnique({ where: { id: supabaseUser.id } });

  if (!dbUser) {
    dbUser = await db.user.create({
      data: { id: supabaseUser.id, email, name, imageUrl, phone, role: safeRole, username: username ?? null },
    });
  } else {
    // Auto-heal broken test accounts where the DB role doesn't match the intended role
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

  return dbUser;
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
