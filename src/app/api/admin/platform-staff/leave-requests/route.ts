import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/admin-auth";
import { unauthorized } from "@/lib/api-helpers";
import { startOfDay } from "date-fns";

// Fetch pending leave requests
export async function GET(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_staff.manage");
  if (!admin) return unauthorized("Permission denied");

  const requests = await db.platformStaffLeaveRequest.findMany({
    where: { status: "PENDING" },
    include: {
      platformStaff: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(requests);
}

// Approve or Reject a leave request
export async function PATCH(req: NextRequest) {
  const admin = await requireAdminPermission(req, "platform_staff.manage");
  if (!admin) return unauthorized("Permission denied");

  const { requestId, status, adminNote } = await req.json();

  if (!requestId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const leaveRequest = await db.platformStaffLeaveRequest.findUnique({
    where: { id: requestId },
    include: { platformStaff: true }
  });

  if (!leaveRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Transaction to update request and optionally insert attendance records
  try {
    await db.$transaction(async (tx) => {
      // 1. Update request
      await tx.platformStaffLeaveRequest.update({
        where: { id: requestId },
        data: { status, adminNote }
      });

      // 2. If approved, create attendance records for each date in the range
      if (status === "APPROVED") {
        const start = startOfDay(new Date(leaveRequest.startDate));
        const end = startOfDay(new Date(leaveRequest.endDate));
        
        let current = new Date(start);
        while (current <= end) {
          await tx.platformStaffAttendance.upsert({
            where: {
              platformStaffId_date: {
                platformStaffId: leaveRequest.platformStaffId,
                date: current
              }
            },
            update: {
              status: "LEAVE",
              note: leaveRequest.reason
            },
            create: {
              platformStaffId: leaveRequest.platformStaffId,
              date: current,
              checkIn: new Date(),
              status: "LEAVE",
              note: leaveRequest.reason
            }
          });
          
          current.setDate(current.getDate() + 1);
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process leave request" }, { status: 500 });
  }
}
