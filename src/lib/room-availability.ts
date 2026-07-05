import "server-only";
import { db } from "@/lib/db";

/**
 * Keeps `Room.isAvailable` in sync with a booking's occupancy status.
 * Centralized so every write path (create, update, delete) applies the same
 * rule — previously this was duplicated inline in the bookings PATCH/DELETE
 * handlers and silently omitted from the create path, which is how Room
 * availability and the Front Desk in-house list used to disagree.
 */
export async function syncRoomAvailabilityForStatus(
  roomId: string,
  status: string,
): Promise<void> {
  if (status === "CHECKED_IN") {
    await db.room.update({ where: { id: roomId }, data: { isAvailable: false } });
  } else if (status === "CHECKED_OUT" || status === "REJECTED") {
    await db.room.update({ where: { id: roomId }, data: { isAvailable: true } });
  }
}
