import { describe, expect, test } from "vitest";
import {
  DETECT_RADIUS,
  DRONE_COUNT,
  DRONE_SPEED_MAX,
  FIXED_WING_COUNT,
  QUAD_COUNT,
  SWARM_WEST_OF_NORTH_MAX_DEG,
  SWARM_WEST_OF_NORTH_MIN_DEG,
} from "./constants";
import { SwarmManager } from "./swarmManager";

function westOfNorthDeg(x: number, z: number): number {
  return (Math.atan2(-x, z) * 180) / Math.PI;
}

describe("SwarmManager", () => {
  test("spawns 20 quads plus 2 eastbound fixed-wing tracks", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    expect(swarm.aliveCount()).toBe(DRONE_COUNT);
    expect(swarm.drones).toHaveLength(QUAD_COUNT + FIXED_WING_COUNT);
    const wings = swarm.drones.filter((d) => d.kind === "fixedWing");
    expect(wings).toHaveLength(2);
    for (const d of wings) {
      expect(Math.hypot(d.position.x, d.position.z)).toBeCloseTo(DETECT_RADIUS, 0);
      const az = Math.atan2(d.position.x, d.position.z);
      expect(az).toBeGreaterThan(Math.PI / 2 - 0.25);
      expect(az).toBeLessThan(Math.PI / 2 + 0.25);
      expect(d.cruiseSpeed).toBeGreaterThan(DRONE_SPEED_MAX);
    }
  });

  test("quads spawn only in the 10–60° northwest sector", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    for (const d of swarm.drones.filter((x) => x.kind === "quad")) {
      const az = westOfNorthDeg(d.position.x, d.position.z);
      expect(az).toBeGreaterThanOrEqual(SWARM_WEST_OF_NORTH_MIN_DEG - 0.01);
      expect(az).toBeLessThanOrEqual(SWARM_WEST_OF_NORTH_MAX_DEG + 0.01);
    }
  });

  test("cruise speeds and altitudes are not uniform", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    const speeds = new Set(swarm.drones.map((d) => d.cruiseSpeed.toFixed(2)));
    const alts = new Set(swarm.drones.map((d) => d.position.y.toFixed(1)));
    expect(speeds.size).toBeGreaterThan(8);
    expect(alts.size).toBeGreaterThan(8);
  });

  test("tracks change speed while flying evasive", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    const before = swarm.drones.map((d) => d.speed);
    for (let i = 0; i < 120; i++) swarm.update(1 / 60);
    const changed = swarm.drones.filter((d, i) => Math.abs(d.speed - before[i]!) > 0.4);
    expect(changed.length).toBeGreaterThan(10);
  });

  test("altitude, azimuth, and speed stay within 40% of spawn values", () => {
    const swarm = new SwarmManager();
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

  test("collectBreaches flags the kill zone but keeps the track shootable", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(200, 40, 200);
    d.refreshTrack();
    const leaks = swarm.collectBreaches();
    expect(leaks.map((x) => x.id)).toContain(d.id);
    expect(d.breached).toBe(true);
    expect(d.alive).toBe(true);
    expect(swarm.collectBreaches()).toHaveLength(0);
  });

  test("collectImpacts removes a track only over the facility", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(200, 40, 200);
    d.refreshTrack();
    swarm.collectBreaches();
    expect(d.alive).toBe(true);
    d.position.set(10, 40, 10);
    d.refreshTrack();
    const hits = swarm.collectImpacts();
    expect(hits.map((x) => x.id)).toContain(d.id);
    expect(d.alive).toBe(false);
  });
});
