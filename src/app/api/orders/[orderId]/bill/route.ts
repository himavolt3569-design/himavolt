import { NextRequest, NextResponse } from "next/server";
import { getBillByOrderId, generateBill } from "@/lib/billing";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

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
