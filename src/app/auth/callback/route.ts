import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";

type SafeRole = "CUSTOMER" | "OWNER";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Role source priority: URL query param > cookie (set before OAuth redirect) > Supabase metadata
  const roleParam = searchParams.get("role")?.toUpperCase() as SafeRole | null;
  const roleCookie = req.cookies.get("intended_role")?.value?.toUpperCase() as SafeRole | null;

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

  const isGoogleUser = user.app_metadata?.provider === "google";

  // Look up existing user by Supabase ID first, then fall back to email
  // (Google OAuth can create a new user ID even for an existing email account)
  const existingUserById = await db.user.findUnique({ where: { id: user.id } });
  const existingUserByEmail = !existingUserById && email
    ? await db.user.findFirst({ where: { email } })
    : null;
  const existingUser = existingUserById ?? existingUserByEmail;
  const isNewUser = !existingUser;
  // True when same email exists in DB under a different auth provider/ID
  const isAccountLink = !existingUserById && !!existingUserByEmail;

  // Determine role: URL param > cookie > existing DB role > metadata (email sign-up) > CUSTOMER
  // Never allow ADMIN to be self-assigned.
  const metadataRole = user.user_metadata?.intended_role as SafeRole | undefined;
  const dbRole = existingUser?.role;

  // The explicit intended role from signup flow (query param or cookie)
  const explicitRole: SafeRole | undefined =
    (roleParam === "OWNER" || roleParam === "CUSTOMER" ? roleParam : undefined) ??
    (roleCookie === "OWNER" || roleCookie === "CUSTOMER" ? roleCookie : undefined);

  const intendedRole: SafeRole | undefined =
    explicitRole ??
    (dbRole === "OWNER" || dbRole === "ADMIN" ? "OWNER" as SafeRole : undefined) ??
    metadataRole;
  const safeRole: SafeRole = intendedRole === "OWNER" ? "OWNER" : "CUSTOMER";

  // For account linking: the explicit signup role should take priority over
  // the inherited DB role. An existing CUSTOMER upgrading to OWNER via Google
  // signup should become OWNER, not stay CUSTOMER.
  const finalRole: SafeRole = (() => {
    if (explicitRole === "OWNER") return "OWNER";
    if (isAccountLink && existingUserByEmail) {
      const inherited = existingUserByEmail.role;
      if (inherited === "OWNER" || inherited === "ADMIN") return "OWNER";
    }
    return safeRole;
  })();

  if (isAccountLink && existingUserByEmail) {
    // Same email exists under a different ID — update the existing record
    // instead of creating a new one (which would violate `email @unique`).
    await db.user.update({
      where: { email },
      data: {
        name, imageUrl,
        ...(phone ? { phone } : {}),
        ...(finalRole === "OWNER" ? { role: "OWNER" } : {}),
      },
    });
  } else {
    await db.user.upsert({
      where: { id: user.id },
      update: {
        email, name, imageUrl,
        ...(phone ? { phone } : {}),
        // Upgrade to OWNER if intended, but never downgrade
        ...(finalRole === "OWNER" ? { role: "OWNER" } : {}),
      },
      create: {
        id: user.id, email, name, imageUrl, phone,
        role: finalRole,
        username: usernameFromMeta,
      },
    });
  }

  // Check if this owner already has restaurants (to decide onboarding vs dashboard)
  let ownerHasRestaurant = false;
  if (finalRole === "OWNER") {
    // Check by the current auth user ID
    const restaurantCount = await db.restaurant.count({
      where: { ownerId: user.id },
    });
    // Also check by linked email account ID
    if (restaurantCount === 0 && isAccountLink && existingUserByEmail) {
      const linkedCount = await db.restaurant.count({
        where: { ownerId: existingUserByEmail.id },
      });
      ownerHasRestaurant = linkedCount > 0;
    } else {
      ownerHasRestaurant = restaurantCount > 0;
    }
  }

  // Determine final redirect URL
  let redirectTo = next;

  if (isNewUser || (isAccountLink && isGoogleUser)) {
    if (isGoogleUser) {
      // Check if this user already has a username (from linked account)
      const dbUser = await db.user.findUnique({ where: { id: user.id } })
        ?? (isAccountLink && email ? await db.user.findFirst({ where: { email } }) : null);
      const hasUsername = !!dbUser?.username;

      if (!hasUsername) {
        // Google users need to complete their profile (pick a username)
        const roleQ = finalRole === "OWNER" ? `?role=OWNER` : "";
        redirectTo = `/auth/complete-profile${roleQ}`;
      } else if (finalRole === "OWNER") {
        // Has username already — go to onboarding or dashboard
        redirectTo = ownerHasRestaurant ? "/dashboard" : "/onboarding";
      } else {
        redirectTo = "/";
      }
    } else if (finalRole === "OWNER") {
      // New owner via email — send to restaurant setup wizard
      redirectTo = ownerHasRestaurant ? "/dashboard" : "/onboarding";
    }
    // New customer via email → fall through to `next` (default "/")
  } else if (next === "/" || next === "") {
    // Returning user — redirect based on their effective role
    if (finalRole === "OWNER" || dbRole === "OWNER" || dbRole === "ADMIN") {
      redirectTo = ownerHasRestaurant ? "/dashboard" : "/onboarding";
    }
  }

  // Build final redirect response and attach all session cookies
  const res = NextResponse.redirect(new URL(redirectTo, req.url));
  pendingCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });
  // Clear the intended_role cookie now that we've consumed it
  res.cookies.set("intended_role", "", { path: "/", maxAge: 0 });
  return res;
}
