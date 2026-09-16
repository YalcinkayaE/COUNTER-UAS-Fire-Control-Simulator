/** Procedural Web Audio — unlocked on the first gesture. */

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
    master.gain.value = 0.7;
    sfx.gain.value = 0.85;
    sfx.connect(master);
    master.connect(ctx.destination);
    bus = { ctx, master, sfx, muted: false };
  }
  if (bus.ctx.state === "suspended") void bus.ctx.resume();
}

export function setMuted(muted: boolean): void {
  if (!bus) return;
  bus.muted = muted;
  bus.master.gain.setTargetAtTime(muted ? 0 : 0.7, bus.ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return bus?.muted ?? false;
}

function envGain(ctx: AudioContext, dest: AudioNode, peak: number, attack: number, release: number) {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(dest);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + attack + release);
  return { g, t };
}

export function sfxFire(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const { g, t } = envGain(ctx, sfx, 0.55, 0.004, 0.22);
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.24);

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf(ctx);
  const ng = ctx.createGain();
  ng.gain.value = 0.18;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  noise.connect(bp);
  bp.connect(ng);
  ng.connect(g);
  noise.start(t);
  noise.stop(t + 0.12);
}

export function sfxHit(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const { g, t } = envGain(ctx, sfx, 0.7, 0.003, 0.38);
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.4);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf(ctx);
  const ng = ctx.createGain();
  ng.gain.value = 0.35;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  noise.connect(lp);
  lp.connect(ng);
  ng.connect(g);
  noise.start(t);
  noise.stop(t + 0.32);
}

export function sfxBreach(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const { g, t } = envGain(ctx, sfx, 0.45, 0.01, 0.7);
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(620, t);
  osc.frequency.setValueAtTime(420, t + 0.12);
  osc.frequency.setValueAtTime(620, t + 0.24);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.55);
}

export function sfxPing(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const { g, t } = envGain(ctx, sfx, 0.12, 0.002, 0.18);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 1760;
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.16);
}

export function sfxClick(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const { g, t } = envGain(ctx, sfx, 0.15, 0.001, 0.06);
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 880;
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.05);
}

let _noise: AudioBuffer | null = null;
function noiseBuf(ctx: AudioContext): AudioBuffer {
  if (_noise) return _noise;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  _noise = buf;
  return buf;
}

export function resumeIfNeeded(): void {
  if (bus && bus.ctx.state === "suspended") void bus.ctx.resume();
}
