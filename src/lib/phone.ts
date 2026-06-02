export function normalizeNepalPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("977")) return digits.slice(3);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isValidNepalMobile(value: string | null | undefined): boolean {
  return /^9[678]\d{8}$/.test(normalizeNepalPhone(value));
}

export function extractNepalMobile(text: string): string | null {
  const compact = text.replace(/[^\d+]/g, " ");
  const matches = compact.match(/(?:\+?977\s*)?(?:0\s*)?9\s*[678]\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d\s*\d/g);

  if (!matches) return null;

  for (const match of matches) {
    const normalized = normalizeNepalPhone(match);
    if (isValidNepalMobile(normalized)) return normalized;
  }

  return null;
}
