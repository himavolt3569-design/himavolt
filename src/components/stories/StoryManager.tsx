"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Video,
  Upload,
  X,
  Clock,
  Eye,
  Loader2,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { StoryViewer, type Story } from "@/components/ui/story-viewer";
import { useToast } from "@/context/ToastContext";

interface StoryData {
  id: string;
  type: "image" | "video";
  mediaUrl: string;
  caption: string | null;
  isActive: boolean;
  isExpired: boolean;
  expiresAt: string;
  viewCount: number;
  createdAt: string;
  postedBy: string;
  postedByAvatar: string | null;
  postedByRole: string;
}

interface StoryManagerProps {
  restaurantId: string;
  restaurantName?: string;
  restaurantAvatar?: string;
  staffRole?: string;
}

export default function StoryManager({
  restaurantId,
  restaurantName = "Restaurant",
  restaurantAvatar,
  staffRole,
}: StoryManagerProps) {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    type: "image" | "video";
    file: File;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { showToast } = useToast();
  const [caption, setCaption] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/stories`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setStories(data.stories || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast(`File too large. Max ${isVideo ? "50MB" : "5MB"}`, "error");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewFile({ url, type: isVideo ? "video" : "image", file });
    setShowAddModal(true);
  };

  const handleUpload = async () => {
    if (!previewFile) return;
    setUploading(true);

    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append("file", previewFile.file);
      formData.append("folder", "stories");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await uploadRes.json();

      // 2. Create story record
      const storyRes = await fetch(`/api/restaurants/${restaurantId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mediaUrl: url,
          type: previewFile.type,
          caption: caption || undefined,
          durationHours,
        }),
      });

      if (!storyRes.ok) {
        const err = await storyRes.json();
        throw new Error(err.error || "Failed to create story");
      }

      // 3. Refresh
      await fetchStories();
      resetModal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to upload story",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async (storyId: string) => {
    setDeleteConfirmId(null);
    setDeleting(storyId);

    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/stories?storyId=${storyId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (res.ok) {
        setStories((prev) => prev.filter((s) => s.id !== storyId));
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(null);
    }
  };

  const resetModal = () => {
    setShowAddModal(false);
    setCaption("");
    setDurationHours(24);
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
      setPreviewFile(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const activeStories = stories.filter((s) => s.isActive && !s.isExpired);
  const expiredStories = stories.filter((s) => s.isExpired || !s.isActive);

  // Build preview data for the StoryViewer component
  const previewStories: Story[] = activeStories.map((s) => ({
    id: s.id,
    type: s.type,
    src: s.mediaUrl,
  }));

  function timeLeft(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#3e1e0c]">Stories</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Share photos & videos that customers see when they open the menu.
            Stories auto-expire after the set duration.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-[#eaa94d] px-4 py-2.5 text-sm font-bold text-white cursor-pointer hover:bg-[#d67620] transition-colors shadow-md">
          <Plus className="h-4 w-4" />
          Add Story
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Live Preview */}
      {activeStories.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Customer Preview
          </h3>
          <div className="flex items-center gap-4">
            <StoryViewer
              stories={previewStories}
              username={restaurantName}
              avatar={
                restaurantAvatar ||
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100&h=100&fit=crop"
              }
              timestamp={activeStories[0]?.createdAt}
            />
            <div className="text-sm text-gray-500">
              <span className="font-bold text-[#3e1e0c]">
                {activeStories.length}
              </span>{" "}
              active {activeStories.length === 1 ? "story" : "stories"}
            </div>
          </div>
        </div>
      )}

      {/* Active Stories Grid */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Active Stories ({activeStories.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : activeStories.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
            <Camera className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">
              No active stories
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Upload a photo or video to create your first story
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeStories.map((story) => (
              <motion.div
                key={story.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white"
              >
                <div className="aspect-[9/16] bg-gray-100 relative">
                  {story.type === "video" ? (
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={story.mediaUrl}
                      alt={story.caption || "Story"}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-bold text-white">
                      {story.type === "video" ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                      {story.type === "video" ? "Video" : "Photo"}
                    </span>
                  </div>

                  {/* Delete button */}
                  {deleteConfirmId === story.id ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl">
                      <p className="text-xs font-semibold text-white">
                        Delete story?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDelete(story.id)}
                          className="px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-xs font-bold bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(story.id)}
                      disabled={deleting === story.id}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                    >
                      {deleting === story.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="flex items-center justify-between text-[10px] text-white">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {story.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeLeft(story.expiresAt)}
                      </span>
                    </div>
                    {story.caption && (
                      <p className="text-[10px] text-white/80 truncate mt-1">
                        {story.caption}
                      </p>
                    )}
                  </div>
                </div>

                {/* Posted by */}
                <div className="px-2 py-1.5 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 truncate">
                    by {story.postedBy}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Expired Stories */}
      {expiredStories.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Expired ({expiredStories.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {expiredStories.map((story) => (
              <div
                key={story.id}
                className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white opacity-50"
              >
                <div className="aspect-[9/16] bg-gray-100 relative">
                  {story.type === "video" ? (
                    <video
                      src={story.mediaUrl}
                      className="w-full h-full object-cover grayscale"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={story.mediaUrl}
                      alt={story.caption || "Story"}
                      className="w-full h-full object-cover grayscale"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full">
                      Expired
                    </span>
                  </div>
                  {deleteConfirmId === story.id ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl">
                      <p className="text-xs font-semibold text-white">
                        Delete story?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDelete(story.id)}
                          className="px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-xs font-bold bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(story.id)}
                      disabled={deleting === story.id}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                    >
                      {deleting === story.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Story Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetModal}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-bold text-[#3e1e0c]">
                  Add Story
                </h3>
                <button
                  onClick={resetModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Preview */}
                {previewFile ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[300px] mx-auto">
                    {previewFile.type === "video" ? (
                      <video
                        src={previewFile.url}
                        className="w-full h-full object-contain"
                        controls
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={previewFile.url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-16 cursor-pointer hover:border-[#eaa94d] hover:bg-orange-50/50 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-500">
                      Click to upload an image or video
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      Images: Max 5MB | Videos: Max 50MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/webm,video/quicktime"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Caption */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">
                    Caption (optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="What's happening today?"
                    maxLength={120}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:border-[#eaa94d]/30"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">
                    Expires after
                  </label>
                  <div className="flex gap-2">
                    {[6, 12, 24, 48].map((h) => (
                      <button
                        key={h}
                        onClick={() => setDurationHours(h)}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                          durationHours === h
                            ? "bg-[#3e1e0c] text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload button */}
                <button
                  onClick={handleUpload}
                  disabled={!previewFile || uploading}
                  className="w-full rounded-xl bg-[#eaa94d] py-3 text-sm font-bold text-white transition-all hover:bg-[#d67620] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Post Story
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
