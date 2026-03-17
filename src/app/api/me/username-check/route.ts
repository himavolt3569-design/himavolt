import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const username = new URL(req.url).searchParams.get("username") ?? "";

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false });
  }

  const existing = await db.user.findUnique({ where: { username } });
  return NextResponse.json({ available: !existing });
}
