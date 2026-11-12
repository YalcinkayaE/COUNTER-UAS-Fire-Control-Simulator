import { describe, expect, test } from "vitest";
import {
  DEFAULT_EFFECTOR_ID,
  DEG,
  EFFECTOR_IDS,
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
import { Simulation } from "./simulation";
import { TurretController } from "./turretController";

describe("effector catalog", () => {
  test("CAKIR, HN-12, and PENCE-A match the stated rpm and range", () => {
    expect(EFFECTORS.CAKIR).toMatchObject({ label: "Effector 1", rpm: 1350, range: 400 });
    expect(EFFECTORS["PENCE-A"]).toMatchObject({ label: "Effector 2", rpm: 120, range: 400 });
    expect(EFFECTORS["HN-12"]).toMatchObject({ label: "Effector 3", rpm: 1000, range: 200 });
    expect(EFFECTOR_IDS).toEqual(["CAKIR", "PENCE-A", "HN-12"]);
    expect(DEFAULT_EFFECTOR_ID).toBe("HN-12");
    expect(FIRE_RPM).toBe(1000);
    expect(FIRE_COOLDOWN).toBeCloseTo(fireCooldownSec(1000), 10);
  });

  test("per-effector elevation windows match the operator spec", () => {
    expect(EFFECTORS.CAKIR).toMatchObject({ elMinDeg: -15, elMaxDeg: 70 });
    expect(EFFECTORS["HN-12"]).toMatchObject({ elMinDeg: -5, elMaxDeg: 85 });
    // PENCE-A traverse/elevation not specified — placeholder −8°/+70°.
    expect(EFFECTORS["PENCE-A"]).toMatchObject({ elMinDeg: -8, elMaxDeg: 70 });
  });

  test("switching effector pushes the elevation window onto the turret", () => {
    const sim = new Simulation();
    sim.setEffector("HN-12");
    expect(sim.turret.elMin).toBeCloseTo(-5 * DEG, 12);
    expect(sim.turret.elMax).toBeCloseTo(85 * DEG, 12);
    sim.setEffector("CAKIR");
    expect(sim.turret.elMin).toBeCloseTo(-15 * DEG, 12);
    expect(sim.turret.elMax).toBeCloseTo(70 * DEG, 12);
    sim.setEffector("PENCE-A");
    expect(sim.turret.elMin).toBeCloseTo(-8 * DEG, 12);
    expect(sim.turret.elMax).toBeCloseTo(70 * DEG, 12);
  });

  test("switching effector clamps a stale pitch into the new window", () => {
    const sim = new Simulation();
    sim.setEffector("HN-12");
    sim.turret.pitch = -85 * DEG; // barrel at +85° elevation — legal under HN-12 only
    sim.setEffector("CAKIR");
    expect(sim.turret.pitch).toBeCloseTo(-70 * DEG, 12);
    sim.turret.pitch = 15 * DEG; // barrel at −15° elevation — legal under CAKIR only
    sim.setEffector("HN-12");
    expect(sim.turret.pitch).toBeCloseTo(5 * DEG, 12);
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
