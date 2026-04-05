import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = [
  /^\/$/,
  /^\/food(\/|$)/,
  /^\/menu(\/|$)/,
  /^\/scan(\/|$)/,
  /^\/bill(\/|$)/,
  /^\/contact(\/|$)/,
  /^\/legal(\/|$)/,
  /^\/track(\/|$)/,
  /^\/guide(\/|$)/,
  /^\/orders(\/|$)/,
  /^\/offers(\/|$)/,
  /^\/hotel(\/|$)/,
  /^\/feedback(\/|$)/,
  /^\/sign-in(\/|$)/,
  /^\/sign-up(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/staff-login(\/|$)/,
  /^\/manifest\.json$/,
  /^\/api\/public(\/|$)/,
  /^\/api\/webhooks(\/|$)/,
  /^\/api\/contact$/,
  /^\/api\/track(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/orders$/,
  /^\/api\/orders\/[^/]+\/bill$/,
  /^\/api\/payments\/esewa\/callback/,
  /^\/api\/payments\/khalti\/callback/,
  /^\/api\/payments\/room-booking(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/feedback$/,
  /^\/api\/chat(\/|$)/,
  /^\/api\/staff-login(\/|$)/,
  /^\/api\/staff-session(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/inventory(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/chat(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/menu(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/categories(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/stories(\/|$)/,
  /^\/api\/upload(\/|$)/,
  /^\/api\/me\/username-check(\/|$)/,
  /^\/api\/admin\/login(\/|$)/,
  /^\/api\/admin\/verify(\/|$)/,
  /^\/api\/admin\/logout(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/pos\/(?!staff)(.*)/,
];

const STAFF_ONLY_ROUTES = [/^\/kitchen(\/|$)/, /^\/counter(\/|$)/, /^\/pos\/staff(\/|$)/];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((r) => r.test(pathname));
}

function isStaffRoute(pathname: string) {
  return STAFF_ONLY_ROUTES.some((r) => r.test(pathname));
}

async function verifyStaffJwt(req: NextRequest): Promise<boolean> {
  const staffCookie = req.cookies.get("staff_session")?.value;
  if (!staffCookie || !process.env.JWT_SECRET) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(staffCookie, secret);
    return true;
  } catch {
    return false;
  }
}

async function verifyMasterAdminJwt(req: NextRequest): Promise<boolean> {
  const adminCookie = req.cookies.get("master_admin_session")?.value;
  if (!adminCookie || !process.env.JWT_SECRET) return false;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(adminCookie, secret);
    return payload.role === "MASTER_ADMIN";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Staff-only routes: require valid staff JWT
  if (isStaffRoute(pathname)) {
    const valid = await verifyStaffJwt(req);
    if (!valid) {
      const res = NextResponse.redirect(new URL("/staff-login", req.url));
      res.cookies.delete("staff_session");
      return res;
    }
    return NextResponse.next();
  }

  // Public routes: pass through, but refresh Supabase session cookies
  if (isPublicRoute(pathname)) {
    return refreshSupabaseSession(req);
  }

  // Protected routes: check master admin JWT first (bypasses Supabase auth)
  const masterAdminValid = await verifyMasterAdminJwt(req);
  if (masterAdminValid) return NextResponse.next();

  // Check staff JWT
  const staffValid = await verifyStaffJwt(req);
  if (staffValid) return NextResponse.next();

  // Check Supabase session
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // API routes: return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Page routes: redirect to sign-in
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return res;
}

async function refreshSupabaseSession(req: NextRequest) {
  const res = NextResponse.next();

  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
