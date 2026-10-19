import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { MathUtils } from '../utils/MathUtils';
import { CollisionWorld } from '../world/CollisionWorld';

export interface PlayerPerceptionState {
  position: THREE.Vector3;
  isHiding: boolean;
  isCrouching: boolean;
  flashlightLit: boolean;
}

export class MonsterPerception {
  private readonly halfFovRad = ((GameConfig.MONSTER.FOV_DEGREES * 0.5) * Math.PI) / 180;

  constructor(private readonly collisionWorld: CollisionWorld) {}

  canSeePlayer(
    monsterPosition: THREE.Vector3,
    monsterHeadingYaw: number,
    player: PlayerPerceptionState,
    sawPlayerEnterHiding = false
  ): boolean {
    if (player.isHiding && !sawPlayerEnterHiding) {
      return false;
    }

    const dx = player.position.x - monsterPosition.x;
    const dz = player.position.z - monsterPosition.z;
    const dist = Math.hypot(dx, dz);

    let maxSightRange = player.flashlightLit
      ? GameConfig.MONSTER.SIGHT_RANGE_LIT
      : GameConfig.MONSTER.SIGHT_RANGE_DARK;

    if (player.isCrouching && !player.flashlightLit) {
      maxSightRange *= 0.68;
    }

    if (dist > maxSightRange) {
      return false;
    }

    // Immediate peripheral awareness if player is right next to the creature (< 2.1m)
    if (dist > 2.1) {
      const forwardX = Math.sin(monsterHeadingYaw);
      const forwardZ = Math.cos(monsterHeadingYaw);
      const dirX = dx / (dist || 1);
      const dirZ = dz / (dist || 1);
      const dot = MathUtils.clamp(forwardX * dirX + forwardZ * dirZ, -1, 1);
      const angle = Math.acos(dot);

      if (angle > this.halfFovRad) {
        return false;
      }
    }

    return this.collisionWorld.hasLineOfSight(
      monsterPosition.x,
      monsterPosition.z,
      player.position.x,
      player.position.z
    );
  }

  canHearSound(
    monsterPosition: THREE.Vector3,
    soundX: number,
    soundZ: number,
    soundRadius: number
  ): boolean {
    if (soundRadius <= 0) return false;
    const dist = MathUtils.distance2D(monsterPosition.x, monsterPosition.z, soundX, soundZ);
    // Sound through walls is slightly attenuated (85% range) compared to clear corridor LOS
    const hasLos = this.collisionWorld.hasLineOfSight(
      monsterPosition.x,
      monsterPosition.z,
      soundX,
      soundZ
    );
    const effectiveRadius = hasLos ? soundRadius : soundRadius * 0.85;
    return dist <= effectiveRadius;
  }
}
