import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { NavigationGraph } from '../world/NavigationGraph';
import { MonsterNavigation } from './MonsterNavigation';
import { MonsterPerception, PlayerPerceptionState } from './MonsterPerception';

export type MonsterState =
  | 'IDLE'
  | 'PATROL'
  | 'INVESTIGATE'
  | 'CHASE'
  | 'SEARCH'
  | 'ATTACK'
  | 'COOLDOWN';

export class MonsterAI {
  public readonly position = new THREE.Vector3(0, 0, -28);
  private headingYaw = 0;
  private state: MonsterState = 'IDLE';
  private stateTimer = 0;
  private active = false;
  private lastKnownPlayerPos = new THREE.Vector3();
  private sawPlayerEnterHiding = false;
  private searchSubWaypointCount = 0;

  constructor(
    private readonly perception: MonsterPerception,
    private readonly navigation: MonsterNavigation,
    private readonly navGraph: NavigationGraph,
    private readonly events: EventBus
  ) {}

  setActive(active: boolean, spawnPos?: THREE.Vector3): void {
    this.active = active;
    if (spawnPos) {
      this.position.copy(spawnPos);
    }
    if (active && this.state === 'IDLE') {
      this.transitionTo('PATROL');
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getState(): MonsterState {
    return this.state;
  }

  getHeadingYaw(): number {
    return this.headingYaw;
  }

  getLastKnownPlayerPosition(): THREE.Vector3 {
    return this.lastKnownPlayerPos.clone();
  }

  notifyPlayerEnteredHiding(playerPos: THREE.Vector3): void {
    if (!this.active) return;
    const dist = MathUtils.distance2D(this.position.x, this.position.z, playerPos.x, playerPos.z);
    // Only compromises hiding spot if monster is actively chasing within 8m with clear LOS
    if (this.state === 'CHASE' && dist < 8.0) {
      const canSee = this.perception.canSeePlayer(
        this.position,
        this.headingYaw,
        {
          position: playerPos,
          isHiding: false,
          isCrouching: false,
          flashlightLit: true
        },
        true
      );
      this.sawPlayerEnterHiding = canSee;
    } else {
      this.sawPlayerEnterHiding = false;
    }
  }

  notifySoundEvent(
    x: number,
    z: number,
    radius: number,
    source: 'walk' | 'sprint' | 'crouch' | 'decoy' | 'interaction'
  ): boolean {
    if (!this.active) return false;
    if (this.state === 'ATTACK' || this.state === 'COOLDOWN') return false;

    const heard = this.perception.canHearSound(this.position, x, z, radius);
    if (!heard) return false;

    // A thrown decoy bottle lures the creature even if it was searching or chasing from afar
    if (source === 'decoy') {
      this.sawPlayerEnterHiding = false;
      this.lastKnownPlayerPos.set(x, 0, z);
      this.navigation.setDestination(this.position, this.lastKnownPlayerPos);
      this.transitionTo('INVESTIGATE');
      return true;
    }

    if (this.state !== 'CHASE') {
      this.lastKnownPlayerPos.set(x, 0, z);
      this.navigation.setDestination(this.position, this.lastKnownPlayerPos);
      this.transitionTo('INVESTIGATE');
      return true;
    }

    return false;
  }

  forceStateForTest(state: MonsterState, targetPos?: THREE.Vector3): void {
    if (targetPos) {
      this.lastKnownPlayerPos.copy(targetPos);
      this.navigation.setDestination(this.position, targetPos);
    }
    this.transitionTo(state);
  }

  update(dt: number, player: PlayerPerceptionState): void {
    if (!this.active) return;

    this.stateTimer += dt;
    const distToPlayer = MathUtils.distance2D(
      this.position.x,
      this.position.z,
      player.position.x,
      player.position.z
    );

    if (!player.isHiding) {
      this.sawPlayerEnterHiding = false;
    }

    const canSee =
      this.state !== 'COOLDOWN' &&
      this.state !== 'ATTACK' &&
      this.perception.canSeePlayer(
        this.position,
        this.headingYaw,
        player,
        this.sawPlayerEnterHiding
      );

    if (canSee) {
      this.lastKnownPlayerPos.copy(player.position);
      if (this.state !== 'CHASE') {
        this.transitionTo('CHASE');
      }
    }

    switch (this.state) {
      case 'IDLE': {
        if (this.stateTimer >= GameConfig.MONSTER.IDLE_DURATION) {
          const nextTarget = this.navigation.getNextPatrolTarget(this.position);
          this.navigation.setDestination(this.position, nextTarget);
          this.transitionTo('PATROL');
        }
        break;
      }

      case 'PATROL': {
        const moveRes = this.navigation.moveAlongPath(
          dt,
          this.position,
          this.headingYaw,
          GameConfig.MONSTER.PATROL_SPEED
        );
        this.headingYaw = moveRes.yaw;
        if (moveRes.reached) {
          this.transitionTo('IDLE');
        }
        break;
      }

      case 'INVESTIGATE': {
        const moveRes = this.navigation.moveAlongPath(
          dt,
          this.position,
          this.headingYaw,
          GameConfig.MONSTER.INVESTIGATE_SPEED
        );
        this.headingYaw = moveRes.yaw;
        if (moveRes.reached || this.stateTimer >= GameConfig.MONSTER.INVESTIGATE_DURATION) {
          this.searchSubWaypointCount = 0;
          this.transitionTo('SEARCH');
        }
        break;
      }

      case 'CHASE': {
        if (
          distToPlayer <= GameConfig.MONSTER.ATTACK_DISTANCE &&
          (!player.isHiding || this.sawPlayerEnterHiding)
        ) {
          this.transitionTo('ATTACK');
          this.events.emit('monster:attack', {
            reason: 'Subject 09 caught you in the facility.'
          });
          return;
        }

        if (canSee) {
          this.navigation.setDestination(this.position, player.position);
          const moveRes = this.navigation.moveAlongPath(
            dt,
            this.position,
            this.headingYaw,
            GameConfig.MONSTER.CHASE_SPEED
          );
          this.headingYaw = moveRes.yaw;
        } else {
          // Lost line of sight: move to last known position and transition to SEARCH
          this.navigation.setDestination(this.position, this.lastKnownPlayerPos);
          this.searchSubWaypointCount = 0;
          this.transitionTo('SEARCH');
        }
        break;
      }

      case 'SEARCH': {
        const moveRes = this.navigation.moveAlongPath(
          dt,
          this.position,
          this.headingYaw,
          GameConfig.MONSTER.SEARCH_SPEED
        );
        this.headingYaw = moveRes.yaw;

        if (moveRes.reached && this.searchSubWaypointCount < 2) {
          this.searchSubWaypointCount += 1;
          const jitterX = this.lastKnownPlayerPos.x + (Math.random() * 5 - 2.5);
          const jitterZ = this.lastKnownPlayerPos.z + (Math.random() * 5 - 2.5);
          const node = this.navGraph.getNearestNode(new THREE.Vector3(jitterX, 0, jitterZ));
          if (node) {
            this.navigation.setDestination(this.position, node.position);
          }
        }

        if (this.stateTimer >= GameConfig.MONSTER.SEARCH_DURATION) {
          this.transitionTo('COOLDOWN');
        }
        break;
      }

      case 'ATTACK': {
        if (this.stateTimer >= 1.2) {
          this.transitionTo('COOLDOWN');
        }
        break;
      }

      case 'COOLDOWN': {
        const moveRes = this.navigation.moveAlongPath(
          dt,
          this.position,
          this.headingYaw,
          GameConfig.MONSTER.PATROL_SPEED
        );
        this.headingYaw = moveRes.yaw;

        if (this.stateTimer >= GameConfig.MONSTER.COOLDOWN_DURATION || moveRes.reached) {
          const nextPatrol = this.navigation.getNextPatrolTarget(this.position);
          this.navigation.setDestination(this.position, nextPatrol);
          this.transitionTo('PATROL');
        }
        break;
      }
    }
  }

  private transitionTo(next: MonsterState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    this.stateTimer = 0;

    if (next === 'COOLDOWN') {
      const farNode = this.navGraph.getFarthestPatrolNode(this.lastKnownPlayerPos);
      if (farNode) {
        this.navigation.setDestination(this.position, farNode.position);
      }
    }

    this.events.emit('monster:state', {
      state: next,
      prevState: prev,
      distanceToPlayer: MathUtils.distance2D(
        this.position.x,
        this.position.z,
        this.lastKnownPlayerPos.x,
        this.lastKnownPlayerPos.z
      )
    });
  }
}
