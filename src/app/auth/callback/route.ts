import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

type SafeRole = "CUSTOMER" | "OWNER";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Role passed via query param for Google OAuth path (set on sign-up page)
  const roleParam = searchParams.get("role")?.toUpperCase() as SafeRole | null;

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Collect cookies written by Supabase so we can attach them to the
  // final redirect response regardless of which URL we end up redirecting to.
  const pendingCookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) =>
            pendingCookies.push({
              name: c.name,
              value: c.value,
              options: c.options as Record<string, unknown>,
            }),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const email = user.email ?? "";
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    email.split("@")[0] ??
    "User";
  const imageUrl =
    user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
  const phone = user.user_metadata?.phone ?? user.phone ?? null;
  const usernameFromMeta = (user.user_metadata?.username as string | undefined) ?? null;

  // Determine role: URL param (Google OAuth) > metadata (email sign-up) > CUSTOMER
  // We never allow ADMIN to be self-assigned.
  const metadataRole = user.user_metadata?.intended_role as SafeRole | undefined;
  const intendedRole: SafeRole | undefined = roleParam ?? metadataRole;
  const safeRole: SafeRole = intendedRole === "OWNER" ? "OWNER" : "CUSTOMER";

  const isGoogleUser = user.app_metadata?.provider === "google";

  // Detect whether this user already exists in our DB (new vs returning)
  const existingUser = await db.user.findUnique({ where: { id: user.id } });
  const isNewUser = !existingUser;

  await db.user.upsert({
    where: { id: user.id },
    update: { email, name, imageUrl, ...(phone ? { phone } : {}) },
    create: { id: user.id, email, name, imageUrl, phone, role: safeRole, username: usernameFromMeta },
  });

  // Determine final redirect URL
  let redirectTo = next;
  if (isNewUser) {
    if (isGoogleUser) {
      // Google users always complete their profile (username + optional password)
      const roleQ = intendedRole ? `?role=${intendedRole}` : "";
      redirectTo = `/auth/complete-profile${roleQ}`;
    } else if (safeRole === "OWNER") {
      // New owner via email — send to restaurant setup wizard
      redirectTo = "/onboarding";
    }
    // New customer via email with explicit role → fall through to `next` (default "/")
  }

  // Build final redirect response and attach all session cookies
  const res = NextResponse.redirect(new URL(redirectTo, req.url));
  pendingCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });
  return res;
}
