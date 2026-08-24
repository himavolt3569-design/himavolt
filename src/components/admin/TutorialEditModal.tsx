"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Upload,
  Link2,
  Film,
  Scissors,
  Image as ImageIcon,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Star,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  formatDuration,
  parseEmbedUrl,
  type TutorialCategoryDTO,
  type TutorialVideoDTO,
} from "@/lib/tutorials";
import {
  MIN_CLIP_SECONDS,
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
 * Edit everything about a published tutorial video.
 *
 * Publishing and editing are deliberately separate components. Publishing is a
 * funnel — pick a file, get it under the size limit, fill the form, done. This
 * is the opposite shape: everything is already set, any one field may be the
 * only thing being changed, and the media itself is optional to touch. Folding
 * both into the authoring form produced a screen where half the controls were
 * inert half the time.
 *
 * Trimming is offered because it is nearly free here: the compressor already
 * replays the file in real time through a canvas, so an in/out point costs a
 * seek and an early stop. See `clipWindow` in `lib/video-compress.ts`.
 */

type ReplaceMode = "keep" | "upload" | "embed";

interface Props {
  video: TutorialVideoDTO;
  categories: TutorialCategoryDTO[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function TutorialEditModal({ video, categories, onClose, onSaved }: Props) {
  /* ── Text + flags ─────────────────────────────────────────────────────── */
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? "");
  const [categoryId, setCategoryId] = useState(video.categoryId);
  const [audience, setAudience] = useState(video.audience);
  const [isActive, setIsActive] = useState(video.isActive);
  const [isFeatured, setIsFeatured] = useState(video.isFeatured);
  const [sortOrder, setSortOrder] = useState(String(video.sortOrder));

  /* ── Media replacement ────────────────────────────────────────────────── */
  const [replace, setReplace] = useState<ReplaceMode>("keep");
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<VideoProbe | null>(null);
  const [preset, setPreset] = useState<QualityPresetId>("720p");
  const [embedUrl, setEmbedUrl] = useState("");

  // Trim window, in seconds against the newly picked file.
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [encoded, setEncoded] = useState<{
    blob: Blob;
    width: number;
    height: number;
    mimeType: string;
    durationSec: number;
  } | null>(null);
  const [encoding, setEncoding] = useState(false);
  const [progress, setProgress] = useState(0);

  const [posterFromFrame, setPosterFromFrame] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const canCompress = useMemo(() => isCompressionSupported(), []);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const posterPreviewUrl = useMemo(
    () => (posterFromFrame ? URL.createObjectURL(posterFromFrame) : null),
    [posterFromFrame],
  );
  useEffect(() => {
    return () => {
      if (posterPreviewUrl) URL.revokeObjectURL(posterPreviewUrl);
    };
  }, [posterPreviewUrl]);

  // Escape closes, unless something irreversible is mid-flight.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !encoding) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving, encoding]);

  /* ── File selection ───────────────────────────────────────────────────── */

  const onPickFile = async (picked: File | null) => {
    setError("");
    setEncoded(null);
    setProgress(0);
    setPosterFromFrame(null);
    setFile(picked);
    setProbe(null);
    if (!picked) return;

    try {
      const info = await probeVideo(picked);
      setProbe(info);
      setPreset(info.height > 900 ? "1080p" : info.height > 600 ? "720p" : "480p");
      setTrimStart(0);
      setTrimEnd(info.durationSec);
      setPlayhead(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that video.");
      setFile(null);
    }
  };

  const clipDuration = Math.max(trimEnd - trimStart, 0);
  const trimmed = probe ? clipDuration < probe.durationSec - 0.05 : false;

  const projection = useMemo(() => {
    if (!probe || !file || clipDuration <= 0) return null;
    // Budget against the kept portion, not the whole file.
    const proportion = probe.durationSec > 0 ? clipDuration / probe.durationSec : 1;
    const budget = Math.min(MAX_UPLOAD_BYTES * 0.9, file.size * proportion * 0.9);
    const bps = bitrateFor(clipDuration, budget);
    const dims = targetDimensions(
      probe.width,
      probe.height,
      QUALITY_PRESETS.find((p) => p.id === preset)!.maxHeight,
    );
    return { bytes: estimateBytes(clipDuration, bps), dims, budget };
  }, [probe, file, preset, clipDuration]);

  const runEncode = async () => {
    if (!file || !projection) return;
    if (clipDuration < MIN_CLIP_SECONDS) {
      setError(`Keep at least ${MIN_CLIP_SECONDS} second of video.`);
      return;
    }
    setEncoding(true);
    setError("");
    setProgress(0);
    try {
      const result = await compressVideo(file, {
        preset,
        targetBytes: projection.budget,
        onProgress: setProgress,
        trimStart,
        trimEnd,
      });
      setEncoded({
        blob: result.blob,
        width: result.width,
        height: result.height,
        mimeType: result.mimeType,
        durationSec: Math.round(result.durationSec),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that video.");
    } finally {
      setEncoding(false);
    }
  };

  /* ── Preview transport ────────────────────────────────────────────────── */

  const seekPreview = (seconds: number) => {
    const el = previewRef.current;
    if (!el) return;
    el.currentTime = seconds;
    setPlayhead(seconds);
  };

  const togglePlay = () => {
    const el = previewRef.current;
    if (!el) return;
    if (el.paused) {
      // Playing always previews the kept region, so the trim is audible as well
      // as visible.
      if (el.currentTime < trimStart || el.currentTime >= trimEnd) el.currentTime = trimStart;
      void el.play();
    } else {
      el.pause();
    }
  };

  const captureFrame = async () => {
    if (!file) return;
    try {
      const blob = await extractPoster(file, playhead);
      if (blob) setPosterFromFrame(blob);
      else setError("Could not grab that frame.");
    } catch {
      setError("Could not grab that frame.");
    }
  };

  /* ── Save ─────────────────────────────────────────────────────────────── */

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

  const save = async () => {
    setError("");

    if (title.trim().length < 2) {
      setError("Give the video a title.");
      return;
    }
    if (!categoryId) {
      setError("Choose a section.");
      return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      categoryId,
      audience,
      isActive,
      isFeatured,
      sortOrder: Number(sortOrder) || 0,
    };

    setSaving(true);
    try {
      if (replace === "embed") {
        const parsed = parseEmbedUrl(embedUrl);
        if (!parsed) {
          setError("Paste a YouTube or Vimeo link.");
          setSaving(false);
          return;
        }
        Object.assign(payload, {
          sourceType: "EMBED",
          videoUrl: parsed.canonicalUrl,
          posterUrl: parsed.posterUrl,
          provider: parsed.provider,
          embedId: parsed.embedId,
          // The old file's numbers describe a file this row no longer points at.
          fileSize: null,
          originalSize: null,
          mimeType: null,
          durationSec: null,
          width: null,
          height: null,
        });
      } else if (replace === "upload") {
        if (!file) {
          setError("Choose a video file, or switch back to keeping the current one.");
          setSaving(false);
          return;
        }
        const blob = encoded?.blob ?? file;
        if (blob.size > MAX_UPLOAD_BYTES) {
          setError(
            `That is ${formatBytes(blob.size)}. Process it below ${formatBytes(MAX_UPLOAD_BYTES)} first.`,
          );
          setSaving(false);
          return;
        }
        if (trimmed && !encoded) {
          setError("You set a trim but have not applied it yet — press Apply trim & compress.");
          setSaving(false);
          return;
        }

        const type = encoded?.mimeType ?? file.type;
        const ext = type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";
        const videoUrl = await uploadBlob(blob, `tutorial.${ext}`, type);

        let posterUrl: string | null = null;
        try {
          const poster = posterFromFrame ?? (await extractPoster(file, trimStart + 1));
          if (poster) posterUrl = await uploadBlob(poster, "poster.jpg", "image/jpeg");
        } catch {
          /* a missing poster is not worth failing the save over */
        }

        Object.assign(payload, {
          sourceType: "UPLOAD",
          videoUrl,
          posterUrl,
          provider: null,
          embedId: null,
          fileSize: blob.size,
          originalSize: file.size,
          mimeType: type,
          durationSec: encoded?.durationSec ?? (probe ? Math.round(probe.durationSec) : null),
          width: encoded?.width ?? probe?.width ?? null,
          height: encoded?.height ?? probe?.height ?? null,
        });
      } else if (posterFromFrame) {
        payload.posterUrl = await uploadBlob(posterFromFrame, "poster.jpg", "image/jpeg");
      }

      const res = await fetch(`/api/admin/tutorials/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not save those changes.");

      onSaved(replace === "keep" ? "Changes saved." : "Video replaced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save those changes.");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || encoding;

  /* ── Render ───────────────────────────────────────────────────────────── */

  // Portalled for the same reason as the other admin modals: the tab wrapper
  // has a Framer Motion transform, and `position: fixed` resolves against a
  // transformed ancestor rather than the viewport.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--canvas)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[var(--text-1)]">
                Edit video
              </h2>
              <p className="truncate text-xs text-[var(--text-3)]">{video.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="rounded-lg p-2 text-[var(--text-3)] transition hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)] disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[75vh] space-y-6 overflow-y-auto px-5 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── Details ─────────────────────────────────────────────── */}
            <section className="space-y-3">
              <Label>Details</Label>

              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className={inputClass}
                />
              </Field>

              <Field label="Section">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="What does this video show?"
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <Field label="Order">
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={`${inputClass} max-w-28`}
                />
              </Field>
            </section>

            {/* ── Visibility ──────────────────────────────────────────── */}
            <section className="space-y-2">
              <Label>Who can watch</Label>

              <Toggle
                on={audience === "AUTHENTICATED"}
                onChange={(on) => setAudience(on ? "AUTHENTICATED" : "PUBLIC")}
                icon={audience === "AUTHENTICATED" ? Lock : Globe}
                title="Signed-in viewers only"
                hint={
                  audience === "AUTHENTICATED"
                    ? "Hidden from logged-out visitors on /demo."
                    : "Anyone can watch this, including logged-out visitors."
                }
              />

              <Toggle
                on={isActive}
                onChange={setIsActive}
                icon={isActive ? Eye : EyeOff}
                title="Published"
                hint={isActive ? "Visible in the library." : "Hidden from everyone."}
              />

              <Toggle
                on={isFeatured}
                onChange={setIsFeatured}
                icon={Star}
                title="Featured"
                hint="Shown first. Featuring this un-features whatever holds it now."
              />
            </section>

            {/* ── Media ───────────────────────────────────────────────── */}
            <section className="space-y-3">
              <Label>Video</Label>

              <div className="flex flex-wrap gap-1.5">
                <ModeChip active={replace === "keep"} onClick={() => setReplace("keep")} icon={Film}>
                  Keep current
                </ModeChip>
                <ModeChip
                  active={replace === "upload"}
                  onClick={() => setReplace("upload")}
                  icon={Upload}
                >
                  Upload new
                </ModeChip>
                <ModeChip
                  active={replace === "embed"}
                  onClick={() => setReplace("embed")}
                  icon={Link2}
                >
                  Use a link
                </ModeChip>
              </div>

              {replace === "keep" && (
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] px-3 py-3">
                  <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--canvas)]">
                    {posterPreviewUrl || video.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={posterPreviewUrl ?? video.posterUrl!}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Film className="h-4 w-4 text-[var(--text-3)]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-xs text-[var(--text-3)]">
                    <p className="text-[var(--text-2)]">
                      {video.sourceType === "EMBED" ? `${video.provider} embed` : "Uploaded file"}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-2">
                      {formatDuration(video.durationSec) && (
                        <span>{formatDuration(video.durationSec)}</span>
                      )}
                      {video.fileSize && <span>{formatBytes(video.fileSize)}</span>}
                      {video.width && video.height && (
                        <span>
                          {video.width}×{video.height}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {replace === "embed" && (
                <Field label="YouTube or Vimeo link">
                  <input
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className={inputClass}
                  />
                </Field>
              )}

              {replace === "upload" && (
                <div className="space-y-3">
                  <input
                    ref={fileInput}
                    type="file"
                    accept={ACCEPTED_VIDEO_TYPES.join(",")}
                    onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-[var(--text-3)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />

                  {file && probe && previewUrl && (
                    <>
                      {/* Preview + scrubber */}
                      <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-black">
                        <video
                          ref={previewRef}
                          src={previewUrl}
                          className="max-h-64 w-full bg-black object-contain"
                          onTimeUpdate={(e) => {
                            const el = e.currentTarget;
                            setPlayhead(el.currentTime);
                            // Stop at the out-point so the preview shows the
                            // clip as it will actually be published.
                            if (el.currentTime >= trimEnd && !el.paused) el.pause();
                          }}
                          onPlay={() => setPlaying(true)}
                          onPause={() => setPlaying(false)}
                          playsInline
                        />
                      </div>

                      <div className="space-y-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-3.5 w-3.5 text-[var(--accent)]" />
                          <span className="text-xs font-semibold text-[var(--text-1)]">Trim</span>
                          <span className="ml-auto text-[11px] tabular-nums text-[var(--text-3)]">
                            {clipDuration.toFixed(1)}s kept of {probe.durationSec.toFixed(1)}s
                          </span>
                        </div>

                        <TrimSlider
                          label="Start"
                          value={trimStart}
                          max={probe.durationSec}
                          onChange={(v) => {
                            const next = Math.min(v, trimEnd - MIN_CLIP_SECONDS);
                            setTrimStart(Math.max(0, next));
                            seekPreview(Math.max(0, next));
                            setEncoded(null);
                          }}
                        />
                        <TrimSlider
                          label="End"
                          value={trimEnd}
                          max={probe.durationSec}
                          onChange={(v) => {
                            const next = Math.max(v, trimStart + MIN_CLIP_SECONDS);
                            setTrimEnd(Math.min(probe.durationSec, next));
                            seekPreview(Math.min(probe.durationSec, next));
                            setEncoded(null);
                          }}
                        />

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <SmallButton onClick={togglePlay} icon={playing ? Pause : Play}>
                            {playing ? "Pause" : "Play clip"}
                          </SmallButton>
                          <SmallButton
                            onClick={() => {
                              setTrimStart(Math.min(playhead, trimEnd - MIN_CLIP_SECONDS));
                              setEncoded(null);
                            }}
                            icon={Scissors}
                          >
                            Start here
                          </SmallButton>
                          <SmallButton
                            onClick={() => {
                              setTrimEnd(Math.max(playhead, trimStart + MIN_CLIP_SECONDS));
                              setEncoded(null);
                            }}
                            icon={Scissors}
                          >
                            End here
                          </SmallButton>
                          <SmallButton onClick={() => void captureFrame()} icon={ImageIcon}>
                            Use frame as cover
                          </SmallButton>
                        </div>
                      </div>

                      {/* Quality + encode */}
                      <div className="space-y-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {QUALITY_PRESETS.map((p) => (
                            <ModeChip
                              key={p.id}
                              active={preset === p.id}
                              onClick={() => {
                                setPreset(p.id);
                                setEncoded(null);
                              }}
                            >
                              {p.label}
                            </ModeChip>
                          ))}
                        </div>

                        <p className="text-[11px] text-[var(--text-3)]">
                          {formatBytes(file.size)} in
                          {projection && ` · about ${formatBytes(projection.bytes)} out`}
                          {projection && ` · ${projection.dims.width}×${projection.dims.height}`}
                          {` · takes about ${Math.ceil(clipDuration)}s`}
                        </p>

                        {!canCompress ? (
                          <p className="text-[11px] text-amber-600">
                            This browser cannot re-encode video, so trimming is unavailable. The
                            file will upload as-is, or paste a link instead.
                          </p>
                        ) : encoding ? (
                          <div className="space-y-1.5">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--canvas)]">
                              <div
                                className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                                style={{ width: `${Math.round(progress * 100)}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-[var(--text-3)]">
                              Processing… {Math.round(progress * 100)}% — this runs in real time,
                              keep the tab open.
                            </p>
                          </div>
                        ) : encoded ? (
                          <p className="text-[11px] text-emerald-600">
                            Ready — {formatBytes(encoded.blob.size)}, {encoded.durationSec}s,{" "}
                            {encoded.width}×{encoded.height}. Save to publish it.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void runEncode()}
                            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                          >
                            {trimmed ? "Apply trim & compress" : "Compress"}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm text-[var(--text-2)] transition hover:bg-[var(--canvas-sub)] disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/* ── Small pieces ───────────────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-lg border border-[var(--border-soft)] bg-[var(--canvas)] px-3 py-2 text-sm text-[var(--text-1)] outline-none transition focus:border-[var(--accent)]";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-3)]">
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-[var(--text-2)]">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  on,
  onChange,
  icon: Icon,
  title,
  hint,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--canvas-sub)] px-3 py-2.5 text-left transition hover:border-[var(--accent)]"
    >
      <Icon className={`h-4 w-4 shrink-0 ${on ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-[var(--text-1)]">{title}</span>
        <span className="block text-[11px] text-[var(--text-3)]">{hint}</span>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          on ? "bg-[var(--accent)]" : "bg-[var(--border-soft)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function ModeChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-[var(--accent)] text-white"
          : "bg-[var(--canvas-sub)] text-[var(--text-2)] hover:text-[var(--text-1)]"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function SmallButton({
  onClick,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] px-2 py-1 text-[11px] text-[var(--text-2)] transition hover:border-[var(--accent)] hover:text-[var(--text-1)]"
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

function TrimSlider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-[11px] text-[var(--text-3)]">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--border-soft)] accent-[var(--accent)]"
      />
      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-[var(--text-2)]">
        {value.toFixed(1)}s
      </span>
    </label>
  );
}
