export interface GameOverCallbacks {
  onRetryCheckpoint: () => void;
  onNewGame: () => void;
  onReturnMainMenu: () => void;
  onUiSound: () => void;
}

export class GameOverScreen {
  public readonly element: HTMLElement;
  private readonly reasonEl: HTMLElement;

  constructor(parent: HTMLElement, private readonly callbacks: GameOverCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'game-over-screen';
    this.element.className = 'screen-overlay gameover-screen hidden';

    this.element.innerHTML = `
      <div class="modal-card gameover-card">
        <div class="facility-badge danger-badge">BIOMETRIC SIGNAL LOST // 02:27 AM</div>
        <h2 class="gameover-title">SHIFT TERMINATED</h2>
        <p class="gameover-reason" id="gameover-reason">
          Subject 09 tracked your acoustic signature through the facility.
        </p>
        <p class="gameover-tip">
          TIP: Crouch [Ctrl] to dampen footsteps, use steel lockers [E] before the creature has line of sight, or throw a glass decoy [G] to lure it away.
        </p>
        <div class="menu-nav">
          <button type="button" class="menu-btn primary-btn" id="btn-gameover-retry">RELOAD LAST CHECKPOINT</button>
          <button type="button" class="menu-btn" id="btn-gameover-new">RESTART NEW SHIFT</button>
          <button type="button" class="menu-btn" id="btn-gameover-menu">MAIN MENU</button>
        </div>
      </div>
    `;

    parent.appendChild(this.element);
    this.reasonEl = this.element.querySelector('#gameover-reason')!;

    this.element.querySelector('#btn-gameover-retry')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onRetryCheckpoint();
    });

    this.element.querySelector('#btn-gameover-new')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onNewGame();
    });

    this.element.querySelector('#btn-gameover-menu')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onReturnMainMenu();
    });
  }

  show(reason?: string): void {
    if (reason) {
      this.reasonEl.textContent = reason;
    }
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }

  isVisible(): boolean {
    return !this.element.classList.contains('hidden');
  }
}
