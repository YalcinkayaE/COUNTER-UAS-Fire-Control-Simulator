/** Pure kinematics — quadratic intercept + EDF time-to-breach. */

export type Vec3 = { x: number; y: number; z: number };

export type InterceptSolution = Vec3 & { t: number };

export function hypot3(x: number, y: number, z: number): number {
  return Math.hypot(x, y, z);
}

export function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Closing speed toward the origin (positive = inbound). */
export function radialClosingSpeed(p: Vec3, v: Vec3): number {
  const d = hypot3(p.x, p.y, p.z);
  if (d < 1e-8) return 0;
  return -(p.x * v.x + p.y * v.y + p.z * v.z) / d;
}

/** Ground-plane range to the defended point (asset cylinder). */
export function horizontalRange(p: Vec3): number {
  return Math.hypot(p.x, p.z);
}

/** Ground-plane closing speed toward the origin (positive = inbound). */
export function horizontalClosingSpeed(p: Vec3, v: Vec3): number {
  const r = Math.hypot(p.x, p.z);
  if (r < 1e-8) return 0;
  return -(p.x * v.x + p.z * v.z) / r;
}

/**
 * Earliest-Deadline-First key.
 * Time-to-Breach = (horizontal range − asset radius) / horizontal closing speed.
 * The deadline is the 36 m asset cylinder, not the gun envelope. Receding
 * tracks return +Infinity. Already inside the cylinder → 0.
 */
export function timeToBreach(
  horiz: number,
  horizClosing: number,
  deadlineRadius: number,
): number {
  if (horiz <= deadlineRadius) return 0;
  if (horizClosing <= 1e-6) return Number.POSITIVE_INFINITY;
  return (horiz - deadlineRadius) / horizClosing;
}

/**
 * Quadratic intercept of a constant-velocity target.
 * |P + V t − S| = s t  →  (V·V − s²) t² + 2 (P−S)·V t + |P−S|² = 0
 * Returns the earliest positive time of flight and the 3D aim point.
 */
export function solveIntercept(
  shooter: Vec3,
  projectileSpeed: number,
  targetPos: Vec3,
  targetVel: Vec3,
): InterceptSolution | null {
  const ox = targetPos.x - shooter.x;
  const oy = targetPos.y - shooter.y;
  const oz = targetPos.z - shooter.z;
  const vx = targetVel.x;
  const vy = targetVel.y;
  const vz = targetVel.z;
  const s2 = projectileSpeed * projectileSpeed;

  const a = vx * vx + vy * vy + vz * vz - s2;
  const b = 2 * (ox * vx + oy * vy + oz * vz);
  const c = ox * ox + oy * oy + oz * oz;

  let t = -1;

  if (Math.abs(a) < 1e-8) {
    if (Math.abs(b) < 1e-8) return null;
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrt = Math.sqrt(disc);
    const t1 = (-b - sqrt) / (2 * a);
    const t2 = (-b + sqrt) / (2 * a);
    const valid1 = t1 > 1e-4;
    const valid2 = t2 > 1e-4;
    if (valid1 && valid2) t = Math.min(t1, t2);
    else if (valid1) t = t1;
    else if (valid2) t = t2;
  }

  if (!(t > 1e-4) || !Number.isFinite(t) || t > 30) return null;

  return {
    x: targetPos.x + vx * t,
    y: targetPos.y + vy * t,
    z: targetPos.z + vz * t,
    t,
  };
}

/** Shortest unsigned angle between two unit directions. */
export function angleBetween(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const d = ax * bx + ay * by + az * bz;
  return Math.acos(Math.min(1, Math.max(-1, d)));
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Azimuth from north (+Z), positive clockwise toward east (+X). */
export function azimuthFromNorth(east: number, north: number): number {
  return Math.atan2(east, north);
}

/** Elevation above the ground plane; 0 = horizon, +π/2 = zenith. */
export function elevationFromGround(dx: number, dy: number, dz: number): number {
  const horiz = Math.hypot(dx, dz);
  return Math.atan2(dy, horiz);
}

export function sphericalToCartesian(
  azimuth: number,
  elevation: number,
  range: number,
  origin: Vec3,
): Vec3 {
  const ce = Math.cos(elevation);
  return {
    x: origin.x + range * ce * Math.sin(azimuth),
    y: origin.y + range * Math.sin(elevation),
    z: origin.z + range * ce * Math.cos(azimuth),
  };
}

export function wrapTwoPi(rad: number): number {
  const t = rad % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}

export function formatTtb(t: number): string {
  if (!Number.isFinite(t)) return "REC";
  if (t <= 0) return "NOW";
  if (t >= 100) return t.toFixed(0);
  return t.toFixed(1);
}

export function formatDist(m: number): string {
  return m.toFixed(0);
}

export function formatBearingDeg(rad: number): string {
  let d = (rad * 180) / Math.PI;
  d = ((d % 360) + 360) % 360;
  return `${d.toFixed(0)}°`;
}

export function formatElevDeg(rad: number): string {
  return `${((rad * 180) / Math.PI).toFixed(0)}°`;
}
