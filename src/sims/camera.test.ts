import * as THREE from "three";
import { describe, expect, test } from "vitest";
import { DETECT_RADIUS } from "./constants";
import { azimuthFromNorth } from "./math";
import {
  CAMERA_2D_FIT_RADIUS,
  CAMERA_2D_POLAR,
  CAMERA_3D_POLAR,
  CAMERA_3D_RADIUS,
  CAMERA_FOV_DEG,
  CAMERA_NORTH_AZIMUTH,
  CAMERA_TARGET_Y,
  UAV_CONTACT_PX,
  applyPpiProjection,
  cameraFitRadius,
  northLockedCameraPosition,
  uavContactWorldSize,
} from "./camera";

describe("northLockedCameraPosition", () => {
  test("places the camera due south of the origin (azimuth π)", () => {
    const [x, , z] = northLockedCameraPosition(CAMERA_3D_POLAR, CAMERA_3D_RADIUS);
    expect(x).toBeCloseTo(0, 8);
    expect(z).toBeLessThan(0);
    expect(azimuthFromNorth(x, z)).toBeCloseTo(CAMERA_NORTH_AZIMUTH, 8);
  });

  test("2D polar is still south-of-origin so north stays screen-up", () => {
    const [x, y, z] = northLockedCameraPosition(CAMERA_2D_POLAR, CAMERA_2D_FIT_RADIUS);
    expect(x).toBeCloseTo(0, 6);
    expect(z).toBeLessThan(0);
    expect(y).toBeGreaterThan(CAMERA_2D_FIT_RADIUS * 0.9);
    expect(azimuthFromNorth(x, z)).toBeCloseTo(Math.PI, 6);
  });
});

describe("cameraFitRadius", () => {
  test("square/landscape FOV covers the 2 km detect diameter with margin", () => {
    const halfFov = ((CAMERA_FOV_DEG * Math.PI) / 180) / 2;
    const visibleDiameter = 2 * CAMERA_2D_FIT_RADIUS * Math.tan(halfFov);
    expect(visibleDiameter).toBeGreaterThan(DETECT_RADIUS * 2);
  });

  test("portrait fit is farther so the ring still fits the short width", () => {
    expect(cameraFitRadius(0.46)).toBeGreaterThan(cameraFitRadius(1.6));
  });
});

describe("applyPpiProjection", () => {
  test("projects east to the right and north up, matching the PPI", () => {
    const cam = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 2, 20000);
    const [x, y, z] = northLockedCameraPosition(CAMERA_2D_POLAR, CAMERA_2D_FIT_RADIUS);
    cam.position.set(x, y, z);
    cam.lookAt(0, CAMERA_TARGET_Y, 0);
    cam.updateMatrixWorld();
    applyPpiProjection(cam);

    const east = new THREE.Vector3(DETECT_RADIUS, 0, 0).project(cam);
    const west = new THREE.Vector3(-DETECT_RADIUS, 0, 0).project(cam);
    const north = new THREE.Vector3(0, 0, DETECT_RADIUS).project(cam);
    const south = new THREE.Vector3(0, 0, -DETECT_RADIUS).project(cam);

    expect(east.x).toBeGreaterThan(west.x);
    expect(north.y).toBeGreaterThan(south.y);
  });
});

describe("uavContactWorldSize", () => {
  test("2 km fit distance keeps a contact near the target pixel size", () => {
    const dist = CAMERA_2D_FIT_RADIUS;
    const size = uavContactWorldSize(dist, 900);
    const fov = (CAMERA_FOV_DEG * Math.PI) / 180;
    const px = (size / dist) * (900 / fov);
    expect(px).toBeGreaterThanOrEqual(UAV_CONTACT_PX - 1);
    expect(px).toBeLessThanOrEqual(UAV_CONTACT_PX + 1);
  });
});
