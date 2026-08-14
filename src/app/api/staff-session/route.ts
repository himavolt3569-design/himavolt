import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff-auth";
import { safeHandler, unauthorized } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { checkStaffShift, shiftReasonToMessage } from "@/lib/staff-shifts";

export const GET = safeHandler(async (req) => {
  const session = await getStaffSession(req);
  if (!session) return unauthorized("Not authenticated");

  // Fetch live DB role + active status alongside restaurant details.
  // The JWT may be stale if the owner changed the staff member's role —
  // always use the DB as the source of truth.
  const [staffMember, restaurant] = await Promise.all([
    db.staffMember.findUnique({
      where: { id: session.staffId },
      select: { role: true, isActive: true, staffType: true },
    }),
    db.restaurant.findUnique({
      where: { id: session.restaurantId },
      select: {
        type: true, currency: true, name: true, address: true, phone: true,
        taxRate: true, taxEnabled: true, slug: true,
        featuresEnabled: true, featuresDisabled: true,
        posEnabled: true, posTerminalName: true, posCustomerModeEnabled: true, posCustomerExitCombo: true,
        printCounterWidth: true, printKitchenWidth: true, printAutoReceipt: true, printAutoKOT: true,
        printAutoBillOnAccept: true,
        capability: { select: { mergeBillingOrders: true, autoAcceptOrders: true } },
      },
    }),
  ]);

  if (!staffMember?.isActive) return unauthorized("Account deactivated");

  const shiftCheck = await checkStaffShift({
    id: session.staffId,
    staffType: staffMember.staffType,
    role: staffMember.role,
    restaurantId: session.restaurantId,
  });

  if (!shiftCheck.allowed) {
    return NextResponse.json(
      {
        error: shiftReasonToMessage(shiftCheck.reason),
        reason: shiftCheck.reason,
        nextShiftStartsAt: shiftCheck.nextShiftStartsAt?.toISOString(),
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    staffId: session.staffId,
    restaurantId: session.restaurantId,
    role: staffMember?.role ?? session.role, // live DB role, not JWT role
    userId: session.userId,
    name: session.name,
    restaurantType: restaurant?.type ?? "RESTAURANT",
    currency: restaurant?.currency ?? "NPR",
    restaurantName: restaurant?.name ?? "",
    restaurantAddress: restaurant?.address ?? "",
    restaurantPhone: restaurant?.phone ?? "",
    taxRate: restaurant?.taxRate ?? 13,
    taxEnabled: restaurant?.taxEnabled ?? true,
    restaurantSlug: restaurant?.slug ?? "",
    featuresEnabled: restaurant?.featuresEnabled ?? [],
    featuresDisabled: restaurant?.featuresDisabled ?? [],
    posEnabled: restaurant?.posEnabled ?? false,
    posTerminalName: restaurant?.posTerminalName ?? null,
    posCustomerModeEnabled: restaurant?.posCustomerModeEnabled ?? true,
    posCustomerExitCombo: normalizeExitCombo(restaurant?.posCustomerExitCombo),
    printCounterWidth: restaurant?.printCounterWidth ?? 80,
    printKitchenWidth: restaurant?.printKitchenWidth ?? 80,
    printAutoReceipt: restaurant?.printAutoReceipt ?? false,
    printAutoKOT: restaurant?.printAutoKOT ?? false,
    printAutoBillOnAccept: restaurant?.printAutoBillOnAccept ?? false,
    mergeBillingOrders: restaurant?.capability?.mergeBillingOrders ?? false,
    autoAcceptOrders: restaurant?.capability?.autoAcceptOrders ?? false,
  });
});

/**
 * Coerce the JSON-stored exit combo into a strict shape, falling back
 * to the default Ctrl+Shift+X if the stored value is missing or invalid.
 */
function normalizeExitCombo(raw: unknown): {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
} {
  const fallback = { ctrl: true, shift: true, alt: false, key: "x" };
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  const key = typeof r.key === "string" ? r.key.toLowerCase() : "";
  if (!key || !/^[a-z0-9]+$/.test(key)) return fallback;
  return {
    ctrl: !!r.ctrl,
    shift: !!r.shift,
    alt: !!r.alt,
    key,
  };
}

// Logout — clear the cookie
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: "staff_session",
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
