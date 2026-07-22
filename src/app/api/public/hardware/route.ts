import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toPublicListing } from "@/lib/hardware";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/hardware
 * Public catalog — every APPROVED hardware listing (platform + third-party
 * sellers). Seller PII and internal tokens are stripped by `toPublicListing`.
 */
export async function GET() {
  try {
    const listings = await db.hardwareListing.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ isPlatformListing: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ products: listings.map(toPublicListing) });
  } catch (error) {
    console.error("[Public Hardware GET]", error);
    return NextResponse.json({ products: [] });
  }
}
