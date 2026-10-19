import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { MathUtils } from '../utils/MathUtils';

export class PlayerCamera {
  public readonly camera: THREE.PerspectiveCamera;
  private yaw = Math.PI; // Facing North (-Z)
  private pitch = 0;
  private currentHeight: number = GameConfig.PLAYER.STANDING_HEIGHT;
  private bobTimer = 0;
  private shakeTrauma = 0;
  private sensitivity = 1.0;
  private reducedScreenShake = false;

  constructor(aspect = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.1, 65);
    this.camera.rotation.order = 'YXZ';
    this.syncRotation();
  }

  setSensitivity(sensitivity: number): void {
    this.sensitivity = MathUtils.clamp(sensitivity, 0.2, 3.0);
  }

  setReducedScreenShake(reduced: boolean): void {
    this.reducedScreenShake = reduced;
  }

  applyMouseDelta(movementX: number, movementY: number): void {
    const clampedX = MathUtils.clamp(movementX, -120, 120);
    const clampedY = MathUtils.clamp(movementY, -120, 120);
    const scale = 0.0021 * this.sensitivity;

    this.yaw -= clampedX * scale;
    this.pitch = MathUtils.clamp(this.pitch - clampedY * scale, -Math.PI * 0.45, Math.PI * 0.45);
    this.syncRotation();
  }

  setOrientation(yaw: number, pitch = 0): void {
    this.yaw = yaw;
    this.pitch = MathUtils.clamp(pitch, -Math.PI * 0.45, Math.PI * 0.45);
    this.syncRotation();
  }

  getYaw(): number {
    return this.yaw;
  }

  getPitch(): number {
    return this.pitch;
  }

  addTrauma(amount: number): void {
    if (this.reducedScreenShake) {
      this.shakeTrauma = MathUtils.clamp(this.shakeTrauma + amount * 0.2, 0, 0.25);
    } else {
      this.shakeTrauma = MathUtils.clamp(this.shakeTrauma + amount, 0, 1.0);
    }
  }

  update(
    dt: number,
    basePosition: THREE.Vector3,
    isCrouching: boolean,
    isMoving: boolean,
    isSprinting: boolean
  ): void {
    const targetHeight = isCrouching
      ? GameConfig.PLAYER.CROUCH_HEIGHT
      : GameConfig.PLAYER.STANDING_HEIGHT;

    this.currentHeight = MathUtils.damp(this.currentHeight, targetHeight, 12, dt);

    let bobOffsetY = 0;
    let bobOffsetX = 0;

    if (isMoving) {
      const freq = isSprinting ? 12.5 : isCrouching ? 5.5 : 8.2;
      const amp = this.reducedScreenShake
        ? 0.008
        : isSprinting
          ? 0.048
          : isCrouching
            ? 0.016
            : 0.028;
      this.bobTimer += dt * freq;
      bobOffsetY = Math.sin(this.bobTimer) * amp;
      bobOffsetX = Math.cos(this.bobTimer * 0.5) * amp * 0.5;
    } else {
      this.bobTimer = 0;
    }

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTrauma > 0) {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.4);
      const shakePower = this.shakeTrauma * this.shakeTrauma * 0.06;
      shakeX = (Math.random() * 2 - 1) * shakePower;
      shakeY = (Math.random() * 2 - 1) * shakePower;
    }

    this.camera.position.set(
      basePosition.x + bobOffsetX + shakeX,
      basePosition.y + this.currentHeight + bobOffsetY + shakeY,
      basePosition.z
    );
    this.syncRotation();
  }

  getForwardDirection(out = new THREE.Vector3()): THREE.Vector3 {
    this.camera.getWorldDirection(out);
    return out;
  }

  getFlatForward(out = new THREE.Vector3()): THREE.Vector3 {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    return out;
  }

  getFlatRight(out = new THREE.Vector3()): THREE.Vector3 {
    out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
    return out;
  }

  private syncRotation(): void {
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }
}
