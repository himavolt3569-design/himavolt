import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireStaffForRestaurant } from "@/lib/staff-auth";
import { getAuthUser } from "@/lib/auth";
import { STAFF_TABLE_MANAGE_ROLES } from "@/lib/staff-roles";

type Params = { params: Promise<{ id: string }> };

/** Unguessable token printed in the table QR — the table identity the client can't forge. */
function newQrToken() {
  return randomUUID().replace(/-/g, "");
}

/** Max legacy qrToken backfills per GET. Bounds the write cost of a read so a
 *  venue with many legacy tables can't stall its own first load. */
const BACKFILL_LIMIT = 5;

/** The restaurant columns every handler in this file needs. Fetched at most once
 *  per request — the ownership check and the response payload share one read. */
const RESTAURANT_SELECT = { ownerId: true, slug: true, name: true } as const;
type RestaurantRow = { ownerId: string; slug: string; name: string };

interface Access {
  actorId: string;
  role: string;
  /** Populated only on the owner path, where the row was already read for the
   *  ownership check. Staff paths leave it null — the caller fetches if needed. */
  restaurant: RestaurantRow | null;
}

async function verifyAccess(
  req: NextRequest,
  restaurantId: string,
): Promise<Access | null> {
  const staff = await requireStaffForRestaurant(req, restaurantId);
  if (staff) return { actorId: staff.staffId, role: staff.role, restaurant: null };
  const user = await getAuthUser();
  if (!user) return null;
  const r = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: RESTAURANT_SELECT,
  });
  if (!r || r.ownerId !== user.id) return null;
  // Hand the row back so GET doesn't re-read the same record for slug/name.
  return { actorId: user.id, role: "OWNER", restaurant: r };
}

/** GET /api/restaurants/[id]/tables — list all tables with live occupancy status */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const access = await verifyAccess(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // This endpoint is polled by every open dashboard, and the runtime pool is
  // small (see src/lib/db.ts). Queries run sequentially — a parallel Promise.all
  // saturates the pool and the connection-acquire times out, which surfaced as
  // intermittent 5xx errors here.
  try {
    // Reuse the row verifyAccess already read on the owner path; only the staff
    // path (which checks a JWT, not the DB) needs to fetch it.
    const restaurant =
      access.restaurant ??
      (await db.restaurant.findUnique({
        where: { id: restaurantId },
        select: RESTAURANT_SELECT,
      }));
    const tables = await db.table.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { tableNo: "asc" },
    });

    // Backfill secure QR tokens for legacy tables created before token-based QRs
    // existed. This is a WRITE on a read path, so it is bounded and off the
    // critical path: only rows genuinely missing a token are touched, at most
    // BACKFILL_LIMIT per request, and a failure never fails the read. Remaining
    // rows are picked up by subsequent loads until the set drains to zero, after
    // which this costs one array filter.
    const missingToken = tables.filter((t) => !t.qrToken).slice(0, BACKFILL_LIMIT);
    for (const t of missingToken) {
      const qrToken = newQrToken();
      try {
        await db.table.update({ where: { id: t.id }, data: { qrToken } });
        t.qrToken = qrToken;
      } catch {
        /* unique race — a concurrent request set it; refetched on next load */
      }
    }
    // Auto-close abandoned "just browsing" sessions: a table left on the menu
    // with NO order placed for 4h+ is almost always a scan that walked away
    // (a phone that opened the menu and left), not a live diner — so it should
    // stop showing the table as occupied. We only touch sessions with no order
    // (orderId: null); anything with a real order is left alone. Deleting (vs
    // deactivating) sidesteps the @@unique([restaurantId, tableNo, isActive])
    // constraint and matches the guest-side browse/clear route, and a
    // browse-only session carries no data worth keeping. Bounded write on a
    // read path (like the qrToken backfill above) and never fails the read.
    const IDLE_BROWSE_MS = 4 * 60 * 60 * 1000;
    await db.tableSession
      .deleteMany({
        where: {
          restaurantId,
          isActive: true,
          orderId: null,
          startedAt: { lt: new Date(Date.now() - IDLE_BROWSE_MS) },
        },
      })
      .catch(() => {});

    const activeSessions = await db.tableSession.findMany({
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
    });

    const sessionByTable = new Map(activeSessions.map((s) => [s.tableNo, s]));

    const result = tables.map((t) => {
      const session = sessionByTable.get(t.tableNo);
      return {
        ...t,
        isOccupied: !!session,
        session: session ?? null,
      };
    });

    // Never echo ownerId — it is read for the access check only.
    return NextResponse.json({
      tables: result,
      restaurant: restaurant
        ? { slug: restaurant.slug, name: restaurant.name }
        : null,
    });
  } catch (err) {
    // Degrade gracefully on transient DB/pool errors so the polling client
    // treats it as a skippable refresh instead of crashing the function.
    //
    // Retry-After is load-bearing, not decoration. This 503 is most often pool
    // exhaustion, and apiFetch retries 503 — so without a backoff signal the
    // client's retry lands straight back on the same saturated pool and makes
    // the outage worse. The client honours this header (see src/lib/api-client.ts).
    console.error("[tables] GET failed", err);
    return NextResponse.json(
      { error: "Could not load tables. Please try again." },
      { status: 503, headers: { "Retry-After": "2" } },
    );
  }
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
        data: { tableNo: explicitNo, label, capacity, restaurantId, qrToken: newQrToken() },
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
        data: { tableNo: next, label, capacity, restaurantId, qrToken: newQrToken() },
      });
      return NextResponse.json({ table }, { status: 201 });
    } catch {
      next++; // number taken by a concurrent create — try the next one
    }
  }
  return NextResponse.json({ error: "Could not allocate a table number" }, { status: 500 });
}
