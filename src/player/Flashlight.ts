import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';

export class Flashlight {
  public readonly spotLight: THREE.SpotLight;
  public readonly fillLight: THREE.PointLight;
  public readonly target: THREE.Object3D;
  public readonly handheldMesh: THREE.Group;

  private enabled = true;
  private battery: number = GameConfig.FLASHLIGHT.MAX_BATTERY;
  private malfunctionTimer = 0;
  private flickerPhase = 0;
  private reducedFlashing = false;
  private lensMat: THREE.MeshStandardMaterial;

  constructor(private readonly events: EventBus) {
    // Primary tactical beam with bright center hotspot and smooth wide penumbra spill
    this.spotLight = new THREE.SpotLight(
      0xfff6e5,
      GameConfig.FLASHLIGHT.FULL_INTENSITY,
      GameConfig.FLASHLIGHT.DISTANCE,
      GameConfig.FLASHLIGHT.OUTER_ANGLE,
      0.72,
      1.15
    );
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 0.25;
    this.spotLight.shadow.camera.far = GameConfig.FLASHLIGHT.DISTANCE;
    this.spotLight.shadow.bias = -0.0005;

    // Close bounce fill light
    this.fillLight = new THREE.PointLight(0xdceeff, 1.25, 7.5, 1.4);
    this.target = new THREE.Object3D();
    this.spotLight.target = this.target;

    // 3D handheld tactical flashlight model in lower-right view
    this.handheldMesh = new THREE.Group();
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x222830,
      roughness: 0.35,
      metalness: 0.85
    });
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x566370,
      roughness: 0.25,
      metalness: 0.9
    });
    this.lensMat = new THREE.MeshStandardMaterial({
      color: 0xfff8e7,
      emissive: 0xfff2cc,
      emissiveIntensity: 2.2,
      roughness: 0.1
    });

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.22, 14), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.06, 16), bezelMat);
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0, -0.12);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.01, 16), this.lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, -0.151);

    this.handheldMesh.add(barrel, head, lens);
  }

  attachToCamera(camera: THREE.Camera, scene: THREE.Scene): void {
    this.spotLight.position.set(0.18, -0.14, -0.12);
    this.fillLight.position.set(0, 0, -0.18);
    this.target.position.set(0, -0.05, -8);
    this.handheldMesh.position.set(0.24, -0.21, -0.34);

    camera.add(this.spotLight);
    camera.add(this.fillLight);
    camera.add(this.target);
    camera.add(this.handheldMesh);
    if (!camera.parent) {
      scene.add(camera);
    }
  }

  setReducedFlashing(reduced: boolean): void {
    this.reducedFlashing = reduced;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    this.syncLightIntensity();
    this.emitState();
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.syncLightIntensity();
    this.emitState();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isEffectivelyLit(): boolean {
    return this.enabled && this.battery > 0 && this.malfunctionTimer <= 0;
  }

  getBattery(): number {
    return this.battery;
  }

  setBattery(value: number): void {
    this.battery = MathUtils.clamp(value, 0, GameConfig.FLASHLIGHT.MAX_BATTERY);
    this.syncLightIntensity();
    this.emitState();
  }

  recharge(amount = GameConfig.FLASHLIGHT.BATTERY_PICKUP_AMOUNT): number {
    this.battery = MathUtils.clamp(
      this.battery + amount,
      0,
      GameConfig.FLASHLIGHT.MAX_BATTERY
    );
    this.syncLightIntensity();
    this.emitState();
    return this.battery;
  }

  triggerMalfunction(durationSeconds = 2.0): void {
    this.malfunctionTimer = Math.max(this.malfunctionTimer, durationSeconds);
    this.emitState();
  }

  update(dt: number): void {
    this.flickerPhase += dt * 14;

    if (this.malfunctionTimer > 0) {
      this.malfunctionTimer = Math.max(0, this.malfunctionTimer - dt);
    }

    if (this.enabled && this.battery > 0) {
      this.battery = MathUtils.clamp(
        this.battery - GameConfig.FLASHLIGHT.DRAIN_PER_SECOND * dt,
        0,
        GameConfig.FLASHLIGHT.MAX_BATTERY
      );
    }

    this.syncLightIntensity();
    this.emitState();
  }

  private syncLightIntensity(): void {
    if (!this.enabled) {
      this.spotLight.intensity = 0;
      this.fillLight.intensity = 0.28; // dark-adaptation visibility
      this.lensMat.emissiveIntensity = 0.05;
      return;
    }

    if (this.battery <= 0.01) {
      // Reserve dynamo glow: player can still navigate even if battery hits 0%
      this.spotLight.intensity = GameConfig.FLASHLIGHT.EMERGENCY_RESERVE_INTENSITY;
      this.fillLight.intensity = 0.42;
      this.lensMat.emissiveIntensity = 0.6;
      return;
    }

    let factor = 1.0;

    if (this.battery < GameConfig.FLASHLIGHT.LOW_BATTERY_THRESHOLD) {
      const ratio = this.battery / GameConfig.FLASHLIGHT.LOW_BATTERY_THRESHOLD;
      const pulse = this.reducedFlashing ? 0.85 : 0.72 + 0.28 * Math.sin(this.flickerPhase * 1.7);
      factor *= MathUtils.clamp(ratio * pulse, 0.32, 1.0);
    }

    if (this.malfunctionTimer > 0) {
      if (this.reducedFlashing) {
        factor *= 0.35;
      } else {
        const wave = Math.sin(this.flickerPhase * 3.8) + Math.cos(this.flickerPhase * 2.1);
        factor *= wave > 0.2 ? 0.2 : 0.82;
      }
    }

    this.spotLight.intensity = GameConfig.FLASHLIGHT.FULL_INTENSITY * factor;
    this.fillLight.intensity = 1.25 * factor;
    this.lensMat.emissiveIntensity = 2.2 * factor;
  }

  private emitState(): void {
    this.events.emit('player:flashlight', {
      enabled: this.enabled,
      battery: this.battery,
      malfunctioning: this.malfunctionTimer > 0
    });
  }
}
