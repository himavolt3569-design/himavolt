"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  GripVertical,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Search,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";

interface SlideData {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  sortOrder: number;
  isActive: boolean;
  linkItemId: string | null;
  linkItem: { id: string; name: string } | null;
  createdAt: string;
}

interface MenuItemOption {
  id: string;
  name: string;
  imageUrl: string | null;
}

export default function HeroSlidesManager() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formLinkItemId, setFormLinkItemId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Menu items for link dropdown
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const fetchSlides = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ slides: SlideData[] }>(
        `/api/restaurants/${restaurant.id}/hero-slides`
      );
      setSlides(Array.isArray(data.slides) ? data.slides : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  const fetchMenuItems = useCallback(async () => {
    if (!restaurant) return;
    setMenuLoading(true);
    try {
      const data = await apiFetch<MenuItemOption[]>(
        `/api/restaurants/${restaurant.id}/menu`
      );
      setMenuItems(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setMenuLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  useEffect(() => {
    if (showForm) fetchMenuItems();
  }, [showForm, fetchMenuItems]);

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large (max 5MB)", "error");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, "hero-slides");
      setUploadedUrl(url);
    } catch {
      showToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!restaurant || !uploadedUrl) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ slide: SlideData }>(
        `/api/restaurants/${restaurant.id}/hero-slides`,
        {
          method: "POST",
          body: {
            imageUrl: uploadedUrl,
            title: formTitle.trim() || null,
            subtitle: formSubtitle.trim() || null,
            linkItemId: formLinkItemId || null,
          },
        }
      );
      setSlides((prev) => [...prev, res.slide]);
      resetForm();
      showToast("Slide added!");
    } catch {
      showToast("Failed to create slide", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormSubtitle("");
    setFormLinkItemId("");
    setUploadedUrl("");
    setItemSearch("");
    setShowForm(false);
  };

  const handleToggleActive = async (slide: SlideData) => {
    if (!restaurant) return;
    try {
      const res = await apiFetch<{ slide: SlideData }>(
        `/api/restaurants/${restaurant.id}/hero-slides`,
        {
          method: "PATCH",
          body: { slideId: slide.id, isActive: !slide.isActive },
        }
      );
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? res.slide : s))
      );
      showToast(res.slide.isActive ? "Slide activated" : "Slide deactivated");
    } catch {
      showToast("Failed to update slide", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurant) return;
    try {
      await apiFetch(
        `/api/restaurants/${restaurant.id}/hero-slides?slideId=${id}`,
        { method: "DELETE" }
      );
      setSlides((prev) => prev.filter((s) => s.id !== id));
      showToast("Slide removed");
    } catch {
      showToast("Failed to delete slide", "error");
    }
  };

  const filteredMenuItems = menuItems.filter((m) =>
    m.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-amber-400">
        <ImageIcon className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium text-amber-600">
          Select a restaurant first
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-amber-950">Hero Slides</h2>
          <p className="text-sm text-amber-700/50">
            Manage the hero carousel displayed on your menu page.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Slide
        </button>
      </div>

      {/* Slides list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        </div>
      ) : slides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-amber-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 mb-4">
            <ImageIcon className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-amber-700">
            No hero slides yet
          </p>
          <p className="text-xs text-amber-500 mt-1">
            Add slides to create a hero carousel on your menu page
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-4 rounded-2xl ring-1 bg-white p-3 ${
                slide.isActive
                  ? "ring-amber-100/60"
                  : "ring-gray-100 opacity-60"
              }`}
            >
              {/* Drag handle */}
              <div className="text-amber-300 hidden sm:block">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Thumbnail */}
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-amber-50">
                <img
                  src={slide.imageUrl}
                  alt={slide.title || "Slide"}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900 truncate">
                  {slide.title || "Untitled slide"}
                </p>
                {slide.subtitle && (
                  <p className="text-xs text-amber-600/60 truncate mt-0.5">
                    {slide.subtitle}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-amber-500 font-medium">
                    Order: {slide.sortOrder}
                  </span>
                  {slide.linkItem && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-500">
                      <LinkIcon className="h-2.5 w-2.5" />
                      {slide.linkItem.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Toggle active */}
                <button
                  onClick={() => handleToggleActive(slide)}
                  className={`rounded-lg p-2 transition-colors cursor-pointer ${
                    slide.isActive
                      ? "text-amber-600 hover:bg-amber-50"
                      : "text-gray-400 hover:bg-gray-50"
                  }`}
                  title={slide.isActive ? "Deactivate" : "Activate"}
                >
                  {slide.isActive ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(slide.id)}
                  className="rounded-lg p-2 text-amber-300 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Slide Modal */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="fixed inset-0 z-100 bg-amber-950/30 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[95%] max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100/60">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-amber-600" />
                  <h3 className="text-base font-bold text-amber-950">
                    Add Hero Slide
                  </h3>
                </div>
                <button
                  onClick={resetForm}
                  className="rounded-full p-2 text-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Image upload */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />

                {uploadedUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-amber-100">
                    <img
                      src={uploadedUrl}
                      alt="Slide preview"
                      className="w-full h-44 object-cover"
                    />
                    <button
                      onClick={() => setUploadedUrl("")}
                      className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-amber-600 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 py-10 cursor-pointer hover:border-amber-400 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                          <Upload className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="text-sm font-bold text-amber-800">
                          Upload slide image
                        </p>
                        <p className="text-xs text-amber-500">
                          JPEG, PNG, WebP (max 5MB)
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Title (optional)
                  </label>
                  <input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Chicken Momo Special"
                    className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Subtitle (optional)
                  </label>
                  <input
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Freshly steamed, served with special achar"
                    className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                  />
                </div>

                {/* Link to menu item */}
                <div>
                  <label className="text-xs font-bold text-amber-700/60 uppercase tracking-wider mb-1.5 block">
                    Link to Menu Item (optional)
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400" />
                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search menu items..."
                      className="w-full rounded-xl border border-amber-200/60 bg-amber-50/30 pl-9 pr-4 py-2.5 text-sm text-amber-950 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                    />
                  </div>
                  {formLinkItemId && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-xs text-amber-700 font-medium">
                        Linked:{" "}
                        {menuItems.find((m) => m.id === formLinkItemId)?.name ||
                          formLinkItemId}
                      </span>
                      <button
                        onClick={() => setFormLinkItemId("")}
                        className="text-amber-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {menuLoading ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    </div>
                  ) : (
                    <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-amber-100/60 divide-y divide-amber-50">
                      {filteredMenuItems.slice(0, 8).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setFormLinkItemId(item.id);
                            setItemSearch(item.name);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                            formLinkItemId === item.id
                              ? "bg-amber-50 text-amber-900 font-semibold"
                              : "text-amber-700 hover:bg-amber-50/50"
                          }`}
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-6 w-6 rounded object-cover"
                            />
                          )}
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                      {filteredMenuItems.length === 0 && (
                        <p className="px-3 py-2 text-xs text-amber-400">
                          No items found
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!uploadedUrl || submitting}
                  className="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-500 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {submitting ? "Adding..." : "Add Slide"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
