import * as THREE from 'three';
import { Interactable } from './Interactable';

export interface HidingSpotConfig {
  id: string;
  label: string;
  position: THREE.Vector3;
  hidePosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  exitYaw: number;
  mesh: THREE.Object3D;
  onToggleHide: (spot: HidingSpot) => void;
  isPlayerHidingHere: () => boolean;
}

export class HidingSpot implements Interactable {
  public readonly id: string;
  public readonly label: string;
  public readonly position: THREE.Vector3;
  public readonly hidePosition: THREE.Vector3;
  public readonly exitPosition: THREE.Vector3;
  public readonly exitYaw: number;
  public readonly mesh: THREE.Object3D;
  public readonly interactionRadius = 2.6;

  private readonly onToggleHide: (spot: HidingSpot) => void;
  private readonly isPlayerHidingHere: () => boolean;

  constructor(config: HidingSpotConfig) {
    this.id = config.id;
    this.label = config.label;
    this.position = config.position.clone();
    this.hidePosition = config.hidePosition.clone();
    this.exitPosition = config.exitPosition.clone();
    this.exitYaw = config.exitYaw;
    this.mesh = config.mesh;
    this.onToggleHide = config.onToggleHide;
    this.isPlayerHidingHere = config.isPlayerHidingHere;
  }

  isEnabled(): boolean {
    return true;
  }

  getPromptText(): string {
    if (this.isPlayerHidingHere()) {
      return `Press E to Exit ${this.label}`;
    }
    return `Press E to Hide in ${this.label}`;
  }

  interact(): void {
    this.onToggleHide(this);
  }
}
