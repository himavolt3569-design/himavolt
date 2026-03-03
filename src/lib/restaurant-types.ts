export const RESTAURANT_TYPE_OPTIONS = [
  { value: "FAST_FOOD", label: "Fast Food", emoji: "🍟" },
  { value: "RESORT", label: "Resort", emoji: "🏖️" },
  { value: "HOTEL", label: "Hotel", emoji: "🏨" },
  { value: "BAKERY", label: "Bakery", emoji: "🧁" },
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen", emoji: "☁️" },
  { value: "BAR", label: "Bar", emoji: "🍸" },
  { value: "CAFE", label: "Cafe", emoji: "☕" },
  { value: "RESTAURANT", label: "Restaurant", emoji: "🍽️" },
] as const;

const TYPE_MAP = Object.fromEntries(
  RESTAURANT_TYPE_OPTIONS.map((t) => [t.value, t]),
);

export function getTypeLabel(value: string) {
  return TYPE_MAP[value]?.label ?? value;
}

export function getTypeEmoji(value: string) {
  return TYPE_MAP[value]?.emoji ?? "🍽️";
}
