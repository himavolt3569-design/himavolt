"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Upload,
  X,
  Clock,
  Loader2,
  Tag,
  Image as ImageIcon,
  CalendarClock,
  Megaphone,
  Timer,
  Search,
  Percent,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";

interface OfferData {
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
  postedByRole: string;
}

export default function OffersTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [duration, setDuration] = useState(24); // hours
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchOffers = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ stories: OfferData[] } | OfferData[]>(
        `/api/restaurants/${restaurant.id}/stories`
      );
      const list = Array.isArray(data) ? data : Array.isArray(data?.stories) ? data.stories : [];
      setOffers(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large (max 5MB)", "error");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFile(file, "offers");
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
      const res = await apiFetch<{ story: { id: string; type: string; mediaUrl: string; caption: string | null; expiresAt: string; createdAt: string } }>(
        `/api/restaurants/${restaurant.id}/stories`,
        {
          method: "POST",
          body: {
            type: "image",
            mediaUrl: uploadedUrl,
            caption: caption.trim() || null,
            durationHours: duration,
          },
        }
      );
      const offer: OfferData = {
        id: res.story.id,
        type: "image",
        mediaUrl: res.story.mediaUrl,
        caption: res.story.caption,
        isActive: true,
        isExpired: false,
        expiresAt: res.story.expiresAt,
        viewCount: 0,
        createdAt: res.story.createdAt,
        postedBy: "You",
        postedByRole: "OWNER",
      };
      setOffers((prev) => [offer, ...prev]);
      setCaption("");
      setUploadedUrl("");
      setDuration(24);
      setShowForm(false);
      showToast("Offer published!");
    } catch {
      showToast("Failed to create offer", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!restaurant) return;
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/stories?storyId=${id}`, {
        method: "DELETE",
      });
      setOffers((prev) => prev.filter((o) => o.id !== id));
      showToast("Offer removed");
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const [menuItems, setMenuItems] = useState<{ id: string; name: string; imageUrl: string | null; discount: number; discountLabel: string | null; offerExpiresAt: string | null }[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [showTimedOffer, setShowTimedOffer] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [offerDiscount, setOfferDiscount] = useState(10);
  const [offerLabel, setOfferLabel] = useState("");
  const [offerDurationMin, setOfferDurationMin] = useState(60);
  const [settingOffer, setSettingOffer] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const fetchMenuItems = useCallback(async () => {
    if (!restaurant) return;
    setMenuLoading(true);
    try {
      const data = await apiFetch<{ id: string; name: string; imageUrl: string | null; discount: number; discountLabel: string | null; offerExpiresAt: string | null }[]>(
        `/api/restaurants/${restaurant.id}/menu`
      );
      setMenuItems(Array.isArray(data) ? data : []);
    } catch { /* silent */ } finally {
      setMenuLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => { fetchMenuItems(); }, [fetchMenuItems]);

  const handleSetTimedOffer = async () => {
    if (!restaurant || !selectedItemId) return;
    setSettingOffer(true);
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/menu/${selectedItemId}/offer`, {
        method: "PATCH",
        body: { discount: offerDiscount, discountLabel: offerLabel || `${offerDiscount}% OFF`, durationMinutes: offerDurationMin },
      });
      showToast("Timed offer set!");
      setShowTimedOffer(false);
      setSelectedItemId("");
      setOfferDiscount(10);
      setOfferLabel("");
      setOfferDurationMin(60);
      fetchMenuItems();
    } catch { showToast("Failed to set offer", "error"); } finally { setSettingOffer(false); }
  };

  const handleClearOffer = async (itemId: string) => {
    if (!restaurant) return;
    try {
      await apiFetch(`/api/restaurants/${restaurant.id}/menu/${itemId}/offer`, { method: "DELETE" });
      showToast("Offer cleared");
      fetchMenuItems();
    } catch { showToast("Failed to clear offer", "error"); }
  };

  const activeTimedOffers = menuItems.filter((m) => m.offerExpiresAt && new Date(m.offerExpiresAt) > new Date());
  const filteredItems = menuItems.filter((m) => m.name.toLowerCase().includes(itemSearch.toLowerCase()));

  const safeOffers = Array.isArray(offers) ? offers : [];
  const activeOffers = safeOffers.filter((o) => o.isActive && !o.isExpired);
  const expiredOffers = safeOffers.filter((o) => !o.isActive || o.isExpired);

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[var(--accent)]">
        <Megaphone className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium text-[var(--accent-text)]">Select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-1)]">Offers & Promotions</h2>
          <p className="text-sm text-[var(--accent-text)]/50">
            Create time-bound offers visible to all customers. Any staff member can add offers.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-hover)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--accent)] transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Offer
        </button>
      </div>

      {/* ── Timed Offers on Menu Items ─────────────────────────── */}
      <div className="rounded-2xl ring-1 ring-[var(--accent-border)]/60 bg-[var(--canvas)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-[var(--accent-text)]" />
            <h3 className="text-sm font-bold text-[var(--accent-text)]">Timed Menu Offers</h3>
            {activeTimedOffers.length > 0 && (
              <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-text)]">
                {activeTimedOffers.length} active
              </span>
            )}
          </div>
          <button
            onClick={() => setShowTimedOffer(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-bold text-[var(--accent-text)] hover:bg-[var(--accent-muted)] transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Set Offer
          </button>
        </div>

        {activeTimedOffers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeTimedOffers.map((item) => {
              const remaining = Math.max(0, new Date(item.offerExpiresAt!).getTime() - Date.now());
              const hrs = Math.floor(remaining / 3600000);
              const mins = Math.floor((remaining % 3600000) / 60000);
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)]/40 p-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--accent-text)] truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--accent-text)]">
                      <span className="font-bold text-red-500">{item.discountLabel || `${item.discount}% OFF`}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`} left
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClearOffer(item.id)}
                    className="rounded-lg p-1.5 text-[var(--accent)] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTimedOffers.length === 0 && (
          <p className="text-xs text-[var(--accent)] text-center py-2">No active timed offers. Set one to show countdowns on menu items.</p>
        )}
      </div>

      <AnimatePresence>
        {showTimedOffer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTimedOffer(false)}
              className="fixed inset-0 z-100 bg-[var(--text-1)]/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[95%] max-w-md rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--accent-border)]/60">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-[var(--accent-text)]" />
                  <h3 className="text-base font-bold text-[var(--text-1)]">Set Timed Offer</h3>
                </div>
                <button onClick={() => setShowTimedOffer(false)} className="rounded-full p-2 text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Search & Select Item */}
                <div>
                  <label className="text-xs font-bold text-[var(--accent-text)]/60 uppercase tracking-wider mb-1.5 block">Menu Item</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--accent)]" />
                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search menu items..."
                      className="w-full rounded-xl border border-[var(--accent-border)]/60 bg-[var(--accent-muted)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]/40"
                    />
                  </div>
                  <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-[var(--accent-border)]/60 divide-y divide-[var(--border)]">
                    {filteredItems.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setSelectedItemId(item.id); setItemSearch(item.name); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                          selectedItemId === item.id ? "bg-[var(--accent-muted)] text-[var(--accent-text)] font-semibold" : "text-[var(--accent-text)] hover:bg-[var(--accent-muted)]"
                        }`}
                      >
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />}
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--accent-text)]/60 uppercase tracking-wider mb-1.5 block">Discount %</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={offerDiscount}
                      onChange={(e) => setOfferDiscount(Number(e.target.value))}
                      className="w-20 rounded-xl border border-[var(--accent-border)]/60 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]/40"
                    />
                    <Percent className="h-4 w-4 text-[var(--accent)]" />
                    <input
                      value={offerLabel}
                      onChange={(e) => setOfferLabel(e.target.value)}
                      placeholder="Custom label (optional)"
                      className="flex-1 rounded-xl border border-[var(--accent-border)]/60 bg-[var(--accent-muted)] px-3 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--accent-text)]/60 uppercase tracking-wider mb-1.5 block">Duration</label>
                  <div className="flex gap-2">
                    {[{ label: "30m", val: 30 }, { label: "1h", val: 60 }, { label: "2h", val: 120 }, { label: "6h", val: 360 }].map(({ label, val }) => (
                      <button
                        key={val}
                        onClick={() => setOfferDurationMin(val)}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                          offerDurationMin === val ? "bg-[var(--accent-hover)] text-white" : "bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSetTimedOffer}
                  disabled={!selectedItemId || settingOffer}
                  className="w-full rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent)] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {settingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Timer className="h-4 w-4" />}
                  {settingOffer ? "Setting..." : "Set Timed Offer"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auto-scrolling active offers banner */}
      {activeOffers.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-[var(--accent-muted)] ring-1 ring-[var(--accent-border)]/40 p-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <Tag className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span className="text-[11px] font-bold text-[var(--accent-text)] uppercase tracking-wider">
              Live Offers ({activeOffers.length})
            </span>
          </div>
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-4 px-3">
              {activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="shrink-0 w-[280px] sm:w-[340px] rounded-xl overflow-hidden bg-[var(--canvas)] ring-1 ring-[var(--accent-border)]/60"
                >
                  <div className="relative aspect-[2/1] overflow-hidden">
                    <img
                      src={offer.mediaUrl}
                      alt={offer.caption || "Offer"}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[var(--accent)]0/40 to-transparent" />
                    {offer.caption && (
                      <p className="absolute bottom-2 left-3 right-3 text-sm font-bold text-white line-clamp-2">
                        {offer.caption}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--accent-text)]">
                      <Clock className="h-3 w-3" />
                      Expires {new Date(offer.expiresAt).toLocaleDateString()}
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--accent)]">
                      by {offer.postedBy}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 z-100 bg-[var(--text-1)]/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[95%] max-w-md rounded-2xl bg-[var(--canvas)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--accent-border)]/60">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-[var(--accent-text)]" />
                  <h3 className="text-base font-bold text-[var(--text-1)]">New Offer</h3>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-full p-2 text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
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
                  <div className="relative rounded-xl overflow-hidden border border-[var(--accent-border)]">
                    <img
                      src={uploadedUrl}
                      alt="Offer preview"
                      className="w-full h-44 object-cover"
                    />
                    <button
                      onClick={() => setUploadedUrl("")}
                      className="absolute top-2 right-2 rounded-full bg-[var(--canvas)]/90 p-1.5 text-[var(--accent-text)] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--accent-border)] bg-[var(--accent-muted)] py-10 cursor-pointer hover:border-[var(--accent)] transition-colors"
                  >
                    {uploading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-[var(--accent)]" />
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                          <Upload className="h-5 w-5 text-[var(--accent-text)]" />
                        </div>
                        <p className="text-sm font-bold text-[var(--accent-text)]">Upload offer image</p>
                        <p className="text-xs text-[var(--accent)]">JPEG, PNG, WebP (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[var(--accent-text)]/60 uppercase tracking-wider mb-1.5 block">
                    Offer Text
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="e.g. 20% off on all momos today!"
                    rows={2}
                    className="w-full rounded-xl border border-[var(--accent-border)]/60 bg-[var(--accent-muted)] px-4 py-2.5 text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]/40 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--accent-text)]/60 uppercase tracking-wider mb-1.5 block">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    {[6, 12, 24, 48].map((h) => (
                      <button
                        key={h}
                        onClick={() => setDuration(h)}
                        className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                          duration === h
                            ? "bg-[var(--accent-hover)] text-white"
                            : "bg-[var(--accent-muted)] text-[var(--accent-text)] hover:bg-[var(--accent-muted)]"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!uploadedUrl || submitting}
                  className="w-full rounded-xl bg-[var(--accent-hover)] py-3 text-sm font-bold text-white hover:bg-[var(--accent)] transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Megaphone className="h-4 w-4" />
                  )}
                  {submitting ? "Publishing..." : "Publish Offer"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--accent)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-muted)] mb-4">
            <ImageIcon className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-[var(--accent-text)]">No offers yet</p>
          <p className="text-xs text-[var(--accent)] mt-1">
            Create your first offer to attract more customers
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeOffers.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-[var(--accent-text)]/50 uppercase tracking-wider mb-3">
                Active ({activeOffers.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeOffers.map((offer, i) => (
                  <OfferCard key={offer.id} offer={offer} onDelete={handleDelete} index={i} />
                ))}
              </div>
            </div>
          )}

          {expiredOffers.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold text-[var(--accent-text)]/30 uppercase tracking-wider mb-3">
                Expired ({expiredOffers.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiredOffers.map((offer, i) => (
                  <OfferCard key={offer.id} offer={offer} onDelete={handleDelete} index={i} expired />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  onDelete,
  index,
  expired,
}: {
  offer: OfferData;
  onDelete: (id: string) => void;
  index: number;
  expired?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl overflow-hidden ring-1 bg-[var(--canvas)] ${
        expired ? "ring-[var(--border)] opacity-60" : "ring-[var(--accent-border)]/60"
      }`}
    >
      <div className="relative aspect-[2/1] overflow-hidden">
        <img
          src={offer.mediaUrl}
          alt={offer.caption || "Offer"}
          className="h-full w-full object-cover"
        />
        {expired && (
          <div className="absolute inset-0 bg-[var(--canvas)]/50 flex items-center justify-center">
            <span className="rounded-full bg-[var(--text-2)] px-3 py-1 text-xs font-bold text-white">
              Expired
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        {offer.caption && (
          <p className="text-sm font-semibold text-[var(--accent-text)] mb-2 line-clamp-2">{offer.caption}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-[var(--accent-text)]/60">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {new Date(offer.expiresAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="font-medium">{offer.postedBy}</span>
          </div>
          <button
            onClick={() => onDelete(offer.id)}
            className="rounded-lg p-1.5 text-[var(--accent)] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
