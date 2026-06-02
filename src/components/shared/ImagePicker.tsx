"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Loader2,
  Camera,
  Globe,
} from "lucide-react";
import {
  FOOD_IMAGE_LIBRARY,
  FOOD_CATEGORIES,
  type FoodImage,
} from "@/lib/food-images";
import { useToast } from "@/context/ToastContext";
import { uploadFile } from "@/lib/upload";
import ImageCropDialog from "./ImageCropDialog";

interface ImagePickerProps {
  open: boolean;
  currentImage: string | null;
  onSelect: (url: string) => void;
  onClose: () => void;
}

type WebImage = {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  photographer: string | null;
  sourceUrl: string | null;
};

export default function ImagePicker({
  open,
  currentImage,
  onSelect,
  onClose,
}: ImagePickerProps) {
  const [tab, setTab] = useState<"library" | "web" | "upload" | "url">("library");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<{ src: string; name: string } | null>(null);
  const [webQuery, setWebQuery] = useState("");
  const [webResults, setWebResults] = useState<WebImage[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webProvider, setWebProvider] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (tab !== "web") return;
    const q = webQuery.trim();
    if (!q) {
      setWebResults([]);
      setWebError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setWebLoading(true);
      setWebError(null);
      try {
        const res = await fetch(
          `/api/image-search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        const data = await res.json();
        if (!res.ok) {
          setWebResults([]);
          setWebError(data.error || "Search failed");
          setWebProvider(null);
        } else {
          setWebResults(data.images || []);
          setWebProvider(data.provider || null);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setWebError("Search failed");
        }
      } finally {
        setWebLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [webQuery, tab]);

  const filteredImages = FOOD_IMAGE_LIBRARY.filter((img) => {
    const matchSearch =
      !search ||
      img.label.toLowerCase().includes(search.toLowerCase()) ||
      img.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || img.category === category;
    return matchSearch && matchCat;
  });

  const uploadFinalFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const url = await uploadFile(file, "menu");
        onSelect(url);
        onClose();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Upload failed",
          "error",
        );
      } finally {
        setUploading(false);
      }
    },
    [onSelect, onClose, showToast],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        showToast("File too large (max 5MB)", "error");
        return;
      }
      const src = URL.createObjectURL(file);
      setCropSrc({ src, name: file.name });
    },
    [showToast],
  );

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    onSelect(urlInput.trim());
    onClose();
  };

  const handleLibrarySelect = (img: FoodImage) => {
    onSelect(img.url);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-100 bg-black/50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[95%] max-w-2xl max-h-[85vh] rounded-2xl bg-[var(--canvas)] shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-soft)] shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-base font-bold text-[var(--text-1)]">
                  Choose Image
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-3)] hover:bg-[var(--surface)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {currentImage && (
              <div className="px-5 pt-4">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--canvas-sub)] p-3">
                  <img
                    src={currentImage}
                    alt="Current"
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--text-2)]">
                      Current image
                    </p>
                    <p className="text-[11px] text-[var(--text-3)] truncate">
                      {currentImage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-1 px-5 pt-4 shrink-0">
              {(
                [
                  { id: "library", label: "Food Library", icon: ImageIcon },
                  { id: "web", label: "Web Search", icon: Globe },
                  { id: "upload", label: "Upload", icon: Upload },
                  { id: "url", label: "Paste URL", icon: LinkIcon },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold transition-all ${
                    tab === t.id
                      ? "bg-[var(--text-1)] text-white"
                      : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {tab === "library" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search food images..."
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                    {FOOD_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                          category === cat
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filteredImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => handleLibrarySelect(img)}
                        onMouseEnter={() => setPreviewUrl(img.url)}
                        onMouseLeave={() => setPreviewUrl(null)}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--surface)] hover:ring-2 hover:ring-[var(--accent)] transition-all"
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                          {img.label}
                        </span>
                        {currentImage === img.url && (
                          <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--text-1)]">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {filteredImages.length === 0 && (
                    <p className="py-8 text-center text-sm text-[var(--text-3)]">
                      No images found for &ldquo;{search}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {tab === "web" && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
                    <input
                      value={webQuery}
                      onChange={(e) => setWebQuery(e.target.value)}
                      placeholder="Search food or drinks from the web…"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:bg-[var(--canvas)] transition-all"
                    />
                  </div>

                  {webLoading && (
                    <div className="flex items-center justify-center py-10 gap-2 text-[var(--text-3)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-semibold">Searching…</span>
                    </div>
                  )}

                  {webError && !webLoading && (
                    <div className="rounded-xl bg-[var(--status-error-bg)] text-[var(--status-error-text)] p-3 text-xs font-semibold">
                      {webError}
                    </div>
                  )}

                  {!webLoading && !webError && webResults.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {webResults.map((img) => (
                          <button
                            key={img.id}
                            onClick={() =>
                              setCropSrc({
                                src: img.url,
                                name: `${(img.alt || "image").slice(0, 40)}.jpg`,
                              })
                            }
                            className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--surface)] hover:ring-2 hover:ring-[var(--accent)] transition-all"
                            title={img.alt || "Search result"}
                          >
                            <img
                              src={img.thumb}
                              alt={img.alt || "Search result"}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {img.photographer && (
                              <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                {img.photographer}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      {webProvider && (
                        <p className="text-[10px] text-[var(--text-3)] text-center pt-1">
                          Images via{" "}
                          <span className="font-semibold capitalize">{webProvider}</span>. Pick one to crop and use.
                        </p>
                      )}
                    </>
                  )}

                  {!webLoading && !webError && webQuery.trim() && webResults.length === 0 && (
                    <p className="py-8 text-center text-sm text-[var(--text-3)]">
                      No results for &ldquo;{webQuery}&rdquo;
                    </p>
                  )}

                  {!webQuery.trim() && !webLoading && (
                    <div className="py-10 text-center text-sm text-[var(--text-3)] space-y-1">
                      <Globe className="h-6 w-6 mx-auto text-[var(--text-3)]" />
                      <p className="font-semibold">Search food & drink photos from the web</p>
                      <p className="text-[11px]">Try &ldquo;momo&rdquo;, &ldquo;biryani&rdquo;, &ldquo;ramen&rdquo;, &ldquo;latte&rdquo;…</p>
                    </div>
                  )}
                </div>
              )}

              {tab === "upload" && (
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}
                    className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--canvas-sub)] py-14 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
                        <p className="text-sm font-bold text-[var(--text-2)]">
                          Uploading...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10">
                          <Upload className="h-6 w-6 text-[var(--accent)]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-[var(--text-1)]">
                            Click to upload or drag & drop
                          </p>
                          <p className="text-xs text-[var(--text-3)] mt-0.5">
                            JPEG, PNG, WebP, GIF (max 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === "url" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2 block">
                      Image URL
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                      <input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/food-image.jpg"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas-sub)] py-3 pl-10 pr-3 text-sm text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:bg-[var(--canvas)] transition-all"
                      />
                    </div>
                  </div>

                  {urlInput && (
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                      <img
                        src={urlInput}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f3f4f6' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' font-size='12' fill='%239ca3af' text-anchor='middle' dy='.3em'%3EInvalid URL%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  )}

                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="w-full rounded-xl bg-[var(--text-1)] py-3 text-sm font-bold text-white hover:bg-[#2d1508] transition-colors disabled:opacity-50"
                  >
                    Use This Image
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 right-4 w-48 rounded-xl overflow-hidden shadow-2xl border border-[var(--border)]"
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {cropSrc && (
            <ImageCropDialog
              open={!!cropSrc}
              imageSrc={cropSrc.src}
              fileName={cropSrc.name}
              onCancel={() => {
                if (cropSrc.src.startsWith("blob:")) URL.revokeObjectURL(cropSrc.src);
                setCropSrc(null);
              }}
              onConfirm={async (file) => {
                if (cropSrc.src.startsWith("blob:")) URL.revokeObjectURL(cropSrc.src);
                setCropSrc(null);
                await uploadFinalFile(file);
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
