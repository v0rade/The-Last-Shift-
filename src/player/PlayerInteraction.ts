import { Interactable } from '../interaction/Interactable';
import { InteractionManager } from '../interaction/InteractionManager';
import { PlayerController } from './PlayerController';

export class PlayerInteraction {
  private currentTarget: Interactable | null = null;

  constructor(
    private readonly player: PlayerController,
    private readonly interactionManager: InteractionManager
  ) {}

  update(): Interactable | null {
    if (this.player.isHiding()) {
      const spotId = this.player.getHidingSpotId();
      if (spotId) {
        this.currentTarget = this.interactionManager.get(spotId) ?? null;
        return this.currentTarget;
      }
    }

    this.currentTarget = this.interactionManager.findBestTarget(
      this.player.playerCamera.camera,
      this.player.position
    );
    return this.currentTarget;
  }

  getCurrentTarget(): Interactable | null {
    return this.currentTarget;
  }

  getPromptText(): string | null {
    if (this.player.isHiding()) {
      return 'Press E to Leave Hiding Spot';
    }
    if (!this.currentTarget) return null;
    return this.currentTarget.getPromptText();
  }

  interactCurrent(): boolean {
    if (this.player.isHiding()) {
      this.player.exitHiding();
      return true;
    }
    return this.interactionManager.tryInteract(this.currentTarget);
  }
}
