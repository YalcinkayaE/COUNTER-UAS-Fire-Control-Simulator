/** C-UAS battlespace constants — meters, seconds, degrees. */

export const OUTER_RADIUS = 1000;
export const DETECT_RADIUS = 2000;
export const KILL_ZONE = 500;
export const FACILITY_RADIUS = 36;

export const QUAD_COUNT = 20;
export const FIXED_WING_COUNT = 2;
export const DRONE_COUNT = QUAD_COUNT + FIXED_WING_COUNT;
export const RADAR_MAX_TRACKS = 20;
/** Compass sector: degrees west of north. 10–60° is northwest inbound. */
export const SWARM_WEST_OF_NORTH_MIN_DEG = 10;
export const SWARM_WEST_OF_NORTH_MAX_DEG = 60;
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

export const TURRET_POS = { x: 0, y: 14, z: 0 } as const;
/** Echodyne-class AESA on the UGV roof. Simulated reports only. */
export const RADAR_POS = { x: 0, y: 16, z: 0 } as const;
export const TURRET_SLEW_DEG = 75;
export const TURRET_SLEW_RAD = (TURRET_SLEW_DEG * Math.PI) / 180;
export const ALIGN_TOLERANCE_DEG = 0.85;
export const ALIGN_TOLERANCE_RAD = (ALIGN_TOLERANCE_DEG * Math.PI) / 180;

/** Outer-fence intercept completes in FIRE_BURST seconds. */
export const FIRE_BURST = 0.5;
export const PROJECTILE_SPEED = OUTER_RADIUS / FIRE_BURST;
export const PROJECTILE_TTL = FIRE_BURST;
export const HIT_RADIUS = 48;
/** UGV gun: 1000 rounds/min, one kinetic type, 0.5 s burst. */
export const FIRE_RPM = 1000;
export const FIRE_COOLDOWN = 60 / FIRE_RPM;
export const MAX_IN_FLIGHT = 16;

export const STARTING_LIVES = 5;
export const MAX_WAVES = 8;

export const HIGH_SCORE_KEY = "sentinel-cuas-v1";

export const DEG = Math.PI / 180;
