import * as THREE from "three";
import { describe, expect, test } from "vitest";
import { FIXED_DT, HIT_RADIUS, UGV_MOVE_KMH, UGV_MOVE_MPS } from "./constants";
import { getHud, getSim, resetSim, Simulation } from "./simulation";

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

describe("ledger", () => {
  test("clearLedger wipes rows so a run after model changes starts empty", () => {
    const sim = new Simulation();
    sim.muted = true;
    sim.resetRun();
    sim.ledger.append(1, "T01", "BREACH", "500 m");
    sim.ledger.append(2, "T01", "INTERCEPT", "HIT");
    expect(sim.ledger.snapshot().length).toBe(2);
    sim.clearLedger();
    expect(sim.ledger.snapshot()).toHaveLength(0);
  });
});

describe("UGV shoot-on-the-move", () => {
  test("is 4 km/h when the option is on, and stays put when off", () => {
    expect(UGV_MOVE_KMH).toBe(4);
    expect(UGV_MOVE_MPS).toBeCloseTo(4 / 3.6, 10);

    const parked = new Simulation();
    parked.muted = true;
    parked.resetRun();
    parked.phase = "live";
    parked.setUgvMove(false);
    step(parked, 2);
    expect(parked.ugv.x).toBeCloseTo(0, 8);
    expect(parked.ugv.z).toBeCloseTo(0, 8);

    const moving = new Simulation();
    moving.muted = true;
    moving.resetRun();
    moving.phase = "live";
    moving.setUgvMove(true);
    step(moving, 1);
    const dist = Math.hypot(moving.ugv.x, moving.ugv.z);
    expect(dist).toBeGreaterThan(UGV_MOVE_MPS * 0.9);
    expect(dist).toBeLessThan(UGV_MOVE_MPS * 1.1);
  });
});

describe("designate priority", () => {
  test("does not change the default AUTO mode", () => {
    const sim = new Simulation();
    sim.muted = true;
    sim.resetRun();
    expect(sim.turret.mode).toBe("AUTO");
    sim.designateTrack("T01");
    expect(sim.turret.mode).toBe("AUTO");
    expect(sim.edge.designatedId).toBe("T01");
    sim.designateTrack("T01");
    expect(sim.edge.designatedId).toBeNull();
    expect(sim.turret.mode).toBe("AUTO");
  });
});

describe("EDF row assignment", () => {
  test("marks a track ENGAGED while a round is in flight to it", () => {
    resetSim();
    const sim = getSim();
    sim.muted = true;
    sim.resetRun();
    sim.phase = "live";
    step(sim, 0.2);
    const id = sim.edge.tracks[0]?.id;
    expect(id).toBeTruthy();
    sim.projectiles.push({
      id: 7,
      position: new THREE.Vector3(0, 14, 0),
      velocity: new THREE.Vector3(0, 0, 2000),
      dest: new THREE.Vector3(0, 40, 200),
      targetId: id!,
      tof: 0.4,
      alive: true,
    });
    sim.update(0.05);
    expect(getHud().tracks.find((t) => t.id === id)?.assignment).toBe("ENGAGED");
  });
});

describe("fuse radius", () => {
  test("aligned AUTO still hits at 48 m; CPA is inside the bubble so the fuse stays", () => {
    const sim = new Simulation();
    sim.muted = true;
    sim.resetRun();
    sim.phase = "live";
    for (const d of sim.swarm.drones) d.alive = false;
    const d = sim.swarm.getById("T02")!;
    d.alive = true;
    d.breached = false;
    d.hoverDive = false;
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
          .some((r) => r.action === "INTERCEPT" && r.what === "T02" && r.outcome === "HIT")
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
