import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager, type AccessContext } from "@/lib/access-control";

type Params = { params: Promise<{ id: string; feedbackId: string }> };

const REPLY_MAX = 1000;

async function replierName(access: AccessContext): Promise<string> {
  if (access.kind === "staff") return access.staff.name || "Staff";
  const user = await db.user.findUnique({
    where: { id: access.userId },
    select: { name: true },
  });
  return user?.name || "Owner";
}

/**
 * PATCH /api/restaurants/[id]/feedback/[feedbackId]
 * Owner / manager only — set, edit, or clear the reply on a piece of feedback.
 * Body: { reply: string | null }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: restaurantId, feedbackId } = await params;

  const access = await requireOwnerOrStaffManager(req, restaurantId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { reply } = body as { reply?: unknown };

  if (reply !== null && reply !== undefined && typeof reply !== "string") {
    return NextResponse.json({ error: "reply must be a string" }, { status: 400 });
  }
  if (typeof reply === "string" && reply.length > REPLY_MAX) {
    return NextResponse.json(
      { error: `reply is too long (max ${REPLY_MAX} characters)` },
      { status: 400 },
    );
  }

  // Scope the update to this restaurant so one venue can't touch another's rows.
  const existing = await db.feedback.findFirst({
    where: { id: feedbackId, restaurantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const trimmed = typeof reply === "string" ? reply.trim() : "";
  const clearing = trimmed.length === 0;

  const updated = await db.feedback.update({
    where: { id: feedbackId },
    data: clearing
      ? { reply: null, repliedAt: null, repliedBy: null }
      : {
          reply: trimmed.slice(0, REPLY_MAX),
          repliedAt: new Date(),
          repliedBy: await replierName(access),
        },
    include: {
      order: { select: { orderNo: true, tableNo: true, guestName: true } },
    },
  });

  return NextResponse.json({ feedback: updated });
}

/**
 * DELETE /api/restaurants/[id]/feedback/[feedbackId]
 * Owner / manager only — remove a piece of feedback (moderation).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: restaurantId, feedbackId } = await params;

  const access = await requireOwnerOrStaffManager(req, restaurantId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await db.feedback.findFirst({
    where: { id: feedbackId, restaurantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  await db.feedback.delete({ where: { id: feedbackId } });
  return NextResponse.json({ success: true });
}
