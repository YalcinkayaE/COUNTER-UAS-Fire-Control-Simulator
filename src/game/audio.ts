/** Procedural Web Audio — unlocked on the first gesture. Short console beeps only. */

type Bus = { ctx: AudioContext; master: GainNode; sfx: GainNode; muted: boolean };

let bus: Bus | null = null;

function getBus(): Bus | null {
  return bus;
}

export function unlockAudio(): void {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!bus) {
    const ctx = new AC({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    master.gain.value = 0.55;
    sfx.gain.value = 0.8;
    sfx.connect(master);
    master.connect(ctx.destination);
    bus = { ctx, master, sfx, muted: false };
  }
  if (bus.ctx.state === "suspended") void bus.ctx.resume();
}

export function setMuted(muted: boolean): void {
  if (!bus) return;
  bus.muted = muted;
  bus.master.gain.setTargetAtTime(muted ? 0 : 0.55, bus.ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return bus?.muted ?? false;
}

function beep(freq: number, duration = 0.05, peak = 0.2): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(sfx);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(g);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export function sfxFire(): void {
  beep(620, 0.028, 0.1);
}

export function sfxHit(): void {
  beep(1240, 0.045, 0.16);
}

export function sfxBreach(): void {
  beep(520, 0.07, 0.2);
}

export function sfxPing(): void {
  beep(1760, 0.04, 0.08);
}

export function sfxClick(): void {
  beep(880, 0.04, 0.12);
}

export function resumeIfNeeded(): void {
  if (bus && bus.ctx.state === "suspended") void bus.ctx.resume();
}
