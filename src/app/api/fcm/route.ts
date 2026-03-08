import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { z } from "zod";

const fcmTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
  device: z.string().max(100).optional().nullable(),
});

export const POST = safeHandler(
  async (_req, { body }) => {
    const user = await getOrCreateUser();
    if (!user) return unauthorized();

    await db.fCMToken.upsert({
      where: { token: body.token },
      update: { userId: user.id, device: body.device ?? null, updatedAt: new Date() },
      create: { token: body.token, userId: user.id, device: body.device ?? null },
    });

    return NextResponse.json({ success: true });
  },
  { schema: fcmTokenSchema },
);

const deleteTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const DELETE = safeHandler(
  async (_req, { body }) => {
    await db.fCMToken.deleteMany({ where: { token: body.token } });
    return NextResponse.json({ success: true });
  },
  { schema: deleteTokenSchema },
);
