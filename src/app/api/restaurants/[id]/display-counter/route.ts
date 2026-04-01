import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

async function authorize(restaurantId: string) {
  const user = await getOrCreateUser();
  if (!user) return null;
  const restaurant = await db.restaurant.findFirst({
    where: {
      id: restaurantId,
      OR: [
        { ownerId: user.id },
        { staff: { some: { userId: user.id, isActive: true } } },
      ],
    },
  });
  return restaurant;
}

// GET — owner/staff reads all display counter items + config
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = await authorize(id);
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [items, config] = await Promise.all([
    db.displayCounterItem.findMany({
      where: { restaurantId: id },
      orderBy: { sortOrder: "asc" },
    }),
    db.displayCounterConfig.findUnique({
      where: { restaurantId: id },
    }),
  ]);

  return NextResponse.json({
    items,
    config: config ?? { isEnabled: false, autoHideSoldOut: false },
  });
}

// POST — create a new display counter item
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = await authorize(id);
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, category, price, status, showPrice, imageUrl } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Get max sort order
  const maxOrder = await db.displayCounterItem.findFirst({
    where: { restaurantId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const item = await db.displayCounterItem.create({
    data: {
      name,
      category: category ?? "General",
      price: price ?? 0,
      status: status ?? "available",
      showPrice: showPrice ?? true,
      imageUrl: imageUrl ?? null,
      sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      restaurantId: id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

// PATCH — update item(s) or config
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = await authorize(id);
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Update config
  if (body.config) {
    const config = await db.displayCounterConfig.upsert({
      where: { restaurantId: id },
      update: {
        isEnabled: body.config.isEnabled,
        autoHideSoldOut: body.config.autoHideSoldOut,
      },
      create: {
        restaurantId: id,
        isEnabled: body.config.isEnabled ?? false,
        autoHideSoldOut: body.config.autoHideSoldOut ?? false,
      },
    });
    return NextResponse.json({ config });
  }

  // Update a single item
  if (body.itemId) {
    const { itemId, ...data } = body;
    const item = await db.displayCounterItem.update({
      where: { id: itemId },
      data,
    });
    return NextResponse.json(item);
  }

  // Bulk reorder
  if (body.reorder && Array.isArray(body.reorder)) {
    await Promise.all(
      body.reorder.map((r: { id: string; sortOrder: number }) =>
        db.displayCounterItem.update({
          where: { id: r.id },
          data: { sortOrder: r.sortOrder },
        })
      )
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

// DELETE — delete a display counter item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = await authorize(id);
  if (!restaurant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  await db.displayCounterItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
