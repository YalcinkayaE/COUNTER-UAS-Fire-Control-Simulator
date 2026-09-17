import { describe, expect, test } from "vitest";
import { FACILITY_RADIUS, PROJECTILE_SPEED, RADAR_POS, TURRET_POS } from "./constants";
import { EdgeComputer } from "./edgeComputer";
import { horizontalClosingSpeed, horizontalRange, timeToBreach } from "./math";
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
    const ttb = timeToBreach(
      horizontalRange(hot.position),
      horizontalClosingSpeed(hot.position, hot.velocity),
      FACILITY_RADIUS,
    );
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

  test("ranks a near-asset track ahead of a far inbound even when both are inside a gun envelope", () => {
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
    edge.maxRange = 200;
    const call = edge.ingest(radar.scan([inside, outside]), "AUTO", TURRET_POS);
    expect(call).not.toBeNull();
    expect(call!.targetId).toBe("T-IN");
    expect(call!.autoEngage).toBe(true);
    expect(edge.tracks[0]!.timeToBreach).toBeGreaterThan(0);
    expect(edge.tracks[0]!.timeToBreach).toBeLessThan(edge.tracks[1]!.timeToBreach);
  });

  test("TTB is time to the asset cylinder and does not follow the gun envelope", () => {
    const radar = new RadarSensor(() => 0.5);
    const t = {
      id: "T01",
      alive: true,
      position: { x: 0, y: 40, z: 300 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const reports = radar.scan([t]);
    const edge = new EdgeComputer();
    const expected = (300 - FACILITY_RADIUS) / 20;

    edge.maxRange = 200;
    edge.ingest(reports, "AUTO", TURRET_POS);
    expect(edge.tracks[0]!.timeToBreach).toBeCloseTo(expected, 5);

    edge.maxRange = 400;
    edge.ingest(reports, "AUTO", TURRET_POS);
    expect(edge.tracks[0]!.timeToBreach).toBeCloseTo(expected, 5);
    expect(edge.tracks[0]!.timeToBreach).not.toBe(0);
  });

  test("a high overflight still has a finite TTB even when it never enters the HN-12 sphere", () => {
    const radar = new RadarSensor(() => 0.5);
    const high = {
      id: "F-HIGH",
      alive: true,
      kind: "fixedWing" as const,
      position: { x: 0, y: 250, z: 120 },
      velocity: { x: 0, y: 0, z: -80 },
    };
    const edge = new EdgeComputer();
    edge.maxRange = 200;
    edge.ingest(radar.scan([high]), "AUTO", TURRET_POS);
    const ttb = edge.tracks[0]!.timeToBreach;
    expect(Math.hypot(0, 250, 120)).toBeGreaterThan(200);
    expect(ttb).toBeGreaterThan(0);
    expect(ttb).toBeCloseTo((120 - FACILITY_RADIUS) / 80, 5);
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

  test("stays on the committed track unless another deadline beats it by the hysteresis", () => {
    const radar = new RadarSensor(() => 0.5);
    const edge = new EdgeComputer();
    const a = {
      id: "T-A",
      alive: true,
      position: { x: 0, y: 40, z: 200 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const b = {
      id: "T-B",
      alive: true,
      position: { x: 40, y: 40, z: 250 },
      velocity: { x: -3, y: 0, z: -20 },
    };
    const first = edge.ingest(radar.scan([a, b]), "AUTO", TURRET_POS);
    expect(first!.targetId).toBe("T-A");

    const bCloser = { ...b, position: { x: 30, y: 40, z: 185 }, velocity: { x: -3, y: 0, z: -20 } };
    const held = edge.ingest(radar.scan([a, bCloser]), "AUTO", TURRET_POS);
    expect(held!.targetId).toBe("T-A");

    const bHot = { ...b, position: { x: 10, y: 40, z: 70 }, velocity: { x: -4, y: 0, z: -40 } };
    const switched = edge.ingest(radar.scan([a, bHot]), "AUTO", TURRET_POS);
    expect(switched!.targetId).toBe("T-B");
  });

  test("skips a track when slew plus time of flight exceeds TTB", () => {
    const radar = new RadarSensor(() => 0.5);
    const edge = new EdgeComputer();
    edge.maxRange = 400;
    const hot = {
      id: "T-HOT",
      alive: true,
      position: { x: 34, y: 40, z: 34 },
      velocity: { x: -28, y: 0, z: -28 },
    };
    const steady = {
      id: "T-STEADY",
      alive: true,
      position: { x: 0, y: 40, z: 250 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const edf = edge.ingest(radar.scan([hot, steady]), "AUTO", TURRET_POS);
    expect(edf!.targetId).toBe("T-HOT");

    edge.resetCommitment();
    const barrelEast = { x: 1, y: 0, z: 0 };
    const feasible = edge.ingest(radar.scan([hot, steady]), "AUTO", TURRET_POS, barrelEast);
    expect(feasible!.targetId).toBe("T-STEADY");
    expect(feasible!.autoEngage).toBe(true);
  });
});
