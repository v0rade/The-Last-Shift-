import * as THREE from 'three';
import { Interactable } from './Interactable';

export type CollectibleKind = 'key' | 'keycard' | 'fuse' | 'battery' | 'decoy' | 'note';

export interface CollectibleConfig {
  id: string;
  name: string;
  kind: CollectibleKind;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  promptLabel?: string;
  reusable?: boolean;
  onCollect: (collectible: Collectible) => void;
}

export class Collectible implements Interactable {
  public readonly id: string;
  public readonly name: string;
  public readonly kind: CollectibleKind;
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Object3D;
  public readonly interactionRadius = 2.7;

  private collected = false;
  private readonly reusable: boolean;
  private readonly promptLabel: string;
  private readonly onCollect: (collectible: Collectible) => void;

  constructor(config: CollectibleConfig) {
    this.id = config.id;
    this.name = config.name;
    this.kind = config.kind;
    this.position = config.position.clone();
    this.mesh = config.mesh;
    this.reusable = config.reusable ?? config.kind === 'note';
    this.promptLabel =
      config.promptLabel ??
      (config.kind === 'note' ? `Press E to Read "${config.name}"` : `Press E to Pick Up ${config.name}`);
    this.onCollect = config.onCollect;
  }

  isEnabled(): boolean {
    if (this.reusable) return true;
    return !this.collected;
  }

  isCollected(): boolean {
    return this.collected;
  }

  markCollected(hideMesh = !this.reusable): void {
    this.collected = true;
    if (hideMesh) {
      this.mesh.visible = false;
    }
  }

  reset(): void {
    this.collected = false;
    this.mesh.visible = true;
  }

  getPromptText(): string {
    return this.promptLabel;
  }

  interact(): void {
    if (!this.isEnabled()) return;
    this.markCollected(!this.reusable);
    this.onCollect(this);
  }
}
