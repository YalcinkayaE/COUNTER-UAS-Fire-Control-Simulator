import { describe, expect, test } from "vitest";
import {
  DEFAULT_EFFECTOR_ID,
  EFFECTORS,
  FIRE_BURST,
  FIRE_COOLDOWN,
  FIRE_RPM,
  FIXED_DT,
  TURRET_POS,
  fireCooldownSec,
} from "./constants";
import { EdgeComputer } from "./edgeComputer";
import { RadarSensor } from "./radarSensor";
import { TurretController } from "./turretController";

describe("effector catalog", () => {
  test("CAKIR, HN-12, and PENCE-A match the stated rpm and range", () => {
    expect(EFFECTORS.CAKIR).toMatchObject({ rpm: 1350, range: 400 });
    expect(EFFECTORS["HN-12"]).toMatchObject({ rpm: 1000, range: 200 });
    expect(EFFECTORS["PENCE-A"]).toMatchObject({ rpm: 120, range: 400 });
    expect(DEFAULT_EFFECTOR_ID).toBe("HN-12");
    expect(FIRE_RPM).toBe(1000);
    expect(FIRE_COOLDOWN).toBeCloseTo(fireCooldownSec(1000), 10);
  });

  test("elevation windows are per-effector (HN-12 opens to 85°, CAKIR/PENCE-A stay at 70°)", () => {
    expect(EFFECTORS["HN-12"]).toMatchObject({ elMinDeg: -5, elMaxDeg: 85 });
    expect(EFFECTORS.CAKIR).toMatchObject({ elMinDeg: -8, elMaxDeg: 70 });
    expect(EFFECTORS["PENCE-A"]).toMatchObject({ elMinDeg: -8, elMaxDeg: 70 });
  });
});

describe("edge computer envelope", () => {
  test("withholds AUTO engage when no intercept is inside the envelope", () => {
    const radar = new RadarSensor(() => 0.5);
    const far = {
      id: "T-FAR",
      alive: true,
      position: { x: 0, y: 80, z: 900 },
      velocity: { x: 0, y: 0, z: -20 },
    };
    const edge = new EdgeComputer();
    edge.maxRange = 200;
    const call = edge.ingest(radar.scan([far]), "AUTO", TURRET_POS);
    expect(call).not.toBeNull();
    expect(call!.targetId).toBe("T-FAR");
    expect(call!.autoEngage).toBe(false);
  });
});

describe("turret rate of fire", () => {
  test("PENCE-A 120 rds/min puts at most two rounds in a 0.5 s burst", () => {
    const radar = new RadarSensor(() => 0.5);
    const edge = new EdgeComputer();
    edge.maxRange = 400;
    const turret = new TurretController();
    turret.mode = "AUTO";
    turret.fireCooldown = fireCooldownSec(120);
    turret.effectiveRange = 400;
    const t0 = {
      id: "T01",
      alive: true,
      position: { x: 40, y: 40, z: 80 },
      velocity: { x: -8, y: 0, z: -12 },
    };
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < 120; i++) {
      const scan = radar.update(FIXED_DT, [t0]);
      if (scan) edge.ingest(scan, "AUTO", turret.position);
      else edge.coast(FIXED_DT);
      const ev = turret.update(FIXED_DT, edge.fireCall, null, false, new Set());
      t += FIXED_DT;
      if (ev) times.push(t);
    }
    expect(times.length).toBeGreaterThanOrEqual(1);
    const first = times[0]!;
    const inBurst = times.filter((x) => x - first <= FIRE_BURST + FIXED_DT);
    expect(inBurst.length).toBeLessThanOrEqual(2);
  });
});
