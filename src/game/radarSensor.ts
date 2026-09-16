import { KILL_ZONE, RADAR_DT, RADAR_MAX_TRACKS, RADAR_POS } from "./constants";
import {
  azimuthFromNorth,
  elevationFromGround,
  hypot3,
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
};

/**
 * Simulated AESA on the UGV. Samples truth kinematics at 10 Hz and emits
 * at most 20 simultaneous tracks. Not a fielded radar DSP.
 */
export class RadarSensor {
  readonly origin: Vec3 = { x: RADAR_POS.x, y: RADAR_POS.y, z: RADAR_POS.z };
  reports: RadarReport[] = [];
  seq = 0;
  private wait = 0;

  update(dt: number, objects: RadarObject[]): RadarReport[] | null {
    this.wait -= dt;
    if (this.wait > 0) return null;
    this.wait += RADAR_DT;
    return this.scan(objects);
  }

  scan(objects: RadarObject[]): RadarReport[] {
    this.seq += 1;
    const live = objects.filter((o) => o.alive);
    const ranked = live
      .map((o) => {
        const ttb = timeToBreach(
          hypot3(o.position.x, o.position.y, o.position.z),
          radialClosingSpeed(o.position, o.velocity),
          KILL_ZONE,
        );
        return { o, ttb };
      })
      .sort((a, b) => a.ttb - b.ttb)
      .slice(0, RADAR_MAX_TRACKS);
    this.reports = ranked.map(({ o }) => this.reportOn(o));
    return this.reports;
  }

  private reportOn(o: RadarObject): RadarReport {
    const dx = o.position.x - this.origin.x;
    const dy = o.position.y - this.origin.y;
    const dz = o.position.z - this.origin.z;
    const range = hypot3(dx, dy, dz);
    return {
      id: o.id,
      azimuth: azimuthFromNorth(dx, dz),
      elevation: elevationFromGround(dx, dy, dz),
      range,
      velocity: { x: o.velocity.x, y: o.velocity.y, z: o.velocity.z },
      speed: hypot3(o.velocity.x, o.velocity.y, o.velocity.z),
      rangeRate: radialClosingSpeed(
        { x: dx, y: dy, z: dz },
        o.velocity,
      ),
      seq: this.seq,
      kind: o.kind ?? "quad",
    };
  }
}
