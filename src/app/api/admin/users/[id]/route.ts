import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";

type AuthMeta = {
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  providers: string[];
  createdAt: string | null;
};

/** Pull the Supabase Auth side of an account (login history, providers). */
async function getAuthMeta(id: string): Promise<AuthMeta | null> {
  try {
    const { data, error } = await getSupabaseAdminClient().auth.admin.getUserById(id);
    if (error || !data?.user) return null;
    const au = data.user;
    const providers =
      (au.app_metadata?.providers as string[] | undefined) ??
      (au.app_metadata?.provider ? [au.app_metadata.provider as string] : []);
    return {
      lastSignInAt: au.last_sign_in_at ?? null,
      emailConfirmed: !!au.email_confirmed_at,
      providers,
      createdAt: au.created_at ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/users/[id]
 * Full profile, account status and activity for one user — powers the master
 * admin's user detail drawer.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("users.view");
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      phone: true,
      imageUrl: true,
      role: true,
      hasPassword: true,
      isBlacklisted: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          orders: true,
          ownedRestaurants: true,
          reviews: true,
          favourites: true,
          staffMemberships: true,
          loyaltyAccounts: true,
        },
      },
    },
  });

  // Pending (auth-only) users have no DB row yet — return a minimal profile so
  // the drawer still opens instead of 404-ing.
  if (!user) {
    const meta = await getAuthMeta(id);
    if (!meta) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      user: {
        id,
        email: "",
        name: "Pending sign-up",
        username: null,
        phone: null,
        imageUrl: null,
        role: "CUSTOMER",
        hasPassword: false,
        isBlacklisted: false,
        isDeleted: false,
        pending: true,
        createdAt: meta.createdAt,
        updatedAt: null,
        counts: { orders: 0, ownedRestaurants: 0, reviews: 0, favourites: 0, staffMemberships: 0, loyaltyAccounts: 0 },
      },
      auth: meta,
      recentOrders: [],
      ownedRestaurants: [],
      staffMemberships: [],
      loyalty: { points: 0, totalSpent: 0 },
    });
  }

  const [recentOrders, ownedRestaurants, staffMemberships, loyalty, auth] =
    await Promise.all([
      db.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNo: true,
          total: true,
          status: true,
          type: true,
          createdAt: true,
          restaurant: { select: { name: true } },
        },
      }),
      db.restaurant.findMany({
        where: { ownerId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, slug: true, type: true, city: true, isActive: true },
      }),
      db.staffMember.findMany({
        where: { userId: id },
        select: {
          id: true,
          role: true,
          isActive: true,
          restaurant: { select: { id: true, name: true } },
        },
      }),
      db.loyaltyAccount.aggregate({
        where: { userId: id },
        _sum: { points: true, totalSpent: true },
      }),
      getAuthMeta(id),
    ]);

  const { _count, ...profile } = user;

  return NextResponse.json(
    {
      user: { ...profile, pending: false, counts: _count },
      auth,
      recentOrders,
      ownedRestaurants,
      staffMemberships,
      loyalty: {
        points: loyalty._sum.points ?? 0,
        totalSpent: loyalty._sum.totalSpent ?? 0,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * PATCH /api/admin/users/[id]
 * Act on a user's behalf: edit profile, change role, block or unblock.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("users.manage");
  if (!admin) return unauthorized("Admin access required");

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, phone, username, role, isBlacklisted } = body as {
    name?: string;
    phone?: string;
    username?: string;
    role?: string;
    isBlacklisted?: boolean;
  };

  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name too short" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (phone !== undefined) {
    data.phone = typeof phone === "string" ? phone.trim() : null;
  }

  if (username !== undefined) {
    if (username !== null && username !== "") {
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return NextResponse.json(
          { error: "Username must be 3-20 lowercase letters, numbers, or underscores" },
          { status: 400 },
        );
      }
      const taken = await db.user.findFirst({
        where: { username, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      data.username = username;
    } else {
      data.username = null;
    }
  }

  if (role !== undefined) {
    if (!["CUSTOMER", "OWNER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = role;
  }

  if (isBlacklisted !== undefined) {
    data.isBlacklisted = !!isBlacklisted;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      phone: true,
      role: true,
      isBlacklisted: true,
    },
  });

  logAudit({
    action: "USER_UPDATED",
    entity: "User",
    entityId: id,
    detail: `Master admin updated user ${updated.email || id}`,
    metadata: { by: "master_admin", fields: Object.keys(data) },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(updated);
}
