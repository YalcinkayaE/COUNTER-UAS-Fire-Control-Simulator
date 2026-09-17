import { KILL_ZONE, PROJECTILE_SPEED, RADAR_POS } from "./constants";
import {
  azimuthFromNorth,
  elevationFromGround,
  hypot3,
  radialClosingSpeed,
  solveIntercept,
  sphericalToCartesian,
  timeToBreach,
  type InterceptSolution,
  type Vec3,
} from "./math";
import type { RadarReport } from "./radarSensor";

type FireMode = "AUTO" | "MANUAL";

export type TrackSnapshot = {
  id: string;
  kind: "quad" | "fixedWing";
  azimuth: number;
  elevation: number;
  range: number;
  speed: number;
  rangeRate: number;
  velocity: Vec3;
  position: Vec3;
  distance: number;
  radialVelocity: number;
  timeToBreach: number;
};

export type FireCall = {
  targetId: string;
  intercept: InterceptSolution;
  track: TrackSnapshot;
  autoEngage: boolean;
};

/**
 * Onboard edge computer: 10 Hz track file in, EDF TTB + quadratic intercept out.
 * AUTO publishes a fire call. MANUAL keeps the same solution but withholds engage.
 */
export class EdgeComputer {
  tracks: TrackSnapshot[] = [];
  fireCall: FireCall | null = null;
  maxRange = Number.POSITIVE_INFINITY;
  private mode: FireMode = "AUTO";
  private shooter: Vec3 = { x: 0, y: 14, z: 0 };

  setRelease(mode: FireMode, shooter: Vec3): void {
    this.mode = mode;
    this.shooter = shooter;
  }

  ingest(reports: RadarReport[], mode: FireMode, shooter: Vec3): FireCall | null {
    this.setRelease(mode, shooter);
    this.tracks = reports.map((r) => this.fromReport(r));
    this.tracks.sort((a, b) => a.timeToBreach - b.timeToBreach || a.range - b.range);
    return this.refreshCall(this.mode, this.shooter);
  }

  coast(dt: number): FireCall | null {
    for (const t of this.tracks) {
      t.position.x += t.velocity.x * dt;
      t.position.y += t.velocity.y * dt;
      t.position.z += t.velocity.z * dt;
      this.refreshDerived(t);
    }
    this.tracks.sort((a, b) => a.timeToBreach - b.timeToBreach || a.range - b.range);
    return this.refreshCall(this.mode, this.shooter);
  }

  getPriority(): TrackSnapshot | null {
    return this.tracks[0] ?? null;
  }

  private fromReport(r: RadarReport): TrackSnapshot {
    const position = sphericalToCartesian(r.azimuth, r.elevation, r.range, RADAR_POS);
    const track: TrackSnapshot = {
      id: r.id,
      kind: r.kind,
      azimuth: r.azimuth,
      elevation: r.elevation,
      range: r.range,
      speed: r.speed,
      rangeRate: r.rangeRate,
      velocity: { x: r.velocity.x, y: r.velocity.y, z: r.velocity.z },
      position,
      distance: 0,
      radialVelocity: 0,
      timeToBreach: Number.POSITIVE_INFINITY,
    };
    this.refreshDerived(track);
    return track;
  }

  private refreshDerived(t: TrackSnapshot): void {
    const dx = t.position.x - RADAR_POS.x;
    const dy = t.position.y - RADAR_POS.y;
    const dz = t.position.z - RADAR_POS.z;
    t.azimuth = azimuthFromNorth(dx, dz);
    t.elevation = elevationFromGround(dx, dy, dz);
    t.range = hypot3(dx, dy, dz);
    t.speed = hypot3(t.velocity.x, t.velocity.y, t.velocity.z);
    t.rangeRate = radialClosingSpeed({ x: dx, y: dy, z: dz }, t.velocity);
    t.distance = hypot3(t.position.x, t.position.y, t.position.z);
    t.radialVelocity = radialClosingSpeed(t.position, t.velocity);
    t.timeToBreach = timeToBreach(t.distance, t.radialVelocity, KILL_ZONE);
  }

  private refreshCall(mode: FireMode, shooter: Vec3): FireCall | null {
    let fallback: FireCall | null = null;
    for (const track of this.tracks) {
      const intercept = solveIntercept(shooter, PROJECTILE_SPEED, track.position, track.velocity);
      if (!intercept) continue;
      const dist = hypot3(
        intercept.x - shooter.x,
        intercept.y - shooter.y,
        intercept.z - shooter.z,
      );
      const inRange = dist <= this.maxRange;
      const call: FireCall = {
        targetId: track.id,
        intercept,
        track,
        autoEngage: mode === "AUTO" && inRange,
      };
      if (!fallback) fallback = call;
      if (inRange) {
        this.fireCall = call;
        return call;
      }
    }
    this.fireCall = fallback;
    return fallback;
  }
}
