import {
  DRONE_ALT_MAX,
  DRONE_ALT_MIN,
  DRONE_COUNT,
  DRONE_HEADING_OFFSET_DEG,
  DRONE_SPEED_MAX,
  DRONE_SPEED_MIN,
  KILL_ZONE,
  RADAR_DT,
} from "./constants";
import { DEG } from "./constants";
import { DroneTarget } from "./droneTarget";

/**
 * Unity analogue: SwarmManager.cs
 * Spawns 20 drones on a 1 000 m ring and maintains a 10 Hz EDF-sorted track list.
 */
export class SwarmManager {
  readonly drones: DroneTarget[] = [];
  /** Dynamically sorted by lowest Time-to-Breach (public, like the C# list). */
  sorted: DroneTarget[] = [];
  private radarWait = 0;
  private seq = 0;
  wave = 1;

  constructor() {
    for (let i = 0; i < DRONE_COUNT; i++) {
      this.drones.push(new DroneTarget(`T${String(i + 1).padStart(2, "0")}`));
    }
  }

  spawnWave(wave = 1): void {
    this.wave = wave;
    const speedBoost = Math.min(10, (wave - 1) * 2.2);
    const count = DRONE_COUNT;
    for (let i = 0; i < this.drones.length; i++) {
      const d = this.drones[i]!;
      if (i >= count) {
        d.alive = false;
        continue;
      }
      const angle = (i / count) * Math.PI * 2 + hash(wave * 17 + i) * 0.35;
      const alt = lerp(DRONE_ALT_MIN, DRONE_ALT_MAX, hash(wave * 31 + i * 3));
      const speed =
        lerp(DRONE_SPEED_MIN, DRONE_SPEED_MAX, hash(wave * 13 + i * 7)) + speedBoost;
      const offset =
        (hash(wave * 41 + i) * 2 - 1) * DRONE_HEADING_OFFSET_DEG * DEG;
      const phase = hash(i * 9 + wave) * Math.PI * 2;
      const freq = 0.28 + hash(i * 5 + wave * 3) * 0.35;
      d.spawn(angle, alt, speed, offset, phase, freq);
    }
    this.tickRadar();
  }

  /**
   * 10 Hz coroutine analogue. Call from the sim loop with frame dt;
   * internally accumulates until a radar frame is due.
   */
  update(dt: number): DroneTarget[] {
    for (const d of this.drones) d.tick(dt);
    this.radarWait -= dt;
    if (this.radarWait <= 0) {
      this.tickRadar();
      this.radarWait += RADAR_DT;
    }
    return this.sorted;
  }

  /** Recalculate TTB and sort earliest deadline first. */
  tickRadar(): DroneTarget[] {
    this.seq += 1;
    const live = this.drones.filter((d) => d.alive);
    for (const d of live) d.refreshTrack();
    live.sort((a, b) => a.timeToBreach - b.timeToBreach || a.distance - b.distance);
    this.sorted = live;
    return this.sorted;
  }

  getPriority(exclude: Set<string> = new Set()): DroneTarget | null {
    return this.sorted.find((d) => d.alive && !d.breached && !exclude.has(d.id)) ?? null;
  }

  getById(id: string): DroneTarget | undefined {
    return this.drones.find((d) => d.id === id);
  }

  aliveCount(): number {
    return this.drones.filter((d) => d.alive).length;
  }

  collectBreaches(): DroneTarget[] {
    const hit: DroneTarget[] = [];
    for (const d of this.drones) {
      if (!d.alive || d.breached) continue;
      if (d.distance <= KILL_ZONE) {
        d.breached = true;
        d.alive = false;
        hit.push(d);
      }
    }
    if (hit.length) this.tickRadar();
    return hit;
  }
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
