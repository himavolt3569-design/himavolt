"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  FileText,
  Building2,
  Clock,
  Headset,
  Handshake,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import { uploadFile } from "@/lib/upload";
import {
  SiteSettings,
  SITE_SETTINGS_DEFAULTS,
} from "@/lib/site-settings";

type FieldKey = keyof SiteSettings;

/**
 * Upload or paste the hero photograph, with a live preview at roughly the shape
 * it renders on the landing page so an operator can see immediately whether the
 * subject survives the scrim.
 */
function HeroImageField({
  value,
  onChange,
  multi = false,
}: {
  value: string;
  onChange: (url: string) => void;
  /** List mode: uploads append to a newline separated set that crossfades. */
  multi?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const urls = multi
    ? value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : value
      ? [value]
      : [];

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadFile(file, "site");
      // Appending rather than replacing is the whole point of list mode: an
      // operator building a four slide set should not lose the first three.
      onChange(multi ? [...urls, url].slice(0, 4).join("\n") : url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
    setBusy(false);
  };

  const removeAt = (i: number) =>
    onChange(multi ? urls.filter((_, n) => n !== i).join("\n") : "");

  return (
    <div className="mb-3">
      {urls.length === 0 ? (
        <div className="mb-2 flex h-32 w-full items-center justify-center rounded-2xl bg-[var(--canvas-sub)] text-[12px] text-[var(--text-3)]">
          No photograph set, the built in backdrop will be used
        </div>
      ) : (
        <div
          className={`mb-2 grid gap-2 ${multi ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {urls.map((url, i) => (
            <div
              key={url + i}
              className={`relative overflow-hidden rounded-2xl bg-[var(--canvas-sub)] ${
                multi ? "h-24" : "h-32"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {/* Same scrim the live hero applies, so an operator can see
                  whether the subject survives it before saving. */}
              <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(23,20,18,.9)_0%,rgba(23,20,18,.75)_45%,rgba(23,20,18,.4)_100%)]" />
              {i === 0 && (
                <span className="absolute left-3 top-3 text-[13px] font-black text-white">
                  {multi ? "First slide" : "Find Nearby."}
                </span>
              )}
              <button
                onClick={() => removeAt(i)}
                className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[var(--accent-hover)]">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {busy
          ? "Uploading"
          : multi
            ? `Add photograph${urls.length ? ` (${urls.length} of 4)` : ""}`
            : "Upload photograph"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy || (multi && urls.length >= 4)}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>
      {err && <p className="mt-1 text-[11px] text-red-500">{err}</p>}
    </div>
  );
}

interface FieldDef {
  key: FieldKey;
  label: string;
  icon: typeof Phone;
  placeholder: string;
  hint?: string;
  multiline?: boolean;
  /** Renders an image uploader plus a URL box instead of a plain text input. */
  image?: boolean;
}

interface Section {
  title: string;
  description: string;
  fields: FieldDef[];
}

const SECTIONS: Section[] = [
  {
    title: "Landing Page Hero",
    description:
      "The first thing every visitor sees. Change the photograph and the headline here without needing a deploy.",
    fields: [
      {
        key: "heroImageUrl",
        label: "Background Photograph",
        icon: ImageIcon,
        placeholder: "https://…",
        hint: "Wide, well lit, and busy on the right. A dark scrim covers the left where the headline sits. Leave empty to use the built in gradient.",
        image: true,
      },
      {
        key: "heroTitle",
        label: "Headline",
        icon: FileText,
        placeholder: "Find Nearby.",
      },
      {
        key: "heroHighlight",
        label: "Headline, accent line",
        icon: FileText,
        placeholder: "Order Easily.",
        hint: "Shown on a second line in the brand colour.",
      },
      {
        key: "heroSubtitle",
        label: "Supporting Line",
        icon: FileText,
        placeholder: "Restaurants, hotels, fast food, drinks and more…",
        multiline: true,
      },
    ],
  },
  {
    title: "Stays Page Hero",
    description:
      "The hotels and stays landing page. Multiple photographs crossfade behind the headline.",
    fields: [
      {
        key: "staysHeroImages",
        label: "Background Photographs",
        icon: ImageIcon,
        placeholder: "https://...",
        hint: "One URL per line, up to four. Upload adds to the list. Leave empty to use the built in set.",
        image: true,
        multiline: true,
      },
      {
        key: "staysHeroTitle",
        label: "Headline",
        icon: FileText,
        placeholder: "The Himalayas are calling",
      },
      {
        key: "staysHeroSubtitle",
        label: "Supporting Line",
        icon: FileText,
        placeholder: "Luxury hotels, boutique resorts, and mountain retreats...",
        multiline: true,
      },
    ],
  },
  {
    title: "Brand",
    description: "The public name and tagline shown across the site.",
    fields: [
      {
        key: "businessName",
        label: "Business Name",
        icon: Building2,
        placeholder: "HimaVolt",
      },
      {
        key: "description",
        label: "Short Description",
        icon: FileText,
        placeholder: "Short tagline shown under the logo in the footer",
        multiline: true,
      },
    ],
  },
  {
    title: "Primary Contact",
    description:
      "Used in the footer and as the main details on the Contact page.",
    fields: [
      { key: "phone", label: "Phone", icon: Phone, placeholder: "+977 9801234567" },
      { key: "email", label: "Email", icon: Mail, placeholder: "hello@himavolt.com" },
      {
        key: "hours",
        label: "Opening Hours",
        icon: Clock,
        placeholder: "Sun to Fri, 9:00 AM to 6:00 PM",
      },
      {
        key: "address",
        label: "Address",
        icon: MapPin,
        placeholder: "Thamel, Kathmandu",
      },
      {
        key: "addressNote",
        label: "Address (second line)",
        icon: MapPin,
        placeholder: "Nepal, 44600",
      },
    ],
  },
  {
    title: "Contact Directory (optional)",
    description:
      "Extra lines shown in the Contact page directory. Leave blank to fall back to the primary phone / email.",
    fields: [
      {
        key: "supportPhone",
        label: "Customer Support Phone",
        icon: Headset,
        placeholder: "+977 9801234567",
        hint: "Falls back to the primary phone when empty.",
      },
      {
        key: "partnerPhone",
        label: "Restaurant Partners Phone",
        icon: Handshake,
        placeholder: "+977 9807654321",
        hint: "Falls back to the primary phone when empty.",
      },
      {
        key: "partnerEmail",
        label: "Partnerships Email",
        icon: Handshake,
        placeholder: "partners@himavolt.com",
        hint: "Falls back to the primary email when empty.",
      },
    ],
  },
];

export default function BusinessInfoTab() {
  const [form, setForm] = useState<SiteSettings>(SITE_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setForm({ ...SITE_SETTINGS_DEFAULTS, ...data });
        hydratedRef.current = true;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (key: FieldKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status !== "idle") setStatus("idle");
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const updated = await res.json();
      setForm({ ...SITE_SETTINGS_DEFAULTS, ...updated });
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
    setForm(SITE_SETTINGS_DEFAULTS);
    setStatus("idle");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
        <p className="text-sm text-[var(--text-2)]">
          These are <strong className="font-semibold text-[var(--text-1)]">HimaVolt&apos;s own</strong> public
          contact details. Editing them here updates the site footer, the Contact
          page, and every other place the platform shows its number, email, name
          or hours. Individual restaurants set their own contact info separately.
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-1)]">
                {section.title}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-3)]">
                {section.description}
              </p>
            </div>

            <div className="space-y-4">
              {section.fields.map((field, i) => {
                const Icon = field.icon;
                return (
                  <motion.div
                    key={field.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-sm"
                  >
                    <label className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-2.5">
                      <Icon className="h-3.5 w-3.5 text-[var(--accent)]" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
                        {field.label}
                      </span>
                    </label>
                    <div className="px-4 py-3">
                      {field.image && (
                        <HeroImageField
                          value={form[field.key]}
                          onChange={(v) => handleChange(field.key, v)}
                          multi={field.key === "staysHeroImages"}
                        />
                      )}
                      {field.multiline ? (
                        <textarea
                          rows={3}
                          value={form[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full resize-none bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[field.key]}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] focus:outline-none"
                        />
                      )}
                      {field.hint && (
                        <p className="mt-1 text-[11px] text-[var(--text-3)]">
                          {field.hint}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-center gap-2 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-2.5 text-sm text-[var(--accent-text)]"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          Business info saved. It&apos;s now live on the footer and Contact page.
        </motion.div>
      )}
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-500"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </motion.div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
          className="flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-medium text-[var(--text-3)] transition-all hover:text-[var(--text-1)] disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
