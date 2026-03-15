type SoundType = "newMessage" | "newOrder" | "orderReady";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  return audioCtx;
}

function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("hh_sound_enabled") !== "false";
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number = 0.3,
) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(volume, startTime);
  // Fade out to avoid clicking
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

const SOUND_CONFIG: Record<
  SoundType,
  { frequencies: number[]; durations: number[] }
> = {
  // Short high-pitched beep
  newMessage: {
    frequencies: [800],
    durations: [0.1],
  },
  // Two-tone chime
  newOrder: {
    frequencies: [600, 800],
    durations: [0.15, 0.15],
  },
  // Pleasant three-note ascending chime (C5, E5, G5)
  orderReady: {
    frequencies: [523, 659, 784],
    durations: [0.12, 0.12, 0.12],
  },
};

export function playSound(type: SoundType): void {
  try {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const config = SOUND_CONFIG[type];
    let time = ctx.currentTime;

    for (let i = 0; i < config.frequencies.length; i++) {
      playTone(ctx, config.frequencies[i], time, config.durations[i], 0.3);
      time += config.durations[i];
    }
  } catch {
    // Ignore autoplay or other audio errors
  }
}

export function toggleSound(): boolean {
  if (typeof window === "undefined") return true;
  const current = localStorage.getItem("hh_sound_enabled") !== "false";
  const next = !current;
  localStorage.setItem("hh_sound_enabled", String(next));
  return next;
}

export function isSoundOn(): boolean {
  return isSoundEnabled();
}
