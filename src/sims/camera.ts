/**
 * North-locked operator camera.
 * World +Z is north. Camera sits south of origin (azimuth π) so north is screen-up.
 * lookAt from the south puts east on screen-left; applyPpiProjection flips clip-space X
 * so east is screen-right, matching the PPI (x = east, y = −north).
 */

import * as THREE from "three";
import { DETECT_RADIUS } from "./constants";

export type ViewMode = "2d" | "3d";

/** Orbit azimuth with the camera south of origin (looking north). */
export const CAMERA_NORTH_AZIMUTH = Math.PI;
export const CAMERA_TARGET_Y = 8;
export const CAMERA_FOV_DEG = 42;
export const CAMERA_3D_POLAR = 1.05;
export const CAMERA_3D_POLAR_MIN = 0.28;
export const CAMERA_3D_POLAR_MAX = 1.22;
export const CAMERA_3D_RADIUS = 580;
/** Near-zenith polar; 0 hits OrbitControls gimbal lock. */
export const CAMERA_2D_POLAR = 0.05;
export const CAMERA_MIN_RADIUS = 160;
export const CAMERA_2D_FIT_MARGIN = 1.35;
/** Narrowest viewport aspect we still try to fit the 2 km ring inside. */
export const CAMERA_MIN_ASPECT = 0.45;

function verticalHalfFov(): number {
  return ((CAMERA_FOV_DEG * Math.PI) / 180) / 2;
}

/** Camera distance that fits the 2 km detect ring in the current viewport. */
export function cameraFitRadius(aspect: number): number {
  const span = 2 * Math.tan(verticalHalfFov()) * Math.min(1, Math.max(aspect, CAMERA_MIN_ASPECT));
  return (DETECT_RADIUS * 2 * CAMERA_2D_FIT_MARGIN) / span;
}

export const CAMERA_2D_FIT_RADIUS = cameraFitRadius(1);
export const CAMERA_MAX_RADIUS = cameraFitRadius(CAMERA_MIN_ASPECT) * 1.15;
export const CAMERA_FAR = CAMERA_MAX_RADIUS + DETECT_RADIUS * 2;

export function northLockedCameraPosition(
  polar: number,
  radius: number,
): [number, number, number] {
  return [
    radius * Math.sin(polar) * Math.sin(CAMERA_NORTH_AZIMUTH),
    CAMERA_TARGET_Y + radius * Math.cos(polar),
    radius * Math.sin(polar) * Math.cos(CAMERA_NORTH_AZIMUTH),
  ];
}

/** Flip clip-space X so world +X (east) is on the right, matching the PPI. */
export function applyPpiProjection(camera: THREE.Camera): void {
  camera.scale.set(1, 1, 1);
  const e = camera.projectionMatrix.elements;
  if (e[0] > 0) {
    e[0] = -e[0];
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
}

export const UAV_CONTACT_PX = 16;
export const UAV_CONTACT_MIN_M = 8;
export const UAV_CONTACT_MAX_M = 140;
/** Hide the far-contact disc when the detailed mesh already fills the view. */
export const UAV_CONTACT_HIDE_M = 220;

/** World-space disc diameter so a UAV stays about UAV_CONTACT_PX tall on screen. */
export function uavContactWorldSize(distance: number, viewHeight: number): number {
  const fov = (CAMERA_FOV_DEG * Math.PI) / 180;
  const size = (UAV_CONTACT_PX / Math.max(viewHeight, 1)) * distance * fov;
  return Math.min(UAV_CONTACT_MAX_M, Math.max(UAV_CONTACT_MIN_M, size));
}
