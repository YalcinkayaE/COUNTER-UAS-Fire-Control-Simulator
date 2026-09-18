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
    cakir.elMinRad = EFFECTORS.CAKIR.elMinDeg * DEG;
    cakir.elMaxRad = EFFECTORS.CAKIR.elMaxDeg * DEG;
    for (let i = 0; i < 180; i++) {
      cakir.update(FIXED_DT, overhead as never, null, false, new Set());
    }
    expect(barrelEl(cakir)).toBeLessThanOrEqual(EFFECTORS.CAKIR.elMaxDeg * DEG + 1e-3);
    expect(barrelEl(cakir)).toBeGreaterThan(60 * DEG);
    expect(barrelEl(cakir)).toBeLessThan(80 * DEG);

    const hn12 = new TurretController();
    hn12.mode = "AUTO";
    hn12.elMinRad = EFFECTORS["HN-12"].elMinDeg * DEG;
    hn12.elMaxRad = EFFECTORS["HN-12"].elMaxDeg * DEG;
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
});
