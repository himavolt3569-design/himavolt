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
  /^\/order-track(\/|$)/,
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
  /^\/api\/order-track(\/|$)/,
  /^\/api\/track(\/|$)/,
  /^\/api\/restaurants\/[^/]+\/orders$/,
  /^\/api\/restaurants\/[^/]+\/table-session(\/|$)/,
  /^\/api\/orders\/[^/]+\/bill$/,
  /^\/api\/payments\/initiate$/,
  /^\/api\/payments\/[^/]+\/status$/,
  /^\/api\/payments\/esewa\/callback/,
  /^\/api\/payments\/khalti\/callback/,
  /^\/api\/payments\/bank-proof$/,
  /^\/api\/payments\/room-booking(\/|$)/,
  /^\/api\/cron(\/|$)/,
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

const STAFF_ONLY_ROUTES = [
  /^\/kitchen(\/|$)/,
  /^\/counter(\/|$)/,
  /^\/pos\/staff(\/|$)/,
  /^\/pos\/cfd(\/|$)/,
];

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

const BODY_SIZE_LIMIT = 1 * 1024 * 1024; // 1 MB for API JSON payloads
const UPLOAD_PATHS = ["/api/upload"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Reject oversized payloads before they hit route handlers.
  // Upload routes handle their own size limits internally.
  if (
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    !UPLOAD_PATHS.some((p) => pathname.startsWith(p))
  ) {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > BODY_SIZE_LIMIT) {
      return NextResponse.json(
        { error: "Payload too large. Maximum 1 MB." },
        { status: 413 },
      );
    }
  }

  if (isStaffRoute(pathname)) {
    const valid = await verifyStaffJwt(req);
    if (!valid) {
      const res = NextResponse.redirect(new URL("/staff-login", req.url));
      res.cookies.delete("staff_session");
      return res;
    }
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return refreshSupabaseSession(req);
  }

  const masterAdminValid = await verifyMasterAdminJwt(req);
  if (masterAdminValid) return NextResponse.next();

  const staffValid = await verifyStaffJwt(req);
  if (staffValid) return NextResponse.next();

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens onto BOTH the request and the response.
          // Request: so the downstream route handler (getSupabaseServerClient)
          // reads the NEW access token instead of re-refreshing with a refresh
          // token this middleware already rotated — which would fail and 401.
          // Response: so the browser persists the rotated session.
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return res;
}

function hasSupabaseAuthCookies(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

async function refreshSupabaseSession(req: NextRequest) {
  if (!hasSupabaseAuthCookies(req)) {
    return NextResponse.next();
  }

  let res = NextResponse.next({ request: req });
  const { pathname } = req.nextUrl;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror refreshed tokens onto the request so downstream handlers see
          // the rotated session, then onto the response for the browser.
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in, don't allow hitting sign-in/sign-up
  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
