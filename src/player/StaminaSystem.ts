import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';

export class StaminaSystem {
  private stamina: number = GameConfig.STAMINA.MAX;
  private readonly maxStamina: number = GameConfig.STAMINA.MAX;
  private exhausted = false;

  constructor(private readonly events: EventBus) {}

  update(dt: number, wantsSprint: boolean, isMoving: boolean): boolean {
    const activelySprinting = wantsSprint && isMoving && this.canSprint();

    if (activelySprinting) {
      this.stamina = MathUtils.clamp(
        this.stamina - GameConfig.STAMINA.DRAIN_PER_SECOND * dt,
        0,
        this.maxStamina
      );
      if (this.stamina <= 0.01) {
        this.stamina = 0;
        this.exhausted = true;
      }
    } else {
      this.stamina = MathUtils.clamp(
        this.stamina + GameConfig.STAMINA.REGEN_PER_SECOND * dt,
        0,
        this.maxStamina
      );
      if (this.exhausted && this.stamina >= GameConfig.STAMINA.EXHAUSTED_RECOVERY_THRESHOLD) {
        this.exhausted = false;
      }
    }

    this.events.emit('player:stamina', {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      exhausted: this.exhausted
    });

    return activelySprinting && !this.exhausted;
  }

  canSprint(): boolean {
    return !this.exhausted && this.stamina > 0;
  }

  getStamina(): number {
    return this.stamina;
  }

  getMaxStamina(): number {
    return this.maxStamina;
  }

  isExhausted(): boolean {
    return this.exhausted;
  }

  reset(): void {
    this.stamina = this.maxStamina;
    this.exhausted = false;
    this.events.emit('player:stamina', {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      exhausted: this.exhausted
    });
  }
}
