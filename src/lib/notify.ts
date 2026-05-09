import { toast } from "sonner";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      audioCtx = new Ctx();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playNotificationSound() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const tones = [880, 1175];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.25);
    });
  } catch {
    /* ignore */
  }
}

type Opts = Parameters<typeof toast>[1];

export const notify = {
  success: (msg: string, opts?: Opts) => {
    playNotificationSound();
    return toast.success(msg, opts);
  },
  error: (msg: string, opts?: Opts) => {
    playNotificationSound();
    return toast.error(msg, opts);
  },
  warning: (msg: string, opts?: Opts) => {
    playNotificationSound();
    return toast.warning(msg, opts);
  },
  info: (msg: string, opts?: Opts) => {
    playNotificationSound();
    return toast(msg, opts);
  },
};

// Unlock audio on first user interaction (browser autoplay policy)
if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock);
}
