import { compressImage } from "./image-compress";

export async function uploadFile(rawFile: File, folder?: string): Promise<string> {
  // Shrink oversized phone photos client-side first — this is what makes
  // uploads feel instant and stops legitimate photos from bouncing off the
  // server's size cap. No-op for videos, GIFs, or already-small files.
  const file = await compressImage(rawFile);

  // Step 1: Request a signed upload URL from our API
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      folder: folder || "menu",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to initialize upload");
  }

  const { signedUrl, publicUrl } = await res.json();

  // Step 2: Directly upload the file binary to Supabase Storage bypassing Vercel
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to securely upload file to storage provider.");
  }

  return publicUrl;
}
