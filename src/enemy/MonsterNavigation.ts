import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { MathUtils } from '../utils/MathUtils';
import { CollisionWorld } from '../world/CollisionWorld';
import { NavigationGraph } from '../world/NavigationGraph';

export class MonsterNavigation {
  private path: THREE.Vector3[] = [];
  private patrolIndex = 0;
  private stuckTimer = 0;
  private lastProgressPos = new THREE.Vector3();
  private readonly desiredTemp = new THREE.Vector3();

  constructor(
    private readonly navGraph: NavigationGraph,
    private readonly collisionWorld: CollisionWorld
  ) {}

  setDestination(fromPos: THREE.Vector3, targetPos: THREE.Vector3): void {
    if (this.collisionWorld.hasLineOfSight(fromPos.x, fromPos.z, targetPos.x, targetPos.z)) {
      this.path = [targetPos.clone()];
    } else {
      this.path = this.navGraph.findPath(fromPos, targetPos);
    }
  }

  getNextPatrolTarget(currentPos: THREE.Vector3): THREE.Vector3 {
    const patrolNodes = this.navGraph.getPatrolNodes();
    if (patrolNodes.length === 0) {
      return currentPos.clone();
    }
    this.patrolIndex = (this.patrolIndex + 1) % patrolNodes.length;
    return patrolNodes[this.patrolIndex].position.clone();
  }

  moveAlongPath(
    dt: number,
    position: THREE.Vector3,
    currentYaw: number,
    speed: number
  ): { reached: boolean; yaw: number } {
    if (this.path.length === 0) {
      return { reached: true, yaw: currentYaw };
    }

    const waypoint = this.path[0];
    const dx = waypoint.x - position.x;
    const dz = waypoint.z - position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.48) {
      this.path.shift();
      if (this.path.length === 0) {
        return { reached: true, yaw: currentYaw };
      }
    }

    const activeTarget = this.path[0];
    const dirX = activeTarget.x - position.x;
    const dirZ = activeTarget.z - position.z;
    const len = Math.hypot(dirX, dirZ);

    if (len < 1e-4) {
      this.path.shift();
      return { reached: this.path.length === 0, yaw: currentYaw };
    }

    const normX = dirX / len;
    const normZ = dirZ / len;
    const targetYaw = Math.atan2(normX, normZ);
    const angleDiff = MathUtils.normalizeAngle(targetYaw - currentYaw);
    const nextYaw = currentYaw + angleDiff * Math.min(1, dt * 8.5);

    this.desiredTemp.set(
      position.x + normX * speed * dt,
      position.y,
      position.z + normZ * speed * dt
    );

    // Resolve against static walls, but use smaller radius (0.32) so monster navigates doorways cleanly
    this.collisionWorld.resolveMovement(position, this.desiredTemp, 0.32, position);

    // Check stuck recovery
    const movedDist = MathUtils.distance2D(
      position.x,
      position.z,
      this.lastProgressPos.x,
      this.lastProgressPos.z
    );
    if (movedDist > 0.25) {
      this.lastProgressPos.copy(position);
      this.stuckTimer = 0;
    } else {
      this.stuckTimer += dt;
      if (this.stuckTimer >= GameConfig.MONSTER.STUCK_TIMEOUT) {
        this.stuckTimer = 0;
        const nearest = this.navGraph.getNearestNode(position);
        if (nearest) {
          position.set(nearest.position.x, position.y, nearest.position.z);
        }
        this.path.shift();
      }
    }

    return { reached: false, yaw: nextYaw };
  }

  clearPath(): void {
    this.path = [];
    this.stuckTimer = 0;
  }
}
