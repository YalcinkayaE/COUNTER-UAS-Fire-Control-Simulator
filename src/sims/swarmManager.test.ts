import { describe, expect, test } from "vitest";
import {
  DETECT_RADIUS,
  DRONE_POOL_MAX,
  DRONE_SPEED_MAX,
  EFFECTORS,
  FIXED_DT,
  FIXED_WING_COUNT_MAX,
  HOVER_HOLD_SEC,
  HOVER_OVERHEAD_ALT_M,
  HOVER_STANDOFF_M,
  QUAD_COUNT_MAX,
} from "./constants";
import { SwarmManager } from "./swarmManager";

/** Zero-variance raid draws: corridor center 0°, 12 quads, 3 fixed-wing at 21/25/29° az. */
const fixedRng = () => 0.5;

function azFromNorthDeg(x: number, z: number): number {
  return (Math.atan2(x, z) * 180) / Math.PI;
}

describe("SwarmManager", () => {
  test("spawns 8–16 quads plus 2–3 fixed-wing inside the radar sector", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    expect(swarm.drones).toHaveLength(DRONE_POOL_MAX);
    expect(swarm.aliveCount()).toBe(12 + 3 + 1);
    expect(swarm.drones.filter((d) => d.alive && d.kind === "quad" && !d.hoverDive)).toHaveLength(12);
    const wings = swarm.drones.filter((d) => d.alive && d.kind === "fixedWing");
    expect(wings).toHaveLength(FIXED_WING_COUNT_MAX);
    for (const d of wings) {
      expect(Math.hypot(d.position.x, d.position.z)).toBeCloseTo(DETECT_RADIUS, 0);
      const az = azFromNorthDeg(d.position.x, d.position.z);
      expect(az).toBeGreaterThan(5);
      expect(az).toBeLessThan(45);
      expect(d.cruiseSpeed).toBeGreaterThan(DRONE_SPEED_MAX);
    }
  });

  test("wave draws stay inside the radar sector across the rng range", () => {
    for (const v of [0, 0.25, 0.5, 0.75, 0.999]) {
      const swarm = new SwarmManager(() => v);
      swarm.spawnWave(1);
      for (const d of swarm.drones) {
        if (!d.alive || d.hoverDive) continue;
        expect(Math.abs(azFromNorthDeg(d.position.x, d.position.z))).toBeLessThanOrEqual(43);
      }
    }
  });

  test("quads spawn inside the wave's raid corridor", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const quads = swarm.drones.filter((d) => d.alive && d.kind === "quad" && !d.hoverDive);
    expect(quads).toHaveLength(12);
    for (const d of quads) {
      expect(Math.abs(azFromNorthDeg(d.position.x, d.position.z))).toBeLessThanOrEqual(15.01);
    }
  });

  test("cruise speeds and altitudes are not uniform", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const live = swarm.drones.filter((d) => d.alive);
    const speeds = new Set(live.map((d) => d.cruiseSpeed.toFixed(2)));
    const alts = new Set(live.map((d) => d.position.y.toFixed(1)));
    expect(speeds.size).toBeGreaterThan(8);
    expect(alts.size).toBeGreaterThan(8);
  });

  test("tracks change speed while flying evasive", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const before = swarm.drones.map((d) => d.speed);
    for (let i = 0; i < 120; i++) swarm.update(1 / 60);
    const changed = swarm.drones.filter(
      (d, i) => d.alive && Math.abs(d.speed - before[i]!) > 0.4,
    );
    expect(changed.length).toBeGreaterThan(10);
  });

  test("altitude, azimuth, and speed stay within 40% of spawn values", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const start = swarm.drones.map((d) => ({
      alt: d.baseAlt,
      az: Math.atan2(d.position.x, d.position.z),
      cruise: d.cruiseSpeed,
    }));
    let maxAlt = 0;
    let maxAz = 0;
    let maxSpd = 0;
    for (let i = 0; i < 1800; i++) {
      swarm.update(1 / 60);
      for (let j = 0; j < swarm.drones.length; j++) {
        const d = swarm.drones[j]!;
        if (!d.alive || d.hoverDive) continue;
        const s = start[j]!;
        maxAlt = Math.max(maxAlt, Math.abs(d.position.y - s.alt) / s.alt);
        maxSpd = Math.max(maxSpd, Math.abs(d.speed - s.cruise) / s.cruise);
        const az = Math.atan2(d.position.x, d.position.z);
        maxAz = Math.max(maxAz, Math.abs(az - s.az) / Math.max(Math.abs(s.az), 0.15));
      }
    }
    expect(maxSpd).toBeGreaterThan(0.2);
    expect(maxSpd).toBeLessThanOrEqual(0.401);
    expect(maxAlt).toBeGreaterThan(0.15);
    expect(maxAlt).toBeLessThanOrEqual(0.401);
    expect(maxAz).toBeGreaterThan(0.05);
    expect(maxAz).toBeLessThanOrEqual(0.45);
  });

  test("hover-then-dive parks outside HN-12 with TTB REC, then dives", () => {
    expect(HOVER_STANDOFF_M).toBeGreaterThan(EFFECTORS["HN-12"].range);
    expect(HOVER_STANDOFF_M).toBeLessThan(EFFECTORS.CAKIR.range);

    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const divers = swarm.drones.filter((d) => d.hoverDive && d.alive);
    expect(divers).toHaveLength(1);
    const h = swarm.getById("H01")!;
    expect(h.hoverDive).toBe(true);
    expect(Math.abs(azFromNorthDeg(h.position.x, h.position.z))).toBeLessThan(5);
    expect(h.hoverPhase).toBe("ingress");

    for (let i = 0; i < 45 * 60 && h.hoverPhase !== "hover"; i++) swarm.update(FIXED_DT);
    expect(h.alive).toBe(true);
    expect(h.hoverPhase).toBe("hover");
    expect(Math.hypot(h.position.x, h.position.z)).toBeCloseTo(HOVER_STANDOFF_M, 0);
    expect(h.timeToBreach).toBe(Number.POSITIVE_INFINITY);
    expect(h.distance).toBeGreaterThan(EFFECTORS["HN-12"].range);

    for (let i = 0; i < Math.ceil(HOVER_HOLD_SEC / FIXED_DT) + 1; i++) swarm.update(FIXED_DT);
    expect(h.hoverPhase).toBe("climb");
    for (let i = 0; i < 20 * 60 && h.hoverPhase !== "dive"; i++) swarm.update(FIXED_DT);
    expect(h.hoverPhase).toBe("dive");
    expect(h.position.y).toBeGreaterThan(400);
    for (let i = 0; i < Math.ceil(4 / FIXED_DT); i++) swarm.update(FIXED_DT);
    const r = Math.hypot(h.position.x, h.position.z);
    expect(r).toBeLessThan(HOVER_STANDOFF_M - 50);
    // The dive actually descends: ≈48 m/s down from the 420 m apex while closing in.
    expect(h.position.y).toBeLessThan(HOVER_OVERHEAD_ALT_M - 150);
    expect(h.position.y).toBeGreaterThan(100);
    const elDeg = (Math.atan2(h.position.y - 14, r) * 180) / Math.PI;
    expect(elDeg).toBeGreaterThan(55);
    expect(elDeg).toBeLessThan(70);
  });

  test("collectBreaches flags the kill zone but keeps the track shootable", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.killZone = 500;
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(200, 40, 200);
    d.refreshTrack(swarm.killZone);
    const leaks = swarm.collectBreaches();
    expect(leaks.map((x) => x.id)).toContain(d.id);
    expect(d.breached).toBe(true);
    expect(d.alive).toBe(true);
    expect(swarm.collectBreaches()).toHaveLength(0);
  });

  test("breach ring follows the selected effector range", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(200, 40, 200); // distance ≈ 286 m

    swarm.killZone = 200; // HN-12
    d.refreshTrack(200);
    expect(swarm.collectBreaches()).toHaveLength(0);
    expect(d.breached).toBe(false);

    swarm.killZone = 400; // CAKIR / PENCE-A
    d.refreshTrack(400);
    expect(swarm.collectBreaches().map((x) => x.id)).toContain(d.id);
    expect(d.breached).toBe(true);
  });

  test("a high overflight never breaches the HN-12 sphere but still has a finite TTB to the asset", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.killZone = 200;
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(0, 250, 120);
    d.velocity.set(0, 0, -80);
    d.refreshTrack(swarm.killZone);
    expect(d.distance).toBeGreaterThan(200);
    expect(swarm.collectBreaches()).toHaveLength(0);
    expect(d.timeToBreach).toBeCloseTo((120 - 36) / 80, 5);
  });

  test("collectImpacts uses the defended point, not world origin", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    const origin = { x: 120, y: 0, z: 40 };
    d.position.set(10, 40, 10);
    expect(swarm.collectImpacts(origin)).toHaveLength(0);
    d.position.set(120, 40, 45);
    const hits = swarm.collectImpacts(origin);
    expect(hits.map((x) => x.id)).toContain(d.id);
    expect(d.alive).toBe(false);
  });

  test("collectImpacts removes a track only over the facility", () => {
    const swarm = new SwarmManager(fixedRng);
    swarm.killZone = 500;
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(200, 40, 200);
    d.refreshTrack(swarm.killZone);
    swarm.collectBreaches();
    expect(d.alive).toBe(true);
    d.position.set(10, 40, 10);
    d.refreshTrack(swarm.killZone);
    const hits = swarm.collectImpacts();
    expect(hits.map((x) => x.id)).toContain(d.id);
    expect(d.alive).toBe(false);
  });
});
