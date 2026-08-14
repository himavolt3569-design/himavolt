import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, FOOD_IMAGES_BUCKET } from "@/lib/supabase";
import { v4 as uuid } from "uuid";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/public/hardware/upload
 *
 * Account-less image upload for the hardware marketplace (seller product photos
 * and buyer payment-proof screenshots). The authenticated `/api/upload` route
 * is off-limits to sellers/buyers who have no HimaVolt account, so this is a
 * public, tightly-scoped sibling: images only (no video), 5 MB cap, rate
 * limited, and confined to the `hardware/` folder of the shared bucket.
 *
 * Returns a short-lived `signedUrl` the client PUTs the file to, plus the
 * `publicUrl` to persist on the listing/order.
 */
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const rl = await rateLimit(clientKey(req, "hw-upload"), 15 * 60_000, 15);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { fileName, fileType, fileSize } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing file metadata" }, { status: 400 });
    }
    if (!ALLOWED.includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP or GIF." },
        { status: 400 },
      );
    }
    if (fileSize && fileSize > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    const cleanSegment = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");
    const ext = cleanSegment(String(fileName).split(".").pop() || "") || "jpg";
    const filePath = `hardware/${uuid()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(FOOD_IMAGES_BUCKET)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error("[Hardware Upload] sign error:", error);
      return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(FOOD_IMAGES_BUCKET).getPublicUrl(filePath);

    return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
  } catch (err) {
    console.error("[Hardware Upload] parse error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
