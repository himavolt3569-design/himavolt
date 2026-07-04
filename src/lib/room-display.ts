// Shared display helpers for hotel rooms.
//
// `type` and `floor` used to be a fixed enum / integer. They are now free-form:
// `type` is any label (presets Normal/Deluxe/Suite + custom) and floors carry a
// text `floorLabel` ("Ground", "Mezzanine", "2A") alongside the legacy numeric
// `floor`. These helpers normalize both so legacy rows keep rendering nicely.

/** Legacy uppercase enum values → friendly labels. New rows already store labels. */
const LEGACY_TYPE_LABELS: Record<string, string> = {
  STANDARD: "Normal",
  NORMAL: "Normal",
  DELUXE: "Deluxe",
  SUITE: "Suite",
  DORMITORY: "Dormitory",
};

export function roomTypeLabel(type?: string | null): string {
  if (!type) return "Normal";
  const trimmed = type.trim();
  return LEGACY_TYPE_LABELS[trimmed.toUpperCase()] ?? trimmed;
}

/** Prefer the free-text floor; fall back to the legacy numeric column. */
export function roomFloorLabel(room: { floorLabel?: string | null; floor?: number | null }): string {
  const label = room.floorLabel?.trim();
  if (label) return label;
  if (room.floor != null) return String(room.floor);
  return "";
}
