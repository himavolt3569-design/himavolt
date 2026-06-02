import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const exitComboSchema = z.object({
  ctrl: z.boolean(),
  shift: z.boolean(),
  alt: z.boolean(),
  key: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-z0-9]+$/i, "Key must be a single letter or digit"),
});

const activateSchema = z.object({
  terminalName: z
    .string()
    .trim()
    .min(1, "Terminal name is required")
    .max(40, "Terminal name too long"),
  openingCash: z.number().min(0).max(10_000_000),
  taxRate: z.number().min(0).max(100).optional(),
  taxEnabled: z.boolean().optional(),
  serviceChargeRate: z.number().min(0).max(100).optional(),
  serviceChargeEnabled: z.boolean().optional(),
  customerModeEnabled: z.boolean().optional(),
  customerExitCombo: exitComboSchema.optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, name: true, posEnabled: true, posActivatedAt: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = activateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const now = new Date();

  const updated = await db.restaurant.update({
    where: { id },
    data: {
      posEnabled: true,
      posActivatedAt: restaurant.posActivatedAt ?? now,
      posTerminalName: data.terminalName,
      posOpeningCash: data.openingCash,
      posCustomerModeEnabled: data.customerModeEnabled ?? true,
      ...(data.customerExitCombo
        ? {
            posCustomerExitCombo: {
              ctrl: data.customerExitCombo.ctrl,
              shift: data.customerExitCombo.shift,
              alt: data.customerExitCombo.alt,
              key: data.customerExitCombo.key.toLowerCase(),
            },
          }
        : {}),
      ...(data.taxRate !== undefined ? { taxRate: data.taxRate } : {}),
      ...(data.taxEnabled !== undefined ? { taxEnabled: data.taxEnabled } : {}),
      ...(data.serviceChargeRate !== undefined
        ? { serviceChargeRate: data.serviceChargeRate }
        : {}),
      ...(data.serviceChargeEnabled !== undefined
        ? { serviceChargeEnabled: data.serviceChargeEnabled }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      posEnabled: true,
      posActivatedAt: true,
      posTerminalName: true,
      posOpeningCash: true,
      posCustomerModeEnabled: true,
    },
  });

  logAudit({
    action: restaurant.posEnabled ? "POS_UPDATED" : "POS_ACTIVATED",
    entity: "Restaurant",
    entityId: id,
    detail: restaurant.posEnabled
      ? `POS settings updated for "${restaurant.name}"`
      : `POS activated for "${restaurant.name}"`,
    metadata: {
      terminalName: data.terminalName,
      openingCash: data.openingCash,
    },
    userId: user.id,
    restaurantId: id,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const restaurant = await db.restaurant.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, name: true, posEnabled: true },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!restaurant.posEnabled) {
    return NextResponse.json({ ok: true, posEnabled: false });
  }

  await db.restaurant.update({
    where: { id },
    data: { posEnabled: false },
  });

  logAudit({
    action: "POS_DEACTIVATED",
    entity: "Restaurant",
    entityId: id,
    detail: `POS deactivated for "${restaurant.name}"`,
    userId: user.id,
    restaurantId: id,
  });

  return NextResponse.json({ ok: true, posEnabled: false });
}
