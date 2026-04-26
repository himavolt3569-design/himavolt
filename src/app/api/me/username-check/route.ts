import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate-limit so the endpoint can't be used to enumerate the username space.
  // 30 lookups / minute / IP is plenty for a debounced sign-up form.
  const limit = rateLimit(clientKey(req, "username-check"), 60_000, 30);
  if (!limit.ok) {
    return NextResponse.json(
      { available: false, error: "Too many checks" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const username = new URL(req.url).searchParams.get("username") ?? "";

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json({ available: false });
  }

  const existing = await db.user.findUnique({ where: { username } });
  return NextResponse.json({ available: !existing });
}
