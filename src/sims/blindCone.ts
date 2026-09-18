/**
 * Blind-cone derivation — the conical zone directly above the UGV that the
 * gun elevation limit and the radar elevation gate cannot cover, exploited by
 * the kamikaze dive. Half-angle = 90° − max elevation; apex at the turret on
 * the UGV, opening upward. All angles derive from constants.ts.
 */

import { DEG, RADAR_EL_MAX_DEG, TURRET_POS, type EffectorSpec } from "./constants";
import type { Vec3 } from "./math";

/** Cone half-angle from zenith for an elevation limit: 90° − max elevation. */
export function blindConeHalfAngle(maxElevationDeg: number): number {
  return (90 - maxElevationDeg) * DEG;
}

/**
 * Engagement blind cone for the selected effector: above its elevation limit
 * the gun cannot engage. Follows the effector selector like the kill zone does.
 */
export function effectorBlindConeHalfAngle(spec: Pick<EffectorSpec, "elMaxDeg">): number {
  return blindConeHalfAngle(spec.elMaxDeg);
}

/** Radar blind cone: above the radar's elevation gate the sector cannot see. */
export const RADAR_BLIND_CONE_HALF_ANGLE = blindConeHalfAngle(RADAR_EL_MAX_DEG);

/** Both cones hang on the turret apex on the UGV roof. */
export const BLIND_CONE_APEX = { x: TURRET_POS.x, y: TURRET_POS.y, z: TURRET_POS.z } as const;

/** Horizontal radius of the cone opening at `heightAboveApex` meters above the apex. */
export function blindConeRadius(halfAngleRad: number, heightAboveApex: number): number {
  return Math.max(0, heightAboveApex) * Math.tan(halfAngleRad);
}

/**
 * A point on the cone surface relative to the apex: `heightAboveApex` up, at
 * `azimuthRad` from north, clockwise toward east (matching azimuthFromNorth).
 */
export function blindConeSurfacePoint(
  halfAngleRad: number,
  azimuthRad: number,
  heightAboveApex: number,
): [number, number, number] {
  const r = blindConeRadius(halfAngleRad, heightAboveApex);
  return [r * Math.sin(azimuthRad), heightAboveApex, r * Math.cos(azimuthRad)];
}

/**
 * True when a point (dx, dy, dz relative to the apex) sits inside the cone:
 * above the apex and steeper than the elevation limit.
 */
export function inBlindCone(
  maxElevationDeg: number,
  dx: number,
  dy: number,
  dz: number,
): boolean {
  if (dy <= 0) return false;
  return Math.atan2(dy, Math.hypot(dx, dz)) > maxElevationDeg * DEG;
}

/**
 * True when a track sits inside the engagement blind cone of the selected
 * effector — the gun cannot elevate to it. Apex is the turret on the UGV.
 */
export function trackInEngagementBlindCone(
  spec: Pick<EffectorSpec, "elMaxDeg">,
  track: Vec3,
  apex: Vec3,
): boolean {
  return inBlindCone(spec.elMaxDeg, track.x - apex.x, track.y - apex.y, track.z - apex.z);
}
