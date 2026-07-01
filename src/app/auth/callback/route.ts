import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { INTENDED_ROLE_COOKIE, normalizeIntendedRole } from "@/lib/intended-role";
import { generateUniqueUsername } from "@/lib/username";

type SafeRole = "CUSTOMER" | "OWNER";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as string | null;
  const next = searchParams.get("next") ?? "/";

  // Role source priority: URL query param > first-party cookie hint (survives
  // the OAuth redirect when the query param is dropped) > Supabase metadata >
  // default CUSTOMER.
  const roleParam =
    normalizeIntendedRole(searchParams.get("role")) ??
    normalizeIntendedRole(req.cookies.get(INTENDED_ROLE_COOKIE)?.value) ??
    null;

  if (!code && !tokenHash) {
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

  // Handle both PKCE flow (code) and implicit/token-hash flow
  let authError: Error | null = null;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "signup" | "email" });
    authError = error;
  }

  if (authError) {
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

  let redirectTo = next;

  try {
    // Look up existing user by Supabase ID first, then fall back to email
    // (Google OAuth can create a new user ID even for an existing email account)
    let existingUserById = await db.user.findUnique({ where: { id: user.id } });
    let existingUserByEmail = !existingUserById && email
      ? await db.user.findFirst({ where: { email } })
      : null;

    // Any leftover "scheduled deletion" record is treated as gone — remove it
    // and let this sign-in provision a fresh account.
    if (existingUserById?.isDeleted) {
      try { await db.user.delete({ where: { id: existingUserById.id } }); } catch (e) {}
      existingUserById = null;
    }
    if (existingUserByEmail?.isDeleted) {
      try { await db.user.delete({ where: { id: existingUserByEmail.id } }); } catch (e) {}
      existingUserByEmail = null;
    }

    const existingUser = existingUserById ?? existingUserByEmail;
    const isNewAccount = !existingUser;
    // True when same email exists in DB under a different auth provider/ID
    const isAccountLink = !existingUserById && !!existingUserByEmail;

    // Determine role: URL param > existing DB role > metadata (email sign-up) > default CUSTOMER
    // Never allow ADMIN to be self-assigned.
    const metadataRole = user.user_metadata?.intended_role as SafeRole | undefined;
    const dbRole = existingUser?.role;

    const explicitRole: SafeRole | undefined =
      roleParam === "OWNER" || roleParam === "CUSTOMER" ? roleParam : undefined;

    // Only ever used to provision a BRAND-NEW account below — an intent
    // signal (cookie/query param) must never change an EXISTING account's
    // role. Role upgrades for existing accounts only happen through an
    // explicit in-app action (Get Started -> Create Restaurant, or creating
    // a restaurant directly), never as a side effect of logging in.
    const finalRole: SafeRole = (() => {
      if (explicitRole === "OWNER") return "OWNER";
      if (explicitRole === "CUSTOMER") return "CUSTOMER";
      if (metadataRole === "OWNER") return "OWNER";
      if (metadataRole === "CUSTOMER") return "CUSTOMER";
      return "CUSTOMER";
    })();

    if (isAccountLink && existingUserByEmail) {
      await db.user.update({
        where: { email },
        data: {
          name, imageUrl,
          isDeleted: false, deletedAt: null,
          ...(phone ? { phone } : {}),
        },
      });
    } else {
      await db.user.upsert({
        where: { id: user.id },
        update: {
          email, name, imageUrl,
          isDeleted: false, deletedAt: null,
          ...(phone ? { phone } : {}),
        },
        create: {
          id: user.id, email, name, imageUrl, phone,
          role: finalRole,
          username: usernameFromMeta ?? await generateUniqueUsername(name || email),
          // Neither Google OAuth nor the magic-link flow ever sets a password
          // at account-creation time — the mandatory /auth/set-password step
          // flips this once the user actually sets one.
          hasPassword: false,
        },
      });
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } })
      ?? (isAccountLink && email ? await db.user.findFirst({ where: { email } }) : null);

    // Base destination, ignoring the password gate for a moment.
    const explicitCustomerIntent = roleParam === "CUSTOMER";
    let baseRedirect: string;
    if (!isNewAccount) {
      // Existing account: routing follows what's ACTUALLY on file, never an
      // intent signal — a login can't misroute (or, per above, re-role) an
      // established account. Owners always land on the dashboard (which opens
      // the create-restaurant modal inline if they somehow have none yet);
      // everyone else lands back where they came from.
      baseRedirect = dbRole === "OWNER" || dbRole === "ADMIN" ? "/dashboard" : next;
    } else if (explicitCustomerIntent) {
      // Consumer-site entry points explicitly flag customer intent so plain
      // customers never see the owner-onboarding screens.
      baseRedirect = next;
    } else {
      // Brand-new account with owner-intent (or no signal at all, since this
      // page is now B2B-framed by default) — let them pick create vs. join.
      baseRedirect = "/auth/get-started";
    }

    // The password step is unconditional and highest priority — it carries
    // the real destination forward via `next` so it isn't lost.
    redirectTo = dbUser?.hasPassword
      ? baseRedirect
      : `/auth/set-password?next=${encodeURIComponent(baseRedirect)}`;
  } catch (err: any) {
    console.error("[/auth/callback] DB error:", err?.message ?? err);
    // Session cookies are still valid — redirect to dashboard and let it recover
    redirectTo = "/dashboard";
  }

  // Build final redirect response and attach all session cookies
  const res = NextResponse.redirect(new URL(redirectTo, req.url));
  pendingCookies.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });
  // The intended-role hint has done its job — drop it.
  res.cookies.set(INTENDED_ROLE_COOKIE, "", { path: "/", maxAge: 0 });

  return res;
}
