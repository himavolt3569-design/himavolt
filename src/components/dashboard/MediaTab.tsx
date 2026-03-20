"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Video,
  X,
  Loader2,
  Play,
  Download,
  Film,
  GalleryHorizontalEnd,
  Plus,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";

interface MediaItem {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  caption: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  uploadedBy: { user: { name: string } } | null;
}

export default function MediaTab() {
  const { selectedRestaurant } = useRestaurant();
  const { showToast } = useToast();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restaurantId = selectedRestaurant?.id;

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const qs = filter !== "ALL" ? `?type=${filter}` : "";
      const res = await fetch(`/api/restaurants/${restaurantId}/media${qs}`);
      const data = await res.json();
      setMedia(data.media ?? []);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, filter]);

  useEffect(() => { load(); }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !restaurantId) return;
    const fileArr = Array.from(files);
    setUploading(true);
    let success = 0;
    for (const file of fileArr) {
      try {
        // Upload to storage
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "media-library");
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!upRes.ok) throw new Error((await upRes.json()).error || "Upload failed");
        const { url } = await upRes.json();

        // Save to DB
        const isVideo = file.type.startsWith("video/");
        await fetch(`/api/restaurants/${restaurantId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            type: isVideo ? "VIDEO" : "IMAGE",
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          }),
        });
        success++;
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Upload failed", "error");
      }
    }
    if (success > 0) showToast(`${success} file${success > 1 ? "s" : ""} uploaded`, "success");
    setUploading(false);
    load();
  };

  const handleDelete = async (item: MediaItem) => {
    if (!restaurantId) return;
    if (!confirm(`Delete "${item.fileName || "this file"}"?`)) return;
    await fetch(`/api/restaurants/${restaurantId}/media?mediaId=${item.id}`, { method: "DELETE" });
    setMedia((m) => m.filter((x) => x.id !== item.id));
    showToast("Deleted", "success");
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!selectedRestaurant) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <GalleryHorizontalEnd className="h-5 w-5 text-amber-500" />
            Media Library
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Upload and manage photos & videos</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["ALL", "IMAGE", "VIDEO"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              filter === f
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f === "IMAGE" && <ImageIcon className="h-3.5 w-3.5" />}
            {f === "VIDEO" && <Video className="h-3.5 w-3.5" />}
            {f === "ALL" && <GalleryHorizontalEnd className="h-3.5 w-3.5" />}
            {f === "ALL" ? "All" : f === "IMAGE" ? "Photos" : "Videos"}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{media.length} files</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className="group cursor-pointer rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center hover:border-amber-300 hover:bg-amber-50/30 transition-all"
      >
        <Upload className="mx-auto h-8 w-8 text-gray-300 group-hover:text-amber-400 transition-colors mb-2" />
        <p className="text-sm font-semibold text-gray-400 group-hover:text-amber-600">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF, MP4, WebM · Max 50 MB per file</p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : media.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 py-16 text-center">
          <Film className="mx-auto h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-400">No media yet</p>
          <p className="text-xs text-gray-300 mt-1">Upload photos or videos to get started</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {media.map((item) => (
            <motion.div
              key={item.id}
              variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
              className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm"
            >
              {item.type === "IMAGE" ? (
                <img
                  src={item.url}
                  alt={item.fileName ?? ""}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-900">
                  <video src={item.url} className="h-full w-full object-cover" muted />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-8 w-8 text-white/80" />
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-end gap-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-full bg-white/20 backdrop-blur-sm p-1.5 text-white hover:bg-white/30"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(item)}
                    className="rounded-full bg-rose-500/80 backdrop-blur-sm p-1.5 text-white hover:bg-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setPreview(item)}
                  className="text-left"
                >
                  <p className="text-[10px] font-semibold text-white/90 line-clamp-1">
                    {item.fileName ?? "Untitled"}
                  </p>
                  <p className="text-[9px] text-white/60">
                    {formatBytes(item.fileSize)}
                    {item.uploadedBy && ` · ${item.uploadedBy.user.name}`}
                  </p>
                </button>
              </div>

              {/* Type badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white ${
                  item.type === "VIDEO" ? "bg-violet-500/80" : "bg-amber-500/80"
                }`}>
                  {item.type === "VIDEO" ? "VID" : "IMG"}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreview(null)}
                className="absolute -top-10 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
              {preview.type === "IMAGE" ? (
                <img src={preview.url} alt="" className="max-h-[80vh] rounded-xl object-contain" />
              ) : (
                <video src={preview.url} controls autoPlay className="max-h-[80vh] rounded-xl w-full" />
              )}
              {preview.fileName && (
                <p className="mt-3 text-sm text-white/70">{preview.fileName}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
