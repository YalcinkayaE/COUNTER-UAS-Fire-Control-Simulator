/** Procedural Web Audio — unlocked on the first gesture. Gunfire follows the round rate. */

type Bus = { ctx: AudioContext; master: GainNode; sfx: GainNode; muted: boolean };

let bus: Bus | null = null;
let noiseBuf: AudioBuffer | null = null;

function getBus(): Bus | null {
  return bus;
}

function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const len = Math.floor(ctx.sampleRate * 0.08);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
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
    master.gain.value = 0.5;
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
  bus.master.gain.setTargetAtTime(muted ? 0 : 0.5, bus.ctx.currentTime, 0.02);
}

export function isMuted(): boolean {
  return bus?.muted ?? false;
}

/** One muzzle report — very short high crack only (TRRRT at cyclic rate). */
export function sfxFire(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const t = ctx.currentTime;
  const dur = 0.018;

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0, t);
  crackGain.gain.linearRampToValueAtTime(0.42, t + 0.0008);
  crackGain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  crackGain.connect(sfx);

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(3200, t);
  bp.Q.value = 1.2;
  bp.connect(crackGain);

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1500;
  hp.connect(bp);

  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuffer(ctx);
  crack.connect(hp);
  crack.start(t);
  crack.stop(t + dur + 0.005);
}

/** Kept as a no-op so callers can drop hit cues without gamey chirps. */
export function sfxHit(): void {}

/** Kill-zone BREACH cue — short mid ping, not a low whoosh (that was the hu-hu-hu). */
export function sfxBreach(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const t = ctx.currentTime;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.08);
  g.connect(sfx);

  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(660, t + 0.07);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  osc.connect(hp);
  hp.connect(g);
  osc.start(t);
  osc.stop(t + 0.09);
}

export function sfxPing(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
  g.connect(sfx);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 1400;
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.06);
}

export function sfxClick(): void {
  const b = getBus();
  if (!b) return;
  const { ctx, sfx } = b;
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.03);
  g.connect(sfx);
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 420;
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.035);
}

export function resumeIfNeeded(): void {
  if (bus && bus.ctx.state === "suspended") void bus.ctx.resume();
}
