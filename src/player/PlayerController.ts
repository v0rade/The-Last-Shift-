import * as THREE from 'three';
import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';
import { CollisionWorld } from '../world/CollisionWorld';
import { Flashlight } from './Flashlight';
import { PlayerCamera } from './PlayerCamera';
import { PlayerInventory } from './PlayerInventory';
import { StaminaSystem } from './StaminaSystem';

export interface ActiveHidingState {
  spotId: string;
  hidePosition: THREE.Vector3;
  exitPosition: THREE.Vector3;
  exitYaw: number;
}

export class PlayerController {
  public readonly position = new THREE.Vector3(0, 0, 2.5);
  public readonly velocity = new THREE.Vector3();

  private keysDown: Set<string> = new Set();
  private crouchToggled = false;
  private crouchMode: 'hold' | 'toggle' = 'hold';
  private pointerLocked = false;
  private hidingState: ActiveHidingState | null = null;
  private footstepTimer = 0;
  private currentNoiseRadius = 0;

  private readonly forwardTemp = new THREE.Vector3();
  private readonly rightTemp = new THREE.Vector3();
  private readonly desiredPosTemp = new THREE.Vector3();

  private onInteractCallback: (() => void) | null = null;
  private onReloadCheckpointCallback: (() => void) | null = null;
  private onPauseRequestCallback: (() => void) | null = null;
  private onFootstepCallback: ((mode: 'walk' | 'sprint' | 'crouch') => void) | null = null;

  constructor(
    public readonly playerCamera: PlayerCamera,
    public readonly stamina: StaminaSystem,
    public readonly flashlight: Flashlight,
    public readonly inventory: PlayerInventory,
    private readonly collisionWorld: CollisionWorld,
    private readonly events: EventBus
  ) {}

  bindInput(domElement: HTMLElement): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const wasDown = this.keysDown.has(code);
      this.keysDown.add(code);

      if (wasDown) return;

      if (code === 'KeyF') {
        this.flashlight.toggle();
      } else if (code === 'KeyE') {
        this.onInteractCallback?.();
      } else if (code === 'KeyG') {
        this.throwDistraction();
      } else if (code === 'KeyR') {
        this.onReloadCheckpointCallback?.();
      } else if (code === 'ControlLeft' || code === 'ControlRight' || code === 'KeyC') {
        if (this.crouchMode === 'toggle') {
          this.crouchToggled = !this.crouchToggled;
        }
      } else if (code === 'Escape') {
        this.onPauseRequestCallback?.();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.pointerLocked) return;
      this.playerCamera.applyMouseDelta(e.movementX || 0, e.movementY || 0);
    };

    const onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === domElement;
    };

    const onBlur = () => {
      this.keysDown.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      window.removeEventListener('blur', onBlur);
    };
  }

  requestPointerLock(domElement: HTMLElement | null): void {
    if (!domElement || typeof domElement.requestPointerLock !== 'function') return;
    try {
      const res = domElement.requestPointerLock() as unknown as Promise<void> | undefined;
      if (res && typeof res.catch === 'function') {
        res.catch(() => {
          // Ignore pointer lock rejection in headless browsers or rapid Escape presses
        });
      }
    } catch {
      // Ignore pointer lock exceptions
    }
  }

  releasePointerLock(): void {
    if (typeof document !== 'undefined' && document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    this.pointerLocked = false;
  }

  setCallbacks(callbacks: {
    onInteract?: () => void;
    onReloadCheckpoint?: () => void;
    onPauseRequest?: () => void;
    onFootstep?: (mode: 'walk' | 'sprint' | 'crouch') => void;
  }): void {
    this.onInteractCallback = callbacks.onInteract ?? null;
    this.onReloadCheckpointCallback = callbacks.onReloadCheckpoint ?? null;
    this.onPauseRequestCallback = callbacks.onPauseRequest ?? null;
    this.onFootstepCallback = callbacks.onFootstep ?? null;
  }

  setCrouchMode(mode: 'hold' | 'toggle'): void {
    this.crouchMode = mode;
    if (mode === 'hold') {
      this.crouchToggled = false;
    }
  }

  isCrouching(): boolean {
    if (this.hidingState) return true;
    if (this.crouchMode === 'toggle') {
      return this.crouchToggled;
    }
    return (
      this.keysDown.has('ControlLeft') ||
      this.keysDown.has('ControlRight') ||
      this.keysDown.has('KeyC')
    );
  }

  isHiding(): boolean {
    return this.hidingState !== null;
  }

  getHidingSpotId(): string | null {
    return this.hidingState?.spotId ?? null;
  }

  enterHiding(spotId: string, hidePosition: THREE.Vector3, exitPosition: THREE.Vector3, exitYaw: number): void {
    this.hidingState = {
      spotId,
      hidePosition: hidePosition.clone(),
      exitPosition: exitPosition.clone(),
      exitYaw
    };
    this.position.copy(hidePosition);
    this.playerCamera.setOrientation(exitYaw, 0);
    this.keysDown.clear();
    this.currentNoiseRadius = 0;
    this.events.emit('player:hiding', { isHiding: true, spotId });
  }

  exitHiding(): void {
    if (!this.hidingState) return;
    const prev = this.hidingState;
    this.hidingState = null;
    this.position.copy(prev.exitPosition);
    this.playerCamera.setOrientation(prev.exitYaw, 0);
    this.events.emit('player:hiding', { isHiding: false, spotId: null });
  }

  throwDistraction(): boolean {
    if (this.hidingState) return false;
    if (!this.inventory.hasItem('decoy_bottle')) {
      this.events.emit('notification:show', {
        text: 'No sound distraction items in inventory.',
        tone: 'info'
      });
      return false;
    }

    this.inventory.consumeItem('decoy_bottle', 1);
    const forward = this.playerCamera.getFlatForward();
    const targetX = this.position.x + forward.x * 5.8;
    const targetZ = this.position.z + forward.z * 5.8;
    const resolved = this.collisionWorld.resolveMovement(
      this.position,
      new THREE.Vector3(targetX, 0, targetZ),
      0.25
    );

    const remaining = this.inventory.getItemCount('decoy_bottle');
    this.events.emit('player:distraction_thrown', {
      x: resolved.x,
      z: resolved.z,
      remaining
    });
    this.events.emit('player:noise', {
      x: resolved.x,
      y: 0.2,
      z: resolved.z,
      radius: GameConfig.PLAYER.NOISE_DECOY,
      source: 'decoy'
    });
    this.events.emit('notification:show', {
      text: `Shattered glass decoy thrown (${remaining} left)`,
      tone: 'warning'
    });
    return true;
  }

  setPositionAndYaw(x: number, y: number, z: number, yaw: number): void {
    this.hidingState = null;
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.playerCamera.setOrientation(yaw, 0);
    this.playerCamera.update(0.016, this.position, false, false, false);
  }

  getCurrentNoiseRadius(): number {
    return this.currentNoiseRadius;
  }

  clearInputState(): void {
    this.keysDown.clear();
  }

  update(dt: number): void {
    this.flashlight.update(dt);

    // Optional keyboard look fallback (ArrowLeft / ArrowRight / ArrowUp / ArrowDown)
    if (this.keysDown.has('ArrowLeft')) {
      this.playerCamera.applyMouseDelta(-450 * dt, 0);
    }
    if (this.keysDown.has('ArrowRight')) {
      this.playerCamera.applyMouseDelta(450 * dt, 0);
    }
    if (this.keysDown.has('ArrowUp')) {
      this.playerCamera.applyMouseDelta(0, -320 * dt);
    }
    if (this.keysDown.has('ArrowDown')) {
      this.playerCamera.applyMouseDelta(0, 320 * dt);
    }

    if (this.hidingState) {
      this.stamina.update(dt, false, false);
      this.currentNoiseRadius = 0;
      this.playerCamera.update(dt, this.position, true, false, false);
      return;
    }

    let moveForward = 0;
    let moveRight = 0;

    if (this.keysDown.has('KeyW')) moveForward += 1;
    if (this.keysDown.has('KeyS')) moveForward -= 1;
    if (this.keysDown.has('KeyD')) moveRight += 1;
    if (this.keysDown.has('KeyA')) moveRight -= 1;

    const isMoving = moveForward !== 0 || moveRight !== 0;
    const crouching = this.isCrouching();
    const wantsSprint =
      !crouching &&
      (this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight'));

    const sprinting = this.stamina.update(dt, wantsSprint, isMoving);

    let speed: number = GameConfig.PLAYER.WALK_SPEED;
    if (crouching) {
      speed = GameConfig.PLAYER.CROUCH_SPEED;
    } else if (sprinting) {
      speed = GameConfig.PLAYER.SPRINT_SPEED;
    }

    if (isMoving) {
      this.playerCamera.getFlatForward(this.forwardTemp);
      this.playerCamera.getFlatRight(this.rightTemp);

      this.velocity
        .set(0, 0, 0)
        .addScaledVector(this.forwardTemp, moveForward)
        .addScaledVector(this.rightTemp, moveRight);

      if (this.velocity.lengthSq() > 1e-5) {
        this.velocity.normalize().multiplyScalar(speed);
      }

      this.desiredPosTemp.copy(this.position).addScaledVector(this.velocity, dt);
      this.collisionWorld.resolveMovement(
        this.position,
        this.desiredPosTemp,
        GameConfig.PLAYER.RADIUS,
        this.position
      );

      const mode: 'walk' | 'sprint' | 'crouch' = sprinting
        ? 'sprint'
        : crouching
          ? 'crouch'
          : 'walk';

      this.currentNoiseRadius =
        mode === 'sprint'
          ? GameConfig.PLAYER.NOISE_SPRINT
          : mode === 'crouch'
            ? GameConfig.PLAYER.NOISE_CROUCH
            : GameConfig.PLAYER.NOISE_WALK;

      const stepInterval = mode === 'sprint' ? 0.34 : mode === 'crouch' ? 0.68 : 0.48;
      this.footstepTimer += dt;
      if (this.footstepTimer >= stepInterval) {
        this.footstepTimer = 0;
        this.onFootstepCallback?.(mode);
        this.events.emit('player:noise', {
          x: this.position.x,
          y: this.position.y,
          z: this.position.z,
          radius: this.currentNoiseRadius,
          source: mode
        });
      }
    } else {
      this.velocity.set(0, 0, 0);
      this.currentNoiseRadius = 0;
      this.footstepTimer = 0;
    }

    this.playerCamera.update(dt, this.position, crouching, isMoving, sprinting);
  }
}
