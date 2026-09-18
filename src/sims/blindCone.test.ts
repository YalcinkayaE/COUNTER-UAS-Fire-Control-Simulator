import { describe, expect, test } from "vitest";
import {
  BLIND_CONE_APEX,
  RADAR_BLIND_CONE_HALF_ANGLE,
  blindConeHalfAngle,
  blindConeRadius,
  blindConeSurfacePoint,
  effectorBlindConeHalfAngle,
  inBlindCone,
  trackInEngagementBlindCone,
} from "./blindCone";
import { DEG, EFFECTORS, RADAR_EL_MAX_DEG, TURRET_EL_MAX_DEG, TURRET_POS } from "./constants";

describe("blind cone", () => {
  test("half-angle is 90° − max elevation", () => {
    expect(blindConeHalfAngle(70)).toBeCloseTo(20 * DEG, 12);
    expect(blindConeHalfAngle(80)).toBeCloseTo(10 * DEG, 12);
    expect(blindConeHalfAngle(0)).toBeCloseTo(Math.PI / 2, 12);
    expect(blindConeHalfAngle(90)).toBeCloseTo(0, 12);
  });

  test("the engagement cone follows the selected effector's elevation limit", () => {
    expect(EFFECTORS.CAKIR.elMaxDeg).toBe(70);
    expect(effectorBlindConeHalfAngle(EFFECTORS.CAKIR) / DEG).toBeCloseTo(20, 9);
    expect(EFFECTORS["HN-12"].elMaxDeg).toBe(85);
    expect(effectorBlindConeHalfAngle(EFFECTORS["HN-12"]) / DEG).toBeCloseTo(5, 9);
    // PENCE-A has no per-effector spec yet — placeholder window −8°/+70°.
    expect(EFFECTORS["PENCE-A"].elMaxDeg).toBe(TURRET_EL_MAX_DEG);
    expect(effectorBlindConeHalfAngle(EFFECTORS["PENCE-A"]) / DEG).toBeCloseTo(20, 9);
  });

  test("HN-12's cone sits inside the radar gate; CAKIR's contains it", () => {
    expect(RADAR_BLIND_CONE_HALF_ANGLE).toBeCloseTo((90 - RADAR_EL_MAX_DEG) * DEG, 12);
    expect(RADAR_BLIND_CONE_HALF_ANGLE / DEG).toBeCloseTo(10, 9);
    expect(effectorBlindConeHalfAngle(EFFECTORS["HN-12"])).toBeLessThan(
      RADAR_BLIND_CONE_HALF_ANGLE,
    );
    expect(effectorBlindConeHalfAngle(EFFECTORS.CAKIR)).toBeGreaterThan(
      RADAR_BLIND_CONE_HALF_ANGLE,
    );
  });

  test("apex sits at the turret on the UGV", () => {
    expect(BLIND_CONE_APEX).toEqual({ x: TURRET_POS.x, y: TURRET_POS.y, z: TURRET_POS.z });
    expect(BLIND_CONE_APEX.y).toBe(14);
  });

  test("radius grows linearly with height: r = h·tan(half-angle)", () => {
    const half = blindConeHalfAngle(70);
    expect(blindConeRadius(half, 0)).toBe(0);
    expect(blindConeRadius(half, 100)).toBeCloseTo(100 * Math.tan(20 * DEG), 9);
    expect(blindConeRadius(half, 406)).toBeCloseTo(406 * Math.tan(20 * DEG), 9);
    expect(blindConeRadius(half, -5)).toBe(0);
  });

  test("surface points sit exactly on the elevation limit as seen from the apex", () => {
    const half = blindConeHalfAngle(70);
    const [xn, yn, zn] = blindConeSurfacePoint(half, 0, 100);
    expect(xn).toBeCloseTo(0, 9);
    expect(yn).toBe(100);
    expect(zn).toBeCloseTo(100 * Math.tan(20 * DEG), 9);
    expect(Math.atan2(yn, Math.hypot(xn, zn))).toBeCloseTo(70 * DEG, 9);
    const [xe, , ze] = blindConeSurfacePoint(half, Math.PI / 2, 50);
    expect(ze).toBeCloseTo(0, 9);
    expect(xe).toBeCloseTo(50 * Math.tan(20 * DEG), 9);
    expect(Math.atan2(50, Math.hypot(xe, ze))).toBeCloseTo(70 * DEG, 9);
  });

  test("an overhead dive is inside the cone for every effector and the radar", () => {
    for (const spec of Object.values(EFFECTORS)) {
      expect(inBlindCone(spec.elMaxDeg, 0, 400, 2)).toBe(true);
    }
    expect(inBlindCone(RADAR_EL_MAX_DEG, 0, 400, 2)).toBe(true);
  });

  test("a 75° approach is blind for CAKIR but engageable under HN-12 and the radar", () => {
    const horiz = 100 / Math.tan(75 * DEG);
    expect(inBlindCone(EFFECTORS.CAKIR.elMaxDeg, 0, 100, horiz)).toBe(true);
    expect(inBlindCone(EFFECTORS["PENCE-A"].elMaxDeg, 0, 100, horiz)).toBe(true);
    expect(inBlindCone(EFFECTORS["HN-12"].elMaxDeg, 0, 100, horiz)).toBe(false);
    expect(inBlindCone(RADAR_EL_MAX_DEG, 0, 100, horiz)).toBe(false);
  });

  test("an 82° dive beats the radar gate but not the HN-12 gun", () => {
    const horiz = 100 / Math.tan(82 * DEG);
    expect(inBlindCone(RADAR_EL_MAX_DEG, 0, 100, horiz)).toBe(true);
    expect(inBlindCone(EFFECTORS.CAKIR.elMaxDeg, 0, 100, horiz)).toBe(true);
    expect(inBlindCone(EFFECTORS["HN-12"].elMaxDeg, 0, 100, horiz)).toBe(false);
  });

  test("a 45° approach is covered everywhere, and below the apex is never blind", () => {
    for (const spec of Object.values(EFFECTORS)) {
      expect(inBlindCone(spec.elMaxDeg, 0, 100, 100)).toBe(false);
    }
    expect(inBlindCone(RADAR_EL_MAX_DEG, 0, 100, 100)).toBe(false);
    expect(inBlindCone(70, 0, -10, 5)).toBe(false);
  });
});

describe("trackInEngagementBlindCone", () => {
  const apex = { x: TURRET_POS.x, y: TURRET_POS.y, z: TURRET_POS.z };

  test("the overhead kamikaze is inside every effector's cone", () => {
    const overhead = { x: 0, y: 420, z: 2 };
    for (const spec of Object.values(EFFECTORS)) {
      expect(trackInEngagementBlindCone(spec, overhead, apex)).toBe(true);
    }
  });

  test("the 280 m hover standoff is outside every cone", () => {
    const hover = { x: 0, y: 80, z: 280 };
    for (const spec of Object.values(EFFECTORS)) {
      expect(trackInEngagementBlindCone(spec, hover, apex)).toBe(false);
    }
  });

  test("mid-dive at ≈78° is inside CAKIR's cone but outside HN-12's", () => {
    const midDive = { x: 0, y: 300, z: 60 };
    expect(trackInEngagementBlindCone(EFFECTORS.CAKIR, midDive, apex)).toBe(true);
    expect(trackInEngagementBlindCone(EFFECTORS["PENCE-A"], midDive, apex)).toBe(true);
    expect(trackInEngagementBlindCone(EFFECTORS["HN-12"], midDive, apex)).toBe(false);
  });

  test("follows the turret apex when the UGV moves", () => {
    const movedApex = { x: 300, y: TURRET_POS.y, z: -40 };
    const track = { x: 300, y: 400, z: -38 };
    expect(trackInEngagementBlindCone(EFFECTORS.CAKIR, track, movedApex)).toBe(true);
    expect(trackInEngagementBlindCone(EFFECTORS.CAKIR, track, apex)).toBe(false);
  });

  test("under HN-12 the strike resolves at the 36 m cylinder before entering the 5° cone", () => {
    // Impact resolves on horizontal overflight while still ~217 m up (el ≈ 80°).
    const atImpact = { x: 0, y: TURRET_POS.y + 203, z: 36 };
    expect(trackInEngagementBlindCone(EFFECTORS["HN-12"], atImpact, apex)).toBe(false);
    expect(trackInEngagementBlindCone(EFFECTORS.CAKIR, atImpact, apex)).toBe(true);
  });
});
