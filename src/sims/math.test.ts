import { describe, expect, test } from "vitest";
import { FACILITY_RADIUS, PROJECTILE_SPEED } from "./constants";
import {
  azimuthFromNorth,
  elevationFromGround,
  formatSlew,
  formatTtb,
  horizontalClosingSpeed,
  horizontalRange,
  solveIntercept,
  sphericalToCartesian,
  timeToBreach,
  trackAssignment,
} from "./math";

describe("timeToBreach", () => {
  test("is (horizontal range − asset radius) / inbound ground speed", () => {
    expect(timeToBreach(900, 20, FACILITY_RADIUS)).toBeCloseTo((900 - 36) / 20, 8);
    expect(timeToBreach(200, 25, FACILITY_RADIUS)).toBeCloseTo((200 - 36) / 25, 8);
  });

  test("returns 0 when already inside the 36 m asset cylinder", () => {
    expect(timeToBreach(35, 30, FACILITY_RADIUS)).toBe(0);
    expect(timeToBreach(36, 30, FACILITY_RADIUS)).toBe(0);
  });

  test("does not go to 0 merely because the track is inside a gun envelope", () => {
    expect(timeToBreach(150, 20, FACILITY_RADIUS)).toBeCloseTo((150 - 36) / 20, 8);
    expect(timeToBreach(150, 20, FACILITY_RADIUS)).toBeGreaterThan(0);
  });

  test("returns +Infinity for receding or hovering tracks", () => {
    expect(timeToBreach(800, 0, FACILITY_RADIUS)).toBe(Number.POSITIVE_INFINITY);
    expect(timeToBreach(800, -4, FACILITY_RADIUS)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("horizontal range and closing", () => {
  test("ignores altitude so a high overflight still has a finite deadline", () => {
    const p = { x: 0, y: 250, z: 100 };
    const v = { x: 0, y: 0, z: -20 };
    expect(horizontalRange(p)).toBeCloseTo(100, 8);
    expect(horizontalClosingSpeed(p, v)).toBeCloseTo(20, 8);
    const ttb = timeToBreach(horizontalRange(p), horizontalClosingSpeed(p, v), FACILITY_RADIUS);
    expect(ttb).toBeCloseTo((100 - 36) / 20, 8);
    expect(Math.hypot(p.x, p.y, p.z)).toBeGreaterThan(200);
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

describe("formatSlew", () => {
  test("shows seconds, not NOW, and blanks a missing solution", () => {
    expect(formatSlew(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatSlew(0)).toBe("0.0");
    expect(formatSlew(1.24)).toBe("1.2");
  });
});

describe("trackAssignment", () => {
  test("ENGAGED when rounds are in flight, even if the geometry later goes late", () => {
    expect(
      trackAssignment({ inFlight: true, assigned: true, feasible: false, timeToBreach: 0.4 }),
    ).toBe("ENGAGED");
  });

  test("LATE when slew plus tof cannot beat a finite TTB", () => {
    expect(
      trackAssignment({ inFlight: false, assigned: false, feasible: false, timeToBreach: 0.8 }),
    ).toBe("LATE");
  });

  test("does not mark receding tracks LATE", () => {
    expect(
      trackAssignment({
        inFlight: false,
        assigned: false,
        feasible: false,
        timeToBreach: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull();
  });

  test("HOLD when this row is the fire call and no round is away yet", () => {
    expect(
      trackAssignment({ inFlight: false, assigned: true, feasible: true, timeToBreach: 12 }),
    ).toBe("HOLD");
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
