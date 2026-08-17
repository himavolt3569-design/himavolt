"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  PictureInPicture2,
  Gauge,
} from "lucide-react";
import { embedSrcFor, formatDuration, type TutorialVideoDTO } from "@/lib/tutorials";

/**
 * The tutorial player.
 *
 * Two rendering paths behind one surface:
 *  - UPLOAD -> a real <video> with fully custom chrome, so playback matches the
 *    HimaVolt theme rather than five different browser default skins.
 *  - EMBED  -> a click-to-load facade over the provider iframe. The iframe is
 *    only injected after an explicit play, which keeps YouTube/Vimeo from
 *    setting cookies or loading ~1MB of player JS on every page view.
 */

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

interface Props {
  video: TutorialVideoDTO;
  /** Fires once the viewer has watched enough to count as a view. */
  onCounted?: () => void;
  autoPlay?: boolean;
  className?: string;
}

export default function VideoPlayer({
  video,
  onCounted,
  autoPlay = false,
  className = "",
}: Props) {
  if (video.sourceType === "EMBED") {
    return (
      <EmbedPlayer
        video={video}
        onCounted={onCounted}
        autoPlay={autoPlay}
        className={className}
      />
    );
  }
  return (
    <FilePlayer
      video={video}
      onCounted={onCounted}
      autoPlay={autoPlay}
      className={className}
    />
  );
}

/* ── Embed facade ──────────────────────────────────────────────────────── */

function EmbedPlayer({ video, onCounted, autoPlay, className }: Props) {
  const src = embedSrcFor(video.provider, video.embedId);
  const [active, setActive] = useState(Boolean(autoPlay));

  useEffect(() => {
    if (active) onCounted?.();
  }, [active, onCounted]);

  if (!src) {
    return (
      <Shell className={className}>
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/70">
          This video link can no longer be played.
        </div>
      </Shell>
    );
  }

  if (!active) {
    return (
      <Shell className={className}>
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          aria-label={`Play ${video.title}`}
        >
          {video.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.posterUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#2c1a0e] via-[#5c4131] to-[#b25c1c]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
          <BigPlayBadge />
        </button>
      </Shell>
    );
  }

  return (
    <Shell className={className}>
      <iframe
        src={`${src}&autoplay=1`}
        title={video.title}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </Shell>
  );
}

/* ── Self-hosted player ────────────────────────────────────────────────── */

function FilePlayer({ video, onCounted, autoPlay, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counted = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [started, setStarted] = useState(Boolean(autoPlay));
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(video.durationSec ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Never hide the bar while paused — a hidden bar on a paused video reads
      // as a broken player.
      if (videoRef.current && !videoRef.current.paused) setChromeVisible(false);
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setStarted(true);
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(el.currentTime + delta, 0), el.duration || 0);
    showChrome();
  }, [showChrome]);

  const changeVolume = useCallback((next: number) => {
    const el = videoRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(next, 0), 1);
    el.volume = clamped;
    el.muted = clamped === 0;
    setVolume(clamped);
    setMuted(clamped === 0);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrap.requestFullscreen();
    } catch {
      /* denied by the browser — nothing useful to do */
    }
  }, []);

  const togglePip = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await el.requestPictureInPicture();
    } catch {
      /* unsupported or denied */
    }
  }, []);

  // Keyboard shortcuts, scoped to the player so they never hijack page typing.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const key = event.key.toLowerCase();
    const handled: Record<string, () => void> = {
      " ": togglePlay,
      k: togglePlay,
      arrowright: () => seekBy(5),
      arrowleft: () => seekBy(-5),
      arrowup: () => changeVolume(volume + 0.1),
      arrowdown: () => changeVolume(volume - 0.1),
      f: () => void toggleFullscreen(),
      m: () => changeVolume(muted ? 1 : 0),
    };
    const action = handled[key];
    if (action) {
      event.preventDefault();
      action();
      showChrome();
    }
  };

  const onTimeUpdate = () => {
    const el = videoRef.current;
    if (!el) return;
    setCurrent(el.currentTime);

    // Count a view at 5s, or a third of the way through a very short clip.
    if (!counted.current && el.duration) {
      const threshold = Math.min(5, el.duration / 3);
      if (el.currentTime >= threshold) {
        counted.current = true;
        onCounted?.();
      }
    }

    if (el.buffered.length > 0) {
      setBuffered(el.buffered.end(el.buffered.length - 1));
    }
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  const scrub = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    el.currentTime = Math.min(Math.max(ratio, 0), 1) * duration;
    showChrome();
  };

  return (
    <div
      ref={wrapRef}
      className={`group relative isolate aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-[var(--border)] shadow-[0_24px_70px_-30px_rgba(44,26,14,0.55)] ${className}`}
      onMouseMove={showChrome}
      onMouseLeave={() => playing && setChromeVisible(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Video player: ${video.title}`}
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.posterUrl ?? undefined}
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          showChrome();
        }}
        onPause={() => {
          setPlaying(false);
          setChromeVisible(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => {
          setPlaying(false);
          setChromeVisible(true);
        }}
      />

      {/* Poster overlay until first play, so the title reads before playback. */}
      {!started && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer"
          aria-label={`Play ${video.title}`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
          <BigPlayBadge />
          <div className="absolute inset-x-0 bottom-0 p-5 text-left sm:p-7">
            <p className="text-base font-bold text-white sm:text-xl">{video.title}</p>
            {formatDuration(video.durationSec) && (
              <p className="mt-1 text-xs font-medium text-white/70">
                {formatDuration(video.durationSec)}
              </p>
            )}
          </div>
        </button>
      )}

      {waiting && started && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-white/90" />
        </div>
      )}

      {/* Control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-300 sm:px-4 ${
          chromeVisible || !playing
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        } ${!started ? "pointer-events-none opacity-0" : ""}`}
      >
        {/* Scrubber */}
        <div
          className="group/bar relative mb-2.5 h-4 cursor-pointer"
          onClick={scrub}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={-1}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 bg-white/30"
              style={{ width: `${bufferedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-[var(--accent)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--accent)] opacity-0 shadow ring-2 ring-black/30 transition-opacity group-hover/bar:opacity-100"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-white sm:gap-2">
          <ControlButton onClick={togglePlay} label={playing ? "Pause" : "Play"}>
            {playing ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </ControlButton>

          <div className="group/vol flex items-center gap-1">
            <ControlButton
              onClick={() => changeVolume(muted || volume === 0 ? 1 : 0)}
              label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/vol:w-16 group-hover/vol:opacity-100 accent-[var(--accent)]"
            />
          </div>

          <span className="ml-0.5 select-none text-[11px] font-medium tabular-nums text-white/85 sm:text-xs">
            {formatDuration(current) ?? "0:00"}
            <span className="text-white/45"> / {formatDuration(duration) ?? "0:00"}</span>
          </span>

          <div className="flex-1" />

          <div className="relative">
            <ControlButton
              onClick={() => setSpeedOpen((v) => !v)}
              label="Playback speed"
              active={speed !== 1}
            >
              <Gauge className="h-4 w-4" />
            </ControlButton>
            {speedOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-24 overflow-hidden rounded-xl bg-black/90 py-1 ring-1 ring-white/15 backdrop-blur">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.playbackRate = s;
                      setSpeed(s);
                      setSpeedOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-white/10 ${
                      speed === s ? "text-[var(--accent)]" : "text-white/80"
                    }`}
                  >
                    {s === 1 ? "Normal" : `${s}×`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ControlButton onClick={() => void togglePip()} label="Picture in picture">
            <PictureInPicture2 className="h-4 w-4" />
          </ControlButton>

          <ControlButton
            onClick={() => void toggleFullscreen()}
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </ControlButton>
        </div>
      </div>
    </div>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────── */

function Shell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate aspect-video w-full overflow-hidden rounded-2xl bg-black ring-1 ring-[var(--border)] shadow-[0_24px_70px_-30px_rgba(44,26,14,0.55)] ${className}`}
    >
      {children}
    </div>
  );
}

function BigPlayBadge() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent)] shadow-[0_10px_40px_-8px_rgba(234,169,77,0.9)] transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20">
      <span className="absolute inset-0 animate-ping rounded-full bg-[var(--accent)] opacity-20" />
      <Play className="ml-1 h-7 w-7 fill-white text-white sm:h-8 sm:w-8" />
    </span>
  );
}

function ControlButton({
  children,
  onClick,
  label,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/15 active:scale-95 ${
        active ? "text-[var(--accent)]" : "text-white"
      }`}
    >
      {children}
    </button>
  );
}
