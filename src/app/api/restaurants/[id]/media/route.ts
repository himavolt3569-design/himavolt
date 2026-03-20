import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

async function getRestaurantId(req: NextRequest, ctx: Ctx): Promise<string | null> {
  const { id } = await ctx.params;
  // Staff session
  const staffSession = await getStaffSession(req);
  if (staffSession && staffSession.restaurantId === id) return id;
  // Owner session
  try {
    const owner = await requireOwner();
    const rest = await db.restaurant.findFirst({ where: { id, ownerId: owner.id } });
    if (rest) return id;
  } catch {
    // not an owner
  }
  return null;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const restaurantId = await getRestaurantId(req, ctx);
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // IMAGE | VIDEO | null = all

  const media = await db.media.findMany({
    where: { restaurantId, ...(type ? { type: type as "IMAGE" | "VIDEO" } : {}) },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json({ media });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  let uploadedById: string | undefined;

  const staffSession = await getStaffSession(req);
  if (staffSession && staffSession.restaurantId === id) {
    uploadedById = staffSession.staffId;
  } else {
    try {
      const owner = await requireOwner();
      const rest = await db.restaurant.findFirst({ where: { id, ownerId: owner.id } });
      if (!rest) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();
  const { url, type, caption, fileName, fileSize, mimeType } = body;

  if (!url || !type) {
    return NextResponse.json({ error: "url and type are required" }, { status: 400 });
  }

  const media = await db.media.create({
    data: {
      url,
      type: type as "IMAGE" | "VIDEO",
      caption: caption ?? null,
      fileName: fileName ?? null,
      fileSize: fileSize ?? null,
      mimeType: mimeType ?? null,
      restaurantId: id,
      uploadedById: uploadedById ?? null,
    },
    include: { uploadedBy: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json({ media }, { status: 201 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const restaurantId = await getRestaurantId(req, ctx);
  if (!restaurantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("mediaId");
  if (!mediaId) return NextResponse.json({ error: "mediaId required" }, { status: 400 });

  await db.media.delete({ where: { id: mediaId, restaurantId } });
  return NextResponse.json({ ok: true });
}
