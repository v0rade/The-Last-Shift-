import * as THREE from 'three';

export interface Interactable {
  readonly id: string;
  readonly position: THREE.Vector3;
  readonly interactionRadius?: number;
  readonly mesh?: THREE.Object3D;
  isEnabled(): boolean;
  getPromptText(): string;
  interact(): void;
}
