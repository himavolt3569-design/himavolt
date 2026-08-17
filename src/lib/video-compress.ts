/**
 * In-browser video compression.
 *
 * Why this exists at all: the app runs on Vercel Hobby, where a serverless
 * function takes a 4.5MB request body and dies at 60s — server-side transcoding
 * is not on the table. Uploads already go browser -> Supabase directly through a
 * signed URL, so the only place a large file can be shrunk is before it leaves
 * the machine.
 *
 * How it works: decode the source into a `<video>`, draw each frame onto a
 * canvas at the target resolution, capture that canvas as a MediaStream, and
 * re-encode it with `MediaRecorder` at a bitrate computed from the size budget.
 * Audio is taken from the source element's own captured stream and mixed in.
 *
 * Honest limits, surfaced in the UI rather than hidden:
 *  - This is a re-encode. It is not mathematically lossless. It targets
 *    *visually* lossless for screen-recorded content, which is what product
 *    tutorials are, and it will show its work (before/after, preview) so the
 *    admin can reject a bad result.
 *  - `MediaRecorder` runs against the wall clock, so compression takes roughly
 *    as long as the video is. Playing faster desynchronises the output
 *    timestamps, so we do not do it.
 *  - Requires `canvas.captureStream` + `MediaRecorder`. Feature-detected;
 *    callers fall back to "upload a smaller file, or paste a link".
 */

export interface VideoProbe {
  durationSec: number;
  width: number;
  height: number;
}

export type QualityPresetId = "1080p" | "720p" | "480p";

export interface QualityPreset {
  id: QualityPresetId;
  label: string;
  /** Longest edge of the output, in pixels. */
  maxHeight: number;
  blurb: string;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    id: "1080p",
    label: "1080p — Full HD",
    maxHeight: 1080,
    blurb: "Sharpest. Best for detailed screen recordings with small text.",
  },
  {
    id: "720p",
    label: "720p — HD",
    maxHeight: 720,
    blurb: "The sweet spot. Crisp on phones and laptops, roughly half the size.",
  },
  {
    id: "480p",
    label: "480p — Compact",
    maxHeight: 480,
    blurb: "Smallest file. Use when a long video refuses to fit.",
  },
];

export interface CompressOptions {
  preset: QualityPresetId;
  /** Size budget in bytes the encoder aims for. */
  targetBytes: number;
  onProgress?: (fraction: number) => void;
  /**
   * Optional in/out points, in seconds from the start of the source.
   *
   * Trimming happens during the same real-time pass as compression rather than
   * as a separate step: the encoder is already replaying the file through a
   * canvas, so honouring a start and end costs a seek and an early stop. It is
   * also why trimming *shortens* the encode — a 20s clip out of a 10min source
   * takes 20s, not 10min.
   */
  trimStart?: number;
  trimEnd?: number;
}

export interface CompressResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  durationSec: number;
  originalSize: number;
}

/** Codec preference, best compression first. Safari only offers MP4/H.264. */
const CODEC_CANDIDATES = [
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
  "video/mp4",
];

/** True when this browser can run `compressVideo` at all. */
export function isCompressionSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  const canvas = document.createElement("canvas");
  if (typeof canvas.captureStream !== "function") return false;
  return CODEC_CANDIDATES.some((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
}

function pickMimeType(): string | null {
  for (const type of CODEC_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      /* keep trying */
    }
  }
  return null;
}

/** Read duration and intrinsic dimensions without decoding the whole file. */
export function probeVideo(file: File): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const probe: VideoProbe = {
        durationSec: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      cleanup();
      resolve(probe);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read this video. Try MP4, WebM or MOV."));
    };

    video.src = url;
  });
}

/**
 * Scale `(width, height)` so the height fits `maxHeight`, preserving aspect
 * ratio. Never upscales. Dimensions are forced even — some encoders reject odd
 * numbers outright.
 */
export function targetDimensions(
  width: number,
  height: number,
  maxHeight: number,
): { width: number; height: number } {
  if (!width || !height) return { width: 1280, height: 720 };
  const scale = height > maxHeight ? maxHeight / height : 1;
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { width: even(width * scale), height: even(height * scale) };
}

/**
 * Bits per second that lands a video of `durationSec` near `targetBytes`.
 * Clamped so a very short clip is not handed an absurd bitrate and a very long
 * one does not fall to mush.
 */
export function bitrateFor(
  durationSec: number,
  targetBytes: number,
  audioBps = 96_000,
): number {
  if (!durationSec || durationSec <= 0) return 2_500_000;
  // 4% container/muxing overhead, measured empirically against WebM output.
  const budgetBits = targetBytes * 8 * 0.96;
  const videoBps = budgetBits / durationSec - audioBps;
  return Math.round(Math.min(Math.max(videoBps, 400_000), 12_000_000));
}

/** Rough output size for a given bitrate, used for the live UI estimate. */
export function estimateBytes(
  durationSec: number,
  videoBps: number,
  audioBps = 96_000,
): number {
  return Math.round(((videoBps + audioBps) * durationSec) / 8 / 0.96);
}

/**
 * `requestVideoFrameCallback` is typed as required in lib.dom but is absent on
 * older Safari, so it is read through this optional view and feature-checked.
 */
type MaybeFrameCallback = {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

/**
 * Resolve a trim window against a real duration.
 *
 * Everything is clamped rather than rejected: a stale out-point left over from
 * a longer video should quietly become "the end", not fail the encode.
 */
export function clipWindow(
  durationSec: number,
  trimStart?: number,
  trimEnd?: number,
): { start: number; end: number; duration: number } {
  const total = durationSec > 0 ? durationSec : 0;
  const start = Math.min(Math.max(trimStart ?? 0, 0), total);
  const rawEnd = trimEnd == null ? total : trimEnd;
  const end = Math.min(Math.max(rawEnd, start), total);
  const duration = end - start;

  // Below this a MediaRecorder pass produces an unplayable stub.
  if (duration < MIN_CLIP_SECONDS) {
    throw new Error(
      `A clip has to be at least ${MIN_CLIP_SECONDS} second long. Widen the trim.`,
    );
  }
  return { start, end, duration };
}

/** Shortest clip the encoder will produce. */
export const MIN_CLIP_SECONDS = 1;

/** Seek and wait for the frame at that position to be decoded and presented. */
function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    // A seek to an unbuffered region can silently never fire on some browsers;
    // proceeding with a slightly-off first frame beats hanging the encode.
    setTimeout(done, 3000);
    video.currentTime = seconds;
  });
}

/**
 * Re-encode `file` to fit `targetBytes` at the chosen preset.
 *
 * Runs for approximately the duration of the video. `onProgress` reports
 * playback position as a 0..1 fraction.
 */
export async function compressVideo(
  file: File,
  options: CompressOptions,
): Promise<CompressResult> {
  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error(
      "This browser cannot re-encode video. Upload a smaller file, or paste a YouTube/Vimeo link instead.",
    );
  }

  const probe = await probeVideo(file);
  if (!probe.durationSec) {
    throw new Error("This video has no readable duration, so it cannot be compressed.");
  }

  const preset =
    QUALITY_PRESETS.find((p) => p.id === options.preset) ?? QUALITY_PRESETS[1];
  const dims = targetDimensions(probe.width, probe.height, preset.maxHeight);

  // Clip window. Bitrate is budgeted against what is actually kept, so trimming
  // a long source down buys quality rather than just a smaller file.
  const clip = clipWindow(probe.durationSec, options.trimStart, options.trimEnd);
  const videoBps = bitrateFor(clip.duration, options.targetBytes);

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  // Without this the decoded frames are tainted for canvas reads in some
  // browsers even for blob: sources.
  video.crossOrigin = "anonymous";

  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not create a drawing surface for compression.");
  }

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not decode this video."));
  });

  // 30fps is plenty for screen capture and keeps the bitrate honest.
  const stream = canvas.captureStream(30);

  // Pull the audio track off the source element and mix it into the canvas
  // stream. Wrapped because captureStream on a media element is not universal;
  // a silent output beats a hard failure.
  try {
    const elementStream = (
      video as HTMLVideoElement & { captureStream?: () => MediaStream }
    ).captureStream?.();
    elementStream?.getAudioTracks().forEach((track) => stream.addTrack(track));
  } catch {
    /* proceed without audio */
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: videoBps,
    audioBitsPerSecond: 96_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("Compression failed while encoding."));
  });

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    try {
      recorder.stop();
    } catch {
      /* already stopping */
    }
    stream.getTracks().forEach((t) => t.stop());
  };

  const drawFrame = () => {
    if (stopped) return;
    ctx.drawImage(video, 0, 0, dims.width, dims.height);
    options.onProgress?.(
      Math.min(Math.max(video.currentTime - clip.start, 0) / clip.duration, 1),
    );

    // Reaching the out-point ends the recording exactly like reaching the end
    // of the file does.
    if (video.currentTime >= clip.end || video.ended || video.paused) {
      stop();
      return;
    }

    const rvfc = (video as HTMLVideoElement & MaybeFrameCallback)
      .requestVideoFrameCallback;
    if (typeof rvfc === "function") {
      rvfc.call(video, drawFrame);
    } else {
      requestAnimationFrame(drawFrame);
    }
  };

  video.onended = stop;

  // Seek to the in-point before recording starts, so the first captured frame
  // is the one the admin chose rather than frame zero of the source.
  if (clip.start > 0) {
    await seekTo(video, clip.start);
  }

  // 1s timeslice keeps memory bounded on long recordings.
  recorder.start(1000);
  await video.play();
  drawFrame();

  try {
    const blob = await finished;
    options.onProgress?.(1);
    return {
      blob,
      mimeType,
      width: dims.width,
      height: dims.height,
      durationSec: clip.duration,
      originalSize: file.size,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Grab a still frame as a JPEG, used as the video poster when the admin does
 * not supply one. Seeks to 1s (or the midpoint of a very short clip) to avoid
 * the black frame most recordings open on.
 */
export function extractPoster(file: File, atSeconds?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    const fail = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    video.onloadedmetadata = () => {
      // An explicit timestamp wins — it is how "use this frame as the cover"
      // works in the editor — but is clamped inside the file either way.
      video.currentTime =
        atSeconds != null
          ? Math.min(Math.max(atSeconds, 0), Math.max(video.duration - 0.05, 0))
          : Math.min(1, (video.duration || 2) / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return fail();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob);
        },
        "image/jpeg",
        0.82,
      );
    };

    video.onerror = fail;
  });
}
