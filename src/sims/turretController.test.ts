import { describe, expect, test } from "vitest";
import {
  DEG,
  EFFECTORS,
  FIRE_BURST,
  FIRE_COOLDOWN,
  FIRE_RPM,
  FIXED_DT,
  TURRET_POS,
} from "./constants";
import { EdgeComputer } from "./edgeComputer";
import { RadarSensor } from "./radarSensor";
import { SwarmManager } from "./swarmManager";
import { TurretController } from "./turretController";

describe("UGV gun", () => {
  test("is 1000 rounds per minute with a 0.5 s burst", () => {
    expect(FIRE_RPM).toBe(1000);
    expect(FIRE_COOLDOWN).toBeCloseTo(60 / 1000, 10);
    expect(FIRE_BURST).toBe(0.5);
  });

  test("AUTO burst lasts at most 0.5 s and puts several rounds on the track", () => {
    const swarm = new SwarmManager(() => 0.5);
    swarm.spawnWave(1);
    const radar = new RadarSensor(() => 0.5);
    const edge = new EdgeComputer();
    const turret = new TurretController();
    turret.mode = "AUTO";
    const times: number[] = [];
    let t = 0;
    for (let i = 0; i < 360; i++) {
      swarm.update(FIXED_DT);
      const scan = radar.update(FIXED_DT, swarm.drones);
      if (scan) edge.ingest(scan, "AUTO", turret.position);
      else edge.coast(FIXED_DT);
      const ev = turret.update(FIXED_DT, edge.fireCall, null, false, new Set());
      t += FIXED_DT;
      if (ev) times.push(t);
    }
    expect(times.length).toBeGreaterThanOrEqual(6);
    const first = times[0]!;
    const inBurst = times.filter((x) => x - first <= FIRE_BURST + FIXED_DT);
    const afterBurst = times.filter((x) => x - first > FIRE_BURST + FIXED_DT && x - first <= 1);
    expect(inBurst.length).toBeGreaterThanOrEqual(6);
    expect(inBurst.at(-1)! - first).toBeLessThanOrEqual(FIRE_BURST + FIXED_DT);
    expect(afterBurst).toHaveLength(0);
  });

  test("AUTO clamps look-point to the selected effector elevation window", () => {
    const overhead = {
      targetId: "H01",
      intercept: { x: 0, y: 400, z: 2, t: 0.2 },
      track: {
        id: "H01",
        position: { x: 0, y: 400, z: 2 },
        velocity: { x: 0, y: -20, z: 0 },
      },
      autoEngage: true,
    };

    const barrelEl = (t: TurretController) =>
      Math.atan2(t.barrelDir.y, Math.hypot(t.barrelDir.x, t.barrelDir.z));

    const cakir = new TurretController();
    cakir.mode = "AUTO";
    cakir.elMin = EFFECTORS.CAKIR.elMinDeg * DEG;
    cakir.elMax = EFFECTORS.CAKIR.elMaxDeg * DEG;
    for (let i = 0; i < 180; i++) {
      cakir.update(FIXED_DT, overhead as never, null, false, new Set());
    }
    expect(barrelEl(cakir)).toBeLessThanOrEqual(EFFECTORS.CAKIR.elMaxDeg * DEG + 1e-3);
    expect(barrelEl(cakir)).toBeGreaterThan(60 * DEG);
    expect(barrelEl(cakir)).toBeLessThan(80 * DEG);

    const hn12 = new TurretController();
    hn12.mode = "AUTO";
    hn12.elMin = EFFECTORS["HN-12"].elMinDeg * DEG;
    hn12.elMax = EFFECTORS["HN-12"].elMaxDeg * DEG;
    for (let i = 0; i < 180; i++) {
      hn12.update(FIXED_DT, overhead as never, null, false, new Set());
    }
    expect(barrelEl(hn12)).toBeGreaterThan(80 * DEG);
    expect(barrelEl(hn12)).toBeLessThanOrEqual(EFFECTORS["HN-12"].elMaxDeg * DEG + 1e-3);
    expect(barrelEl(hn12)).toBeLessThan(Math.PI / 2 - 0.05);
    expect(TURRET_POS.y).toBe(14);
  });

  test("resetBurst clears an in-progress burst so the next wave cannot fire it", () => {
    const turret = new TurretController();
    turret.burstLeft = 0.4;
    turret.recovery = 0.2;
    turret.resetBurst();
    expect(turret.burstLeft).toBe(0);
    expect(turret.recovery).toBe(0);
  });

  test("HN-12's +85° window lets AUTO elevate past the old +70° cap", () => {
    const turret = new TurretController();
    turret.mode = "AUTO";
    turret.elMin = EFFECTORS["HN-12"].elMinDeg * DEG;
    turret.elMax = EFFECTORS["HN-12"].elMaxDeg * DEG;
    // Track at ≈80° elevation from the turret: outside CAKIR/PENCE-A, inside HN-12.
    const steep = {
      targetId: "H01",
      intercept: { x: 0, y: 581, z: 100, t: 0.3 },
      track: {
        id: "H01",
        position: { x: 0, y: 581, z: 100 },
        velocity: { x: 0, y: 0, z: 0 },
      },
      autoEngage: true,
    };
    for (let i = 0; i < 300; i++) {
      turret.update(FIXED_DT, steep as never, null, false, new Set());
    }
    const barrelEl = Math.asin(Math.max(-1, Math.min(1, turret.barrelDir.y)));
    expect(barrelEl).toBeGreaterThan(70 * DEG);
    expect(barrelEl).toBeLessThanOrEqual(85 * DEG + 1e-6);
    expect(barrelEl).toBeCloseTo(80 * DEG, 1);
    expect(turret.pitch).toBeCloseTo(-80 * DEG, 1);
  });

  test("MANUAL pitch clamp follows the per-effector window", () => {
    const turret = new TurretController();
    turret.mode = "MANUAL";
    turret.elMin = EFFECTORS.CAKIR.elMinDeg * DEG;
    turret.elMax = EFFECTORS.CAKIR.elMaxDeg * DEG;
    // pitch is negated elevation: KeyS drives elevation up to +70°, KeyW down to −15°.
    const pitchUp = new Set(["KeyS"]);
    for (let i = 0; i < 600; i++) turret.update(FIXED_DT, null, null, false, pitchUp);
    expect(turret.pitch).toBeCloseTo(-70 * DEG, 6);
    expect(Math.asin(Math.max(-1, Math.min(1, turret.barrelDir.y)))).toBeCloseTo(70 * DEG, 6);
    const pitchDown = new Set(["KeyW"]);
    for (let i = 0; i < 900; i++) turret.update(FIXED_DT, null, null, false, pitchDown);
    expect(turret.pitch).toBeCloseTo(15 * DEG, 6);
    expect(Math.asin(Math.max(-1, Math.min(1, turret.barrelDir.y)))).toBeCloseTo(-15 * DEG, 6);
  });
});
