import { randomBytes } from "crypto";
import { db } from "./db";
import type {
  HardwareListing,
  HardwareOrder,
} from "@/generated/prisma";

/**
 * Hardware marketplace helpers — token minting, commission maths, the
 * platform payout-method setting, and public serialisers.
 *
 * The marketplace is deliberately account-less (sellers and buyers are
 * identified by contact details + an opaque token) and entirely separate from
 * the restaurant Order/Payment pipeline. HimaVolt takes a flat commission on
 * confirmed third-party sales, tracked as a ledger.
 */

/** Platform commission on third-party (non-platform) confirmed sales. */
export const HARDWARE_COMMISSION_RATE = 5; // percent

/** Product categories a listing can belong to. */
export const HARDWARE_TYPE_OPTIONS = [
  "Terminal",
  "Screen",
  "Printer",
  "Accessory",
] as const;
export type HardwareType = (typeof HARDWARE_TYPE_OPTIONS)[number];

/** Opaque, unguessable token — same shape as Order.trackToken (48 hex chars). */
export function newHardwareToken(): string {
  return randomBytes(24).toString("hex");
}

/** Round to 2 decimals (money). */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the price snapshot + commission for a new order. Platform listings
 * (HimaVolt's own stock) owe no commission.
 */
export function computeOrderTotals(
  listing: Pick<HardwareListing, "price" | "isPlatformListing">,
  quantity: number,
): {
  unitPrice: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
} {
  const unitPrice = money(listing.price);
  const total = money(unitPrice * quantity);
  const commissionRate = listing.isPlatformListing ? 0 : HARDWARE_COMMISSION_RATE;
  const commissionAmount = money((total * commissionRate) / 100);
  return { unitPrice, total, commissionRate, commissionAmount };
}

// ── Platform payout method (site_settings JSON blob) ──────────────────────────
// Mirrors the gateway-settings pattern: one JSON blob under a single key.

const PAYOUT_KEY = "hardware_commission_payout";

export interface HardwarePayoutMethod {
  /** e.g. "esewa" | "khalti" | "bank" | "other" */
  method: string;
  /** Human label, e.g. "eSewa" or "NIC Asia Bank" */
  label: string;
  /** The identifier sellers send commission to (wallet id, account no, …) */
  identifier: string;
  /** Free-form extra instructions */
  instructions: string;
}

export const DEFAULT_PAYOUT_METHOD: HardwarePayoutMethod = {
  method: "esewa",
  label: "",
  identifier: "",
  instructions: "",
};

export async function readPayoutMethod(): Promise<HardwarePayoutMethod> {
  const row = await db.siteSetting.findUnique({ where: { key: PAYOUT_KEY } });
  if (!row) return DEFAULT_PAYOUT_METHOD;
  try {
    const p = JSON.parse(row.value) as Partial<HardwarePayoutMethod>;
    return {
      method: typeof p.method === "string" ? p.method : DEFAULT_PAYOUT_METHOD.method,
      label: typeof p.label === "string" ? p.label : "",
      identifier: typeof p.identifier === "string" ? p.identifier : "",
      instructions: typeof p.instructions === "string" ? p.instructions : "",
    };
  } catch {
    return DEFAULT_PAYOUT_METHOD;
  }
}

export async function writePayoutMethod(m: HardwarePayoutMethod): Promise<void> {
  await db.siteSetting.upsert({
    where: { key: PAYOUT_KEY },
    create: { key: PAYOUT_KEY, value: JSON.stringify(m) },
    update: { value: JSON.stringify(m) },
  });
}

// ── Public serialisers ────────────────────────────────────────────────────────

/** Public catalog shape — no seller PII, no internal tokens. */
export function toPublicListing(l: HardwareListing) {
  return {
    id: l.id,
    name: l.name,
    description: l.description,
    type: l.type,
    price: l.price,
    stock: l.stock,
    imageUrl: l.imageUrl ?? "",
    sellerName: l.sellerName,
    isPlatformListing: l.isPlatformListing,
  };
}

/** Buyer-facing order shape (for the tracking page). */
export function toPublicOrder(
  o: HardwareOrder,
  listing?: Pick<
    HardwareListing,
    | "name"
    | "type"
    | "imageUrl"
    | "sellerName"
    | "sellerPhone"
    | "sellerPayoutNote"
    | "sellerPaymentQr"
  > | null,
) {
  return {
    id: o.id,
    trackToken: o.trackToken,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    total: o.total,
    status: o.status,
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    shippingAddress: o.shippingAddress,
    proofUrl: o.proofUrl,
    rejectionNote: o.rejectionNote,
    createdAt: o.createdAt,
    listing: listing
      ? {
          name: listing.name,
          type: listing.type,
          imageUrl: listing.imageUrl ?? "",
          sellerName: listing.sellerName,
          sellerPhone: listing.sellerPhone,
          sellerPayoutNote: listing.sellerPayoutNote ?? "",
          sellerPaymentQr: listing.sellerPaymentQr ?? "",
        }
      : null,
  };
}
