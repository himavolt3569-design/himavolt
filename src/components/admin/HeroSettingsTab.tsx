"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  ImagePlus,
  Trash2,
  GripVertical,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Settings,
  Eye,
} from "lucide-react";
import { v4 as uuid } from "uuid";

interface HeroImage {
  id: string;
  url: string;
  order: number;
  createdAt: string;
}

interface HeroSettings {
  images: HeroImage[];
  autoplay: boolean;
  interval: number;
  overlayOpacity: number;
}

const DEFAULTS: HeroSettings = {
  images: [],
  autoplay: true,
  interval: 5000,
  overlayOpacity: 40,
};

export default function HeroSettingsTab() {
  const queryClient = useQueryClient();
  // Query cache paints instantly on a re-opened tab (no fetch-on-every-visit
  // spinner); `settings` stays local editable draft state, hydrated once
  // from the fetched data.
  const settingsQuery = useQuery({
    queryKey: ["hero-settings"],
    queryFn: () => fetch("/api/admin/hero-settings").then((r) => r.json()),
  });
  const [settings, setSettings] = useState<HeroSettings>(DEFAULTS);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current && settingsQuery.data) {
      setSettings({ ...DEFAULTS, ...settingsQuery.data });
      hydratedRef.current = true;
    }
  }, [settingsQuery.data]);
  const loading = settingsQuery.isLoading;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);

  // Auto-rotate preview
  useEffect(() => {
    if (!settings.autoplay || settings.images.length <= 1) return;
    const timer = setInterval(() => {
      setPreviewIndex((i) => (i + 1) % settings.images.length);
    }, settings.interval);
    return () => clearInterval(timer);
  }, [settings.autoplay, settings.interval, settings.images.length]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setStatus("idle");

      try {
        // Step 1: Get signed URL from our upload API
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            folder: "hero",
          }),
        });

        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          throw new Error(error.error || "Failed to get upload URL");
        }

        const { signedUrl, publicUrl } = await uploadRes.json();

        // Step 2: Upload file to Supabase using signed URL
        const supabaseRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!supabaseRes.ok) {
          throw new Error("Failed to upload image");
        }

        // Step 3: Add to local state
        const newImage: HeroImage = {
          id: uuid(),
          url: publicUrl,
          order: settings.images.length,
          createdAt: new Date().toISOString(),
        };

        setSettings((prev) => ({
          ...prev,
          images: [...prev.images, newImage],
        }));
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Upload failed");
        setStatus("error");
      } finally {
        setUploading(false);
        // Reset input
        e.target.value = "";
      }
    },
    [settings.images.length]
  );

  const handleRemoveImage = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id),
    }));
  }, []);

  const handleReorder = useCallback((newOrder: HeroImage[]) => {
    setSettings((prev) => ({
      ...prev,
      images: newOrder.map((img, idx) => ({ ...img, order: idx })),
    }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/hero-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const updated = await res.json();
      setSettings({ ...DEFAULTS, ...updated });
      queryClient.setQueryData(["hero-settings"], updated);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    setStatus("idle");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1A2744]">Hero Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage the landing page hero section images and carousel settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Images & Settings */}
        <div className="space-y-6">
          {/* Images Section */}
          <div className="rounded-3xl border border-blue-100 bg-[var(--canvas)] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1A2744]">
                <ImagePlus className="h-4 w-4 text-blue-400" />
                Hero Images
              </h3>
              <span className="text-xs text-slate-400">
                {settings.images.length} image{settings.images.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Image Grid with Reorder */}
            {settings.images.length > 0 ? (
              <Reorder.Group
                axis="y"
                values={settings.images}
                onReorder={handleReorder}
                className="space-y-3"
              >
                {settings.images.map((image) => (
                  <Reorder.Item
                    key={image.id}
                    value={image}
                    className="group relative flex items-center gap-3 rounded-xl border border-white/40 shadow-sm bg-white/60 backdrop-blur-xl p-2 shadow-sm"
                  >
                    <div className="cursor-grab p-1 text-slate-300 hover:text-slate-500 active:cursor-grabbing">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                      <img
                        src={image.url}
                        alt="Hero"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs text-slate-500">
                        {image.url.split("/").pop()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-white/40 shadow-sm p-8 text-center">
                <ImagePlus className="mx-auto h-10 w-10 text-slate-200" />
                <p className="mt-2 text-sm text-slate-400">No images yet</p>
                <p className="text-xs text-slate-300">
                  Upload images to create a hero carousel
                </p>
              </div>
            )}

            {/* Upload Button */}
            <div className="mt-4">
              <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-sm font-medium text-blue-500 hover:bg-blue-50 transition-colors">
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Add Image
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Settings Section */}
          <div className="rounded-3xl border border-blue-100 bg-[var(--canvas)] p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1A2744]">
              <Settings className="h-4 w-4 text-blue-400" />
              Carousel Settings
            </h3>

            <div className="space-y-4">
              {/* Autoplay Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.autoplay ? (
                    <Play className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Pause className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-700">Autoplay</span>
                </div>
                <button
                  onClick={() =>
                    setSettings((prev) => ({ ...prev, autoplay: !prev.autoplay }))
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    settings.autoplay ? "bg-blue-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white/60 backdrop-blur-xl transition-transform ${
                      settings.autoplay ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Interval Slider */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-700">Slide Interval</span>
                  <span className="text-xs text-slate-400">
                    {settings.interval / 1000}s
                  </span>
                </div>
                <input
                  type="range"
                  min="3000"
                  max="10000"
                  step="1000"
                  value={settings.interval}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      interval: parseInt(e.target.value, 10),
                    }))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-500"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>3s</span>
                  <span>10s</span>
                </div>
              </div>

              {/* Overlay Opacity */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-700">Overlay Opacity</span>
                  <span className="text-xs text-slate-400">
                    {settings.overlayOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={settings.overlayOpacity}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      overlayOpacity: parseInt(e.target.value, 10),
                    }))
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Dark overlay for better text readability
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-blue-100 bg-[var(--canvas)] p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1A2744]">
              <Eye className="h-4 w-4 text-blue-400" />
              Live Preview
            </h3>

            {/* Preview Container */}
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
              {settings.images.length > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={settings.images[previewIndex]?.id || "none"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    src={settings.images[previewIndex]?.url}
                    alt="Hero preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </AnimatePresence>
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <div className="text-center">
                    <ImagePlus className="mx-auto h-10 w-10 opacity-50" />
                    <p className="mt-2 text-sm">No images to preview</p>
                  </div>
                </div>
              )}

              {/* Overlay */}
              {settings.images.length > 0 && (
                <div
                  className="absolute inset-0 bg-black transition-opacity"
                  style={{ opacity: settings.overlayOpacity / 100 }}
                />
              )}

              {/* Sample Text */}
              {settings.images.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                  <h4 className="text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
                    Craving something
                    <span className="block text-[var(--accent)]">Delicious?</span>
                  </h4>
                  <p className="mt-3 text-sm text-white/80 drop-shadow-md">
                    Nepal&apos;s Smartest Food Platform
                  </p>
                </div>
              )}

              {/* Slide Indicators */}
              {settings.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                  {settings.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === previewIndex
                          ? "w-6 bg-white/60 backdrop-blur-xl"
                          : "w-1.5 bg-white/60 backdrop-blur-xl/50 hover:bg-white/60 backdrop-blur-xl/75"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Preview Controls */}
            {settings.images.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setPreviewIndex((i) =>
                      i === 0 ? settings.images.length - 1 : i - 1
                    )
                  }
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  {previewIndex + 1} / {settings.images.length}
                </span>
                <button
                  onClick={() =>
                    setPreviewIndex((i) => (i + 1) % settings.images.length)
                  }
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-blue-50/50 p-4 text-xs text-slate-500">
            <p className="font-medium text-blue-600 mb-1">Tips:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Use high-quality images (1920×1080 or larger)</li>
              <li>Images with darker areas work best for text overlay</li>
              <li>Drag images to reorder the carousel sequence</li>
              <li>Overlay opacity helps text stand out on busy images</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          Hero settings saved successfully.
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-500"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition-all hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-white/40 shadow-sm bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
