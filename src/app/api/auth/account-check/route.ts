import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

// Tells the unified sign-in page whether to reveal a password field or send
// a magic-link email. Deliberately reveals account existence (a mild
// enumeration tradeoff already accepted elsewhere in this app, e.g.
// /api/me/username-check) — the alternative of always emailing an OTP would
// force every returning password user through an email round-trip on every
// login, which is worse for this app's target audience.
export async function POST(req: NextRequest) {
  const limit = await rateLimit(clientKey(req, "auth:account-check"), 60_000, 10);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const emailLimit = await rateLimit(
    clientKey(req, `auth:account-check:${parsed.data.email}`),
    60_000,
    10,
  );
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } },
    );
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { hasPassword: true },
  });

  return NextResponse.json({ hasPassword: user?.hasPassword ?? false });
}
