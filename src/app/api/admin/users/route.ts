import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const userSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  phone: true,
  imageUrl: true,
  role: true,
  createdAt: true,
  isDeleted: true,
  _count: { select: { orders: true, ownedRestaurants: true, reviews: true } },
} as const;

type MergedUser = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: string;
  isDeleted: boolean;
  pending: boolean; // exists in Supabase Auth but not yet in the app DB
  emailConfirmed: boolean;
  lastSignInAt: string | null;
  _count: { orders: number; ownedRestaurants: number; reviews: number };
};

type AuthUserLite = {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/** Read a string-ish metadata value, ignoring anything non-string. */
function metaStr(meta: Record<string, unknown>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Pull every user straight from Supabase Auth (auth.users) using the service
 * role admin client. This surfaces brand-new sign-ups in real time — including
 * accounts that are still pending email confirmation and therefore haven't been
 * provisioned into the app's `User` table yet.
 */
async function listAllAuthUsers(): Promise<AuthUserLite[]> {
  const supabase = getSupabaseAdminClient();
  const all: AuthUserLite[] = [];
  const perPage = 1000;
  // Cap the sweep so a pathological dataset can't hang the request.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = (data?.users ?? []) as unknown as AuthUserLite[];
    all.push(...batch);
    if (batch.length < perPage) break;
  }
  return all;
}

/**
 * GET /api/admin/users
 * All users with filtering & pagination. Merges live Supabase Auth users with
 * the app's `User` table so the admin always sees the latest sign-ups.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const roleFilter = url.searchParams.get("role") || undefined;
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();

  // App DB users — source of truth for role, profile and activity counts.
  const dbUsers = await db.user.findMany({
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });
  const byId = new Map(dbUsers.map((u) => [u.id, u]));
  const byEmail = new Map(
    dbUsers.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]),
  );
  const consumed = new Set<string>();

  // Live Supabase Auth users. If the service role key is missing or the call
  // fails, fall back gracefully to the DB-only list instead of erroring out.
  let authUsers: AuthUserLite[] = [];
  let authError = false;
  try {
    authUsers = await listAllAuthUsers();
  } catch (err) {
    authError = true;
    console.error("[Admin Users] supabase.auth.admin.listUsers failed:", err);
  }

  const merged: MergedUser[] = [];

  for (const au of authUsers) {
    const email = (au.email ?? "").toLowerCase();
    const dbu = byId.get(au.id) ?? (email ? byEmail.get(email) : undefined);
    if (dbu) consumed.add(dbu.id);

    const meta = au.user_metadata ?? {};
    const metaRole = (metaStr(meta, "intended_role") ?? "").toUpperCase();

    merged.push({
      id: dbu?.id ?? au.id,
      email: au.email ?? dbu?.email ?? "",
      name:
        dbu?.name ??
        metaStr(meta, "full_name") ??
        metaStr(meta, "name") ??
        au.email?.split("@")[0] ??
        "User",
      username: dbu?.username ?? metaStr(meta, "username") ?? null,
      phone: dbu?.phone ?? au.phone ?? metaStr(meta, "phone") ?? null,
      imageUrl:
        dbu?.imageUrl ??
        metaStr(meta, "avatar_url") ??
        metaStr(meta, "picture") ??
        null,
      role: dbu?.role ?? (metaRole === "OWNER" ? "OWNER" : "CUSTOMER"),
      createdAt: dbu?.createdAt
        ? dbu.createdAt.toISOString()
        : new Date(au.created_at).toISOString(),
      isDeleted: dbu?.isDeleted ?? false,
      pending: !dbu,
      emailConfirmed: !!au.email_confirmed_at,
      lastSignInAt: au.last_sign_in_at ?? null,
      _count: dbu?._count ?? { orders: 0, ownedRestaurants: 0, reviews: 0 },
    });
  }

  // Include any app-DB users that have no matching Supabase Auth account
  // (legacy rows, or when the auth sweep failed entirely).
  for (const dbu of dbUsers) {
    if (consumed.has(dbu.id)) continue;
    merged.push({
      id: dbu.id,
      email: dbu.email,
      name: dbu.name,
      username: dbu.username,
      phone: dbu.phone,
      imageUrl: dbu.imageUrl,
      role: dbu.role,
      createdAt: dbu.createdAt.toISOString(),
      isDeleted: dbu.isDeleted,
      pending: false,
      emailConfirmed: true,
      lastSignInAt: null,
      _count: dbu._count,
    });
  }

  // Filter, sort (newest first) and paginate in memory over the merged set.
  let result = merged;
  if (roleFilter) result = result.filter((u) => u.role === roleFilter);
  if (search) {
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        (u.username ?? "").toLowerCase().includes(search) ||
        (u.phone ?? "").toLowerCase().includes(search),
    );
  }
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = result.length;
  const start = (page - 1) * limit;
  const users = result.slice(start, start + limit);

  return NextResponse.json(
    {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      source: authError ? "db" : "supabase+db",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * DELETE /api/admin/users
 * Permanently delete a user and their data — from both the app DB and Supabase
 * Auth, so pending (auth-only) sign-ups can be removed too.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json();
  const ids: string[] = body.ids ?? (body.userId ? [body.userId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "userId or ids required" }, { status: 400 });
  }

  for (const userId of ids) {
    // Remove app-DB data only if a record actually exists (pending auth-only
    // users won't have one, and that must not 500 the request).
    const exists = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (exists) {
      await db.$transaction([
        db.delivery.deleteMany({ where: { order: { userId } } }),
        db.payment.deleteMany({ where: { order: { userId } } }),
        db.bill.deleteMany({ where: { order: { userId } } }),
        db.tableSession.deleteMany({ where: { order: { userId } } }),
        db.orderItem.deleteMany({ where: { order: { userId } } }),
        db.order.deleteMany({ where: { userId } }),
        db.review.deleteMany({ where: { userId } }),
        db.user.delete({ where: { id: userId } }),
      ]);
    }

    // Also remove the Supabase Auth account so the user can't silently
    // re-appear on the next sign-in / auth sweep. Ignore failures (e.g. id is
    // an app id that differs from the auth id, or the auth user is already gone).
    try {
      await getSupabaseAdminClient().auth.admin.deleteUser(userId);
    } catch (err) {
      console.error(`[Admin Users] auth.admin.deleteUser(${userId}) failed:`, err);
    }
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}

/**
 * PATCH /api/admin/users
 * Update a user's role.
 */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }

  const validRoles = ["CUSTOMER", "OWNER", "ADMIN"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent admin from demoting themselves
  if (userId === admin.id && role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  // The Users list merges live Supabase Auth accounts with the app DB, so the
  // admin can act on brand-new sign-ups that are still "pending" (auth-only and
  // not yet provisioned into our `User` table). Updating those would throw, so
  // provision a minimal record first, then the role assignment always succeeds.
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existing) {
    try {
      const { data, error } = await getSupabaseAdminClient().auth.admin.getUserById(userId);
      if (error || !data?.user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const au = data.user;
      const meta = (au.user_metadata ?? {}) as Record<string, unknown>;
      const email = au.email ?? "";
      const created = await db.user.create({
        data: {
          id: au.id,
          email,
          name:
            metaStr(meta, "full_name") ??
            metaStr(meta, "name") ??
            email.split("@")[0] ??
            "User",
          username: metaStr(meta, "username") ?? null,
          phone: au.phone ?? metaStr(meta, "phone") ?? null,
          imageUrl:
            metaStr(meta, "avatar_url") ?? metaStr(meta, "picture") ?? null,
          role,
        },
        select: { id: true, name: true, email: true, role: true },
      });
      return NextResponse.json(created);
    } catch (err) {
      console.error("[Admin Users] role change provisioning failed:", err);
      return NextResponse.json(
        { error: "Could not update this user's role" },
        { status: 500 },
      );
    }
  }

  const user = await db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
