import { describe, expect, test } from "vitest";
import { PROJECTILE_SPEED, RADAR_POS, TURRET_POS } from "./constants";
import { EdgeComputer } from "./edgeComputer";
import { timeToBreach } from "./math";
import { RadarSensor } from "./radarSensor";

describe("EdgeComputer", () => {
  test("reconstructs cartesian from az/el/range and ranks EDF by TTB", () => {
    const radar = new RadarSensor(() => 0.5);
    const far = {
      id: "T-FAR",
      alive: true,
      position: { x: 0, y: 70, z: 900 },
      velocity: { x: 0, y: 0, z: -18 },
    };
    const near = {
      id: "T-HOT",
      alive: true,
      position: { x: 80, y: 50, z: 560 },
      velocity: { x: -4, y: 0, z: -28 },
    };
    const reports = radar.scan([far, near]);
    const edge = new EdgeComputer();
    edge.ingest(reports, "AUTO", TURRET_POS);
    expect(edge.tracks[0]!.id).toBe("T-HOT");
    expect(edge.tracks[1]!.id).toBe("T-FAR");
    const hot = edge.tracks[0]!;
    expect(hot.range).toBeGreaterThan(0);
    expect(hot.position.z).toBeCloseTo(560, 0);
    const ttb = timeToBreach(hot.distance, hot.radialVelocity, edge.killZone);
    expect(hot.timeToBreach).toBeCloseTo(ttb, 5);
  });

  test("AUTO issues a fire call; MANUAL holds the solution without auto-engage", () => {
    const radar = new RadarSensor(() => 0.5);
    const t = {
      id: "T01",
      alive: true,
      position: { x: 120, y: 60, z: 700 },
      velocity: { x: -6, y: 0, z: -22 },
    };
    const reports = radar.scan([t]);
    const edge = new EdgeComputer();
    const auto = edge.ingest(reports, "AUTO", TURRET_POS);
    expect(auto).not.toBeNull();
    expect(auto!.targetId).toBe("T01");
    expect(auto!.autoEngage).toBe(true);
    expect(auto!.intercept.t).toBeGreaterThan(0);
    const range = Math.hypot(
      auto!.intercept.x - TURRET_POS.x,
      auto!.intercept.y - TURRET_POS.y,
      auto!.intercept.z - TURRET_POS.z,
    );
    expect(range).toBeCloseTo(PROJECTILE_SPEED * auto!.intercept.t, 3);

    const manual = edge.ingest(reports, "MANUAL", TURRET_POS);
    expect(manual).not.toBeNull();
    expect(manual!.autoEngage).toBe(false);
    expect(manual!.targetId).toBe("T01");
  });

  test("still issues a fire call inside the kill zone (TTB is NOW)", () => {
    const radar = new RadarSensor(() => 0.5);
    const inside = {
      id: "T-IN",
      alive: true,
      kind: "quad" as const,
      position: { x: 120, y: 40, z: 80 },
      velocity: { x: -20, y: 0, z: -12 },
    };
    const outside = {
      id: "T-OUT",
      alive: true,
      kind: "quad" as const,
      position: { x: 0, y: 60, z: 900 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const edge = new EdgeComputer();
    edge.killZone = 200;
    const call = edge.ingest(radar.scan([inside, outside]), "AUTO", TURRET_POS);
    expect(call).not.toBeNull();
    expect(call!.targetId).toBe("T-IN");
    expect(call!.autoEngage).toBe(true);
    expect(edge.tracks[0]!.timeToBreach).toBe(0);
  });

  test("TTB follows the selected effector's kill zone", () => {
    const radar = new RadarSensor(() => 0.5);
    const t = {
      id: "T01",
      alive: true,
      position: { x: 0, y: 40, z: 300 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const reports = radar.scan([t]);
    const edge = new EdgeComputer();

    edge.killZone = 200;
    edge.ingest(reports, "AUTO", TURRET_POS);
    expect(edge.tracks[0]!.timeToBreach).toBeGreaterThan(0);

    edge.killZone = 400;
    edge.ingest(reports, "AUTO", TURRET_POS);
    expect(edge.tracks[0]!.timeToBreach).toBe(0);
  });

  test("coasts tracks between 10 Hz scans", () => {
    const radar = new RadarSensor(() => 0.5);
    const t = {
      id: "T01",
      alive: true,
      position: { x: 0, y: 80, z: 800 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const edge = new EdgeComputer();
    edge.ingest(radar.scan([t]), "AUTO", TURRET_POS);
    const z0 = edge.tracks[0]!.position.z;
    edge.coast(0.1);
    expect(edge.tracks[0]!.position.z).toBeCloseTo(z0 - 2, 5);
    expect(RADAR_POS.y).toBeGreaterThan(0);
  });
});
