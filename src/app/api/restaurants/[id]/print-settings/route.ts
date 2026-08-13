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
      printShowFeedbackQR: true,
      printAutoReceipt: true,
      printAutoKOT: true,
      printAutoBillOnAccept: true,
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
  const {
    counterWidth,
    kitchenWidth,
    showFeedbackQR,
    autoPrint,
    autoPrintKOT,
    autoPrintBillOnAccept,
  } = body as {
    counterWidth?: unknown;
    kitchenWidth?: unknown;
    showFeedbackQR?: unknown;
    autoPrint?: unknown;
    autoPrintKOT?: unknown;
    autoPrintBillOnAccept?: unknown;
  };

  const widthOk = (v: unknown) => v === 58 || v === 80;
  if (!widthOk(counterWidth) || !widthOk(kitchenWidth)) {
    return NextResponse.json(
      { error: "Paper widths must be 58 or 80 (mm)." },
      { status: 400 },
    );
  }
  if (typeof showFeedbackQR !== "boolean") {
    return NextResponse.json(
      { error: "showFeedbackQR must be a boolean." },
      { status: 400 },
    );
  }
  // autoPrint / autoPrintKOT are optional for backward compatibility.
  if (autoPrint !== undefined && typeof autoPrint !== "boolean") {
    return NextResponse.json(
      { error: "autoPrint must be a boolean." },
      { status: 400 },
    );
  }
  if (autoPrintKOT !== undefined && typeof autoPrintKOT !== "boolean") {
    return NextResponse.json(
      { error: "autoPrintKOT must be a boolean." },
      { status: 400 },
    );
  }
  if (
    autoPrintBillOnAccept !== undefined &&
    typeof autoPrintBillOnAccept !== "boolean"
  ) {
    return NextResponse.json(
      { error: "autoPrintBillOnAccept must be a boolean." },
      { status: 400 },
    );
  }

  const updated = await db.restaurant.update({
    where: { id: restaurantId },
    data: {
      printCounterWidth: counterWidth as number,
      printKitchenWidth: kitchenWidth as number,
      printShowFeedbackQR: showFeedbackQR,
      ...(autoPrint !== undefined ? { printAutoReceipt: autoPrint } : {}),
      ...(autoPrintKOT !== undefined ? { printAutoKOT: autoPrintKOT } : {}),
      ...(autoPrintBillOnAccept !== undefined
        ? { printAutoBillOnAccept: autoPrintBillOnAccept }
        : {}),
    },
    select: {
      printCounterWidth: true,
      printKitchenWidth: true,
      printShowFeedbackQR: true,
      printAutoReceipt: true,
      printAutoKOT: true,
      printAutoBillOnAccept: true,
    },
  });

  return NextResponse.json(resolvePrintSettings(updated));
}
