import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { sessionToken } = body as { sessionToken?: string };

    if (!sessionToken) {
      return NextResponse.json({ error: "No session token" }, { status: 400 });
    }

    // Only delete if there is no orderId (i.e. it's just a browsing session)
    await db.tableSession.deleteMany({
      where: {
        restaurantId: id,
        sessionToken,
        orderId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Browse clear error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
