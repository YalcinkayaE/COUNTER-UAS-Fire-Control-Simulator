import * as THREE from "three";
import { describe, expect, test } from "vitest";
import { FIXED_DT, HIT_RADIUS } from "./constants";
import { Simulation } from "./simulation";

function step(sim: Simulation, seconds: number): void {
  const n = Math.ceil(seconds / FIXED_DT);
  for (let i = 0; i < n; i++) sim.update(FIXED_DT);
}

describe("wave-clear abort", () => {
  test("kills leftover rounds as SUPPRESSED and does not MISS the next wave's reused IDs", () => {
    const sim = new Simulation();
    sim.muted = true;
    sim.resetRun();
    sim.phase = "live";

    const t01 = sim.swarm.getById("T01");
    expect(t01?.alive).toBe(true);

    sim.projectiles.push({
      id: 99,
      position: new THREE.Vector3(0, 14, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      dest: new THREE.Vector3(0, 14, 50),
      targetId: "T01",
      tof: 0.2,
      alive: true,
    });
    sim.turret.burstLeft = 0.4;
    sim.turret.recovery = 0.3;

    for (const d of sim.swarm.drones) d.alive = false;
    sim.update(FIXED_DT);

    expect(sim.phase).toBe("wavehold");
    expect(sim.turret.burstLeft).toBe(0);
    expect(sim.turret.recovery).toBe(0);
    expect(sim.projectiles.filter((p) => p.alive)).toHaveLength(0);
    expect(
      sim.ledger.snapshot().some((r) => r.action === "INTERCEPT" && r.outcome === "SUPPRESSED"),
    ).toBe(true);
    expect(sim.ledger.snapshot().filter((r) => r.outcome === "MISS")).toHaveLength(0);

    step(sim, 2.5);
    expect(sim.phase).toBe("live");
    expect(sim.wave).toBe(2);
    expect(sim.swarm.getById("T01")?.alive).toBe(true);
    expect(sim.ledger.snapshot().filter((r) => r.outcome === "MISS")).toHaveLength(0);
  });
});

describe("fuse radius", () => {
  test("aligned AUTO still hits at 48 m; CPA is inside the bubble so the fuse stays", () => {
    const sim = new Simulation();
    sim.muted = true;
    sim.resetRun();
    sim.phase = "live";
    for (const d of sim.swarm.drones) d.alive = false;
    const d = sim.swarm.getById("T01")!;
    d.alive = true;
    d.breached = false;
    d.position.set(0, 40, 120);
    d.velocity.set(0, 0, -18);
    d.refreshTrack(sim.swarm.killZone);

    let hit = false;
    const n = Math.ceil(4 / FIXED_DT);
    for (let i = 0; i < n; i++) {
      sim.update(FIXED_DT);
      if (
        sim.ledger
          .snapshot()
          .some((r) => r.action === "INTERCEPT" && r.what === "T01" && r.outcome === "HIT")
      ) {
        hit = true;
        break;
      }
    }
    expect(hit).toBe(true);
    expect(sim.closestApproach).toBeLessThanOrEqual(HIT_RADIUS);
    expect(HIT_RADIUS).toBe(48);
  });
});
