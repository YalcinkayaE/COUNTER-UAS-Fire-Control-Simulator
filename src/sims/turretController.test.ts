import { describe, expect, test } from "vitest";
import { FIRE_BURST, FIRE_COOLDOWN, FIRE_RPM, FIXED_DT } from "./constants";
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

  test("resetBurst clears an in-progress burst so the next wave cannot fire it", () => {
    const turret = new TurretController();
    turret.burstLeft = 0.4;
    turret.recovery = 0.2;
    turret.resetBurst();
    expect(turret.burstLeft).toBe(0);
    expect(turret.recovery).toBe(0);
  });
});
