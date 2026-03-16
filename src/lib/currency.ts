export type CurrencyCode = "NPR" | "INR" | "USD";

export interface CurrencyDef {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: "NPR", symbol: "Rs.", label: "Nepalese Rupee", flag: "🇳🇵" },
  { code: "INR", symbol: "₹", label: "Indian Rupee", flag: "🇮🇳" },
  { code: "USD", symbol: "$", label: "US Dollar", flag: "🇺🇸" },
];

const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): CurrencyDef {
  return CURRENCY_MAP[code] ?? CURRENCY_MAP.NPR;
}

export function getCurrencySymbol(code: string): string {
  return getCurrency(code).symbol;
}

/** Format a price with the currency symbol, e.g. "Rs. 1,000" or "$25.00" */
export function formatPrice(amount: number, currencyCode: string = "NPR"): string {
  const { symbol } = getCurrency(currencyCode);
  // USD uses 2 decimal places; NPR/INR use integer display
  if (currencyCode === "USD") {
    return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${symbol} ${Math.round(amount).toLocaleString("en-IN")}`;
}
