import { describe, expect, test } from "vitest";
import { KILL_ZONE, PROJECTILE_SPEED } from "./constants";
import {
  azimuthFromNorth,
  elevationFromGround,
  formatTtb,
  solveIntercept,
  sphericalToCartesian,
  timeToBreach,
} from "./math";

describe("timeToBreach", () => {
  test("is (distance − kill zone) / inbound radial speed", () => {
    expect(timeToBreach(900, 20, KILL_ZONE)).toBeCloseTo(20, 8);
  });

  test("returns 0 when already inside the kill zone", () => {
    expect(timeToBreach(499, 30, KILL_ZONE)).toBe(0);
    expect(timeToBreach(KILL_ZONE, 30, KILL_ZONE)).toBe(0);
  });

  test("returns +Infinity for receding or hovering tracks", () => {
    expect(timeToBreach(800, 0, KILL_ZONE)).toBe(Number.POSITIVE_INFINITY);
    expect(timeToBreach(800, -4, KILL_ZONE)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("solveIntercept", () => {
  test("returns the earliest positive intercept of a constant-velocity target", () => {
    const shooter = { x: 0, y: 14, z: 0 };
    const targetPos = { x: 800, y: 70, z: 0 };
    const targetVel = { x: -22, y: 0, z: 0 };
    const ic = solveIntercept(shooter, PROJECTILE_SPEED, targetPos, targetVel);
    expect(ic).not.toBeNull();
    if (!ic) return;
    const range = Math.hypot(ic.x - shooter.x, ic.y - shooter.y, ic.z - shooter.z);
    expect(range).toBeCloseTo(PROJECTILE_SPEED * ic.t, 5);
    expect(ic.x).toBeCloseTo(targetPos.x + targetVel.x * ic.t, 5);
    expect(ic.t).toBeGreaterThan(0);
  });

  test("returns null when the projectile cannot catch the target", () => {
    const ic = solveIntercept(
      { x: 0, y: 0, z: 0 },
      10,
      { x: 1000, y: 0, z: 0 },
      { x: 40, y: 0, z: 0 },
    );
    expect(ic).toBeNull();
  });
});

describe("formatTtb", () => {
  test("labels receding and imminent tracks", () => {
    expect(formatTtb(Number.POSITIVE_INFINITY)).toBe("REC");
    expect(formatTtb(0)).toBe("NOW");
    expect(formatTtb(8.21)).toBe("8.2");
  });
});

describe("radar spherical", () => {
  const origin = { x: 0, y: 16, z: 0 };

  test("azimuth is 0 due north (+Z) and +90° due east (+X)", () => {
    expect(azimuthFromNorth(0, 400)).toBeCloseTo(0, 8);
    expect(azimuthFromNorth(400, 0)).toBeCloseTo(Math.PI / 2, 8);
  });

  test("elevation is the angle above the ground plane", () => {
    expect(elevationFromGround(0, 0, 400)).toBeCloseTo(0, 8);
    expect(elevationFromGround(0, 400, 0)).toBeCloseTo(Math.PI / 2, 8);
    expect(elevationFromGround(0, 100, 100)).toBeCloseTo(Math.PI / 4, 8);
  });

  test("az/el/range round-trip to cartesian", () => {
    const pos = { x: 220, y: 90, z: 640 };
    const az = azimuthFromNorth(pos.x - origin.x, pos.z - origin.z);
    const dx = pos.x - origin.x;
    const dy = pos.y - origin.y;
    const dz = pos.z - origin.z;
    const range = Math.hypot(dx, dy, dz);
    const el = elevationFromGround(dx, dy, dz);
    const back = sphericalToCartesian(az, el, range, origin);
    expect(back.x).toBeCloseTo(pos.x, 6);
    expect(back.y).toBeCloseTo(pos.y, 6);
    expect(back.z).toBeCloseTo(pos.z, 6);
  });
});
