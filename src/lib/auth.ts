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

  const user = await db.user.upsert({
    where: { id: supabaseUser.id },
    update: { email, name, imageUrl, phone },
    create: { id: supabaseUser.id, email, name, imageUrl, phone },
  });

  return user;
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
