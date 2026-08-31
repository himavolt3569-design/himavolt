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
  Coffee,
} from "lucide-react";
import {
  FOOD_IMAGE_LIBRARY,
  FOOD_CATEGORIES,
  DRINK_IMAGE_LIBRARY,
  DRINK_CATEGORIES,
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
  type?: "food" | "drink" | "all";
  /** Seed the search with the item's name so opening the picker for "Momo"
   *  immediately suggests Momo photos instead of a blank search. */
  initialQuery?: string;
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
  type = "all",
  initialQuery,
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
        const params = new URLSearchParams({ q });
        // Lets the search bias toward a plate or a glass, per the picker's context.
        if (type !== "all") params.set("type", type);
        const res = await fetch(`/api/image-search?${params.toString()}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) {
          setWebResults([]);
          setWebError(data.error || "Search failed");
          setWebProvider(null);
        } else if (data.missingKeys) {
          setWebResults([]);
          setWebProvider(null);
          setWebError("API_KEYS_MISSING");
        } else if (data.degraded) {
          // Every image source errored — not an empty result set. Telling the
          // owner to reword the query here would send them chasing nothing.
          setWebResults([]);
          setWebProvider(null);
          setWebError("Image sources are unavailable right now. Try again in a moment, or upload a photo instead.");
        } else {
          setWebResults(data.images || []);
          setWebProvider(data.provider || null);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setWebResults([]);
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
  }, [webQuery, tab, type]);

  // Determine Library Context
  const activeLibrary =
    type === "food"
      ? FOOD_IMAGE_LIBRARY
      : type === "drink"
      ? DRINK_IMAGE_LIBRARY
      : [...FOOD_IMAGE_LIBRARY, ...DRINK_IMAGE_LIBRARY];

  const activeCategories =
    type === "food"
      ? FOOD_CATEGORIES
      : type === "drink"
      ? DRINK_CATEGORIES
      : ["All", ...FOOD_CATEGORIES.filter((c) => c !== "All"), ...DRINK_CATEGORIES.filter((c) => c !== "All")];

  const filteredImages = activeLibrary.filter((img) => {
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

  const handleUrlSubmit = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    setUploading(true);
    try {
      // Load image onto a canvas for auto-crop
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = url;
      });

      // Center-crop to square
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - size) / 2;
      const sy = (img.naturalHeight - size) / 2;
      const outSize = Math.min(size, 800); // cap at 800px

      const canvas = document.createElement("canvas");
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, outSize, outSize);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas conversion failed"))),
          "image/jpeg",
          0.85,
        );
      });

      const file = new File([blob], "menu-image.jpg", { type: "image/jpeg" });
      const uploadedUrl = await uploadFile(file, "menu");
      onSelect(uploadedUrl);
      onClose();
    } catch {
      // CORS blocked — fall back to using raw URL
      onSelect(url);
      onClose();
    } finally {
      setUploading(false);
    }
  }, [urlInput, onSelect, onClose]);

  const handleLibrarySelect = (img: FoodImage) => {
    onSelect(img.url);
    onClose();
  };

  // On open, seed the search from the item's name and jump to Web Search so
  // relevant photos are suggested straight away. Runs once per open (the modal
  // sits above the name field, so initialQuery is stable while open); the user
  // can still edit or clear the query, or switch to the curated library.
  useEffect(() => {
    if (!open) return;
    const seed = (initialQuery ?? "").trim();
    if (!seed) return;
    setTab("web");
    setWebQuery(seed);
    setSearch(seed);
  }, [open, initialQuery]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 15 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[95%] max-w-2xl max-h-[90vh] rounded-2xl bg-[var(--canvas)] shadow-2xl flex flex-col overflow-hidden border border-[var(--border)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-soft)] shrink-0 bg-[var(--surface-alt)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
                  {type === "drink" ? <Coffee className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-1)] tracking-tight">
                    {type === "drink" ? "Choose Drink Image" : type === "food" ? "Choose Food Image" : "Choose Image"}
                  </h2>
                  <p className="text-xs text-[var(--text-3)] font-medium">Select from library, search the web, or upload</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Current Image (Optional) */}
            {currentImage && (
              <div className="px-6 pt-5 shrink-0">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--canvas)] p-2 shadow-sm">
                  <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-[var(--border)]">
                    <img
                      src={currentImage}
                      alt="Current"
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-0.5">
                      Current Selection
                    </p>
                    <p className="text-xs text-[var(--text-3)] truncate font-medium">
                      {currentImage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="px-6 pt-5 shrink-0">
              <div className="flex p-1 gap-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-x-auto scrollbar-hide">
                {(
                  [
                    { id: "library", label: type === "drink" ? "Drink Library" : "Food Library", icon: ImageIcon },
                    { id: "web", label: "Web Search", icon: Globe },
                    { id: "upload", label: "Upload", icon: Upload },
                    { id: "url", label: "Paste URL", icon: LinkIcon },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                      tab === t.id
                        ? "bg-[var(--canvas)] text-[var(--text-1)] shadow-sm ring-1 ring-[var(--border)]"
                        : "text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-alt)]"
                    }`}
                  >
                    <t.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === "library" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Search ${type === "drink" ? "drinks" : "food"} library...`}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {activeCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-sm border ${
                          category === cat
                            ? "bg-[var(--accent)] text-white border-[var(--accent-border)]"
                            : "bg-[var(--surface)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {filteredImages.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => handleLibrarySelect(img)}
                        onMouseEnter={() => setPreviewUrl(img.url)}
                        onMouseLeave={() => setPreviewUrl(null)}
                        className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--surface)] ring-1 ring-[var(--border)] hover:ring-2 hover:ring-[var(--accent)] transition-all shadow-sm"
                      >
                        <img
                          src={img.url}
                          alt={img.label}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML += '<div class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">Broken Image</div>';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="absolute bottom-2 left-2 right-2 text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity truncate drop-shadow-md">
                          {img.label}
                        </span>
                        {currentImage === img.url && (
                          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] shadow-md">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {filteredImages.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <ImageIcon className="h-10 w-10 text-[var(--text-3)] mb-3 opacity-50" />
                      <p className="text-sm font-bold text-[var(--text-2)]">
                        No images found
                      </p>
                      <p className="text-xs text-[var(--text-3)] mt-1">
                        Try searching for something else in the {type} library
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tab === "web" && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                    <input
                      value={webQuery}
                      onChange={(e) => setWebQuery(e.target.value)}
                      placeholder={`Search ${type === "drink" ? "drinks" : type === "food" ? "food" : "food or drinks"} from the web…`}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] transition-all shadow-sm"
                    />
                  </div>

                  {webLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--text-3)]">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                      <span className="text-xs font-bold uppercase tracking-widest">Searching…</span>
                    </div>
                  )}

                  {webError === "API_KEYS_MISSING" && !webLoading && (
                    <div className="py-10 flex flex-col items-center justify-center text-center">
                      <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                        <Globe className="h-6 w-6 text-orange-600" />
                      </div>
                      <p className="text-base font-bold text-[var(--text-1)]">Web Search Unavailable</p>
                      <p className="text-sm font-medium text-[var(--text-2)] mt-2 max-w-md">
                        To search for high-quality images, the site owner needs to configure API keys for Pexels, Unsplash, or Pixabay in the server settings.
                      </p>
                      <div className="flex gap-3 mt-6">
                        <button onClick={() => setTab("upload")} className="px-4 py-2 bg-[var(--surface)] text-[var(--text-1)] border border-[var(--border)] rounded-lg text-sm font-bold shadow-sm hover:bg-[var(--surface-alt)]">
                          Upload Photo
                        </button>
                        <button onClick={() => setTab("url")} className="px-4 py-2 bg-[var(--surface)] text-[var(--text-1)] border border-[var(--border)] rounded-lg text-sm font-bold shadow-sm hover:bg-[var(--surface-alt)]">
                          Paste URL
                        </button>
                      </div>
                    </div>
                  )}

                  {webError && webError !== "API_KEYS_MISSING" && !webLoading && (
                    <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 p-4 text-sm font-medium flex items-start gap-3">
                      <Globe className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Search Error</p>
                        <p className="text-red-500 text-xs mt-0.5">{webError}</p>
                      </div>
                    </div>
                  )}

                  {!webLoading && !webError && webResults.length > 0 && (
                    <>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {webResults.map((img) => (
                          <button
                            key={img.id}
                            onClick={() =>
                              setCropSrc({
                                src: img.url,
                                name: `${(img.alt || "image").slice(0, 40)}.jpg`,
                              })
                            }
                            className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--surface)] ring-1 ring-[var(--border)] hover:ring-2 hover:ring-[var(--accent)] transition-all shadow-sm"
                            title={img.alt || "Search result"}
                          >
                            <img
                              src={img.thumb}
                              alt={img.alt || "Search result"}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                              // Openverse's thumb proxy 404s on a few results;
                              // drop those instead of showing a broken tile.
                              onError={() =>
                                setWebResults((prev) => prev.filter((i) => i.id !== img.id))
                              }
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {img.photographer && (
                              <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity truncate drop-shadow-md">
                                @{img.photographer}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      {webProvider && (
                        <p className="text-[11px] text-[var(--text-3)] text-center pt-2 font-medium">
                          Images provided by{" "}
                          <span className="font-bold text-[var(--text-2)] capitalize">{webProvider}</span>. Select one to crop and use.
                        </p>
                      )}
                    </>
                  )}

                  {!webLoading && !webError && webQuery.trim() && webResults.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                      <div className="h-16 w-16 rounded-full bg-[var(--surface-alt)] flex items-center justify-center mb-4">
                        <Search className="h-8 w-8 text-[var(--text-3)]" />
                      </div>
                      <p className="text-base font-bold text-[var(--text-1)]">
                        No specific high-quality images found for &ldquo;{webQuery}&rdquo;
                      </p>
                      <p className="text-sm font-medium text-[var(--text-2)] mt-2 max-w-md">
                        We couldn't find a perfect match. You can try a different search, or provide your own image instead.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                        <button onClick={() => setTab("upload")} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[var(--accent-hover)] transition-all">
                          <Upload className="h-4 w-4" />
                          Upload your own
                        </button>
                        <button onClick={() => setTab("url")} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface)] text-[var(--text-1)] border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm hover:bg-[var(--surface-alt)] transition-all">
                          <LinkIcon className="h-4 w-4" />
                          Paste URL
                        </button>
                      </div>
                    </div>
                  )}

                  {!webQuery.trim() && !webLoading && (
                    <div className="py-14 flex flex-col items-center justify-center text-center">
                      <div className="h-16 w-16 rounded-full bg-[var(--surface-alt)] flex items-center justify-center mb-4">
                        <Globe className="h-8 w-8 text-[var(--text-3)]" />
                      </div>
                      <p className="text-base font-bold text-[var(--text-1)]">Search the web</p>
                      <p className="text-xs font-medium text-[var(--text-3)] mt-1.5 max-w-xs">
                        Find high-quality, royalty-free {type === "drink" ? "drink" : "food"} photos instantly.
                        <br />
                        Try &ldquo;{type === "drink" ? "latte art" : "fresh salad"}&rdquo; or &ldquo;{type === "drink" ? "mojito" : "biryani"}&rdquo;…
                      </p>
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
                    className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] py-20 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-10 w-10 animate-spin text-[var(--accent)]" />
                        <p className="text-sm font-bold text-[var(--text-2)] tracking-wide">
                          UPLOADING...
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--canvas)] shadow-sm border border-[var(--border)] group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-[var(--accent-border)] transition-all duration-300">
                          <Upload className="h-6 w-6 text-[var(--text-2)] group-hover:text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-[var(--text-1)] mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs font-medium text-[var(--text-3)]">
                            SVG, PNG, JPG or GIF (max. 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === "url" && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-2)] uppercase tracking-widest mb-2.5 block">
                      Image URL
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-3)]" />
                      <input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--canvas)] py-3 pl-10 pr-4 text-sm font-medium text-[var(--text-1)] placeholder-gray-400 focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent-border)] transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {urlInput && (
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-sm bg-[var(--surface)]">
                      <div className="px-4 py-3 border-b border-[var(--border-soft)] bg-[var(--canvas)]">
                        <p className="text-xs font-bold text-[var(--text-2)] uppercase tracking-wider">Preview</p>
                      </div>
                      <div className="flex items-center justify-center p-4 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,white_0%_50%)] bg-[length:16px_16px]" style={{ minHeight: "12rem" }}>
                        <img
                          src={urlInput}
                          alt="Preview"
                          className="max-w-full max-h-64 object-contain rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f9fafb' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' font-size='14' font-family='sans-serif' font-weight='bold' fill='%239ca3af' text-anchor='middle' dy='.3em'%3EInvalid Image URL%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div className="px-4 py-2.5 border-t border-[var(--border-soft)] bg-[var(--canvas)]">
                        <p className="text-[10px] font-medium text-[var(--text-3)]">Image will be auto-cropped to a square for the menu</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleUrlSubmit}
                      disabled={!urlInput.trim() || uploading}
                      className="w-full rounded-xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-50 disabled:hover:bg-[var(--accent)] shadow-md shadow-[var(--accent)]/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Auto-cropping & uploading…
                        </>
                      ) : (
                        "Use This Image"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hover Preview Tooltip */}
            <AnimatePresence>
              {previewUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 10 }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  className="absolute bottom-6 right-6 w-56 rounded-2xl overflow-hidden shadow-2xl border-4 border-[var(--surface)] pointer-events-none z-[200]"
                >
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-56 object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Crop Dialog (on top of picker) */}
          {cropSrc && (
            <div className="fixed inset-0 z-[120]">
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
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
