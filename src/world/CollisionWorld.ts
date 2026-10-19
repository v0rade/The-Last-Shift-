import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils';

export interface BoxCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  enabled: boolean;
  blocksSight: boolean;
  tag?: string;
}

export class CollisionWorld {
  private colliders: Map<string, BoxCollider> = new Map();

  addBox(
    id: string,
    centerX: number,
    centerY: number,
    centerZ: number,
    sizeX: number,
    sizeY: number,
    sizeZ: number,
    options?: { enabled?: boolean; blocksSight?: boolean; tag?: string }
  ): BoxCollider {
    const halfX = sizeX / 2;
    const halfY = sizeY / 2;
    const halfZ = sizeZ / 2;
    const box: BoxCollider = {
      id,
      minX: centerX - halfX,
      maxX: centerX + halfX,
      minY: centerY - halfY,
      maxY: centerY + halfY,
      minZ: centerZ - halfZ,
      maxZ: centerZ + halfZ,
      enabled: options?.enabled ?? true,
      blocksSight: options?.blocksSight ?? true,
      tag: options?.tag
    };
    this.colliders.set(id, box);
    return box;
  }

  setColliderEnabled(id: string, enabled: boolean): void {
    const c = this.colliders.get(id);
    if (c) {
      c.enabled = enabled;
    }
  }

  isColliderEnabled(id: string): boolean {
    return this.colliders.get(id)?.enabled ?? false;
  }

  resolveMovement(
    current: THREE.Vector3,
    desired: THREE.Vector3,
    radius: number,
    out = new THREE.Vector3()
  ): THREE.Vector3 {
    out.copy(desired);

    // Perform 2 passes of circle-vs-AABB pushout for stable corner sliding
    for (let pass = 0; pass < 2; pass++) {
      for (const box of this.colliders.values()) {
        if (!box.enabled) continue;
        if (out.y + 1.7 < box.minY || out.y > box.maxY) continue;

        const closestX = MathUtils.clamp(out.x, box.minX, box.maxX);
        const closestZ = MathUtils.clamp(out.z, box.minZ, box.maxZ);

        const dx = out.x - closestX;
        const dz = out.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            out.x += (dx / dist) * overlap;
            out.z += (dz / dist) * overlap;
          } else {
            // Center is inside the box; push out along shortest axis
            const leftPen = Math.abs(out.x - box.minX);
            const rightPen = Math.abs(box.maxX - out.x);
            const backPen = Math.abs(out.z - box.minZ);
            const frontPen = Math.abs(box.maxZ - out.z);
            const minPen = Math.min(leftPen, rightPen, backPen, frontPen);

            if (minPen === leftPen) out.x = box.minX - radius;
            else if (minPen === rightPen) out.x = box.maxX + radius;
            else if (minPen === backPen) out.z = box.minZ - radius;
            else out.z = box.maxZ + radius;
          }
        }
      }
    }

    return out;
  }

  hasLineOfSight(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    for (const box of this.colliders.values()) {
      if (!box.enabled || !box.blocksSight) continue;
      if (this.segmentIntersectsAABB2D(fromX, fromZ, toX, toZ, box)) {
        return false;
      }
    }
    return true;
  }

  private segmentIntersectsAABB2D(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    box: BoxCollider
  ): boolean {
    const dx = x2 - x1;
    const dz = z2 - z1;

    let tmin = 0;
    let tmax = 1;

    if (Math.abs(dx) < 1e-8) {
      if (x1 < box.minX || x1 > box.maxX) return false;
    } else {
      const invD = 1 / dx;
      let t1 = (box.minX - x1) * invD;
      let t2 = (box.maxX - x1) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    if (Math.abs(dz) < 1e-8) {
      if (z1 < box.minZ || z1 > box.maxZ) return false;
    } else {
      const invD = 1 / dz;
      let t1 = (box.minZ - z1) * invD;
      let t2 = (box.maxZ - z1) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    return tmin <= tmax;
  }

  clear(): void {
    this.colliders.clear();
  }
}
