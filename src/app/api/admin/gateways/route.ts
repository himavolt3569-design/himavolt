import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Payment gateway configuration for the platform's own billing (hardware
 * purchases, subscription fees, …). Persisted in the shared `site_settings`
 * store — one JSON blob per provider.
 *
 * SECURITY: secret keys are write-only. They are stored server-side but NEVER
 * returned to the client — the GET response only reports whether a secret is
 * set (`hasSecret`). A secret is only overwritten when the client sends a new,
 * non-empty value; sending an empty string leaves the existing secret intact.
 */

interface GatewayMeta {
  id: string;
  label: string;
  subtitle: string;
  /** Human label for the public merchant identifier field. */
  merchantLabel: string;
}

const PROVIDERS: GatewayMeta[] = [
  {
    id: "esewa",
    label: "eSewa",
    subtitle: "Digital wallet integration",
    merchantLabel: "Merchant Code (Product Code)",
  },
  {
    id: "khalti",
    label: "Khalti",
    subtitle: "Digital wallet & online payments",
    merchantLabel: "Merchant / Public Key",
  },
  {
    id: "imepay",
    label: "IME Pay",
    subtitle: "Banking & wallet gateway",
    merchantLabel: "Merchant Code",
  },
];

const PROVIDER_IDS = new Set(PROVIDERS.map((p) => p.id));

interface StoredGateway {
  enabled: boolean;
  merchantCode: string;
  secretKey: string;
}

function keyFor(id: string) {
  return `gateway_${id}`;
}

async function readGateway(id: string): Promise<StoredGateway> {
  const row = await db.siteSetting.findUnique({ where: { key: keyFor(id) } });
  const fallback: StoredGateway = { enabled: false, merchantCode: "", secretKey: "" };
  if (!row) return fallback;
  try {
    const parsed = JSON.parse(row.value) as Partial<StoredGateway>;
    return {
      enabled: Boolean(parsed.enabled),
      merchantCode: typeof parsed.merchantCode === "string" ? parsed.merchantCode : "",
      secretKey: typeof parsed.secretKey === "string" ? parsed.secretKey : "",
    };
  } catch {
    return fallback;
  }
}

async function writeGateway(id: string, data: StoredGateway): Promise<void> {
  const value = JSON.stringify(data);
  await db.siteSetting.upsert({
    where: { key: keyFor(id) },
    create: { key: keyFor(id), value },
    update: { value },
  });
}

/** GET — public-safe gateway config (never includes secret keys). */
export async function GET() {
  const admin = await requireAdmin("gateways.manage");
  if (!admin) return unauthorized("Admin access required");

  const gateways = await Promise.all(
    PROVIDERS.map(async (meta) => {
      const g = await readGateway(meta.id);
      return {
        id: meta.id,
        label: meta.label,
        subtitle: meta.subtitle,
        merchantLabel: meta.merchantLabel,
        enabled: g.enabled,
        merchantCode: g.merchantCode,
        hasSecret: g.secretKey.length > 0,
        webhookPath: `/api/webhooks/${meta.id}`,
      };
    }),
  );

  return NextResponse.json({ gateways });
}

/** PATCH — update one gateway. Body: { id, enabled?, merchantCode?, secretKey? } */
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin("gateways.manage");
  if (!admin) return unauthorized("Admin access required");

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!PROVIDER_IDS.has(id)) {
    return NextResponse.json({ error: "Unknown gateway" }, { status: 400 });
  }

  const current = await readGateway(id);
  const next: StoredGateway = {
    enabled:
      typeof body.enabled === "boolean" ? body.enabled : current.enabled,
    merchantCode:
      typeof body.merchantCode === "string"
        ? body.merchantCode.trim().slice(0, 200)
        : current.merchantCode,
    // Only overwrite the secret when a fresh, non-empty value is supplied.
    secretKey:
      typeof body.secretKey === "string" && body.secretKey.trim().length > 0
        ? body.secretKey.trim().slice(0, 500)
        : current.secretKey,
  };

  await writeGateway(id, next);

  const meta = PROVIDERS.find((p) => p.id === id)!;
  return NextResponse.json({
    gateway: {
      id: meta.id,
      label: meta.label,
      subtitle: meta.subtitle,
      merchantLabel: meta.merchantLabel,
      enabled: next.enabled,
      merchantCode: next.merchantCode,
      hasSecret: next.secretKey.length > 0,
      webhookPath: `/api/webhooks/${meta.id}`,
    },
  });
}
