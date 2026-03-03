import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { supabase, FOOD_IMAGES_BUCKET } from "@/lib/supabase";
import { v4 as uuid } from "uuid";
import { getStaffSession } from "@/lib/staff-auth";

async function getAnyAuthUser(req: NextRequest): Promise<boolean> {
  // Check staff JWT first — fast, no Clerk dependency
  const session = await getStaffSession(req);
  if (session) return true;

  // Fallback: check Clerk auth
  try {
    const clerkUser = await getOrCreateUser();
    if (clerkUser) return true;
  } catch {
    // Clerk not available or not authenticated
  }

  return false;
}

export async function POST(req: NextRequest) {
  const authed = await getAnyAuthUser(req);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const folder = formData.get("folder") as string | null;
  const isVideo = file.type.startsWith("video/");

  const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB video, 5MB image
  if (file.size > maxSize) {
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
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      {
        error: "Invalid file type. Use JPEG, PNG, WebP, GIF, MP4, WebM, or MOV",
      },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const fileName = `${uuid()}.${ext}`;
  const uploadFolder = folder || "menu";
  const filePath = `${uploadFolder}/${fileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(FOOD_IMAGES_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(FOOD_IMAGES_BUCKET).getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrl });
}
