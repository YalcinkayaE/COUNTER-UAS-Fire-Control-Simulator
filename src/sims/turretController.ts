import * as THREE from "three";
import {
  ALIGN_TOLERANCE_RAD,
  FIRE_BURST,
  FIRE_COOLDOWN,
  PROJECTILE_SPEED,
  TURRET_SLEW_RAD,
} from "./constants";
import { angleBetween, clamp, solveIntercept, type InterceptSolution } from "./math";
import type { FireCall } from "./edgeComputer";

export type FireMode = "AUTO" | "MANUAL";

export type FireEvent = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  targetId: string;
  intercept: InterceptSolution;
};

/**
 * Unity analogue: TurretController.cs at Vector3.zero.
 * Consumes the edge-computer fire call, slews at 75°/s, fires on alignment.
 * MANUAL is the weapons-release bypass.
 */
export class TurretController {
  readonly position = new THREE.Vector3(0, 14, 0);
  readonly quaternion = new THREE.Quaternion();
  readonly barrelDir = new THREE.Vector3(0, 0, 1);
  mode: FireMode = "AUTO";
  cooldown = 0;
  /** Seconds left in the current 0.5 s burst. */
  burstLeft = 0;
  /** Seconds until a new burst may start. */
  recovery = 0;
  aligned = false;
  intercept: InterceptSolution | null = null;
  targetId: string | null = null;
  readonly muzzle = new THREE.Vector3();
  yaw = 0;
  pitch = 0.12;
  private burstAim: InterceptSolution | null = null;
  private burstTargetId: string | null = null;

  private readonly _aim = new THREE.Quaternion();
  private readonly _dummy = new THREE.Object3D();
  private readonly _look = new THREE.Vector3();
  private readonly _euler = new THREE.Euler();

  constructor() {
    this.syncFromYawPitch();
  }

  setMode(mode: FireMode): void {
    this.mode = mode;
  }

  toggleMode(): FireMode {
    this.mode = this.mode === "AUTO" ? "MANUAL" : "AUTO";
    return this.mode;
  }

  /** AUTO: slew to the edge-computer intercept. MANUAL: operator bypass. */
  update(
    dt: number,
    call: FireCall | null,
    mouseAim: THREE.Vector3 | null,
    fireHeld: boolean,
    keys: Set<string>,
  ): FireEvent | null {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recovery = Math.max(0, this.recovery - dt);
    if (this.burstLeft > 0) {
      this.burstLeft = Math.max(0, this.burstLeft - dt);
      if (this.burstLeft <= 0) {
        this.recovery = FIRE_BURST;
        this.burstAim = null;
        this.burstTargetId = null;
      }
    }

    this.targetId = call?.targetId ?? null;
    this.intercept = null;
    if (call) {
      this.intercept = solveIntercept(
        this.position,
        PROJECTILE_SPEED,
        call.track.position,
        call.track.velocity,
      );
    }

    if (this.mode === "AUTO" && this.intercept) {
      this._look.set(this.intercept.x, this.intercept.y, this.intercept.z);
      this.slewToward(lookToQuat(this.position, this._look, this._dummy, this._aim), dt);
    } else if (this.mode === "MANUAL") {
      let steer = 0;
      let pitchIn = 0;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) steer += 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) steer -= 1;
      if (keys.has("KeyW") || keys.has("ArrowUp")) pitchIn += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) pitchIn -= 1;
      if (steer !== 0 || pitchIn !== 0) {
        this.yaw += steer * TURRET_SLEW_RAD * dt;
        this.pitch = clamp(this.pitch + pitchIn * TURRET_SLEW_RAD * dt, -0.15, 1.15);
        this.syncFromYawPitch();
      } else if (mouseAim) {
        this.slewToward(lookToQuat(this.position, mouseAim, this._dummy, this._aim), dt);
      }
    }

    this.barrelDir.set(0, 0, 1).applyQuaternion(this.quaternion).normalize();
    this.muzzle.copy(this.position).addScaledVector(this.barrelDir, 18);

    if (call) {
      this.intercept = solveIntercept(
        this.muzzle,
        PROJECTILE_SPEED,
        call.track.position,
        call.track.velocity,
      );
    }

    this.aligned = false;
    if (this.intercept) {
      const tx = this.intercept.x - this.muzzle.x;
      const ty = this.intercept.y - this.muzzle.y;
      const tz = this.intercept.z - this.muzzle.z;
      const len = Math.hypot(tx, ty, tz) || 1;
      const ang = angleBetween(
        this.barrelDir.x,
        this.barrelDir.y,
        this.barrelDir.z,
        tx / len,
        ty / len,
        tz / len,
      );
      this.aligned = ang <= ALIGN_TOLERANCE_RAD;
    }

    const autoGate = this.mode === "AUTO" && Boolean(call?.autoEngage) && this.aligned;
    const manualGate = this.mode === "MANUAL" && fireHeld && this.aligned;
    const gate = Boolean(this.intercept) && Boolean(this.targetId) && (autoGate || manualGate);

    if (this.burstLeft > 0 && this.mode === "MANUAL" && !fireHeld) {
      this.burstLeft = 0;
      this.recovery = FIRE_BURST;
      this.burstAim = null;
      this.burstTargetId = null;
    }
    if (gate && this.burstLeft <= 0 && this.recovery <= 0 && this.intercept && this.targetId) {
      this.burstLeft = FIRE_BURST;
      this.burstAim = this.intercept;
      this.burstTargetId = this.targetId;
    }

    const aim = this.burstAim ?? this.intercept;
    const id = this.burstTargetId ?? this.targetId;
    const shouldFire = this.burstLeft > 0 && this.cooldown <= 0 && Boolean(aim) && Boolean(id);
    if (shouldFire && aim && id) {
      this.cooldown = FIRE_COOLDOWN;
      return {
        from: this.muzzle.clone(),
        to: new THREE.Vector3(aim.x, aim.y, aim.z),
        targetId: id,
        intercept: aim,
      };
    }
    return null;
  }

  private slewToward(target: THREE.Quaternion, dt: number): void {
    this.quaternion.rotateTowards(target, TURRET_SLEW_RAD * dt);
    const euler = this._euler.setFromQuaternion(this.quaternion, "YXZ");
    this.yaw = euler.y;
    this.pitch = euler.x;
  }

  syncFromYawPitch(): void {
    const euler = this._euler.set(this.pitch, this.yaw, 0, "YXZ");
    this.quaternion.setFromEuler(euler);
    this.barrelDir.set(0, 0, 1).applyQuaternion(this.quaternion);
  }
}

function lookToQuat(
  from: THREE.Vector3,
  to: THREE.Vector3,
  dummy: THREE.Object3D,
  out: THREE.Quaternion,
): THREE.Quaternion {
  dummy.position.copy(from);
  dummy.up.set(0, 1, 0);
  dummy.lookAt(to);
  return out.copy(dummy.quaternion);
}
