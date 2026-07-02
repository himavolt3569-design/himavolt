"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["footer-settings"],
    queryFn: () => fetch("/api/admin/footer-settings").then((r) => r.json()),
  });
  const [form, setForm] = useState<FooterSettings>(DEFAULTS);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current && settingsQuery.data) {
      setForm({ ...DEFAULTS, ...settingsQuery.data });
      hydratedRef.current = true;
    }
  }, [settingsQuery.data]);
  const loading = settingsQuery.isLoading;
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
      queryClient.setQueryData(["footer-settings"], updated);
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
        <p className="mt-1 text-sm text-gray-400 font-semibold">
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
              className="overflow-hidden rounded-3xl border border-blue-100 bg-[var(--canvas)] shadow-sm"
            >
              <label className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <Icon className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 font-semibold">
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

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-2.5 text-sm text-[var(--accent-text)]"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          Footer settings saved successfully.
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-500"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </motion.div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition-all hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="flex items-center gap-2 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500 font-medium transition-all hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
