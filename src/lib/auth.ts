import { db } from "./db";
import { getSupabaseServerClient } from "./supabase-server";

export async function getAuthUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();
  if (!supabaseUser) return null;

  const user = await db.user.findUnique({ where: { id: supabaseUser.id } })
    // Fall back to email lookup for Google OAuth account linking (different Supabase ID)
    ?? (supabaseUser.email
      ? await db.user.findFirst({ where: { email: supabaseUser.email } })
      : null);
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
  const username = supabaseUser.user_metadata?.username as string | undefined;

  // Look up by Supabase ID first; fall back to email (handles Google OAuth account linking)
  let dbUser = await db.user.findUnique({ where: { id: supabaseUser.id } });
  const userByEmail = !dbUser && email
    ? await db.user.findFirst({ where: { email } })
    : null;

  // Determine safe role — intended role or inherited from existing DB record
  // The intended role (from signup) should always win over inherited CUSTOMER role
  const existingRole = (dbUser ?? userByEmail)?.role;
  const safeRole =
    intendedRole === "OWNER" || existingRole === "OWNER" || existingRole === "ADMIN"
      ? "OWNER"
      : "CUSTOMER";

  if (!dbUser && !userByEmail) {
    // Brand new user
    dbUser = await db.user.create({
      data: { id: supabaseUser.id, email, name, imageUrl, phone, role: safeRole, username: username ?? null },
    });
  } else if (!dbUser && userByEmail) {
    // Google OAuth with same email as an existing email/password account.
    // Supabase may auto-link (same user.id) or create a new auth user.
    // Use the higher of intended role vs inherited role (never downgrade).
    const inheritedRole = userByEmail.role;
    const finalRole = safeRole === "OWNER" || inheritedRole === "OWNER" || inheritedRole === "ADMIN"
      ? "OWNER"
      : inheritedRole;

    // Update the existing record with fresh metadata & role
    dbUser = await db.user.update({
      where: { email },
      data: {
        name, imageUrl, phone,
        ...(finalRole === "OWNER" ? { role: "OWNER" } : {}),
      },
    });
  } else if (dbUser) {
    // Existing user — upgrade CUSTOMER → OWNER if needed, never downgrade
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

  // Auto-repair: if user owns restaurants but is stuck as CUSTOMER, upgrade to OWNER.
  // This handles cases where Google OAuth account linking previously failed to set the role.
  if (dbUser && dbUser.role === "CUSTOMER") {
    const ownsRestaurants = await db.restaurant.count({ where: { ownerId: dbUser.id } });
    if (ownsRestaurants > 0) {
      dbUser = await db.user.update({
        where: { id: dbUser.id },
        data: { role: "OWNER" },
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
