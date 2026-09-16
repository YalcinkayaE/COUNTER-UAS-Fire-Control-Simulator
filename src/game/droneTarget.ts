import * as THREE from "three";
import { DRONE_WEAVE_AMP, KILL_ZONE, OUTER_RADIUS } from "./constants";
import { hypot3, radialClosingSpeed, timeToBreach } from "./math";

const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();
const _inbound = new THREE.Vector3();

/**
 * Unity analogue: DroneTarget.cs
 * Kinematic UAV track with EDF time-to-breach against the 500 m kill zone.
 */
export class DroneTarget {
  readonly id: string;
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  readonly homeDir = new THREE.Vector3();
  speed = 20;
  alive = true;
  breached = false;
  distance = OUTER_RADIUS;
  radialVelocity = 0;
  timeToBreach = Number.POSITIVE_INFINITY;
  weavePhase = 0;
  weaveFreq = 0.4;
  headingOffset = 0;
  age = 0;
  rotor = 0;

  constructor(id: string) {
    this.id = id;
  }

  spawn(
    angle: number,
    altitude: number,
    speed: number,
    headingOffset: number,
    weavePhase: number,
    weaveFreq: number,
  ): void {
    this.alive = true;
    this.breached = false;
    this.speed = speed;
    this.headingOffset = headingOffset;
    this.weavePhase = weavePhase;
    this.weaveFreq = weaveFreq;
    this.age = 0;
    this.position.set(Math.cos(angle) * OUTER_RADIUS, altitude, Math.sin(angle) * OUTER_RADIUS);
    this.homeDir.set(-Math.cos(angle), 0, -Math.sin(angle)).normalize();
    _inbound.copy(this.homeDir).applyAxisAngle(_up, headingOffset);
    this.velocity.copy(_inbound).multiplyScalar(speed);
    this.refreshTrack();
  }

  tick(dt: number): void {
    if (!this.alive) return;
    this.age += dt;
    this.rotor += dt * (18 + this.speed * 0.4);

    const lateral = Math.sin(this.age * this.weaveFreq * Math.PI * 2 + this.weavePhase);
    _right.set(this.homeDir.z, 0, -this.homeDir.x).normalize();
    _inbound.copy(this.homeDir).applyAxisAngle(_up, this.headingOffset);
    this.velocity
      .copy(_inbound)
      .multiplyScalar(this.speed)
      .addScaledVector(_right, lateral * DRONE_WEAVE_AMP * this.weaveFreq * 0.9);
    this.position.addScaledVector(this.velocity, dt);
    this.refreshTrack();
  }

  refreshTrack(): void {
    this.distance = hypot3(this.position.x, this.position.y, this.position.z);
    this.radialVelocity = radialClosingSpeed(this.position, this.velocity);
    this.timeToBreach = timeToBreach(this.distance, this.radialVelocity, KILL_ZONE);
  }
}
