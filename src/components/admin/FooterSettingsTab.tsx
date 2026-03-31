"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, FileText, Save, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

interface FooterSettings {
  phone: string;
  email: string;
  address: string;
  description: string;
}

const DEFAULTS: FooterSettings = {
  phone: "+977 980-123-4567",
  email: "hello@himavolt.com",
  address: "Thamel, Kathmandu",
  description:
    "Nepal's smartest food platform. Scan QR, browse the menu, order instantly or get it delivered to your door.",
};

const FIELDS: {
  key: keyof FooterSettings;
  label: string;
  icon: typeof Phone;
  placeholder: string;
  multiline?: boolean;
}[] = [
  {
    key: "phone",
    label: "Phone Number",
    icon: Phone,
    placeholder: "+977 980-123-4567",
  },
  {
    key: "email",
    label: "Email Address",
    icon: Mail,
    placeholder: "hello@himavolt.com",
  },
  {
    key: "address",
    label: "Address",
    icon: MapPin,
    placeholder: "Thamel, Kathmandu",
  },
  {
    key: "description",
    label: "Description Text",
    icon: FileText,
    placeholder: "Short tagline shown under the logo in the footer",
    multiline: true,
  },
];

export default function FooterSettingsTab() {
  const [form, setForm] = useState<FooterSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/footer-settings")
      .then((r) => r.json())
      .then((data) => setForm({ ...DEFAULTS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof FooterSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status !== "idle") setStatus("idle");
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/footer-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const updated = await res.json();
      setForm({ ...DEFAULTS, ...updated });
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
    setForm(DEFAULTS);
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1A2744]">Footer Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Edit the contact details and description displayed in the public footer.
        </p>
      </div>

      <div className="space-y-4">
        {FIELDS.map((field, i) => {
          const Icon = field.icon;
          return (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
            >
              <label className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <Icon className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {field.label}
                </span>
              </label>
              <div className="px-4 py-3">
                {field.multiline ? (
                  <textarea
                    rows={3}
                    value={form[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status message */}
      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          Footer settings saved successfully.
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

      {/* Actions */}
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
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
