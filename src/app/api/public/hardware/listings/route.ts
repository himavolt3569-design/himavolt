import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { hardwareListingSubmitSchema } from "@/lib/validations";
import { newHardwareToken } from "@/lib/hardware";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/hardware/listings
 * A seller submits a product to the marketplace — no HimaVolt account needed.
 * The listing starts PENDING_REVIEW and only goes live once the master admin
 * approves it. Returns an opaque `manageToken` the seller uses to check status.
 */
export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "hw-listing"), 15 * 60_000, 5);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const parsed = hardwareListingSubmitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid submission" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // Anti-abuse: a single seller (identified by phone) may not flood the review
  // queue. Cap the number of listings they can have awaiting review at once.
  // Nothing is public until an admin approves it, so this only bounds the queue.
  const MAX_PENDING_PER_SELLER = 3;
  const pendingForSeller = await db.hardwareListing.count({
    where: { sellerPhone: d.sellerPhone, status: "PENDING_REVIEW" },
  });
  if (pendingForSeller >= MAX_PENDING_PER_SELLER) {
    return NextResponse.json(
      {
        error:
          "You already have listings awaiting review. Please wait for them to be approved before submitting more.",
      },
      { status: 429 },
    );
  }

  const manageToken = newHardwareToken();

  const listing = await db.hardwareListing.create({
    data: {
      name: d.name,
      description: d.description,
      type: d.type,
      price: d.price,
      stock: d.stock,
      imageUrl: d.imageUrl || null,
      status: "PENDING_REVIEW",
      isPlatformListing: false,
      sellerName: d.sellerName,
      sellerPhone: d.sellerPhone,
      sellerEmail: d.sellerEmail,
      sellerPayoutNote: d.sellerPayoutNote,
      sellerPaymentQr: d.sellerPaymentQr || null,
      manageToken,
    },
    select: { id: true },
  });

  logAudit({
    action: "HARDWARE_LISTING_SUBMITTED",
    entity: "HardwareListing",
    entityId: listing.id,
    detail: `Seller "${d.sellerName}" submitted "${d.name}" for review`,
    metadata: { type: d.type, price: d.price },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true, manageToken }, { status: 201 });
}
