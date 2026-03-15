import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { createInventoryItemSchema } from "@/lib/validations";

/**
 * Authenticate via staff JWT OR Clerk owner session.
 * Returns true if authorised for this restaurant.
 */
async function authorise(req: NextRequest, restaurantId: string) {
  // Staff path
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return true;

  // Owner path
  const user = await getOrCreateUser();
  if (!user) return false;
  const owns = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
    select: { id: true },
  });
  return !!owns;
}

// GET all inventory items for the restaurant
export const GET = safeHandler(async (req, { params }) => {
  const { id } = await params;

  if (!(await authorise(req, id))) return unauthorized();

  const items = await db.inventoryItem.findMany({
    where: { restaurantId: id },
    include: {
      menuItems: {
        include: {
          menuItem: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Flatten the menuItems relation for easier consumption
  const result = items.map((item) => ({
    ...item,
    usedInMenuItems: item.menuItems.map((mi) => ({
      id: mi.menuItem.id,
      name: mi.menuItem.name,
      quantityUsed: mi.quantityUsed,
    })),
    menuItems: undefined,
  }));

  return NextResponse.json(result);
});

// POST — add new inventory item
export const POST = safeHandler(
  async (req, { params, body }) => {
    const { id } = await params;

    if (!(await authorise(req, id))) return unauthorized();

    const item = await db.inventoryItem.create({
      data: { ...body, restaurantId: id },
    });

    return NextResponse.json(item, { status: 201 });
  },
  { schema: createInventoryItemSchema },
);
