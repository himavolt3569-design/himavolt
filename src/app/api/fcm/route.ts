import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, device } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  await db.fCMToken.upsert({
    where: { token },
    update: { userId: user.id, device: device || null, updatedAt: new Date() },
    create: { token, userId: user.id, device: device || null },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  await db.fCMToken.deleteMany({ where: { token } });
  return NextResponse.json({ success: true });
}
