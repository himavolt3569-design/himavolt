import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

const THEME_SELECT = {
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  fontFamily: true,
  menuLayout: true,
  footerText: true,
  showStories: true,
  showReviews: true,
} as const;

async function verifyOwnerAccess(req: NextRequest, restaurantId: string) {
  // Try staff auth first (SUPER_ADMIN or MANAGER only)
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff && ["SUPER_ADMIN", "MANAGER"].includes(staff.role)) {
    return { type: "staff" as const };
  }
  // Fallback: owner auth
  const user = await getAuthUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: { ownerId: true },
  });
  if (!restaurant || restaurant.ownerId !== user.id) return null;
  return { type: "owner" as const };
}

// GET /api/restaurants/[id]/theme — public (no auth required for menu pages)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    select: THEME_SELECT,
  });

  if (!restaurant)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(restaurant);
}

// PUT /api/restaurants/[id]/theme
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await verifyOwnerAccess(req, id);
  if (!actor)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    fontFamily,
    menuLayout,
    footerText,
    showStories,
    showReviews,
  } = body;

  const VALID_FONTS = ["Inter", "Poppins", "Lato", "Roboto", "Nunito", "Montserrat"];
  const VALID_LAYOUTS = ["grid", "list", "compact"];
  const HEX_RE = /^#[0-9a-fA-F]{6}$/;

  const data: Record<string, unknown> = {};
  if (typeof primaryColor === "string" && (HEX_RE.test(primaryColor) || primaryColor === ""))
    data.primaryColor = primaryColor || null;
  if (typeof secondaryColor === "string" && (HEX_RE.test(secondaryColor) || secondaryColor === ""))
    data.secondaryColor = secondaryColor || null;
  if (typeof accentColor === "string" && (HEX_RE.test(accentColor) || accentColor === ""))
    data.accentColor = accentColor || null;
  if (typeof fontFamily === "string" && (VALID_FONTS.includes(fontFamily) || fontFamily === ""))
    data.fontFamily = fontFamily || null;
  if (typeof menuLayout === "string" && VALID_LAYOUTS.includes(menuLayout))
    data.menuLayout = menuLayout;
  if (typeof footerText === "string")
    data.footerText = footerText || null;
  if (typeof showStories === "boolean") data.showStories = showStories;
  if (typeof showReviews === "boolean") data.showReviews = showReviews;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const updated = await db.restaurant.update({
    where: { id },
    data,
    select: THEME_SELECT,
  });

  return NextResponse.json(updated);
}
