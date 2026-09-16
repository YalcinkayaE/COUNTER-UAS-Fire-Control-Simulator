/** C-UAS battlespace constants — meters, seconds, degrees. */

export const OUTER_RADIUS = 1000;
export const KILL_ZONE = 500;
export const FACILITY_RADIUS = 36;

export const DRONE_COUNT = 20;
export const DRONE_SPEED_MIN = 15;
export const DRONE_SPEED_MAX = 30;
export const DRONE_ALT_MIN = 42;
export const DRONE_ALT_MAX = 118;
export const DRONE_HEADING_OFFSET_DEG = 8;
export const DRONE_WEAVE_AMP = 2;

export const RADAR_HZ = 10;
export const RADAR_DT = 1 / RADAR_HZ;
export const FIXED_DT = 1 / 60;

export const TURRET_POS = { x: 0, y: 14, z: 0 } as const;
export const TURRET_SLEW_DEG = 75;
export const TURRET_SLEW_RAD = (TURRET_SLEW_DEG * Math.PI) / 180;
export const ALIGN_TOLERANCE_DEG = 0.85;
export const ALIGN_TOLERANCE_RAD = (ALIGN_TOLERANCE_DEG * Math.PI) / 180;

export const PROJECTILE_SPEED = 240;
export const PROJECTILE_TTL = 8;
export const HIT_RADIUS = 48;
export const FIRE_COOLDOWN = 1.35;
export const MAX_IN_FLIGHT = 4;

export const STARTING_LIVES = 5;
export const MAX_WAVES = 8;

export const HIGH_SCORE_KEY = "sentinel-cuas-v1";

export const DEG = Math.PI / 180;
