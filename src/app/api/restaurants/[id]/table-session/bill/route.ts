import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** "Get Bill" - finalize the table session and return the bill */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  const body = await req.json();
  const { sessionToken, tableNo } = body;

  if (!sessionToken && !tableNo) {
    return NextResponse.json(
      { error: "sessionToken or tableNo required" },
      { status: 400 }
    );
  }

  // Find the active session
  const where: Record<string, unknown> = { restaurantId, isActive: true };
  if (sessionToken) where.sessionToken = sessionToken;
  if (tableNo) where.tableNo = tableNo;

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
    return NextResponse.json({ error: "No active session found" }, { status: 404 });
  }

  // End the session
  await db.tableSession.update({
    where: { id: session.id },
    data: { isActive: false, endedAt: new Date() },
  });

  // If order exists and has a CASH payment, mark it for counter collection
  if (session.order?.payment?.method === "CASH" && session.order.payment.status === "PENDING") {
    // Keep payment as PENDING — customer will pay at counter
    // The billing staff will mark it COMPLETED from the dashboard
  }

  return NextResponse.json({
    session: { ...session, isActive: false, endedAt: new Date() },
    bill: session.order?.bill ?? null,
    message: "Session ended. Please proceed to counter for payment.",
  });
}
