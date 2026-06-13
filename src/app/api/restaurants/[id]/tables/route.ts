import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { STAFF_TABLE_MANAGE_ROLES } from "@/lib/staff-roles";

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

  const [restaurant, tables, activeSessions] = await Promise.all([
    db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { slug: true, name: true },
    }),
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

  return NextResponse.json({ tables: result, restaurant });
}

/** POST /api/restaurants/[id]/tables — create a table */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed: string[] = ["OWNER", ...STAFF_TABLE_MANAGE_ROLES];
  if (!allowed.includes(access.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json();
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;
  const capacity = typeof body.capacity === "number" && body.capacity > 0 ? body.capacity : 4;
  // tableNo stays the internal routing handle (QR URLs + live sessions key off it),
  // but staff name tables by label — so it's auto-assigned unless explicitly given (bulk create).
  const explicitNo = typeof body.tableNo === "number" && body.tableNo > 0 ? body.tableNo : null;

  if (explicitNo !== null) {
    try {
      const table = await db.table.create({
        data: { tableNo: explicitNo, label, capacity, restaurantId },
      });
      return NextResponse.json({ table }, { status: 201 });
    } catch {
      return NextResponse.json({ error: "Table number already exists" }, { status: 409 });
    }
  }

  // Auto-assign the next free number. Retry past collisions (the @@unique guards races).
  const last = await db.table.findFirst({
    where: { restaurantId },
    orderBy: { tableNo: "desc" },
    select: { tableNo: true },
  });
  let next = (last?.tableNo ?? 0) + 1;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const table = await db.table.create({
        data: { tableNo: next, label, capacity, restaurantId },
      });
      return NextResponse.json({ table }, { status: 201 });
    } catch {
      next++; // number taken by a concurrent create — try the next one
    }
  }
  return NextResponse.json({ error: "Could not allocate a table number" }, { status: 500 });
}
