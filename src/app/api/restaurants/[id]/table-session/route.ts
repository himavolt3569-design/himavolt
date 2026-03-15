import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Create or restore a table session */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const body = await req.json();
  const { tableNo, sessionToken } = body;

  if (typeof tableNo !== "number" || tableNo < 1) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }

  // If sessionToken provided, try to match existing active session
  if (sessionToken) {
    const existing = await db.tableSession.findFirst({
      where: { sessionToken, restaurantId, isActive: true },
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

    if (existing) {
      return NextResponse.json({ session: existing, restored: true });
    }
  }

  // Check for any active session on this table
  const activeSession = await db.tableSession.findFirst({
    where: { restaurantId, tableNo, isActive: true },
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

  if (activeSession) {
    return NextResponse.json({ session: activeSession, restored: true });
  }

  // Create new session
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
