import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminJwt } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const staff = await verifyAdminJwt(req);
  if (!staff || !staff.staffId) {
    return NextResponse.json({ error: "Unauthorized. Must be logged in as Platform Staff." }, { status: 401 });
  }

  try {
    const { startDate, endDate, reason } = await req.json();

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: "Start date, end date, and reason are required" }, { status: 400 });
    }

    const request = await db.platformStaffLeaveRequest.create({
      data: {
        platformStaffId: staff.staffId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      }
    });

    return NextResponse.json(request);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}
