/** C-UAS battlespace constants — meters, seconds, degrees. */

export const OUTER_RADIUS = 1000;
export const DETECT_RADIUS = 2000;
export const FACILITY_RADIUS = 36;

/** Raid pools: each wave spawns a random 8–16 quads and 2–3 fixed-wing. */
export const QUAD_COUNT_MIN = 8;
export const QUAD_COUNT_MAX = 16;
export const FIXED_WING_COUNT_MIN = 2;
export const FIXED_WING_COUNT_MAX = 3;
export const DRONE_POOL_MAX = QUAD_COUNT_MAX + FIXED_WING_COUNT_MAX;
export const RADAR_MAX_TRACKS = 20;
/**
 * Quad raid corridor: 30° wide; its center shifts each wave within ±27° of
 * north so the ±40% azimuth maneuver still stays inside the radar sector.
 */
export const QUAD_CORRIDOR_WIDTH_DEG = 30;
export const QUAD_CORRIDOR_CENTER_MAX_DEG = 27;
/** Fixed-wing ingress: azimuth 8–34° east of north plus 4° per airframe. */
export const FIXED_WING_AZ_MIN_DEG = 8;
export const FIXED_WING_AZ_SPAN_DEG = 26;
export const DRONE_SPEED_MIN = 12;
export const DRONE_SPEED_MAX = 38;
export const DRONE_ALT_MIN = 28;
export const DRONE_ALT_MAX = 165;
/** Slow path change: altitude, azimuth, and speed each vary by up to this fraction. */
export const DRONE_MANEUVER_FRAC = 0.4;
export const FIXED_WING_SPEED_MIN = 72;
export const FIXED_WING_SPEED_MAX = 96;
export const FIXED_WING_ALT_MIN = 70;
export const FIXED_WING_ALT_MAX = 190;

export const RADAR_HZ = 10;
export const RADAR_DT = 1 / RADAR_HZ;
export const FIXED_DT = 1 / 60;

/**
 * Single Echodyne Guard-class AESA: a 120° az × 80° el staring sector.
 * Boresight is north, so azimuth coverage is ±60° around north and
 * elevation coverage is the 80° window above the horizon.
 */
export const RADAR_AZ_FOV_DEG = 120;
export const RADAR_EL_MIN_DEG = 0;
export const RADAR_EL_MAX_DEG = 80;
/** Boresight azimuth, degrees from north. */
export const RADAR_BORESIGHT_AZ_DEG = 0;
/** Angular measurement accuracy: azimuth within ±1°, elevation within ±1.5°. */
export const RADAR_AZ_ACCURACY_DEG = 1;
export const RADAR_EL_ACCURACY_DEG = 1.5;

export const TURRET_POS = { x: 0, y: 14, z: 0 } as const;
/** Echodyne-class AESA on the UGV roof. Simulated reports only. */
export const RADAR_POS = { x: 0, y: 16, z: 0 } as const;
export const TURRET_SLEW_DEG = 75;
export const TURRET_SLEW_RAD = (TURRET_SLEW_DEG * Math.PI) / 180;
export const ALIGN_TOLERANCE_DEG = 0.85;
export const ALIGN_TOLERANCE_RAD = (ALIGN_TOLERANCE_DEG * Math.PI) / 180;
/** Stay on the current fire-call track unless another deadline is earlier by this much. */
export const COMMIT_HYSTERESIS_SEC = 1.5;

export const EFFECTOR_IDS = ["CAKIR", "HN-12", "PENCE-A"] as const;
export type EffectorId = (typeof EFFECTOR_IDS)[number];

export type EffectorSpec = {
  id: EffectorId;
  rpm: number;
  range: number;
};

export const EFFECTORS: Record<EffectorId, EffectorSpec> = {
  CAKIR: { id: "CAKIR", rpm: 1350, range: 400 },
  "HN-12": { id: "HN-12", rpm: 1000, range: 200 },
  "PENCE-A": { id: "PENCE-A", rpm: 120, range: 400 },
};

export const DEFAULT_EFFECTOR_ID: EffectorId = "HN-12";

export function fireCooldownSec(rpm: number): number {
  if (!(rpm > 0) || !Number.isFinite(rpm)) {
    throw new Error("effector rate of fire must be a positive finite rpm");
  }
  return 60 / rpm;
}

/** Outer-fence intercept completes in FIRE_BURST seconds. */
export const FIRE_BURST = 0.5;
export const PROJECTILE_SPEED = OUTER_RADIUS / FIRE_BURST;
export const PROJECTILE_TTL = FIRE_BURST;
export const HIT_RADIUS = 48;
/** Default effector (HN-12) rate of fire. */
export const FIRE_RPM = EFFECTORS[DEFAULT_EFFECTOR_ID].rpm;
export const FIRE_COOLDOWN = fireCooldownSec(FIRE_RPM);
export const MAX_IN_FLIGHT = 16;

export const STARTING_LIVES = 5;
export const MAX_WAVES = 8;

export const HIGH_SCORE_KEY = "sentinel-cuas-v1";

export const DEG = Math.PI / 180;

/** Unlit contact colours against the dark battlespace; match PPI class colours, brighter. */
export const UAV_QUAD_CONTACT = "#b5e8c8";
export const UAV_FIXED_WING_CONTACT = "#e8cc55";
export const UAV_IMMINENT_CONTACT = "#e56b5c";
