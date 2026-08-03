import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/staff
 * Every staff member (StaffMember rows) across all restaurants, with their
 * linked user account and restaurant. Search + pagination.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const search = (url.searchParams.get("search") || "").trim();
  const roleFilter = url.searchParams.get("role") || undefined;

  const where: Record<string, unknown> = {};
  if (roleFilter) where.role = roleFilter;
  if (search) {
    where.OR = [
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
      { restaurant: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  try {
    const [staff, total] = await Promise.all([
      db.staffMember.findMany({
        where,
        select: {
          id: true,
          role: true,
          staffType: true,
          isActive: true,
          createdAt: true,
          user: {
            select: { id: true, name: true, email: true, phone: true, imageUrl: true },
          },
          restaurant: {
            select: { id: true, name: true, type: true, city: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.staffMember.count({ where }),
    ]);

    return NextResponse.json(
      {
        staff,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[Admin Staff] list failed:", err);
    return NextResponse.json(
      { error: "Could not load staff. Please try again." },
      { status: 503 },
    );
  }
}
