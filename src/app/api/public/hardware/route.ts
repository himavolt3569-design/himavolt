import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const CATALOG_KEY = "hardware_catalog";
const DEFAULT_CATALOG: any[] = [];

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: CATALOG_KEY } });
    if (!row) return NextResponse.json({ products: DEFAULT_CATALOG });
    
    const parsed = JSON.parse(row.value);
    return NextResponse.json({ 
      products: Array.isArray(parsed) ? parsed : DEFAULT_CATALOG 
    });
  } catch (error) {
    console.error("[Public Hardware GET]", error);
    return NextResponse.json({ products: DEFAULT_CATALOG });
  }
}
