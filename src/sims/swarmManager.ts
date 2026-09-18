import {
  DEG,
  DEFAULT_EFFECTOR_ID,
  DETECT_RADIUS,
  DRONE_ALT_MAX,
  DRONE_ALT_MIN,
  DRONE_SPEED_MAX,
  DRONE_SPEED_MIN,
  EFFECTORS,
  FACILITY_RADIUS,
  FIXED_WING_ALT_MAX,
  FIXED_WING_ALT_MIN,
  FIXED_WING_AZ_MIN_DEG,
  FIXED_WING_AZ_SPAN_DEG,
  FIXED_WING_COUNT_MAX,
  FIXED_WING_COUNT_MIN,
  FIXED_WING_SPEED_MAX,
  FIXED_WING_SPEED_MIN,
  HOVER_AZ_DEG,
  HOVER_PER_WAVE,
  OUTER_RADIUS,
  QUAD_CORRIDOR_CENTER_MAX_DEG,
  QUAD_CORRIDOR_WIDTH_DEG,
  QUAD_COUNT_MAX,
  QUAD_COUNT_MIN,
} from "./constants";
import { lerp, type Vec3 } from "./math";
import { DroneTarget } from "./droneTarget";

const WORLD_ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Truth swarm. Radar samples these objects; EDF ranking lives on the edge computer.
 * The kill zone is the selected effector's range (envelope / BREACH alarm).
 * EDF deadlines are time to the 36 m asset cylinder, not this ring.
 * Wave size and raid axis are drawn from `rng` at the start of each wave.
 */
export class SwarmManager {
  readonly drones: DroneTarget[] = [];
  wave = 1;
  killZone: number = EFFECTORS[DEFAULT_EFFECTOR_ID].range;

  /** `rng` returns a uniform sample in [0, 1); tests inject a fixed value. */
  constructor(private readonly rng: () => number = Math.random) {
    for (let i = 0; i < QUAD_COUNT_MAX; i++) {
      this.drones.push(new DroneTarget(`T${String(i + 1).padStart(2, "0")}`));
    }
    for (let i = 0; i < FIXED_WING_COUNT_MAX; i++) {
      this.drones.push(new DroneTarget(`F${String(i + 1).padStart(2, "0")}`));
    }
    for (let i = 0; i < HOVER_PER_WAVE; i++) {
      this.drones.push(new DroneTarget(`H${String(i + 1).padStart(2, "0")}`));
    }
  }

  spawnWave(wave = 1, origin: Vec3 = WORLD_ORIGIN): void {
    this.wave = wave;
    const speedBoost = Math.min(10, (wave - 1) * 2.2);
    // Raid axis and size shift each wave, always inside the radar sector.
    const corridorCenter = (this.rng() * 2 - 1) * QUAD_CORRIDOR_CENTER_MAX_DEG;
    const quadCount =
      QUAD_COUNT_MIN + Math.floor(this.rng() * (QUAD_COUNT_MAX - QUAD_COUNT_MIN + 1));
    const fwCount =
      FIXED_WING_COUNT_MIN +
      Math.floor(this.rng() * (FIXED_WING_COUNT_MAX - FIXED_WING_COUNT_MIN + 1));
    for (let i = 0; i < QUAD_COUNT_MAX; i++) {
      const d = this.drones[i]!;
      if (i >= quadCount) {
        d.alive = false;
        continue;
      }
      const span = quadCount <= 1 ? 0 : i / (quadCount - 1);
      const offsetDeg = corridorCenter + (span - 0.5) * QUAD_CORRIDOR_WIDTH_DEG;
      d.spawn({
        kind: "quad",
        angle: (90 - offsetDeg) * DEG,
        range: OUTER_RADIUS,
        altitude: lerp(DRONE_ALT_MIN, DRONE_ALT_MAX, hash(wave * 31 + i * 3)),
        cruiseSpeed: lerp(DRONE_SPEED_MIN, DRONE_SPEED_MAX, hash(wave * 13 + i * 7)) + speedBoost,
        altFreq: 1 / (10 + hash(i * 11 + wave) * 12),
        altPhase: hash(i * 9 + wave) * Math.PI * 2,
        azFreq: 1 / (12 + hash(i * 17 + wave * 3) * 12),
        azPhase: hash(i * 19 + wave) * Math.PI * 2,
        speedFreq: 1 / (8 + hash(i * 23 + wave * 5) * 10),
        speedPhase: hash(i * 29 + wave * 7) * Math.PI * 2,
      }, this.killZone, origin);
    }
    for (let i = 0; i < FIXED_WING_COUNT_MAX; i++) {
      const d = this.drones[QUAD_COUNT_MAX + i]!;
      if (i >= fwCount) {
        d.alive = false;
        continue;
      }
      // Northeast ingress, azimuth drawn per wave: 8–34° east of north, +4° per airframe.
      const azDeg = FIXED_WING_AZ_MIN_DEG + this.rng() * FIXED_WING_AZ_SPAN_DEG + i * 4;
      d.spawn({
        kind: "fixedWing",
        angle: (90 - azDeg) * DEG,
        range: DETECT_RADIUS,
        altitude: lerp(FIXED_WING_ALT_MIN, FIXED_WING_ALT_MAX, hash(wave * 53 + i * 3)),
        cruiseSpeed:
          lerp(FIXED_WING_SPEED_MIN, FIXED_WING_SPEED_MAX, hash(wave * 59 + i * 7)) + speedBoost * 1.4,
        altFreq: 1 / (14 + hash(i * 41 + wave) * 10),
        altPhase: hash(i * 43 + wave) * Math.PI * 2,
        azFreq: 1 / (16 + hash(i * 47 + wave * 3) * 10),
        azPhase: hash(i * 51 + wave) * Math.PI * 2,
        speedFreq: 1 / (10 + hash(i * 57 + wave * 5) * 8),
        speedPhase: hash(i * 61 + wave * 7) * Math.PI * 2,
      }, this.killZone, origin);
    }
    const hoverBase = QUAD_COUNT_MAX + FIXED_WING_COUNT_MAX;
    for (let i = 0; i < HOVER_PER_WAVE; i++) {
      const d = this.drones[hoverBase + i]!;
      d.spawn({
        kind: "quad",
        hoverDive: true,
        angle: (90 - HOVER_AZ_DEG) * DEG,
        range: OUTER_RADIUS,
        altitude: lerp(DRONE_ALT_MIN, DRONE_ALT_MAX, hash(wave * 71 + i * 5)),
        cruiseSpeed: lerp(DRONE_SPEED_MIN, DRONE_SPEED_MAX, hash(wave * 73 + i * 11)) + speedBoost,
        altFreq: 1 / (10 + hash(i * 31 + wave) * 12),
        altPhase: hash(i * 37 + wave) * Math.PI * 2,
        azFreq: 1 / (12 + hash(i * 41 + wave * 3) * 12),
        azPhase: hash(i * 43 + wave) * Math.PI * 2,
        speedFreq: 1 / (8 + hash(i * 47 + wave * 5) * 10),
        speedPhase: hash(i * 53 + wave * 7) * Math.PI * 2,
      }, this.killZone, origin);
    }
  }

  update(dt: number, origin: Vec3 = WORLD_ORIGIN): void {
    for (const d of this.drones) d.tick(dt, this.killZone, origin);
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
      if (d.distance <= this.killZone) {
        d.breached = true;
        hit.push(d);
      }
    }
    return hit;
  }

  /** Horizontal overflight of the defended asset. Track is then gone. */
  collectImpacts(origin: Vec3 = WORLD_ORIGIN): DroneTarget[] {
    const hit: DroneTarget[] = [];
    for (const d of this.drones) {
      if (!d.alive) continue;
      const horiz = Math.hypot(d.position.x - origin.x, d.position.z - origin.z);
      if (horiz <= FACILITY_RADIUS) {
        d.alive = false;
        d.breached = true;
        hit.push(d);
      }
    }
    return hit;
  }
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}


