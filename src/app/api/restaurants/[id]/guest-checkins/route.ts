import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getStaffSession } from "@/lib/staff-auth";

type Params = { params: Promise<{ id: string }> };

async function canAccess(req: NextRequest, restaurantId: string) {
  // Allow staff session
  const staffSession = await getStaffSession(req);
  if (staffSession && staffSession.restaurantId === restaurantId) return true;
  // Allow restaurant owner
  const user = await getOrCreateUser();
  if (!user) return false;
  const rest = await db.restaurant.findFirst({ where: { id: restaurantId, ownerId: user.id } });
  return !!rest;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  if (!(await canAccess(req, restaurantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const roomNo = searchParams.get("roomNo");

  const where: Record<string, unknown> = { restaurantId };
  if (status) where.status = status;
  if (roomNo) where.roomNo = roomNo;

  const checkIns = await db.guestCheckIn.findMany({
    where,
    orderBy: { checkInAt: "desc" },
    take: 100,
  });

  return NextResponse.json(checkIns);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;
  if (!(await canAccess(req, restaurantId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    guestName, phone, email, idType, idNumber, idImageUrl,
    address, dob, nationality, roomNo, adults, children, notes,
  } = body;

  if (!guestName?.trim() || !roomNo?.trim()) {
    return NextResponse.json({ error: "Guest name and room number are required" }, { status: 400 });
  }

  // Check if room is already occupied
  const existing = await db.guestCheckIn.findFirst({
    where: { restaurantId, roomNo, status: "CHECKED_IN" },
  });
  if (existing) {
    return NextResponse.json({ error: `Room ${roomNo} is already occupied by ${existing.guestName}` }, { status: 409 });
  }

  const checkIn = await db.guestCheckIn.create({
    data: {
      guestName: guestName.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      idType: idType || null,
      idNumber: idNumber?.trim() || null,
      idImageUrl: idImageUrl || null,
      address: address?.trim() || null,
      dob: dob || null,
      nationality: nationality || "Nepali",
      roomNo: roomNo.trim(),
      adults: adults ?? 1,
      children: children ?? 0,
      notes: notes?.trim() || null,
      restaurantId,
    },
  });

  return NextResponse.json(checkIn, { status: 201 });
}
