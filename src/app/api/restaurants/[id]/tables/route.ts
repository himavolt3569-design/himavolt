import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function verifyAccess(req: NextRequest, restaurantId: string) {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return { actorId: staff.staffId, role: staff.role };
  const user = await getAuthUser();
  if (!user) return null;
  const r = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { ownerId: true } });
  if (!r || r.ownerId !== user.id) return null;
  return { actorId: user.id, role: "OWNER" };
}

/** GET /api/restaurants/[id]/tables — list all tables with live occupancy status */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [tables, activeSessions] = await Promise.all([
    db.table.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { tableNo: "asc" },
    }),
    db.tableSession.findMany({
      where: { restaurantId, isActive: true },
      include: {
        order: {
          select: {
            id: true, orderNo: true, status: true, total: true, guestName: true,
            user: { select: { name: true } },
            payment: { select: { status: true, method: true } },
          },
        },
      },
    }),
  ]);

  const sessionByTable = new Map(activeSessions.map((s) => [s.tableNo, s]));

  const result = tables.map((t) => {
    const session = sessionByTable.get(t.tableNo);
    return {
      ...t,
      isOccupied: !!session,
      session: session ?? null,
    };
  });

  return NextResponse.json({ tables: result });
}

/** POST /api/restaurants/[id]/tables — create a table */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(access.role)) {
    return NextResponse.json({ error: "Manager or owner access required" }, { status: 403 });
  }

  const { tableNo, label, capacity } = await req.json();
  if (!tableNo || typeof tableNo !== "number") {
    return NextResponse.json({ error: "tableNo (number) is required" }, { status: 400 });
  }

  try {
    const table = await db.table.create({
      data: { tableNo, label: label ?? null, capacity: capacity ?? 4, restaurantId },
    });
    return NextResponse.json({ table }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Table number already exists" }, { status: 409 });
  }
}
