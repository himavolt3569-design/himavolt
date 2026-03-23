import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { supabaseAdmin, FOOD_IMAGES_BUCKET } from "@/lib/supabase";
import { v4 as uuid } from "uuid";
import { getStaffSession } from "@/lib/staff-auth";

async function getAnyAuthUser(req: NextRequest): Promise<boolean> {
  // Check staff JWT first
  const session = await getStaffSession(req);
  if (session) return true;

  // Fallback: check Supabase auth
  try {
    const authUser = await getOrCreateUser();
    if (authUser) return true;
  } catch {
    // Not authenticated
  }

  return false;
}

export async function POST(req: NextRequest) {
  const authed = await getAnyAuthUser(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const ext = fileName.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const uniqueName = `${uuid()}.${ext}`;
    const uploadFolder = folder || "menu";
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
