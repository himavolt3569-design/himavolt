import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwnerOrStaffManager } from "@/lib/access-control";
import { resolvePrintSettings } from "@/lib/print-settings";

type Params = { params: Promise<{ id: string }> };

/** GET — current printing & receipt settings (owner / manager). */
export async function GET(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;

  const access = await requireOwnerOrStaffManager(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      printCounterWidth: true,
      printKitchenWidth: true,
      printShowLogo: true,
      printShowFeedbackQR: true,
    },
  });
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json(resolvePrintSettings(restaurant));
}

/** PUT — save printing & receipt settings (owner / manager). */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id: restaurantId } = await params;

  const access = await requireOwnerOrStaffManager(req, restaurantId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { counterWidth, kitchenWidth, showLogo, showFeedbackQR } = body as {
    counterWidth?: unknown;
    kitchenWidth?: unknown;
    showLogo?: unknown;
    showFeedbackQR?: unknown;
  };

  const widthOk = (v: unknown) => v === 58 || v === 80;
  if (!widthOk(counterWidth) || !widthOk(kitchenWidth)) {
    return NextResponse.json(
      { error: "Paper widths must be 58 or 80 (mm)." },
      { status: 400 },
    );
  }
  if (typeof showLogo !== "boolean" || typeof showFeedbackQR !== "boolean") {
    return NextResponse.json(
      { error: "showLogo and showFeedbackQR must be booleans." },
      { status: 400 },
    );
  }

  const updated = await db.restaurant.update({
    where: { id: restaurantId },
    data: {
      printCounterWidth: counterWidth as number,
      printKitchenWidth: kitchenWidth as number,
      printShowLogo: showLogo,
      printShowFeedbackQR: showFeedbackQR,
    },
    select: {
      printCounterWidth: true,
      printKitchenWidth: true,
      printShowLogo: true,
      printShowFeedbackQR: true,
    },
  });

  return NextResponse.json(resolvePrintSettings(updated));
}
