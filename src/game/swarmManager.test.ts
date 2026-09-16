import { describe, expect, test } from "vitest";
import { DRONE_COUNT } from "./constants";
import { SwarmManager } from "./swarmManager";

describe("SwarmManager", () => {
  test("spawns 20 live tracks on wave 1", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    expect(swarm.aliveCount()).toBe(DRONE_COUNT);
    expect(swarm.sorted).toHaveLength(DRONE_COUNT);
  });

  test("radar sort is earliest deadline first", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    swarm.tickRadar();
    const ttbs = swarm.sorted.map((d) => d.timeToBreach);
    const copy = [...ttbs].sort((a, b) => a - b);
    expect(ttbs).toEqual(copy);
    expect(swarm.sorted[0]!.timeToBreach).toBeLessThanOrEqual(swarm.sorted.at(-1)!.timeToBreach);
  });

  test("collectBreaches flags tracks at or inside the kill zone", () => {
    const swarm = new SwarmManager();
    swarm.spawnWave(1);
    const d = swarm.drones[0]!;
    d.position.set(0, 40, 0);
    d.refreshTrack();
    const leaks = swarm.collectBreaches();
    expect(leaks.map((x) => x.id)).toContain(d.id);
    expect(d.alive).toBe(false);
    expect(d.breached).toBe(true);
  });
});
