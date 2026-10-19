import * as THREE from 'three';
import { AssetManager } from '../game/AssetManager';
import { Interactable } from '../interaction/Interactable';
import { EventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { CollisionWorld } from './CollisionWorld';

export interface DoorConfig {
  id: string;
  name: string;
  position: THREE.Vector3;
  axis: 'x' | 'z';
  width?: number;
  height?: number;
  locked?: boolean;
  requiredItemId?: string;
  requiredItemName?: string;
  lockReason?: string;
  canUnlockCheck?: () => { allowed: boolean; reason?: string };
  onUnlock?: (door: Door) => void;
  onAttemptLocked?: (door: Door, reason: string) => void;
}

export class Door implements Interactable {
  public readonly id: string;
  public readonly name: string;
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Group;
  public readonly interactionRadius = 2.8;

  private readonly axis: 'x' | 'z';
  private readonly width: number;
  private readonly height: number;
  private readonly colliderId: string;
  private readonly panelMesh: THREE.Group;
  private readonly indicatorFront: THREE.Mesh;
  private readonly indicatorBack: THREE.Mesh;
  private readonly closedOffset = 0;
  private readonly openOffset: number;
  private currentSlide = 0;

  private locked: boolean;
  private isOpen = false;
  private readonly requiredItemId?: string;
  private readonly requiredItemName?: string;
  private lockReason: string;
  private readonly canUnlockCheck?: () => { allowed: boolean; reason?: string };
  private readonly onUnlock?: (door: Door) => void;
  private readonly onAttemptLocked?: (door: Door, reason: string) => void;

  constructor(
    config: DoorConfig,
    private readonly assets: AssetManager,
    private readonly collisionWorld: CollisionWorld,
    private readonly events: EventBus
  ) {
    this.id = config.id;
    this.name = config.name;
    this.position = config.position.clone();
    this.axis = config.axis;
    this.width = config.width ?? 2.2;
    this.height = config.height ?? 2.7;
    this.locked = config.locked ?? false;
    this.requiredItemId = config.requiredItemId;
    this.requiredItemName = config.requiredItemName;
    this.lockReason = config.lockReason ?? 'Locked';
    this.canUnlockCheck = config.canUnlockCheck;
    this.onUnlock = config.onUnlock;
    this.onAttemptLocked = config.onAttemptLocked;
    this.openOffset = this.width * 0.88;
    this.colliderId = `door_collider_${this.id}`;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    const frameMat = this.assets.getMaterial('metal_dark');
    const panelMat = this.assets.getMaterial('metal_brushed');
    const windowMat = this.assets.getMaterial('glass_tinted');
    const hazardMat = this.assets.getMaterial('hazard_stripe');

    // Heavy beveled frame posts, threshold & magnetic header box
    const postGeo = this.assets.getBoxGeometry(0.18, this.height, 0.36);
    const leftPost = new THREE.Mesh(postGeo, frameMat);
    const rightPost = new THREE.Mesh(postGeo, frameMat);
    const headerGeo = this.assets.getBoxGeometry(this.width + 0.36, 0.22, 0.38);
    const header = new THREE.Mesh(headerGeo, frameMat);
    const threshold = new THREE.Mesh(
      this.assets.getBoxGeometry(this.width + 0.2, 0.03, 0.34),
      panelMat
    );

    leftPost.position.set(-this.width / 2 - 0.09, this.height / 2, 0);
    rightPost.position.set(this.width / 2 + 0.09, this.height / 2, 0);
    header.position.set(0, this.height + 0.11, 0);
    threshold.position.set(0, 0.015, 0);

    // Hinge barrels on left jamb
    for (const hy of [0.55, 1.35, 2.15]) {
      const hinge = new THREE.Mesh(
        this.assets.getCylinderGeometry(0.035, 0.035, 0.18, 10),
        panelMat
      );
      hinge.position.set(-this.width / 2 + 0.02, hy, 0.12);
      this.mesh.add(hinge);
    }

    // Detailed sliding security door assembly
    this.panelMesh = new THREE.Group();
    this.panelMesh.position.set(0, this.height / 2, 0);

    const coreLeaf = new THREE.Mesh(
      this.assets.getBoxGeometry(this.width, this.height, 0.12),
      panelMat
    );
    coreLeaf.castShadow = true;
    coreLeaf.receiveShadow = true;
    this.panelMesh.add(coreLeaf);

    // Recessed lower armor plate & bottom hazard kick-plate
    const lowerRecess = new THREE.Mesh(
      this.assets.getBoxGeometry(this.width - 0.28, 0.82, 0.145),
      frameMat
    );
    lowerRecess.position.set(0, -0.58, 0);
    const kickPlate = new THREE.Mesh(
      this.assets.getBoxGeometry(this.width - 0.16, 0.18, 0.15),
      hazardMat
    );
    kickPlate.position.set(0, -this.height / 2 + 0.14, 0);
    this.panelMesh.add(lowerRecess, kickPlate);

    // Reinforced observation window & metallic bezel
    const windowBezel = new THREE.Mesh(
      this.assets.getBoxGeometry(0.58, 0.78, 0.15),
      frameMat
    );
    windowBezel.position.set(0, 0.42, 0);
    const slitGlass = new THREE.Mesh(
      this.assets.getBoxGeometry(0.46, 0.66, 0.16),
      windowMat
    );
    slitGlass.position.set(0, 0.42, 0);
    this.panelMesh.add(windowBezel, slitGlass);

    // Stainless-steel crash bars / handles on both sides
    const handleBarGeo = this.assets.getCylinderGeometry(0.022, 0.022, 0.75, 10);
    const handleFront = new THREE.Mesh(handleBarGeo, panelMat);
    handleFront.rotation.z = Math.PI / 2;
    handleFront.position.set(0.32, -0.05, 0.1);

    const handleBack = new THREE.Mesh(handleBarGeo, panelMat);
    handleBack.rotation.z = Math.PI / 2;
    handleBack.position.set(0.32, -0.05, -0.1);
    this.panelMesh.add(handleFront, handleBack);

    // Access status LEDs on both sides of frame
    const ledGeo = this.assets.getBoxGeometry(0.44, 0.11, 0.07);
    const initialLedMat = this.locked
      ? this.assets.getMaterial('emissive_red')
      : this.assets.getMaterial('emissive_green');

    this.indicatorFront = new THREE.Mesh(ledGeo, initialLedMat);
    this.indicatorFront.position.set(0, this.height + 0.11, 0.2);
    this.indicatorBack = new THREE.Mesh(ledGeo, initialLedMat);
    this.indicatorBack.position.set(0, this.height + 0.11, -0.2);

    this.mesh.add(
      leftPost,
      rightPost,
      header,
      threshold,
      this.panelMesh,
      this.indicatorFront,
      this.indicatorBack
    );

    if (this.axis === 'z') {
      this.mesh.rotation.y = Math.PI / 2;
    }

    const sizeX = this.axis === 'x' ? this.width : 0.32;
    const sizeZ = this.axis === 'x' ? this.width : 0.32;
    this.collisionWorld.addBox(
      this.colliderId,
      this.position.x,
      this.height / 2,
      this.position.z,
      this.axis === 'x' ? sizeX : 0.32,
      this.height,
      this.axis === 'x' ? 0.32 : sizeZ,
      { enabled: !this.isOpen, blocksSight: true, tag: 'door' }
    );
  }

  isEnabled(): boolean {
    return true;
  }

  isLocked(): boolean {
    return this.locked;
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  getRequiredItemId(): string | undefined {
    return this.requiredItemId;
  }

  setLockReason(reason: string): void {
    this.lockReason = reason;
  }

  unlock(openImmediately = true): void {
    this.locked = false;
    this.syncIndicatorMaterial();
    if (openImmediately) {
      this.setOpen(true);
    }
    this.onUnlock?.(this);
  }

  setOpen(open: boolean): void {
    if (this.locked && open) return;
    this.isOpen = open;
    this.collisionWorld.setColliderEnabled(this.colliderId, !this.isOpen);
    this.syncIndicatorMaterial();
    this.events.emit('door:state', {
      id: this.id,
      isOpen: this.isOpen,
      locked: this.locked
    });
  }

  getPromptText(): string {
    if (this.locked) {
      if (this.requiredItemName) {
        return `Press E to Unlock ${this.name} (${this.requiredItemName})`;
      }
      return `Press E to Inspect ${this.name} (${this.lockReason})`;
    }
    return this.isOpen ? `Press E to Close ${this.name}` : `Press E to Open ${this.name}`;
  }

  interact(): void {
    if (this.locked) {
      if (this.canUnlockCheck) {
        const res = this.canUnlockCheck();
        if (res.allowed) {
          this.unlock(true);
          return;
        }
        const msg = res.reason ?? this.lockReason;
        this.onAttemptLocked?.(this, msg);
        this.events.emit('door:state', {
          id: this.id,
          isOpen: false,
          locked: true,
          message: msg
        });
        return;
      }

      this.onAttemptLocked?.(this, this.lockReason);
      this.events.emit('door:state', {
        id: this.id,
        isOpen: false,
        locked: true,
        message: this.lockReason
      });
      return;
    }

    this.setOpen(!this.isOpen);
  }

  update(dt: number): void {
    const targetSlide = this.isOpen ? this.openOffset : this.closedOffset;
    this.currentSlide = MathUtils.damp(this.currentSlide, targetSlide, 8.5, dt);
    this.panelMesh.position.x = this.currentSlide;
  }

  private syncIndicatorMaterial(): void {
    const mat = this.locked
      ? this.assets.getMaterial('emissive_red')
      : this.isOpen
        ? this.assets.getMaterial('emissive_green')
        : this.assets.getMaterial('emissive_amber');
    this.indicatorFront.material = mat;
    this.indicatorBack.material = mat;
  }
}
