import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Hardware catalog — the products the platform sells to partners (POS
 * terminals, kitchen displays, printers, …). Persisted server-side in the
 * shared `site_settings` key-value store under a single JSON blob, so this
 * needs no schema migration and stays in sync across every admin device
 * (the old version only lived in one browser's localStorage).
 */

const CATALOG_KEY = "hardware_catalog";

export interface HardwareProduct {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  stock: number;
  imageUrl: string;
}

const DEFAULT_CATALOG: HardwareProduct[] = [
  {
    id: "hw-pos-terminal",
    name: "Premium POS Terminal",
    description:
      "15-inch capacitive touch screen with a built-in thermal printer.",
    type: "Terminal",
    price: 45000,
    stock: 12,
    imageUrl: "",
  },
  {
    id: "hw-kds",
    name: "Kitchen Display System (KDS)",
    description: "Rugged 21-inch display built for high-heat kitchens.",
    type: "Screen",
    price: 32000,
    stock: 8,
    imageUrl: "",
  },
  {
    id: "hw-thermal-printer",
    name: "Thermal Receipt Printer",
    description: "High-speed 80mm thermal receipt printer with auto-cutter.",
    type: "Printer",
    price: 8500,
    stock: 45,
    imageUrl: "",
  },
];

async function readCatalog(): Promise<HardwareProduct[]> {
  const row = await db.siteSetting.findUnique({ where: { key: CATALOG_KEY } });
  if (!row) return DEFAULT_CATALOG;
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? (parsed as HardwareProduct[]) : DEFAULT_CATALOG;
  } catch {
    return DEFAULT_CATALOG;
  }
}

async function writeCatalog(list: HardwareProduct[]): Promise<void> {
  const value = JSON.stringify(list);
  await db.siteSetting.upsert({
    where: { key: CATALOG_KEY },
    create: { key: CATALOG_KEY, value },
    update: { value },
  });
}

/** Coerce a partial payload into a clean product, clamping numbers. */
function sanitize(
  input: Record<string, unknown>,
  base?: HardwareProduct,
): HardwareProduct {
  const num = (v: unknown, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v.trim().slice(0, 2000) : fallback;

  return {
    id: base?.id ?? randomUUID(),
    name: str(input.name, base?.name ?? ""),
    description: str(input.description, base?.description ?? ""),
    type: str(input.type, base?.type ?? "Terminal") || "Terminal",
    price: input.price !== undefined ? num(input.price, base?.price ?? 0) : base?.price ?? 0,
    stock: input.stock !== undefined ? num(input.stock, base?.stock ?? 0) : base?.stock ?? 0,
    imageUrl: str(input.imageUrl, base?.imageUrl ?? ""),
  };
}

/** GET — list the catalog. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");
  try {
    return NextResponse.json({ products: await readCatalog() });
  } catch {
    return NextResponse.json({ products: DEFAULT_CATALOG });
  }
}

/** POST — add a new product. Returns the full updated list. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json().catch(() => ({}));
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const list = await readCatalog();
  const product = sanitize(body);
  const next = [product, ...list];
  await writeCatalog(next);
  return NextResponse.json({ products: next, product }, { status: 201 });
}

/** PATCH — update an existing product by id. */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const list = await readCatalog();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const next = [...list];
  next[idx] = sanitize(body, list[idx]);
  await writeCatalog(next);
  return NextResponse.json({ products: next, product: next[idx] });
}

/** DELETE — remove a product by ?id=. */
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin access required");

  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const list = await readCatalog();
  const next = list.filter((p) => p.id !== id);
  await writeCatalog(next);
  return NextResponse.json({ products: next });
}
