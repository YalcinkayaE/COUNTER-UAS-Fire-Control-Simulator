import {
  DEG,
  FACILITY_RADIUS,
  RADAR_AZ_ACCURACY_DEG,
  RADAR_AZ_FOV_DEG,
  RADAR_BORESIGHT_AZ_DEG,
  RADAR_DT,
  RADAR_EL_ACCURACY_DEG,
  RADAR_EL_MAX_DEG,
  RADAR_EL_MIN_DEG,
  RADAR_MAX_TRACKS,
  RADAR_POS,
} from "./constants";
import {
  azimuthFromNorth,
  elevationFromGround,
  hypot3,
  horizontalClosingFrom,
  horizontalRangeFrom,
  radialClosingSpeed,
  timeToBreach,
  type Vec3,
} from "./math";

export type RadarObject = {
  id: string;
  alive: boolean;
  position: Vec3;
  velocity: Vec3;
  kind?: "quad" | "fixedWing";
  hoverDive?: boolean;
};

/** One Echodyne-class track report: az/el/range plus cartesian velocity. */
export type RadarReport = {
  id: string;
  azimuth: number;
  elevation: number;
  range: number;
  velocity: Vec3;
  speed: number;
  rangeRate: number;
  seq: number;
  kind: "quad" | "fixedWing";
  hoverDive: boolean;
};

/**
 * Simulated Echodyne Guard-class AESA on the UGV. Samples truth kinematics
 * at 10 Hz and emits at most 20 simultaneous tracks from inside its staring
 * sector: 120° az (±60° around the north boresight) × 80° el. Reported
 * angles carry datasheet noise (±1° az, ±1.5° el). Not a fielded radar DSP.
 */
export class RadarSensor {
  readonly origin: Vec3 = { x: RADAR_POS.x, y: RADAR_POS.y, z: RADAR_POS.z };
  reports: RadarReport[] = [];
  seq = 0;
  private wait = 0;

  /** `jitter` returns a uniform sample in [0, 1); tests inject a fixed value. */
  constructor(private readonly jitter: () => number = Math.random) {}

  update(dt: number, objects: RadarObject[]): RadarReport[] | null {
    this.wait -= dt;
    if (this.wait > 0) return null;
    this.wait += RADAR_DT;
    return this.scan(objects);
  }

  scan(objects: RadarObject[]): RadarReport[] {
    this.seq += 1;
    const live = objects.filter((o) => o.alive && this.inFov(o));
    const kamikaze = live.filter((o) => o.hoverDive);
    const rest = live
      .filter((o) => !o.hoverDive)
      .map((o) => {
        const ttb = timeToBreach(
          horizontalRangeFrom(o.position, this.origin),
          horizontalClosingFrom(o.position, o.velocity, this.origin),
          FACILITY_RADIUS,
        );
        return { o, ttb };
      })
      .sort((a, b) => a.ttb - b.ttb)
      .slice(0, Math.max(0, RADAR_MAX_TRACKS - kamikaze.length))
      .map((row) => row.o);
    this.reports = [...kamikaze, ...rest].slice(0, RADAR_MAX_TRACKS).map((o) => this.reportOn(o));
    return this.reports;
  }

  /** Sector gate: 120° az around the boresight, 80° el above the horizon. */
  private inFov(o: RadarObject): boolean {
    const dx = o.position.x - this.origin.x;
    const dy = o.position.y - this.origin.y;
    const dz = o.position.z - this.origin.z;
    const elDeg = (elevationFromGround(dx, dy, dz) * 180) / Math.PI;
    if (elDeg < RADAR_EL_MIN_DEG || elDeg > RADAR_EL_MAX_DEG) return false;
    const az = azimuthFromNorth(dx, dz);
    const boresight = RADAR_BORESIGHT_AZ_DEG * DEG;
    const rel = Math.atan2(Math.sin(az - boresight), Math.cos(az - boresight));
    return Math.abs(rel) <= (RADAR_AZ_FOV_DEG / 2) * DEG;
  }

  /** Angular measurement error, uniform within the datasheet accuracy bounds. */
  private angleNoise(accuracyDeg: number): number {
    return (this.jitter() - 0.5) * 2 * accuracyDeg * DEG;
  }

  private reportOn(o: RadarObject): RadarReport {
    const dx = o.position.x - this.origin.x;
    const dy = o.position.y - this.origin.y;
    const dz = o.position.z - this.origin.z;
    const range = hypot3(dx, dy, dz);
    return {
      id: o.id,
      azimuth: azimuthFromNorth(dx, dz) + this.angleNoise(RADAR_AZ_ACCURACY_DEG),
      elevation: elevationFromGround(dx, dy, dz) + this.angleNoise(RADAR_EL_ACCURACY_DEG),
      range,
      velocity: { x: o.velocity.x, y: o.velocity.y, z: o.velocity.z },
      speed: hypot3(o.velocity.x, o.velocity.y, o.velocity.z),
      rangeRate: radialClosingSpeed(
        { x: dx, y: dy, z: dz },
        o.velocity,
      ),
      seq: this.seq,
      kind: o.kind ?? "quad",
      hoverDive: Boolean(o.hoverDive),
    };
  }
}
