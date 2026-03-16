import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const isPublicRoute = createRouteMatcher([
  "/",
  "/food(.*)",
  "/menu(.*)",
  "/scan(.*)",
  "/bill(.*)",
  "/contact(.*)",
  "/legal(.*)",
  "/track(.*)",
  "/api/public(.*)",
  "/api/webhooks(.*)",
  "/api/contact",
  "/api/track(.*)",
  "/api/restaurants/(.+)/orders",
  "/api/orders/(.+)/bill",
  "/api/payments/esewa/callback(.*)",
  "/api/payments/khalti/callback(.*)",
  "/api/chat(.*)",
  "/api/staff-login(.*)",
  "/api/staff-session(.*)",
  "/api/restaurants/(.+)/inventory(.*)",
  "/api/restaurants/(.+)/chat(.*)",
  "/api/restaurants/(.+)/menu(.*)",
  "/api/restaurants/(.+)/categories(.*)",
  "/api/restaurants/(.+)/stories(.*)",
  "/api/upload(.*)",
  "/staff-login(.*)",
  "/kitchen(.*)",
  "/counter(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.json",
]);

function passthrough(_req: NextRequest) {
  return NextResponse.next();
}

const handler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware(async (auth, req) => {
      // If route is public, let it pass
      if (isPublicRoute(req)) {
        // Extra check: /kitchen and /counter require a valid staff JWT
        if (
          req.nextUrl.pathname.startsWith("/kitchen") ||
          req.nextUrl.pathname.startsWith("/counter")
        ) {
          const staffCookie = req.cookies.get("staff_session")?.value;
          if (!staffCookie || !process.env.JWT_SECRET) {
            return NextResponse.redirect(new URL("/staff-login", req.url));
          }
          try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            await jwtVerify(staffCookie, secret);
          } catch {
            const res = NextResponse.redirect(new URL("/staff-login", req.url));
            res.cookies.delete("staff_session");
            return res;
          }
        }
        return;
      }

      // Check for Custom Staff JWT Session
      const staffCookie = req.cookies.get("staff_session")?.value;
      if (staffCookie && process.env.JWT_SECRET) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          await jwtVerify(staffCookie, secret);
          // Valid staff session, bypass Clerk check
          return;
        } catch {
          // Token invalid/expired, fall through to Clerk
        }
      }

      // For all protected routes (API and pages), use Clerk protection.
      // This returns 401 for unauthenticated API requests and
      // redirects to sign-in for unauthenticated page requests.
      await auth.protect();
    })
  : passthrough;

export default handler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
