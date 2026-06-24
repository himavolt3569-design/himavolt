import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Create or restore a table session */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const body = await req.json();
  const { sessionToken, qrToken } = body;

  // Server-authoritative table identity: when the QR token is present we resolve
  // the table from it, so a guest can never change the table number in the URL
  // to order on someone else's table. Raw tableNo from the body is only honoured
  // as a legacy fallback for QR codes printed before token-based QRs existed.
  let tableNo: number | undefined;
  if (typeof qrToken === "string" && qrToken) {
    const table = await db.table.findFirst({
      where: { qrToken, restaurantId },
      select: { tableNo: true },
    });
    if (!table) {
      return NextResponse.json({ error: "Invalid table QR" }, { status: 404 });
    }
    tableNo = table.tableNo;
  } else if (typeof body.tableNo === "number" && body.tableNo >= 1) {
    tableNo = body.tableNo;
  }

  if (typeof tableNo !== "number" || tableNo < 1) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }

  const orderInclude = {
    items: { include: { menuItem: true } },
    payment: true,
    bill: true,
  };

  // 1. If sessionToken provided, try to restore exact session (active or has a live order)
  if (sessionToken) {
    const byToken = await db.tableSession.findFirst({
      where: { sessionToken, restaurantId },
      include: { order: { include: orderInclude } },
    });

    if (byToken) {
      // Restore if still active OR if it has an order that isn't done yet
      const orderAlive =
        byToken.order &&
        !["ACCEPTED", "REJECTED", "REJECTED"].includes(byToken.order.status);

      if (byToken.isActive || orderAlive) {
        return NextResponse.json({ session: byToken, restored: true });
      }
    }
  }

  // 2. Check for any active session on this table
  const activeSession = await db.tableSession.findFirst({
    where: { restaurantId, tableNo, isActive: true },
    include: { order: { include: orderInclude } },
  });

  if (activeSession) {
    return NextResponse.json({ session: activeSession, restored: true });
  }

  // 3. No active session — check for a session with a live (non-completed) order
  //    This handles the case where isActive was set false but order is still pending
  const liveOrderSession = await db.tableSession.findFirst({
    where: {
      restaurantId,
      tableNo,
      order: {
        status: { notIn: ["ACCEPTED", "REJECTED", "REJECTED"] },
      },
    },
    include: { order: { include: orderInclude } },
    orderBy: { startedAt: "desc" },
  });

  if (liveOrderSession) {
    // Reactivate the session so it shows correctly
    const reactivated = await db.tableSession.update({
      where: { id: liveOrderSession.id },
      data: { isActive: true },
      include: { order: { include: orderInclude } },
    });
    return NextResponse.json({ session: reactivated, restored: true });
  }

  // 4. Create new session
  const session = await db.tableSession.create({
    data: { tableNo, restaurantId },
    include: { order: true },
  });

  return NextResponse.json({ session, restored: false });
}

/** Check session status */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const { searchParams } = new URL(req.url);
  const tableNo = Number(searchParams.get("tableNo"));
  const token = searchParams.get("token");

  if (!tableNo) {
    return NextResponse.json({ error: "tableNo required" }, { status: 400 });
  }

  const where: Record<string, unknown> = { restaurantId, tableNo, isActive: true };
  if (token) where.sessionToken = token;

  const session = await db.tableSession.findFirst({
    where,
    include: {
      order: {
        include: {
          items: { include: { menuItem: true } },
          payment: true,
          bill: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({ session });
}
