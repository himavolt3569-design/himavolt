import { NextResponse } from "next/server";
import { getAuthUser, getOrCreateUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ role: null, username: null });
  return NextResponse.json({ role: user.role, username: user.username });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { role, username } = body as { role?: string; username?: string };

  const updateData: Record<string, unknown> = {};

  // Role update — only CUSTOMER → OWNER allowed, never ADMIN
  if (role !== undefined) {
    if (role !== "CUSTOMER" && role !== "OWNER") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Role cannot be changed" }, { status: 403 });
    }
    updateData.role = role;
  }

  // Username update
  if (username !== undefined) {
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3–20 lowercase letters, numbers, or underscores" }, { status: 400 });
    }
    const taken = await db.user.findFirst({ where: { username, NOT: { id: user.id } } });
    if (taken) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }
    updateData.username = username;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db.user.update({ where: { id: user.id }, data: updateData });
  return NextResponse.json({ role: updated.role, username: updated.username });
}
