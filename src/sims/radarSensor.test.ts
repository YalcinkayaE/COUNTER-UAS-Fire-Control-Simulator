import { describe, expect, test } from "vitest";
import { DEG, FIXED_DT, RADAR_HZ, RADAR_MAX_TRACKS, RADAR_POS } from "./constants";
import { azimuthFromNorth, elevationFromGround, hypot3 } from "./math";
import { RadarSensor } from "./radarSensor";

/** Zero angular noise for deterministic reconstruction assertions. */
const noNoise = () => 0.5;

function truth(id: string, x: number, y: number, z: number, vx = 0, vy = 0, vz = 0) {
  return {
    id,
    alive: true,
    kind: "quad" as "quad" | "fixedWing",
    position: { x, y, z },
    velocity: { x: vx, y: vy, z: vz },
  };
}

describe("RadarSensor", () => {
  test("publishes azimuth, elevation, range, and velocity per live object", () => {
    const radar = new RadarSensor(noNoise);
    const t = truth("T01", 300, RADAR_POS.y + 80, 400, -10, 1, -20);
    const reports = radar.scan([t]);
    expect(reports).toHaveLength(1);
    const r = reports[0]!;
    expect(r.id).toBe("T01");
    const dx = t.position.x - RADAR_POS.x;
    const dy = t.position.y - RADAR_POS.y;
    const dz = t.position.z - RADAR_POS.z;
    expect(r.range).toBeCloseTo(hypot3(dx, dy, dz), 8);
    expect(r.azimuth).toBeCloseTo(azimuthFromNorth(dx, dz), 8);
    expect(r.elevation).toBeCloseTo(elevationFromGround(dx, dy, dz), 8);
    expect(r.velocity.x).toBeCloseTo(-10, 8);
    expect(r.velocity.y).toBeCloseTo(1, 8);
    expect(r.velocity.z).toBeCloseTo(-20, 8);
    expect(r.speed).toBeCloseTo(hypot3(-10, 1, -20), 8);
  });

  test("drops dead objects and caps simultaneous tracks at 20", () => {
    const radar = new RadarSensor(noNoise);
    const many = Array.from({ length: 25 }, (_, i) =>
      truth(`T${i}`, 100 + i * 10, 60, 800 - i * 5),
    );
    many[0]!.alive = false;
    const reports = radar.scan(many);
    expect(reports).toHaveLength(RADAR_MAX_TRACKS);
    expect(reports.every((r) => r.id !== "T0")).toBe(true);
    expect(reports).toHaveLength(20);
  });

  test("keeps a faster far track over a slower near one when TTB is earlier", () => {
    const radar = new RadarSensor(noNoise);
    const slowNear = truth("T-SLOW", 0, 50, 900, 0, 0, -18);
    // 2 km out at 30° azimuth (inside the sector), closing fast along its radius.
    const fastFar = truth("F-FAST", 1000, 80, 1732, -42.5, 0, -75);
    fastFar.kind = "fixedWing";
    const extras = Array.from({ length: 20 }, (_, i) =>
      truth(`T${i + 1}`, 40, 50, 1000 + i, 0, 0, -15),
    );
    const reports = radar.scan([slowNear, fastFar, ...extras]);
    expect(reports.some((r) => r.id === "F-FAST")).toBe(true);
    const ids = reports.map((r) => r.id);
    expect(ids.indexOf("F-FAST")).toBeLessThan(ids.indexOf("T-SLOW"));
  });

  test("emits a new scan 10 times per second", () => {
    const radar = new RadarSensor(noNoise);
    const t = truth("T01", 0, 80, 900);
    let scans = 0;
    for (let i = 0; i < 60; i++) {
      if (radar.update(FIXED_DT, [t])) scans += 1;
    }
    expect(RADAR_HZ).toBe(10);
    expect(scans).toBe(10);
  });

  test("angular accuracy stays within ±1° az and ±1.5° el", () => {
    const extremes = [0, 0.999999];
    let i = 0;
    const radar = new RadarSensor(() => extremes[i++ % 2]!);
    const t = truth("T01", 300, RADAR_POS.y + 80, 400, -10, 1, -20);
    const r = radar.scan([t])[0]!;
    const dx = t.position.x - RADAR_POS.x;
    const dy = t.position.y - RADAR_POS.y;
    const dz = t.position.z - RADAR_POS.z;
    const azErr = Math.abs(r.azimuth - azimuthFromNorth(dx, dz)) / DEG;
    const elErr = Math.abs(r.elevation - elevationFromGround(dx, dy, dz)) / DEG;
    expect(azErr).toBeGreaterThan(0.99);
    expect(azErr).toBeLessThanOrEqual(1 + 1e-9);
    expect(elErr).toBeGreaterThan(1.49);
    expect(elErr).toBeLessThanOrEqual(1.5 + 1e-9);
  });

  test("drops tracks outside the 80° elevation window", () => {
    const radar = new RadarSensor(noNoise);
    const overhead = truth("T-OVER", 5, 500, 5);
    const low = truth("T-LOW", 0, 80, 900);
    const reports = radar.scan([overhead, low]);
    expect(reports.map((r) => r.id)).toEqual(["T-LOW"]);
  });

  test("drops tracks outside the 120° azimuth sector", () => {
    const radar = new RadarSensor(noNoise);
    const east = truth("T-EAST", 900, 80, 0); // az 90°, outside ±60° of north
    const sector = truth("T-SECT", 450, 80, 779); // az ≈ 30°, inside
    const reports = radar.scan([east, sector]);
    expect(reports.map((r) => r.id)).toEqual(["T-SECT"]);
  });
});
