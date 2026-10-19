import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { Interactable } from './Interactable';

export class InteractionManager {
  private interactables: Map<string, Interactable> = new Map();
  private raycaster = new THREE.Raycaster();
  private lastInteractTimestamp = 0;
  private readonly dirTemp = new THREE.Vector3();
  private readonly toTargetTemp = new THREE.Vector3();

  register(interactable: Interactable): void {
    this.interactables.set(interactable.id, interactable);
  }

  unregister(id: string): void {
    this.interactables.delete(id);
  }

  get(id: string): Interactable | undefined {
    return this.interactables.get(id);
  }

  getAll(): Interactable[] {
    return Array.from(this.interactables.values());
  }

  findBestTarget(camera: THREE.Camera, playerPosition: THREE.Vector3): Interactable | null {
    camera.getWorldDirection(this.dirTemp);

    let bestCandidate: Interactable | null = null;
    let bestScore = Infinity;

    // 1. Check direct raycast against interactable meshes first
    const meshes: THREE.Object3D[] = [];
    const meshOwnerMap = new Map<THREE.Object3D, Interactable>();

    for (const item of this.interactables.values()) {
      if (!item.isEnabled()) continue;
      const maxDist = item.interactionRadius ?? GameConfig.PLAYER.INTERACTION_DISTANCE;
      if (playerPosition.distanceTo(item.position) <= maxDist + 1.0 && item.mesh) {
        meshes.push(item.mesh);
        item.mesh.traverse((child) => meshOwnerMap.set(child, item));
      }
    }

    if (meshes.length > 0) {
      this.raycaster.near = 0.05;
      this.raycaster.far = GameConfig.PLAYER.INTERACTION_DISTANCE + 0.6;
      this.raycaster.set(camera.position, this.dirTemp);
      const hits = this.raycaster.intersectObjects(meshes, true);
      for (const hit of hits) {
        const owner = meshOwnerMap.get(hit.object);
        if (owner && owner.isEnabled()) {
          const maxDist = owner.interactionRadius ?? GameConfig.PLAYER.INTERACTION_DISTANCE;
          if (hit.distance <= maxDist) {
            return owner;
          }
        }
      }
    }

    // 2. View-cone proximity check for reliable pickup/panel targeting
    for (const item of this.interactables.values()) {
      if (!item.isEnabled()) continue;
      const maxDist = item.interactionRadius ?? GameConfig.PLAYER.INTERACTION_DISTANCE;
      const dist = camera.position.distanceTo(item.position);
      if (dist > maxDist) continue;

      this.toTargetTemp.subVectors(item.position, camera.position).normalize();
      const dot = this.dirTemp.dot(this.toTargetTemp);

      // Allow wider angle when very close, tighter angle further away
      const minDot = dist < 1.35 ? 0.55 : 0.78;
      if (dot >= minDot) {
        const score = dist * (1.25 - dot);
        if (score < bestScore) {
          bestScore = score;
          bestCandidate = item;
        }
      }
    }

    return bestCandidate;
  }

  tryInteract(target: Interactable | null): boolean {
    if (!target || !target.isEnabled()) return false;
    const now = performance.now();
    if (now - this.lastInteractTimestamp < 220) {
      return false;
    }
    this.lastInteractTimestamp = now;
    target.interact();
    return true;
  }

  clear(): void {
    this.interactables.clear();
  }
}
