/**
 * Tiny WebAudio chimes — no audio assets, everything synthesized.
 * Used for the "booking confirmed" moment: a soft springy pluck that reads
 * as "done" without being loud.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function pluck(ac: AudioContext, master: GainNode, freq: number, at: number, peak = 0.2, decay = 0.5) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  // Slight upward pitch bend at attack — the "spring" feel.
  osc.frequency.setValueAtTime(freq * 0.92, at);
  osc.frequency.exponentialRampToValueAtTime(freq, at + 0.06);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(gain);
  gain.connect(master);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

/** Rising two-note pluck + soft low thump. ~0.6s, quiet. */
export function playBookingConfirmed() {
  try {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime + 0.02;
    const master = ac.createGain();
    master.gain.value = 0.85;
    master.connect(ac.destination);

    // Warm thump under the plucks.
    const thump = ac.createOscillator();
    const thumpGain = ac.createGain();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(160, t0);
    thump.frequency.exponentialRampToValueAtTime(90, t0 + 0.12);
    thumpGain.gain.setValueAtTime(0, t0);
    thumpGain.gain.linearRampToValueAtTime(0.16, t0 + 0.015);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(t0);
    thump.stop(t0 + 0.32);

    pluck(ac, master, 523.25, t0 + 0.02); // C5
    pluck(ac, master, 783.99, t0 + 0.11); // G5
    pluck(ac, master, 1046.5, t0 + 0.21, 0.14, 0.65); // C6 sparkle
  } catch {
    /* never block the booking flow on audio */
  }
}

/**
 * Three-note "ding-ding-dong" for a newly arrived booking — brighter and a
 * touch louder than the confirm chime so it's noticeable across the shop.
 */
export function playNewBookingAlert() {
  try {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime + 0.02;
    const master = ac.createGain();
    master.gain.value = 1;
    master.connect(ac.destination);
    pluck(ac, master, 880, t0, 0.24, 0.45); // A5
    pluck(ac, master, 1174.66, t0 + 0.14, 0.24, 0.45); // D6
    pluck(ac, master, 1760, t0 + 0.28, 0.2, 0.9); // A6 ring
    pluck(ac, master, 880, t0 + 0.28, 0.08, 0.9); // body under the ring
  } catch {
    /* audio is best-effort */
  }
}

let primed = false;
/**
 * iOS/WebViews only start an AudioContext from a user gesture. Call once at
 * app start: the first tap unlocks audio so realtime alerts can play later.
 */
export function primeAudioOnFirstGesture() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const unlock = () => {
    const ac = audio();
    if (ac) {
      // A silent one-sample buffer fully unlocks output on older iOS.
      const buf = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start(0);
    }
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("touchend", unlock, true);
    window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  window.addEventListener("touchend", unlock, true);
  window.addEventListener("keydown", unlock, true);
}
