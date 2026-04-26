import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getBillByOrderId, generateBill } from "@/lib/billing";
import { canAccessOrder } from "@/lib/order-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  // Bill exposes customer name/email/phone, payment method and transactionId —
  // gate it behind the same access check as the order itself. Previously the
  // bill was readable by anyone who guessed the orderId.
  const lookup = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, restaurantId: true },
  });
  if (!lookup) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  const allowed = await canAccessOrder(req, lookup);
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let bill = await getBillByOrderId(orderId);

  if (!bill) {
    try {
      await generateBill(orderId);
      bill = await getBillByOrderId(orderId);
    } catch {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
  }

  return NextResponse.json(bill);
}
