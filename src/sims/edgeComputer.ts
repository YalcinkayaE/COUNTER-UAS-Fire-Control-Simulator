import {
  COMMIT_HYSTERESIS_SEC,
  FACILITY_RADIUS,
  PROJECTILE_SPEED,
  RADAR_POS,
  TURRET_SLEW_RAD,
} from "./constants";
import {
  angleBetween,
  azimuthFromNorth,
  elevationFromGround,
  hypot3,
  horizontalClosingSpeed,
  horizontalRange,
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
  private barrelDir: Vec3 | null = null;
  private committedId: string | null = null;

  setRelease(mode: FireMode, shooter: Vec3, barrelDir?: Vec3): void {
    this.mode = mode;
    this.shooter = shooter;
    if (barrelDir) this.barrelDir = barrelDir;
  }

  resetCommitment(): void {
    this.committedId = null;
  }

  ingest(
    reports: RadarReport[],
    mode: FireMode,
    shooter: Vec3,
    barrelDir?: Vec3,
  ): FireCall | null {
    this.setRelease(mode, shooter, barrelDir);
    this.tracks = reports.map((r) => this.fromReport(r));
    this.tracks.sort((a, b) => a.timeToBreach - b.timeToBreach || a.range - b.range);
    return this.refreshCall(this.mode, this.shooter);
  }

  coast(dt: number, barrelDir?: Vec3): FireCall | null {
    if (barrelDir) this.barrelDir = barrelDir;
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
    t.timeToBreach = timeToBreach(
      horizontalRange(t.position),
      horizontalClosingSpeed(t.position, t.velocity),
      FACILITY_RADIUS,
    );
  }

  private refreshCall(mode: FireMode, shooter: Vec3): FireCall | null {
    type Candidate = {
      track: TrackSnapshot;
      intercept: InterceptSolution;
      inRange: boolean;
      feasible: boolean;
    };
    const cands: Candidate[] = [];
    for (const track of this.tracks) {
      const intercept = solveIntercept(shooter, PROJECTILE_SPEED, track.position, track.velocity);
      if (!intercept) continue;
      const dist = hypot3(
        intercept.x - shooter.x,
        intercept.y - shooter.y,
        intercept.z - shooter.z,
      );
      const inRange = dist <= this.maxRange;
      cands.push({
        track,
        intercept,
        inRange,
        feasible: this.isFeasible(track, intercept, shooter),
      });
    }

    const feasible = cands.filter((c) => c.feasible);
    const inRangeFeasible = feasible.filter((c) => c.inRange);
    const committed = this.committedId
      ? cands.find((c) => c.track.id === this.committedId)
      : undefined;

    let chosen: Candidate | undefined;
    if (committed?.feasible) {
      const challenger = feasible.find((c) => c.track.id !== committed.track.id);
      const switchForDeadline =
        challenger !== undefined &&
        committed.track.timeToBreach - challenger.track.timeToBreach > COMMIT_HYSTERESIS_SEC;
      chosen = switchForDeadline ? challenger : committed;
    } else {
      chosen = inRangeFeasible[0] ?? feasible[0] ?? cands[0];
    }

    if (!chosen) {
      this.committedId = null;
      this.fireCall = null;
      return null;
    }
    this.committedId = chosen.track.id;
    const call: FireCall = {
      targetId: chosen.track.id,
      intercept: chosen.intercept,
      track: chosen.track,
      autoEngage: mode === "AUTO" && chosen.inRange && chosen.feasible,
    };
    this.fireCall = call;
    return call;
  }

  /** True when the turret can slew and the round can arrive before the asset deadline. */
  private isFeasible(track: TrackSnapshot, intercept: InterceptSolution, shooter: Vec3): boolean {
    const ttb = track.timeToBreach;
    if (!Number.isFinite(ttb)) return false;
    if (ttb <= 0) return true;
    return this.slewTime(shooter, intercept) + intercept.t < ttb;
  }

  private slewTime(shooter: Vec3, aim: InterceptSolution): number {
    if (!this.barrelDir) return 0;
    const tx = aim.x - shooter.x;
    const ty = aim.y - shooter.y;
    const tz = aim.z - shooter.z;
    const len = hypot3(tx, ty, tz) || 1;
    const ang = angleBetween(
      this.barrelDir.x,
      this.barrelDir.y,
      this.barrelDir.z,
      tx / len,
      ty / len,
      tz / len,
    );
    return ang / TURRET_SLEW_RAD;
  }
}
