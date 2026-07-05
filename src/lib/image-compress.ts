const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 300 * 1024; // already small enough — not worth the CPU

/**
 * Downscales + re-encodes an image client-side before it ever hits the network.
 * Phone camera photos routinely land at 3-8MB uncompressed, which is both why
 * uploads felt slow and why they'd get rejected by the 5MB server cap. Shrinking
 * to a sane display resolution here cuts that to a few hundred KB with no
 * visible quality loss, so the upload feels instant and rarely hits any cap.
 *
 * Falls back to the original file untouched on any failure (unsupported
 * format, no canvas support, etc.) or if compression didn't actually help.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // would destroy animation
  if (file.size < SKIP_BELOW_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const outName = file.name.replace(/\.\w+$/, outType === "image/png" ? ".png" : ".jpg");
    return new File([blob], outName, { type: outType, lastModified: Date.now() });
  } catch {
    return file;
  }
}
