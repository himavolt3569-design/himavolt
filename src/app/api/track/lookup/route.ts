import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNo: q },
          { trackToken: q }
        ]
      },
      select: {
        trackToken: true
      }
    });

    if (!order || !order.trackToken) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ trackToken: order.trackToken });
  } catch (err: any) {
    console.error("Error looking up order:", err);
    return NextResponse.json({ error: "Failed to look up order" }, { status: 500 });
  }
}
