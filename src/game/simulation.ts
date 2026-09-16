import * as THREE from "three";
import {
  FIRE_COOLDOWN,
  FIXED_DT,
  HIGH_SCORE_KEY,
  HIT_RADIUS,
  MAX_IN_FLIGHT,
  MAX_WAVES,
  STARTING_LIVES,
} from "./constants";
import { dist3 } from "./math";
import { SwarmManager } from "./swarmManager";
import { DroneTarget } from "./droneTarget";
import { TurretController, type FireMode } from "./turretController";
import { resumeIfNeeded, setMuted, sfxBreach, sfxFire, sfxHit, sfxPing, unlockAudio } from "./audio";

export type Phase = "briefing" | "live" | "paused" | "defeat" | "wavehold";

export type TrackRow = {
  id: string;
  distance: number;
  timeToBreach: number;
  radialVelocity: number;
  speed: number;
  x: number;
  z: number;
  y: number;
  alive: boolean;
};

export type HudSnapshot = {
  phase: Phase;
  mode: FireMode;
  tracks: TrackRow[];
  targetId: string | null;
  intercept: { x: number; y: number; z: number; t: number } | null;
  aligned: boolean;
  cooldown: number;
  lives: number;
  score: number;
  highScore: number;
  wave: number;
  elapsed: number;
  intercepts: number;
  breaches: number;
  barrel: { x: number; y: number; z: number; yaw: number };
  leadScreen: { x: number; y: number; visible: boolean } | null;
  aimScreen: { x: number; y: number; visible: boolean } | null;
  message: string | null;
  muted: boolean;
  alive: number;
};

export type Projectile = {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  dest: THREE.Vector3;
  targetId: string;
  tof: number;
  alive: boolean;
};

export type Tracer = {
  id: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  age: number;
  life: number;
};

export type Burst = {
  id: number;
  position: THREE.Vector3;
  age: number;
  life: number;
  kind: "hit" | "breach";
};

export type InputState = {
  keys: Set<string>;
  ndcX: number;
  ndcY: number;
  pointerOver: boolean;
  pointerDown: boolean;
  fireEdge: boolean;
  modeEdge: boolean;
  pauseEdge: boolean;
};

const listeners = new Set<() => void>();
let hud: HudSnapshot = emptyHud();
const _prev = new THREE.Vector3();
const _lead = new THREE.Vector3();
const _aimPt = new THREE.Vector3();

export function subscribeHud(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getHud(): HudSnapshot {
  return hud;
}

function emit(): void {
  hud = buildHud(sim);
  for (const l of listeners) l();
}

export class Simulation {
  readonly swarm = new SwarmManager();
  readonly turret = new TurretController();
  readonly projectiles: Projectile[] = [];
  readonly tracers: Tracer[] = [];
  readonly bursts: Burst[] = [];
  readonly input: InputState = {
    keys: new Set(),
    ndcX: 0,
    ndcY: 0,
    pointerOver: false,
    pointerDown: false,
    fireEdge: false,
    modeEdge: false,
    pauseEdge: false,
  };
  phase: Phase = "briefing";
  lives = STARTING_LIVES;
  score = 0;
  highScore = readHigh();
  intercepts = 0;
  breaches = 0;
  elapsed = 0;
  wave = 1;
  message: string | null = null;
  muted = false;
  trauma = 0;
  hitstop = 0;
  pingTimer = 0;
  holdTimer = 0;
  shotsFired = 0;
  closestApproach = Infinity;
  camera: THREE.Camera | null = null;
  viewport = { w: 1, h: 1 };
  readonly mouseAim = new THREE.Vector3();
  hasMouseAim = false;
  reducedMotion = false;

  private acc = 0;
  private hudAcc = 0;
  private nextId = 1;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -70);

  start(): void {
    unlockAudio();
    this.resetRun();
    this.phase = "live";
    this.message = "WEAPONS FREE";
    emit();
  }

  resetRun(): void {
    this.lives = STARTING_LIVES;
    this.score = 0;
    this.intercepts = 0;
    this.breaches = 0;
    this.elapsed = 0;
    this.wave = 1;
    this.projectiles.length = 0;
    this.tracers.length = 0;
    this.bursts.length = 0;
    this.turret.cooldown = 0;
    this.turret.mode = "AUTO";
    this.swarm.spawnWave(1);
    this.trauma = 0;
    this.holdTimer = 0;
    this.acc = 0;
    this.shotsFired = 0;
    this.closestApproach = Infinity;
  }

  togglePause(): void {
    if (this.phase === "live") this.phase = "paused";
    else if (this.phase === "paused") this.phase = "live";
    emit();
  }

  setMode(mode: FireMode): void {
    this.turret.setMode(mode);
    emit();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    setMuted(this.muted);
    emit();
  }

  update(dt: number): void {
    const d = Math.min(dt, 0.1);
    this.pollEdges();

    if (this.phase === "briefing" || this.phase === "defeat") {
      this.decayFx(d);
      this.stepManualOnly(d);
      this.hudAcc += d;
      if (this.hudAcc >= 0.1) {
        this.hudAcc = 0;
        emit();
      }
      return;
    }

    if (this.phase === "paused") {
      this.hudAcc += d;
      if (this.hudAcc >= 0.1) {
        this.hudAcc = 0;
        emit();
      }
      return;
    }

    resumeIfNeeded();

    if (this.hitstop > 0) {
      this.hitstop -= d;
      this.decayFx(d);
      return;
    }

    this.acc += d;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 8) {
      this.fixedStep(FIXED_DT);
      this.acc -= FIXED_DT;
      steps += 1;
    }

    this.decayFx(d);
    this.hudAcc += d;
    if (this.hudAcc >= 0.05) {
      this.hudAcc = 0;
      emit();
    }
  }

  private stepManualOnly(dt: number): void {
    if (this.turret.mode !== "MANUAL") return;
    this.turret.update(dt, this.swarm, null, false, this.input.keys);
  }

  private pollEdges(): void {
    if (this.input.pauseEdge) {
      this.input.pauseEdge = false;
      if (this.phase === "live" || this.phase === "paused") this.togglePause();
    }
    if (this.input.modeEdge) {
      this.input.modeEdge = false;
      if (this.phase === "live" || this.phase === "briefing") {
        this.turret.toggleMode();
        emit();
      }
    }
  }

  private fixedStep(dt: number): void {
    if (this.phase === "wavehold") {
      this.holdTimer -= dt;
      this.updateTracers(dt);
      if (this.holdTimer <= 0) {
        this.wave = Math.min(MAX_WAVES, this.wave + 1);
        this.swarm.spawnWave(this.wave);
        this.phase = "live";
        this.message = `WAVE ${String(this.wave).padStart(2, "0")}`;
      }
      this.elapsed += dt;
      return;
    }

    this.elapsed += dt;
    this.swarm.update(dt);
    this.resolveMouseAim();

    const fireHeld =
      this.input.fireEdge ||
      this.input.keys.has("Space") ||
      (this.turret.mode === "MANUAL" && this.input.pointerDown);
    this.input.fireEdge = false;

    const engaged = new Set(
      this.projectiles.filter((p) => p.alive).map((p) => p.targetId),
    );
    const shot = this.turret.update(
      dt,
      this.swarm,
      this.hasMouseAim ? this.mouseAim : null,
      fireHeld,
      this.input.keys,
      engaged,
    );
    if (shot && this.projectiles.filter((p) => p.alive).length < MAX_IN_FLIGHT) {
      this.launch(shot.from, shot.to, shot.targetId, shot.intercept.t);
    }

    this.stepProjectiles(dt);
    this.updateTracers(dt);

    const leaks = this.swarm.collectBreaches();
    for (const d of leaks) {
      this.breaches += 1;
      this.lives -= 1;
      this.score = Math.max(0, this.score - 50);
      this.bursts.push({
        id: this.nextId++,
        position: d.position.clone(),
        age: 0,
        life: 0.9,
        kind: "breach",
      });
      this.addTrauma(0.55);
      if (!this.muted) sfxBreach();
      this.message = `${d.id} BREACHED KILL ZONE`;
    }

    if (this.lives <= 0) {
      this.phase = "defeat";
      this.message = "FACILITY COMPROMISED";
      this.commitHigh();
      emit();
      return;
    }

    if (this.swarm.aliveCount() === 0 && this.phase === "live") {
      this.phase = "wavehold";
      this.holdTimer = 2.2;
      this.message = this.wave >= MAX_WAVES ? "HOLDING PERIMETER" : "WAVE CLEAR";
      this.score += 250;
    }

    this.pingTimer -= dt;
    if (this.pingTimer <= 0) {
      this.pingTimer = 2.4;
      if (!this.muted && this.phase === "live") sfxPing();
    }
  }

  private launch(from: THREE.Vector3, to: THREE.Vector3, targetId: string, tof: number): void {
    const t = Math.max(tof, 1 / 60);
    const velocity = to.clone().sub(from).multiplyScalar(1 / t);
    this.projectiles.push({
      id: this.nextId++,
      position: from.clone(),
      velocity,
      dest: to.clone(),
      targetId,
      tof: t,
      alive: true,
    });
    this.tracers.push({
      id: this.nextId++,
      from: from.clone(),
      to: to.clone(),
      age: 0,
      life: 0.22,
    });
    this.shotsFired += 1;
    this.addTrauma(0.22);
    if (!this.muted) sfxFire();
  }

  private stepProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      _prev.copy(p.position);
      p.tof -= dt;
      if (p.tof <= 0) {
        p.position.copy(p.dest);
        this.detonate(p);
        continue;
      }
      p.position.addScaledVector(p.velocity, dt);
      this.proximityCheck(p, _prev);
    }
  }

  private proximityCheck(p: Projectile, prev: THREE.Vector3): void {
    for (const d of this.swarm.drones) {
      if (!d.alive) continue;
      const dist = distPointSegment(d.position, prev, p.position);
      if (dist <= HIT_RADIUS) {
        this.killDrone(d, p);
        break;
      }
    }
  }

  private detonate(p: Projectile): void {
    p.alive = false;
    let hit = false;
    for (const d of this.swarm.drones) {
      if (!d.alive) continue;
      const dist = dist3(d.position, p.dest);
      if (d.id === p.targetId) this.closestApproach = dist;
      if (dist <= HIT_RADIUS) {
        this.killDrone(d, p);
        hit = true;
        break;
      }
    }
    if (!hit) {
      this.bursts.push({
        id: this.nextId++,
        position: p.dest.clone(),
        age: 0,
        life: 0.35,
        kind: "hit",
      });
    }
  }

  private killDrone(d: DroneTarget, p: Projectile): void {
    d.alive = false;
    p.alive = false;
    this.intercepts += 1;
    const bonus = Math.max(10, 140 - d.distance * 0.04);
    const ttbBonus = Number.isFinite(d.timeToBreach)
      ? (25 - Math.min(25, d.timeToBreach)) * 4
      : 0;
    this.score += Math.round(bonus + ttbBonus);
    this.bursts.push({
      id: this.nextId++,
      position: d.position.clone(),
      age: 0,
      life: 0.7,
      kind: "hit",
    });
    this.addTrauma(0.4);
    this.hitstop = this.reducedMotion ? 0 : 0.045;
    if (!this.muted) sfxHit();
    this.message = `${d.id} KILL`;
    this.swarm.tickRadar();
    this.commitHigh();
  }

  private updateTracers(dt: number): void {
    for (const t of this.tracers) t.age += dt;
    for (const b of this.bursts) b.age += dt;
    this.prune();
  }

  private prune(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i]!.alive) this.projectiles.splice(i, 1);
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      if (this.tracers[i]!.age >= this.tracers[i]!.life) this.tracers.splice(i, 1);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      if (this.bursts[i]!.age >= this.bursts[i]!.life) this.bursts.splice(i, 1);
    }
  }

  private resolveMouseAim(): void {
    if (!this.camera || this.turret.mode !== "MANUAL" || !this.input.pointerOver) {
      this.hasMouseAim = false;
      return;
    }
    this.ndc.set(this.input.ndcX, this.input.ndcY);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.aimPlane, hit)) {
      this.mouseAim.copy(hit);
      this.hasMouseAim = true;
    } else {
      this.mouseAim.copy(this.ray.ray.origin).addScaledVector(this.ray.ray.direction, 800);
      this.hasMouseAim = true;
    }
  }

  private decayFx(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  addTrauma(v: number): void {
    if (this.reducedMotion) return;
    this.trauma = Math.min(1, this.trauma + v);
  }

  shakeOffset(): { x: number; y: number; z: number } {
    const s = this.trauma * this.trauma;
    if (s <= 0.0001) return { x: 0, y: 0, z: 0 };
    const t = this.elapsed * 29;
    return {
      x: (Math.sin(t * 1.7) + Math.sin(t * 3.1)) * 4.5 * s,
      y: (Math.sin(t * 2.3) + Math.cos(t * 1.1)) * 3.2 * s,
      z: (Math.cos(t * 1.9) + Math.sin(t * 2.7)) * 4.5 * s,
    };
  }

  project(v: THREE.Vector3): { x: number; y: number; visible: boolean } | null {
    if (!this.camera) return null;
    const p = v.clone().project(this.camera);
    const visible = p.z < 1 && p.z > -1 && Math.abs(p.x) <= 1.15 && Math.abs(p.y) <= 1.15;
    return {
      x: (p.x * 0.5 + 0.5) * this.viewport.w,
      y: (-p.y * 0.5 + 0.5) * this.viewport.h,
      visible,
    };
  }

  private commitHigh(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(this.highScore));
      } catch {
        /* ignore quota */
      }
    }
  }
}

function distPointSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const apz = p.z - a.z;
  const ab2 = abx * abx + aby * aby + abz * abz;
  const t = ab2 < 1e-8 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / ab2));
  return dist3(p, { x: a.x + abx * t, y: a.y + aby * t, z: a.z + abz * t });
}

function readHigh(): number {
  try {
    const v = localStorage.getItem(HIGH_SCORE_KEY);
    const n = v ? Number.parseInt(v, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function emptyHud(): HudSnapshot {
  return {
    phase: "briefing",
    mode: "AUTO",
    tracks: [],
    targetId: null,
    intercept: null,
    aligned: false,
    cooldown: 0,
    lives: STARTING_LIVES,
    score: 0,
    highScore: readHigh(),
    wave: 1,
    elapsed: 0,
    intercepts: 0,
    breaches: 0,
    barrel: { x: 0, y: 0, z: 1, yaw: 0 },
    leadScreen: null,
    aimScreen: null,
    message: null,
    muted: false,
    alive: 0,
  };
}

function buildHud(s: Simulation): HudSnapshot {
  const target = s.turret.target;
  const ic = s.turret.intercept;
  let leadScreen: HudSnapshot["leadScreen"] = null;
  if (ic) {
    _lead.set(ic.x, ic.y, ic.z);
    leadScreen = s.project(_lead);
  }
  const range = ic ? Math.hypot(ic.x, ic.y, ic.z) : 400;
  _aimPt.copy(s.turret.position).addScaledVector(s.turret.barrelDir, range);
  const aimScreen = s.project(_aimPt);

  return {
    phase: s.phase,
    mode: s.turret.mode,
    tracks: s.swarm.sorted.map((d) => ({
      id: d.id,
      distance: d.distance,
      timeToBreach: d.timeToBreach,
      radialVelocity: d.radialVelocity,
      speed: d.speed,
      x: d.position.x,
      y: d.position.y,
      z: d.position.z,
      alive: d.alive,
    })),
    targetId: target?.id ?? null,
    intercept: ic ? { x: ic.x, y: ic.y, z: ic.z, t: ic.t } : null,
    aligned: s.turret.aligned,
    cooldown: s.turret.cooldown / FIRE_COOLDOWN,
    lives: s.lives,
    score: s.score,
    highScore: s.highScore,
    wave: s.wave,
    elapsed: s.elapsed,
    intercepts: s.intercepts,
    breaches: s.breaches,
    barrel: {
      x: s.turret.barrelDir.x,
      y: s.turret.barrelDir.y,
      z: s.turret.barrelDir.z,
      yaw: s.turret.yaw,
    },
    leadScreen,
    aimScreen,
    message: s.message,
    muted: s.muted,
    alive: s.swarm.aliveCount(),
  };
}

let sim = new Simulation();

export function getSim(): Simulation {
  return sim;
}

export function resetSim(): Simulation {
  sim = new Simulation();
  emit();
  return sim;
}

export function bindControlsProbe(): void {
  window.__controlsTest = {
    getYaw: () => getSim().turret.yaw,
    getSpeed: () => {
      const s = getSim();
      return s.phase === "live" || s.phase === "briefing" ? 1 : 0;
    },
    setSteer: (v: number) => {
      const s = getSim();
      s.turret.mode = "MANUAL";
      s.turret.yaw += v * 0.35;
      s.turret.syncFromYawPitch();
    },
    setKeys: (codes: string[]) => {
      const s = getSim();
      s.input.keys.clear();
      for (const c of codes) s.input.keys.add(c);
      if (codes.includes("KeyA") || codes.includes("KeyD") || codes.includes("KeyW")) {
        s.turret.mode = "MANUAL";
      }
    },
  };
  window.__cuas = {
    getMode: () => getSim().turret.mode,
    setMode: (m: FireMode) => getSim().setMode(m),
    getAlive: () => getSim().swarm.aliveCount(),
    getScore: () => getSim().score,
    getSortedIds: () => getSim().swarm.sorted.map((d) => d.id),
    start: () => getSim().start(),
    getKills: () => getSim().intercepts,
    getAligned: () => getSim().turret.aligned,
    getLives: () => getSim().lives,
    getShots: () => getSim().shotsFired,
    getClosest: () => getSim().closestApproach,
    getInterceptT: () => getSim().turret.intercept?.t ?? -1,
    getProjTof: () => getSim().projectiles[0]?.tof ?? -1,
    getProjCount: () => getSim().projectiles.length,
  };
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
    __cuas?: {
      getMode: () => FireMode;
      setMode: (m: FireMode) => void;
      getAlive: () => number;
      getScore: () => number;
      getSortedIds: () => string[];
      start: () => void;
      getKills?: () => number;
      getAligned?: () => boolean;
      getLives?: () => number;
      getShots?: () => number;
      getClosest?: () => number;
      getInterceptT?: () => number;
      getProjTof?: () => number;
      getProjCount?: () => number;
    };
  }
}
