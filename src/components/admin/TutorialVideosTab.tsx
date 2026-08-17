"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Link2,
  Loader2,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Plus,
  FolderPlus,
  Film,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  Lock,
  Globe,
  X,
  Pencil,
} from "lucide-react";
import {
  COMPRESS_SUGGESTED_BYTES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  formatDuration,
  parseEmbedUrl,
  type TutorialCategoryDTO,
  type TutorialVideoDTO,
} from "@/lib/tutorials";
import TutorialEditModal from "./TutorialEditModal";
import {
  QUALITY_PRESETS,
  bitrateFor,
  compressVideo,
  estimateBytes,
  extractPoster,
  isCompressionSupported,
  probeVideo,
  targetDimensions,
  type QualityPresetId,
  type VideoProbe,
} from "@/lib/video-compress";

/**
 * Master-admin authoring surface for tutorial videos.
 *
 * The compression step is the reason this component is as involved as it is.
 * Vercel Hobby cannot transcode server-side (4.5MB body limit, 60s ceiling), so
 * anything over the bucket limit has to be re-encoded in the browser before it
 * is uploaded. The UI is deliberately explicit about what that costs: it shows
 * the projected size, the time it will take, and a preview of the result, and
 * it never silently degrades a file.
 */

type Mode = "upload" | "embed";

interface Draft {
  title: string;
  description: string;
  categoryId: string;
  audience: "PUBLIC" | "AUTHENTICATED";
  isFeatured: boolean;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  categoryId: "",
  audience: "PUBLIC",
  isFeatured: false,
};

export default function TutorialVideosTab() {
  const [categories, setCategories] = useState<TutorialCategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [mode, setMode] = useState<Mode>("upload");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [preset, setPreset] = useState<QualityPresetId>("720p");
  const [compressed, setCompressed] = useState<{
    blob: Blob;
    width: number;
    height: number;
    mimeType: string;
  } | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Embed state
  const [embedUrl, setEmbedUrl] = useState("");

  // Row being edited, if any.
  const [editing, setEditing] = useState<TutorialVideoDTO | null>(null);

  const canCompress = useMemo(() => isCompressionSupported(), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tutorials", { cache: "no-store" });
      if (res.status === 403) {
        setError("Only the master admin account can manage tutorial videos.");
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { categories: TutorialCategoryDTO[] };
      setCategories(data.categories);
      setDraft((d) => ({ ...d, categoryId: d.categoryId || data.categories[0]?.id || "" }));
    } catch {
      setError("Could not load tutorial videos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  /* ── Sections ────────────────────────────────────────────────────────── */

  const seedDefaults = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/tutorials/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });
      if (!res.ok) throw new Error();
      await load();
      flash("Default sections created.");
    } catch {
      setError("Could not create the default sections.");
    } finally {
      setBusy(false);
    }
  };

  const addCategory = async () => {
    const name = window.prompt("Name this section (e.g. “Using the POS”)");
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/tutorials/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error();
      await load();
      flash("Section added.");
    } catch {
      setError("Could not add that section.");
    } finally {
      setBusy(false);
    }
  };

  const removeCategory = async (category: TutorialCategoryDTO) => {
    if (category.videos.length > 0) {
      setError(
        `"${category.name}" still has ${category.videos.length} video${
          category.videos.length === 1 ? "" : "s"
        }. Move or delete them first.`,
      );
      return;
    }
    if (!window.confirm(`Delete the "${category.name}" section?`)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tutorials/categories/${category.id}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      // The route refuses a section that still holds videos (409). Surface its
      // message rather than a generic failure — it names the count.
      if (!res.ok) throw new Error(body.error || "Could not delete that section.");

      // The form may have been pointing at the section that just went.
      setDraft((d) => (d.categoryId === category.id ? { ...d, categoryId: "" } : d));
      await load();
      flash("Section deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that section.");
    } finally {
      setBusy(false);
    }
  };

  /* ── File selection & compression ────────────────────────────────────── */

  const onPickFile = async (picked: File | null) => {
    setError("");
    setCompressed(null);
    setProgress(0);
    setFile(picked);
    setProbe(null);
    if (!picked) return;

    try {
      const info = await probeVideo(picked);
      setProbe(info);
      // Default the preset to whatever the source already is, capped at 1080p.
      setPreset(info.height > 900 ? "1080p" : info.height > 600 ? "720p" : "480p");
      if (!draft.title) {
        setDraft((d) => ({
          ...d,
          title: picked.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120),
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that video.");
      setFile(null);
    }
  };

  /** Bytes that will actually be uploaded. */
  const outgoingBytes = compressed?.blob.size ?? file?.size ?? 0;
  const overLimit = outgoingBytes > MAX_UPLOAD_BYTES;
  const shouldSuggest = !compressed && (file?.size ?? 0) > COMPRESS_SUGGESTED_BYTES;

  const projection = useMemo(() => {
    if (!probe || !file) return null;
    const budget = Math.min(MAX_UPLOAD_BYTES * 0.9, file.size * 0.9);
    const bps = bitrateFor(probe.durationSec, budget);
    const dims = targetDimensions(
      probe.width,
      probe.height,
      QUALITY_PRESETS.find((p) => p.id === preset)!.maxHeight,
    );
    return {
      bytes: estimateBytes(probe.durationSec, bps),
      dims,
      budget,
    };
  }, [probe, file, preset]);

  const runCompression = async () => {
    if (!file || !projection) return;
    setCompressing(true);
    setError("");
    setProgress(0);
    try {
      const result = await compressVideo(file, {
        preset,
        targetBytes: projection.budget,
        onProgress: setProgress,
      });
      setCompressed({
        blob: result.blob,
        width: result.width,
        height: result.height,
        mimeType: result.mimeType,
      });
      flash(
        `Compressed ${formatBytes(file.size)} → ${formatBytes(result.blob.size)}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setCompressing(false);
    }
  };

  /* ── Publish ─────────────────────────────────────────────────────────── */

  /** Upload a blob through the signed-URL flow and return its public URL. */
  const uploadBlob = async (blob: Blob, filename: string, type: string) => {
    const signRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: filename,
        fileType: type,
        fileSize: blob.size,
        folder: "tutorials",
      }),
    });
    const signed = await signRes.json();
    if (!signRes.ok) throw new Error(signed.error || "Could not start the upload.");

    const put = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": type },
      body: blob,
    });
    if (!put.ok) throw new Error("The upload was rejected by storage.");

    return signed.publicUrl as string;
  };

  const publish = async () => {
    setError("");

    if (!draft.title.trim() || draft.title.trim().length < 2) {
      setError("Give the video a title.");
      return;
    }
    if (!draft.categoryId) {
      setError("Choose a section for this video.");
      return;
    }

    setBusy(true);
    try {
      let payload: Record<string, unknown>;

      if (mode === "embed") {
        const parsed = parseEmbedUrl(embedUrl);
        if (!parsed) {
          setError("Paste a YouTube or Vimeo link.");
          setBusy(false);
          return;
        }
        payload = {
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          sourceType: "EMBED",
          videoUrl: parsed.canonicalUrl,
          posterUrl: parsed.posterUrl,
        };
      } else {
        if (!file) {
          setError("Choose a video file first.");
          setBusy(false);
          return;
        }
        if (overLimit) {
          setError(
            `This file is ${formatBytes(outgoingBytes)}. Compress it below ${formatBytes(MAX_UPLOAD_BYTES)} before publishing.`,
          );
          setBusy(false);
          return;
        }

        const blob = compressed?.blob ?? file;
        const type = compressed?.mimeType ?? file.type;
        const ext = type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";

        setUploadPct(0);
        const videoUrl = await uploadBlob(blob, `tutorial.${ext}`, type);

        // Best-effort poster. A failure here is not worth blocking a publish.
        let posterUrl: string | null = null;
        try {
          const poster = await extractPoster(file);
          if (poster) posterUrl = await uploadBlob(poster, "poster.jpg", "image/jpeg");
        } catch {
          /* no poster */
        }
        setUploadPct(null);

        payload = {
          ...draft,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          sourceType: "UPLOAD",
          videoUrl,
          posterUrl,
          fileSize: blob.size,
          originalSize: file.size,
          mimeType: type,
          durationSec: probe ? Math.round(probe.durationSec) : null,
          width: compressed?.width ?? probe?.width ?? null,
          height: compressed?.height ?? probe?.height ?? null,
        };
      }

      const res = await fetch("/api/admin/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not publish the video.");

      resetForm();
      await load();
      flash("Video published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish the video.");
    } finally {
      setBusy(false);
      setUploadPct(null);
    }
  };

  const resetForm = () => {
    setDraft((d) => ({ ...EMPTY_DRAFT, categoryId: d.categoryId }));
    setFile(null);
    setProbe(null);
    setCompressed(null);
    setEmbedUrl("");
    setProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  };

  /* ── Row actions ─────────────────────────────────────────────────────── */

  const patchVideo = async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/tutorials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Could not update that video.");
    }
  };

  const removeVideo = async (video: TutorialVideoDTO) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/tutorials/${video.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await load();
      flash("Video deleted.");
    } catch {
      setError("Could not delete that video.");
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const totalVideos = categories.reduce((n, c) => n + c.videos.length, 0);

  return (
    <div className="space-y-6">
      {notice && (
        <Banner tone="ok" onDismiss={() => setNotice("")}>
          {notice}
        </Banner>
      )}
      {error && (
        <Banner tone="error" onDismiss={() => setError("")}>
          {error}
        </Banner>
      )}

      {categories.length === 0 ? (
        <div className="rounded-2xl bg-[var(--surface)] p-8 text-center ring-1 ring-[var(--border)]">
          <Film className="mx-auto mb-3 h-9 w-9 text-[var(--accent)]" />
          <h3 className="text-base font-bold text-[var(--text-1)]">
            Set up your video sections
          </h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--text-2)]">
            Sections group the walkthroughs on the demo page — sign in, adding
            dishes, using the POS, and so on.
          </p>
          <button
            type="button"
            onClick={seedDefaults}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            Create the six default sections
          </button>
        </div>
      ) : (
        <>
          {/* ── Composer ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
              <h3 className="text-sm font-bold text-[var(--text-1)]">Add a video</h3>
              <div className="flex rounded-lg bg-[var(--canvas-sub)] p-0.5">
                <ModeTab active={mode === "upload"} onClick={() => setMode("upload")} icon={Upload}>
                  Upload
                </ModeTab>
                <ModeTab active={mode === "embed"} onClick={() => setMode("embed")} icon={Link2}>
                  Link
                </ModeTab>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {mode === "upload" ? (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                    className="block w-full cursor-pointer rounded-xl border border-dashed border-[var(--border)] bg-[var(--canvas-sub)] p-4 text-sm text-[var(--text-2)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:border-[var(--accent)]"
                  />

                  {file && probe && (
                    <div className="rounded-xl bg-[var(--canvas-sub)] p-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[var(--text-2)]">
                        <span className="font-bold text-[var(--text-1)]">{file.name}</span>
                        <span>{formatBytes(file.size)}</span>
                        <span>{formatDuration(probe.durationSec)}</span>
                        <span>
                          {probe.width}×{probe.height}
                        </span>
                      </div>

                      {overLimit && !compressed && (
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-2.5 text-xs font-medium text-red-600">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          This is over the {formatBytes(MAX_UPLOAD_BYTES)} storage
                          limit. Compress it, or switch to the Link tab and host it
                          on YouTube instead.
                        </p>
                      )}

                      {shouldSuggest && !overLimit && (
                        <p className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--accent-muted)] p-2.5 text-xs font-medium text-[var(--accent-text)]">
                          <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          This will play, but compressing it first will make it
                          load noticeably faster on mobile data.
                        </p>
                      )}

                      {/* Compression controls */}
                      {!compressed && canCompress && (
                        <div className="mt-4 space-y-3">
                          <div className="grid gap-2 sm:grid-cols-3">
                            {QUALITY_PRESETS.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setPreset(p.id)}
                                className={`rounded-lg p-2.5 text-left text-xs transition-all ${
                                  preset === p.id
                                    ? "bg-[var(--accent)] text-white"
                                    : "bg-[var(--surface)] text-[var(--text-2)] ring-1 ring-[var(--border)] hover:ring-[var(--accent)]"
                                }`}
                              >
                                <span className="block font-bold">{p.label}</span>
                                <span className={`mt-0.5 block leading-snug ${preset === p.id ? "text-white/80" : "text-[var(--text-3)]"}`}>
                                  {p.blurb}
                                </span>
                              </button>
                            ))}
                          </div>

                          {projection && (
                            <p className="text-[11px] text-[var(--text-3)]">
                              Projected result: about{" "}
                              <span className="font-bold text-[var(--text-2)]">
                                {formatBytes(projection.bytes)}
                              </span>{" "}
                              at {projection.dims.width}×{projection.dims.height}.
                              Re-encoding runs in this browser tab and takes about{" "}
                              <span className="font-bold text-[var(--text-2)]">
                                {formatDuration(probe.durationSec)}
                              </span>{" "}
                              — roughly the length of the video. Keep this tab open.
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() => void runCompression()}
                            disabled={compressing}
                            className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-1)] px-4 py-2.5 text-sm font-bold text-[var(--canvas)] transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            {compressing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Compressing… {Math.round(progress * 100)}%
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4" />
                                Compress before upload
                              </>
                            )}
                          </button>

                          {compressing && (
                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]">
                              <div
                                className="h-full bg-[var(--accent)] transition-[width] duration-300"
                                style={{ width: `${progress * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {!canCompress && overLimit && (
                        <p className="mt-3 text-xs text-[var(--text-3)]">
                          This browser cannot re-encode video. Use Chrome or Edge,
                          or host the file on YouTube and paste the link instead.
                        </p>
                      )}

                      {compressed && (
                        <div className="mt-4 rounded-lg bg-green-500/10 p-3">
                          <p className="flex items-center gap-2 text-xs font-bold text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            {formatBytes(file.size)} → {formatBytes(compressed.blob.size)} (
                            {Math.round((1 - compressed.blob.size / file.size) * 100)}% smaller)
                          </p>
                          <video
                            src={URL.createObjectURL(compressed.blob)}
                            controls
                            className="mt-2.5 w-full max-w-sm rounded-lg bg-black"
                          />
                          <button
                            type="button"
                            onClick={() => setCompressed(null)}
                            className="mt-2 text-[11px] font-semibold text-[var(--text-3)] underline hover:text-[var(--text-2)]"
                          >
                            Not good enough — try another quality
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <input
                    type="url"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
                  />
                  <p className="mt-1.5 text-[11px] text-[var(--text-3)]">
                    YouTube or Vimeo. Best choice for anything long — they stream
                    adaptively, so viewers on slow connections still get a smooth
                    playback instead of buffering.
                  </p>
                  {embedUrl && !parseEmbedUrl(embedUrl) && (
                    <p className="mt-1.5 text-[11px] font-semibold text-red-600">
                      That does not look like a YouTube or Vimeo link.
                    </p>
                  )}
                </div>
              )}

              {/* Shared metadata */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title">
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Adding your first dish"
                    className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
                  />
                </Field>

                <Field label="Section">
                  <div className="flex gap-2">
                    <select
                      value={draft.categoryId}
                      onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
                      className="w-full rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void addCategory()}
                      title="Add a section"
                      className="shrink-0 rounded-xl bg-[var(--canvas-sub)] px-3 ring-1 ring-[var(--border)] transition-colors hover:ring-[var(--accent)]"
                    >
                      <Plus className="h-4 w-4 text-[var(--text-2)]" />
                    </button>
                  </div>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={2}
                  placeholder="What this video covers, in one or two sentences."
                  className="w-full resize-y rounded-xl bg-[var(--canvas-sub)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none ring-1 ring-[var(--border)] focus:ring-[var(--accent)]"
                />
              </Field>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-2)]">
                  <input
                    type="checkbox"
                    checked={draft.audience === "AUTHENTICATED"}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        audience: e.target.checked ? "AUTHENTICATED" : "PUBLIC",
                      })
                    }
                    className="h-4 w-4 rounded accent-[var(--accent)]"
                  />
                  Signed-in viewers only
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--text-2)]">
                  <input
                    type="checkbox"
                    checked={draft.isFeatured}
                    onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })}
                    className="h-4 w-4 rounded accent-[var(--accent)]"
                  />
                  Feature this — shown in the post-signup prompt
                </label>
              </div>

              <div className="flex items-center gap-3 border-t border-[var(--border-soft)] pt-4">
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={busy || compressing}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {uploadPct !== null ? "Uploading…" : "Publish video"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-[var(--text-3)] hover:text-[var(--text-2)]"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* ── Library ──────────────────────────────────────────────── */}
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              {totalVideos} video{totalVideos === 1 ? "" : "s"} across{" "}
              {categories.length} section{categories.length === 1 ? "" : "s"}
            </p>

            {categories.map((category) => (
              <div
                key={category.id}
                className="overflow-hidden rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
                  <h4 className="min-w-0 truncate text-sm font-bold text-[var(--text-1)]">
                    {category.name}
                  </h4>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[11px] font-medium text-[var(--text-3)]">
                      {category.videos.length}
                    </span>
                    <IconAction
                      label={
                        category.videos.length > 0
                          ? "Empty this section before deleting it"
                          : "Delete section"
                      }
                      danger
                      onClick={() => void removeCategory(category)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconAction>
                  </div>
                </div>

                {category.videos.length === 0 ? (
                  <p className="px-4 py-5 text-center text-xs text-[var(--text-3)]">
                    Nothing here yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border-soft)]">
                    {category.videos.map((video) => (
                      <li key={video.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-11 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--canvas-sub)]">
                          {video.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={video.posterUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Film className="h-4 w-4 text-[var(--text-3)]" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-1)]">
                            {video.title}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[var(--text-3)]">
                            <span>{video.sourceType === "EMBED" ? video.provider : "Uploaded"}</span>
                            {formatDuration(video.durationSec) && (
                              <span>{formatDuration(video.durationSec)}</span>
                            )}
                            {video.fileSize && <span>{formatBytes(video.fileSize)}</span>}
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {video.viewCount}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              {video.audience === "PUBLIC" ? (
                                <>
                                  <Globe className="h-3 w-3" /> Public
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" /> Members
                                </>
                              )}
                            </span>
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <IconAction label="Edit" onClick={() => setEditing(video)}>
                            <Pencil className="h-4 w-4" />
                          </IconAction>

                          <IconAction
                            label={video.isFeatured ? "Featured" : "Feature this video"}
                            active={video.isFeatured}
                            onClick={() =>
                              void patchVideo(video.id, { isFeatured: !video.isFeatured })
                            }
                          >
                            <Star className={`h-4 w-4 ${video.isFeatured ? "fill-current" : ""}`} />
                          </IconAction>

                          <IconAction
                            label={video.isActive ? "Visible — click to hide" : "Hidden — click to show"}
                            onClick={() => void patchVideo(video.id, { isActive: !video.isActive })}
                          >
                            {video.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-[var(--text-3)]" />
                            )}
                          </IconAction>

                          <IconAction label="Delete" danger onClick={() => void removeVideo(video)}>
                            <Trash2 className="h-4 w-4" />
                          </IconAction>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <TutorialEditModal
          video={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            setEditing(null);
            await load();
            flash(message);
          }}
        />
      )}
    </div>
  );
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-3)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Upload;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
        active
          ? "bg-[var(--surface)] text-[var(--text-1)] shadow-sm"
          : "text-[var(--text-3)] hover:text-[var(--text-2)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function IconAction({
  children,
  onClick,
  label,
  active = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors active:scale-95 ${
        danger
          ? "text-[var(--text-3)] hover:bg-red-500/10 hover:text-red-600"
          : active
            ? "text-[var(--accent)] hover:bg-[var(--accent-muted)]"
            : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)]"
      }`}
    >
      {children}
    </button>
  );
}

function Banner({
  tone,
  children,
  onDismiss,
}: {
  tone: "ok" | "error";
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl p-3.5 text-sm font-medium ${
        tone === "ok"
          ? "bg-green-500/10 text-green-700"
          : "bg-red-500/10 text-red-600"
      }`}
    >
      {tone === "ok" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{children}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        <X className="h-4 w-4 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}
