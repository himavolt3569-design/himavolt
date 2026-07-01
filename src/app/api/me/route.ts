import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ role: null, username: null, hasPassword: null });
    return NextResponse.json({ role: user.role, username: user.username, hasPassword: user.hasPassword });
  } catch (err: any) {
    console.error("[GET /api/me]", err?.message ?? err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "me:patch"), 15 * 60_000, 10);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many update requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const user = await getAuthUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { role, username, name, phone, imageUrl, hasPassword } = body as {
    role?: string;
    username?: string;
    name?: string;
    phone?: string;
    imageUrl?: string;
    hasPassword?: boolean;
  };

  const updateData: Record<string, unknown> = {};

  if (role !== undefined) {
    if (role !== "CUSTOMER" && role !== "OWNER") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (user.role !== "CUSTOMER" && user.role !== role) {
      return NextResponse.json(
        { error: "Role cannot be changed" },
        { status: 403 },
      );
    }
    if (user.role !== role) {
      updateData.role = role;
    }
  }

  if (username !== undefined) {
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–20 lowercase letters, numbers, or underscores",
        },
        { status: 400 },
      );
    }
    const taken = await db.user.findFirst({
      where: { username, NOT: { id: user.id } },
    });
    if (taken) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 },
      );
    }
    updateData.username = username;
  }

  if (name !== undefined) {
    if (name.trim().length < 2) {
      return NextResponse.json({ error: "Name too short" }, { status: 400 });
    }
    updateData.name = name.trim();
  }

  if (phone !== undefined) {
    updateData.phone = phone.trim();
  }

  if (imageUrl !== undefined) {
    updateData.imageUrl = imageUrl;
  }

  // Trusted client-side — this is only a UX flag deciding whether to show the
  // "Set your Password" step again, not a security boundary. The real
  // credential always lives in Supabase.
  if (hasPassword !== undefined) {
    updateData.hasPassword = hasPassword;
  }

  if (Object.keys(updateData).length === 0) {
    if (
      role === undefined &&
      username === undefined &&
      name === undefined &&
      phone === undefined &&
      imageUrl === undefined &&
      hasPassword === undefined
    ) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    return NextResponse.json({
      role: user.role,
      username: user.username,
      name: user.name,
      imageUrl: user.imageUrl,
      hasPassword: user.hasPassword,
    });
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return NextResponse.json({
    role: updated.role,
    username: updated.username,
    name: updated.name,
    imageUrl: updated.imageUrl,
    hasPassword: updated.hasPassword,
  });
}

export async function DELETE(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "me:delete"), 15 * 60_000, 3);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  // Identify the signed-in person from their live login session so we can
  // remove the matching login afterwards.
  const supabase = await getSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find their account record (by login id first, then email as a fallback for
  // accounts that were linked across different sign-in methods).
  let account = await db.user.findUnique({ where: { id: authUser.id } });
  if (!account && authUser.email) {
    account = await db.user.findFirst({ where: { email: authUser.email } });
  }

  // Remove the account and everything tied to it, right away. Related records
  // (reviews, favourites, rewards, any restaurants they own, etc.) are removed
  // automatically by the database. Past orders are kept but un-linked from the
  // person, so each restaurant keeps its own sales history.
  if (account) {
    try {
      await db.user.delete({ where: { id: account.id } });
    } catch {
      // Fallback for setups where past orders can't auto-unlink: detach the
      // orders first, then remove the account.
      try {
        await db.order.updateMany({
          where: { userId: account.id },
          data: { userId: null },
        });
        await db.user.delete({ where: { id: account.id } });
      } catch (err: any) {
        console.error("[DELETE /api/me] DB error:", err?.message ?? err);
        return NextResponse.json(
          { error: "Failed to delete account" },
          { status: 500 },
        );
      }
    }
  }

  // Remove the sign-in itself so the same email address is free to register
  // again straight away. Best-effort: never block the deletion on this.
  try {
    await getSupabaseAdminClient().auth.admin.deleteUser(authUser.id);
  } catch (err: any) {
    console.error("[DELETE /api/me] login removal failed:", err?.message ?? err);
  }

  return NextResponse.json({ success: true });
}
