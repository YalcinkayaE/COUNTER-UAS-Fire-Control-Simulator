import { describe, expect, test } from "vitest";
import {
  FACILITY_RADIUS,
  FIXED_DT,
  HOVER_DIVE_MPS,
  HOVER_OVERHEAD_ALT_M,
  HOVER_STANDOFF_M,
} from "./constants";
import { DroneTarget } from "./droneTarget";

/** Deterministic kamikaze: due north at 900 m, no maneuver wobble. */
function spawnKamikaze(): DroneTarget {
  const d = new DroneTarget("H01");
  d.spawn(
    {
      kind: "quad",
      angle: Math.PI / 2,
      range: 900,
      altitude: 80,
      cruiseSpeed: 19,
      altFreq: 0,
      altPhase: 0,
      azFreq: 0,
      azPhase: 0,
      speedFreq: 0,
      speedPhase: 0,
      hoverDive: true,
    },
    200,
  );
  return d;
}

function tickUntil(d: DroneTarget, phase: string, maxSec = 120): number {
  let t = 0;
  while (d.hoverPhase !== phase && t < maxSec) {
    d.tick(FIXED_DT, 200);
    t += FIXED_DT;
  }
  return t;
}

describe("kamikaze dive kinematics", () => {
  test("runs ingress → hover → climb → dive at the scripted standoff and altitude", () => {
    const d = spawnKamikaze();
    const tHover = tickUntil(d, "hover");
    expect(d.hoverPhase).toBe("hover");
    expect(Math.hypot(d.position.x, d.position.z)).toBeCloseTo(HOVER_STANDOFF_M, 0);
    expect(tHover).toBeGreaterThan(20); // animated ingress, not a jump
    const tClimb = tickUntil(d, "climb");
    expect(d.hoverPhase).toBe("climb");
    expect(tClimb).toBeCloseTo(10, 0);
    const tDive = tickUntil(d, "dive");
    expect(d.hoverPhase).toBe("dive");
    expect(tDive).toBeGreaterThan(8);
    expect(d.position.y).toBeGreaterThanOrEqual(HOVER_OVERHEAD_ALT_M - 1.5);
  });

  test("the dive descends continuously — no teleport — at the scripted rates", () => {
    const d = spawnKamikaze();
    tickUntil(d, "dive");
    expect(d.hoverPhase).toBe("dive");
    const maxStep = Math.hypot(HOVER_DIVE_MPS, HOVER_DIVE_MPS) * FIXED_DT * 1.05;
    let prevX = d.position.x;
    let prevY = d.position.y;
    let prevZ = d.position.z;
    let prevHoriz = Math.hypot(prevX, prevZ);
    let steps = 0;
    while (prevHoriz > FACILITY_RADIUS && steps < 1200) {
      d.tick(FIXED_DT, 200);
      steps += 1;
      const step3d = Math.hypot(
        d.position.x - prevX,
        d.position.y - prevY,
        d.position.z - prevZ,
      );
      expect(step3d).toBeLessThanOrEqual(maxStep);
      expect(d.position.y).toBeLessThan(prevY); // monotonic descent
      const horiz = Math.hypot(d.position.x, d.position.z);
      expect(horiz).toBeLessThan(prevHoriz); // monotonic approach
      prevX = d.position.x;
      prevY = d.position.y;
      prevZ = d.position.z;
      prevHoriz = horiz;
    }
    const diveSec = steps * FIXED_DT;
    // Animated, not instant: ≈(280 − 36) / 48 s of visible descent.
    expect(diveSec).toBeGreaterThan(4.5);
    expect(diveSec).toBeLessThan(5.7);
  });

  test("the strike still resolves at the 36 m asset cylinder, mid-descent", () => {
    // IMPACT is horizontal overflight of the asset cylinder; with the dive
    // descending at HOVER_DIVE_MPS that happens at ≈176 m altitude.
    const d = spawnKamikaze();
    tickUntil(d, "dive");
    let horiz = Math.hypot(d.position.x, d.position.z);
    let guard = 0;
    while (horiz > FACILITY_RADIUS && guard < 1200) {
      d.tick(FIXED_DT, 200);
      horiz = Math.hypot(d.position.x, d.position.z);
      guard += 1;
    }
    expect(d.position.y).toBeGreaterThan(150);
    expect(d.position.y).toBeLessThan(195);
  });

  test("the dive descends at HOVER_DIVE_MPS while closing horizontally at the same rate", () => {
    const d = spawnKamikaze();
    tickUntil(d, "dive");
    const y0 = d.position.y;
    const horiz0 = Math.hypot(d.position.x, d.position.z);
    for (let i = 0; i < 60; i++) d.tick(FIXED_DT, 200);
    const descent = (y0 - d.position.y) / (60 * FIXED_DT);
    const closing = (horiz0 - Math.hypot(d.position.x, d.position.z)) / (60 * FIXED_DT);
    expect(descent).toBeCloseTo(HOVER_DIVE_MPS, 1);
    expect(closing).toBeCloseTo(HOVER_DIVE_MPS, 1);
  });
});
