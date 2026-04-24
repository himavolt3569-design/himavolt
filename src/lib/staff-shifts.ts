import { db } from "./db";

/**
 * Shift-based access check for POS staff.
 *
 * Rules:
 * - FULL_TIME staff → always on shift (no schedule).
 * - Management roles (SUPER_ADMIN, MANAGER) → always allowed, even without
 *   a scheduled shift. Owners need unconditional access.
 * - SHIFT_BASED staff of other roles must have a Shift record whose
 *   window contains `now`. Shifts that cross midnight are supported.
 * - If a shift's `actualEndTime` is set (early clock-out), the shift is
 *   considered ended at that moment.
 */

export interface ShiftCheckResult {
  allowed: boolean;
  reason?:
    | "NO_SHIFT_TODAY"
    | "NOT_YET_STARTED"
    | "ALREADY_ENDED"
    | "CLOCKED_OUT";
  nextShiftStartsAt?: Date;
  /** The shift covering `now`, when allowed === true. */
  shiftId?: string;
}

interface StaffInput {
  id: string;
  staffType: string;
  role: string;
  restaurantId: string;
}

/**
 * Return whether the given staff member is currently within an active
 * shift window. Callers should treat non-allowed results as a hard block
 * at the POS — the kitchen/counter pages can decide independently.
 */
export async function checkStaffShift(
  staff: StaffInput,
  now: Date = new Date(),
): Promise<ShiftCheckResult> {
  if (staff.staffType === "FULL_TIME") {
    return { allowed: true };
  }

  // Management always allowed — they may need to cover unplanned gaps.
  if (staff.role === "SUPER_ADMIN" || staff.role === "MANAGER") {
    return { allowed: true };
  }

  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const shifts = await db.shift.findMany({
    where: {
      staffId: staff.id,
      restaurantId: staff.restaurantId,
      date: { in: [yesterday, today] },
    },
    orderBy: { date: "asc" },
  });

  if (shifts.length === 0) {
    return { allowed: false, reason: "NO_SHIFT_TODAY" };
  }

  let nextShiftStartsAt: Date | undefined;

  for (const s of shifts) {
    const start = combineDateAndTime(s.date, s.startTime);
    let end = combineDateAndTime(s.date, s.endTime);
    // Shift crosses midnight — bump the end to the next day.
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    // Early clock-out overrides the scheduled end.
    if (s.actualEndTime && s.actualEndTime.getTime() < end.getTime()) {
      end = s.actualEndTime;
    }

    if (now >= start && now <= end) {
      // If actualEndTime was set and now is past it, clocked-out branch.
      if (s.actualEndTime && now > s.actualEndTime) {
        return { allowed: false, reason: "CLOCKED_OUT" };
      }
      return { allowed: true, shiftId: s.id };
    }

    if (now < start) {
      if (!nextShiftStartsAt || start < nextShiftStartsAt) {
        nextShiftStartsAt = start;
      }
    }
  }

  if (nextShiftStartsAt) {
    return { allowed: false, reason: "NOT_YET_STARTED", nextShiftStartsAt };
  }

  return { allowed: false, reason: "ALREADY_ENDED" };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((s) => parseInt(s, 10));
  const result = new Date(date);
  result.setUTCHours(
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0,
  );
  return result;
}

export function shiftReasonToMessage(reason: ShiftCheckResult["reason"]): string {
  switch (reason) {
    case "NO_SHIFT_TODAY":
      return "You don't have a shift scheduled for today. Ask a manager to add you to the roster.";
    case "NOT_YET_STARTED":
      return "Your shift hasn't started yet. Please wait until your scheduled time.";
    case "ALREADY_ENDED":
      return "Your shift has already ended for today.";
    case "CLOCKED_OUT":
      return "You've already clocked out of today's shift.";
    default:
      return "You're not currently on shift.";
  }
}
