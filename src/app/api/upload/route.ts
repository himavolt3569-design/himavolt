import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { supabaseAdmin, FOOD_IMAGES_BUCKET } from "@/lib/supabase";
import { v4 as uuid } from "uuid";
import { getStaffSession } from "@/lib/staff-auth";
import { requireAdmin } from "@/lib/require-admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Accept any of the platform's operator identities.
 *
 * This has to enumerate all three deliberately: the app runs four independent
 * auth systems, and Master Admin authenticates with its own JWT cookie rather
 * than a Supabase session. It was missing here, so an admin uploading a hero
 * photograph got a 401 while every other role worked.
 */
async function getAnyAuthUser(req: NextRequest): Promise<boolean> {
  const session = await getStaffSession(req);
  if (session) return true;

  const admin = await requireAdmin();
  if (admin) return true;

  // Fallback: check Supabase auth (owners and customers)
  try {
    const authUser = await getOrCreateUser();
    if (authUser) return true;
  } catch {
  }

  return false;
}

export async function POST(req: NextRequest) {
  const authed = await getAnyAuthUser(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(clientKey(req, "upload"), 15 * 60_000, 20);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const { fileName, fileType, fileSize, folder } = await req.json();

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing file metadata" }, { status: 400 });
    }

    const isVideo = fileType.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB video, 5MB image

    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large (max ${isVideo ? "50MB" : "5MB"})` },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV",
        },
        { status: 400 },
      );
    }

    // Sanitize the client-supplied folder + extension into safe path segments:
    // strip anything that isn't alphanumeric / - / _ per segment. This kills
    // `..` traversal, absolute paths, and odd characters that could otherwise
    // produce unexpected object keys in the shared bucket.
    const cleanSegment = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "");
    const uploadFolder =
      (typeof folder === "string" ? folder : "")
        .split("/")
        .map(cleanSegment)
        .filter(Boolean)
        .join("/") || "menu";
    const ext =
      cleanSegment(fileName.split(".").pop() || "") || (isVideo ? "mp4" : "jpg");
    const uniqueName = `${uuid()}.${ext}`;
    const filePath = `${uploadFolder}/${uniqueName}`;

    // Request a secure signed URL from Supabase Admin (Server)
    const { data, error } = await supabaseAdmin.storage
      .from(FOOD_IMAGES_BUCKET)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error("[Upload] Supabase sign error:", error);
      return NextResponse.json(
        { error: `Failed to generate upload URL: ${error?.message}` },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(FOOD_IMAGES_BUCKET).getPublicUrl(filePath);

    // Return the signed URL directly to the client
    return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
  } catch (err) {
    console.error("[Upload] Parse error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
