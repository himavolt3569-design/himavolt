import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    if (!user) return NextResponse.json({ role: null, username: null });
    return NextResponse.json({ role: user.role, username: user.username });
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
  const { role, username, name, phone, imageUrl } = body as {
    role?: string;
    username?: string;
    name?: string;
    phone?: string;
    imageUrl?: string;
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

  if (Object.keys(updateData).length === 0) {
    if (
      role === undefined &&
      username === undefined &&
      name === undefined &&
      phone === undefined &&
      imageUrl === undefined
    ) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    return NextResponse.json({
      role: user.role,
      username: user.username,
      name: user.name,
      imageUrl: user.imageUrl,
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

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // SECURITY: Mark as deleted but keep record to prevent immediate re-signup with same ID/Email
    await db.user.update({
      where: { id: user.id },
      data: { isDeleted: true },
    });
  } catch (err: any) {
    console.error("[DELETE /api/me] DB error:", err?.message ?? err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
