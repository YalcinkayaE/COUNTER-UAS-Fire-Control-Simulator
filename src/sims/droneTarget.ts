import * as THREE from "three";
import {
  DRONE_MANEUVER_FRAC,
  FACILITY_RADIUS,
  HOVER_CLIMB_MPS,
  HOVER_DIVE_MPS,
  HOVER_HOLD_SEC,
  HOVER_OVERHEAD_ALT_M,
  HOVER_STANDOFF_M,
  OUTER_RADIUS,
} from "./constants";
import {
  clamp,
  hypot3,
  horizontalClosingFrom,
  horizontalRangeFrom,
  timeToBreach,
  type Vec3,
} from "./math";

const WORLD_ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };

const TWO_PI = Math.PI * 2;

export type ThreatClass = "quad" | "fixedWing";
export type HoverPhase = "ingress" | "hover" | "climb" | "dive";

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
  hoverDive?: boolean;
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
  hoverDive = false;
  hoverPhase: HoverPhase = "ingress";
  hoverHold = 0;
  hoverLogged = false;
  diveLogged = false;

  constructor(id: string) {
    this.id = id;
  }

  spawn(p: SwarmProfile, killZone: number, origin: Vec3 = WORLD_ORIGIN): void {
    this.alive = true;
    this.breached = false;
    this.kind = p.kind;
    this.hoverDive = Boolean(p.hoverDive);
    this.hoverPhase = "ingress";
    this.hoverHold = 0;
    this.hoverLogged = false;
    this.diveLogged = false;
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
    this.position.set(
      origin.x + Math.cos(p.angle) * p.range,
      p.altitude,
      origin.z + Math.sin(p.angle) * p.range,
    );
    this.spawnAz = Math.atan2(this.position.x - origin.x, this.position.z - origin.z);
    this.homeDir.set(-Math.cos(p.angle), 0, -Math.sin(p.angle)).normalize();
    this.velocity.copy(this.homeDir).multiplyScalar(this.speed);
    this.refreshTrack(killZone, origin);
  }

  tick(dt: number, killZone: number, origin: Vec3 = WORLD_ORIGIN): void {
    if (!this.alive) return;
    this.age += dt;
    const k = DRONE_MANEUVER_FRAC;
    if (this.hoverDive && (this.hoverPhase === "hover" || this.hoverPhase === "climb")) {
      this.speed = this.hoverPhase === "climb" ? HOVER_CLIMB_MPS : 0;
    } else if (this.hoverDive && this.hoverPhase === "dive") {
      this.speed = HOVER_DIVE_MPS;
    } else {
      this.speed = this.cruiseSpeed * (1 + k * Math.sin(this.age * this.speedFreq * TWO_PI + this.speedPhase));
    }
    this.rotor += dt * (18 + this.speed * 0.4);

    const dx = this.position.x - origin.x;
    const dz = this.position.z - origin.z;
    const r = Math.hypot(dx, dz);
    const curAz = Math.atan2(dx, dz);
    const targetAz = this.spawnAz * (1 + k * Math.sin(this.age * this.azFreq * TWO_PI + this.azPhase));
    const maxDaz = (12 / Math.max(r, 40)) * dt;
    let newAz = curAz + clamp(targetAz - curAz, -maxDaz, maxDaz);
    let newR = Math.max(1, r - this.speed * dt);

    if (this.hoverDive) {
      if (this.hoverPhase === "ingress") {
        newR = Math.max(HOVER_STANDOFF_M, r - this.speed * dt);
        if (newR <= HOVER_STANDOFF_M + 0.5) {
          this.hoverPhase = "hover";
          this.hoverHold = 0;
          newR = HOVER_STANDOFF_M;
          newAz = curAz;
        }
      } else if (this.hoverPhase === "hover") {
        this.hoverHold += dt;
        newR = HOVER_STANDOFF_M;
        newAz = curAz;
        if (this.hoverHold >= HOVER_HOLD_SEC) this.hoverPhase = "climb";
      } else if (this.hoverPhase === "climb") {
        newR = HOVER_STANDOFF_M;
        newAz = curAz;
        if (this.position.y >= HOVER_OVERHEAD_ALT_M - 1) this.hoverPhase = "dive";
      } else {
        newR = Math.max(1, r - HOVER_DIVE_MPS * dt);
        newAz = curAz;
      }
    }

    let nextY: number;
    if (this.hoverDive && (this.hoverPhase === "climb" || this.hoverPhase === "dive")) {
      const dy = clamp(
        HOVER_OVERHEAD_ALT_M - this.position.y,
        -HOVER_CLIMB_MPS * dt,
        HOVER_CLIMB_MPS * dt,
      );
      nextY = this.position.y + dy;
    } else if (this.hoverDive && this.hoverPhase === "hover") {
      nextY = this.position.y;
    } else {
      const targetY = this.baseAlt * (1 + k * Math.sin(this.age * this.altFreq * TWO_PI + this.altPhase));
      nextY = clamp(
        this.position.y + clamp((targetY - this.position.y) * 0.55, -10, 10) * dt,
        this.baseAlt * (1 - k),
        this.baseAlt * (1 + k),
      );
    }

    const nx = origin.x + newR * Math.sin(newAz);
    const nz = origin.z + newR * Math.cos(newAz);
    const invDt = dt > 1e-8 ? 1 / dt : 0;
    this.velocity.set((nx - this.position.x) * invDt, (nextY - this.position.y) * invDt, (nz - this.position.z) * invDt);
    this.position.set(nx, nextY, nz);
    if (this.hoverDive && this.hoverPhase === "hover") {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
    this.refreshTrack(killZone, origin);
  }

  refreshTrack(killZone: number, origin: Vec3 = WORLD_ORIGIN): void {
    const dx = this.position.x - origin.x;
    const dy = this.position.y - origin.y;
    const dz = this.position.z - origin.z;
    this.distance = hypot3(dx, dy, dz);
    this.radialVelocity = horizontalClosingFrom(this.position, this.velocity, origin);
    this.timeToBreach = timeToBreach(
      horizontalRangeFrom(this.position, origin),
      this.radialVelocity,
      FACILITY_RADIUS,
    );
  }
}
