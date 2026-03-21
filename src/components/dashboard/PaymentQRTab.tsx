"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  QrCode,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  X,
  Check,
} from "lucide-react";
import { useRestaurant } from "@/context/RestaurantContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api-client";
import { uploadFile } from "@/lib/upload";

interface PaymentQR {
  id: string;
  label: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function PaymentQRTab() {
  const { selectedRestaurant, restaurants } = useRestaurant();
  const { showToast } = useToast();
  const restaurant = selectedRestaurant ?? restaurants[0];

  const [qrs, setQrs] = useState<PaymentQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [previewQR, setPreviewQR] = useState<PaymentQR | null>(null);

  // Add form state
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQRs = useCallback(async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const data = await apiFetch<PaymentQR[]>(
        `/api/restaurants/${restaurant.id}/payment-qrs`,
      );
      setQrs(data);
    } catch {
      showToast("Failed to load payment QR codes", "error");
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchQRs();
  }, [fetchQRs]);

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("File too large (max 5MB)", "error");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, "payment-qrs");
      setUploadedUrl(url);
      showToast("QR image uploaded!");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Upload failed",
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!restaurant || !label.trim() || !uploadedUrl) return;
    setSubmitting(true);
    try {
      const qr = await apiFetch<PaymentQR>(
        `/api/restaurants/${restaurant.id}/payment-qrs`,
        {
          method: "POST",
          body: { label: label.trim(), imageUrl: uploadedUrl },
        },
      );
      setQrs((prev) => [...prev, qr]);
      setLabel("");
      setUploadedUrl("");
      setShowAddForm(false);
      showToast(`${qr.label} payment QR added!`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add QR",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (qr: PaymentQR) => {
    try {
      const updated = await apiFetch<PaymentQR>(
        `/api/restaurants/${restaurant!.id}/payment-qrs/${qr.id}`,
        { method: "PATCH", body: { isActive: !qr.isActive } },
      );
      setQrs((prev) => prev.map((q) => (q.id === qr.id ? updated : q)));
      showToast(`${qr.label} ${updated.isActive ? "enabled" : "disabled"}`);
    } catch {
      showToast("Failed to update", "error");
    }
  };

  const handleDelete = async (qr: PaymentQR) => {
    try {
      await apiFetch(
        `/api/restaurants/${restaurant!.id}/payment-qrs/${qr.id}`,
        { method: "DELETE" },
      );
      setQrs((prev) => prev.filter((q) => q.id !== qr.id));
      showToast(`${qr.label} deleted`);
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <QrCode className="h-10 w-10 mb-3" />
        <p className="text-sm font-medium">Select a restaurant first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-amber-950">Payment QR Codes</h2>
          <p className="text-sm text-gray-400">
            Upload QR images for eSewa, Khalti, Fonepay, bank, etc. Customers see
            these when ordering online.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-600 shadow-md shadow-amber-700/20 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Add Payment QR
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200/40 px-4 py-3">
        <Check className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-amber-950">
          Add multiple payment QR codes — one for each payment provider. Customers
          will see these options when placing an online order.
        </p>
      </div>

      {/* Add form modal */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[95%] max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-[#eaa94d]" />
                  <h3 className="text-base font-bold text-amber-950">
                    Add Payment QR
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Label */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Payment Provider
                  </label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. eSewa, Khalti, Fonepay, Bank QR"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-amber-950 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#eaa94d]/30 focus:bg-white transition-all"
                  />
                </div>

                {/* Upload area */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    QR Code Image
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />

                  {uploadedUrl ? (
                    <div className="relative rounded-xl border border-gray-200 overflow-hidden">
                      <img
                        src={uploadedUrl}
                        alt="Payment QR preview"
                        className="w-full h-48 object-contain bg-gray-50 p-2"
                      />
                      <button
                        onClick={() => setUploadedUrl("")}
                        className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-10 cursor-pointer hover:border-[#eaa94d] hover:bg-[#eaa94d]/5 transition-all"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-7 w-7 animate-spin text-[#eaa94d]" />
                          <p className="text-sm font-bold text-gray-500">
                            Uploading...
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaa94d]/10">
                            <Upload className="h-5 w-5 text-[#eaa94d]" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-amber-950">
                              Upload QR image
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              JPEG, PNG, WebP (max 5MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleAdd}
                  disabled={!label.trim() || !uploadedUrl || submitting}
                  className="w-full rounded-xl bg-amber-700 py-3 text-sm font-bold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Payment QR
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview modal */}
      <AnimatePresence>
        {previewQR && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewQR(null)}
              className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-100 w-[90%] max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-amber-950">
                  {previewQR.label}
                </h3>
                <button
                  onClick={() => setPreviewQR(null)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <img
                  src={previewQR.imageUrl}
                  alt={previewQR.label}
                  className="w-full rounded-xl object-contain bg-gray-50"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QR list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : qrs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
            <ImageIcon className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-gray-500">
            No payment QR codes yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add your first payment QR to let customers pay via scanning
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrs.map((qr, i) => (
            <motion.div
              key={qr.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group relative rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                qr.isActive
                  ? "border-gray-200"
                  : "border-gray-100 opacity-60"
              }`}
            >
              {/* Status badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <h3 className="text-sm font-bold text-amber-950">
                    {qr.label}
                  </h3>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    qr.isActive
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {qr.isActive ? "Active" : "Disabled"}
                </span>
              </div>

              {/* QR image */}
              <button
                onClick={() => setPreviewQR(qr)}
                className="w-full rounded-xl overflow-hidden border border-gray-100 bg-gray-50 hover:border-[#eaa94d]/40 transition-colors cursor-pointer"
              >
                <img
                  src={qr.imageUrl}
                  alt={qr.label}
                  className="w-full h-40 object-contain p-2"
                />
              </button>

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleToggle(qr)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                    qr.isActive
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  {qr.isActive ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Enable
                    </>
                  )}
                </button>
                <button
                  onClick={() => setPreviewQR(qr)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                  title="Preview"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(qr)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
