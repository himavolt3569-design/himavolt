"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

/**
 * Account-less image picker for the hardware marketplace. Uploads via the
 * public `/api/public/hardware/upload` signed-URL flow (two steps: get a signed
 * URL, then PUT the file straight to storage) and hands the resulting public
 * URL back through `onChange`. Used by the seller listing form and the buyer's
 * payment-proof upload.
 */
export default function HardwareImageUpload({
  value,
  onChange,
  label = "Photo",
  hint,
  aspect = "video",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  aspect?: "video" | "square";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      // Step 1 — signed URL
      const signRes = await fetch("/api/public/hardware/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      const signData = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        setError(signData.error ?? "Upload failed.");
        return;
      }
      // Step 2 — PUT to storage
      const putRes = await fetch(signData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        setError("Upload failed. Please try again.");
        return;
      }
      onChange(signData.publicUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const aspectCls = aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-3)]">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className={`relative w-full ${aspectCls} rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-alt)]`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="absolute bottom-2 right-2 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-neutral-900 hover:bg-white transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Replace"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className={`flex w-full ${aspectCls} flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-3)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors disabled:opacity-50`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-bold">Tap to upload a photo</span>
              {hint && <span className="text-[11px] font-medium">{hint}</span>}
            </>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}
