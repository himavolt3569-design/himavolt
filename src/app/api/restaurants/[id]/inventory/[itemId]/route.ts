import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { updateInventoryItemSchema } from "@/lib/validations";

async function authorise(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return true;
  const user = await getOrCreateUser();
  if (!user) return false;
  const owns = await db.restaurant.findFirst({
    where: { id: restaurantId, ownerId: user.id },
    select: { id: true },
  });
  return !!owns;
}

// PATCH — update inventory item (validated fields only)
export const PATCH = safeHandler(
  async (req, { params, body }) => {
    const { id, itemId } = await params;

    if (!(await authorise(req, id))) return unauthorized();

    const item = await db.inventoryItem.update({
      where: { id: itemId },
      data: body,
    });

    return NextResponse.json(item);
  },
  { schema: updateInventoryItemSchema },
);

// DELETE — remove inventory item
export const DELETE = safeHandler(async (req, { params }) => {
  const { id, itemId } = await params;

  if (!(await authorise(req, id))) return unauthorized();

  await db.inventoryItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
});
