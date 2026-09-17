import * as THREE from "three";
import { DRONE_MANEUVER_FRAC, FACILITY_RADIUS, OUTER_RADIUS } from "./constants";
import {
  clamp,
  hypot3,
  horizontalClosingSpeed,
  horizontalRange,
  radialClosingSpeed,
  timeToBreach,
} from "./math";

const TWO_PI = Math.PI * 2;

export type ThreatClass = "quad" | "fixedWing";

export type SwarmProfile = {
  kind: ThreatClass;
  angle: number;
  range: number;
  altitude: number;
  cruiseSpeed: number;
  altFreq: number;
  altPhase: number;
  azFreq: number;
  azPhase: number;
  speedFreq: number;
  speedPhase: number;
};

/**
 * Kinematic UAV. Truth state sampled by the UGV radar; not a sensor track.
 * Slow path changes: altitude, azimuth, and speed each vary by up to 40%.
 */
export class DroneTarget {
  readonly id: string;
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly homeDir = new THREE.Vector3();
  kind: ThreatClass = "quad";
  cruiseSpeed = 20;
  speed = 20;
  baseAlt = 80;
  spawnAz = 0;
  /** Pool members start dead; spawnWave brings up only this wave's count. */
  alive = false;
  breached = false;
  distance = OUTER_RADIUS;
  radialVelocity = 0;
  timeToBreach = Number.POSITIVE_INFINITY;
  altFreq = 0.06;
  altPhase = 0;
  azFreq = 0.05;
  azPhase = 0;
  speedFreq = 0.08;
  speedPhase = 0;
  age = 0;
  rotor = 0;

  constructor(id: string) {
    this.id = id;
  }

  spawn(p: SwarmProfile, killZone: number): void {
    this.alive = true;
    this.breached = false;
    this.kind = p.kind;
    this.cruiseSpeed = p.cruiseSpeed;
    this.speed = p.cruiseSpeed;
    this.baseAlt = p.altitude;
    this.altFreq = p.altFreq;
    this.altPhase = p.altPhase;
    this.azFreq = p.azFreq;
    this.azPhase = p.azPhase;
    this.speedFreq = p.speedFreq;
    this.speedPhase = p.speedPhase;
    this.age = 0;
    this.position.set(Math.cos(p.angle) * p.range, p.altitude, Math.sin(p.angle) * p.range);
    this.spawnAz = Math.atan2(this.position.x, this.position.z);
    this.homeDir.set(-Math.cos(p.angle), 0, -Math.sin(p.angle)).normalize();
    this.velocity.copy(this.homeDir).multiplyScalar(this.speed);
    this.refreshTrack(killZone);
  }

  tick(dt: number, killZone: number): void {
    if (!this.alive) return;
    this.age += dt;
    const k = DRONE_MANEUVER_FRAC;
    this.speed = this.cruiseSpeed * (1 + k * Math.sin(this.age * this.speedFreq * TWO_PI + this.speedPhase));
    this.rotor += dt * (18 + this.speed * 0.4);

    const r = Math.hypot(this.position.x, this.position.z);
    const curAz = Math.atan2(this.position.x, this.position.z);
    const targetAz = this.spawnAz * (1 + k * Math.sin(this.age * this.azFreq * TWO_PI + this.azPhase));
    const maxDaz = (12 / Math.max(r, 40)) * dt;
    const newAz = curAz + clamp(targetAz - curAz, -maxDaz, maxDaz);
    const newR = Math.max(1, r - this.speed * dt);

    const targetY = this.baseAlt * (1 + k * Math.sin(this.age * this.altFreq * TWO_PI + this.altPhase));
    const nextY = clamp(
      this.position.y + clamp((targetY - this.position.y) * 0.55, -10, 10) * dt,
      this.baseAlt * (1 - k),
      this.baseAlt * (1 + k),
    );

    const invDt = dt > 1e-8 ? 1 / dt : 0;
    this.velocity.set(
      (newR * Math.sin(newAz) - this.position.x) * invDt,
      (nextY - this.position.y) * invDt,
      (newR * Math.cos(newAz) - this.position.z) * invDt,
    );
    this.position.set(newR * Math.sin(newAz), nextY, newR * Math.cos(newAz));
    this.refreshTrack(killZone);
  }

  refreshTrack(killZone: number): void {
    this.distance = hypot3(this.position.x, this.position.y, this.position.z);
    this.radialVelocity = radialClosingSpeed(this.position, this.velocity);
    this.timeToBreach = timeToBreach(
      horizontalRange(this.position),
      horizontalClosingSpeed(this.position, this.velocity),
      FACILITY_RADIUS,
    );
  }
}
