import { describe, expect, test } from "vitest";
import { FIXED_DT, RADAR_HZ, RADAR_MAX_TRACKS, RADAR_POS } from "./constants";
import { azimuthFromNorth, elevationFromGround, hypot3 } from "./math";
import { RadarSensor } from "./radarSensor";

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
    const radar = new RadarSensor();
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
    const radar = new RadarSensor();
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
    const radar = new RadarSensor();
    const slowNear = truth("T-SLOW", 0, 50, 900, 0, 0, -18);
    const fastFar = truth("F-FAST", 2000, 80, 0, -85, 0, 0);
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
    const radar = new RadarSensor();
    const t = truth("T01", 0, 80, 900);
    let scans = 0;
    for (let i = 0; i < 60; i++) {
      if (radar.update(FIXED_DT, [t])) scans += 1;
    }
    expect(RADAR_HZ).toBe(10);
    expect(scans).toBe(10);
  });
});
