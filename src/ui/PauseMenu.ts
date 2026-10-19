export interface PauseMenuCallbacks {
  onResume: () => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  onRestartCheckpoint: () => void;
  onReturnMainMenu: () => void;
  onUiSound: () => void;
}

export class PauseMenu {
  public readonly element: HTMLElement;

  constructor(parent: HTMLElement, private readonly callbacks: PauseMenuCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'pause-menu';
    this.element.className = 'screen-overlay pause-menu hidden';

    this.element.innerHTML = `
      <div class="modal-card pause-card">
        <div class="facility-badge">SIMULATION SUSPENDED</div>
        <h2 class="modal-title">SHIFT PAUSED</h2>
        <nav class="menu-nav" aria-label="Pause Menu">
          <button type="button" class="menu-btn primary-btn" id="btn-pause-resume">RESUME SHIFT</button>
          <button type="button" class="menu-btn" id="btn-pause-settings">SETTINGS</button>
          <button type="button" class="menu-btn" id="btn-pause-controls">CONTROLS</button>
          <button type="button" class="menu-btn" id="btn-pause-checkpoint">RESTART CHECKPOINT</button>
          <button type="button" class="menu-btn danger-outline-btn" id="btn-pause-mainmenu">RETURN TO MAIN MENU</button>
        </nav>
      </div>
    `;

    parent.appendChild(this.element);

    this.element.querySelector('#btn-pause-resume')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onResume();
    });

    this.element.querySelector('#btn-pause-settings')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onOpenSettings();
    });

    this.element.querySelector('#btn-pause-controls')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onOpenControls();
    });

    this.element.querySelector('#btn-pause-checkpoint')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onRestartCheckpoint();
    });

    this.element.querySelector('#btn-pause-mainmenu')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onReturnMainMenu();
    });
  }

  show(): void {
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }

  isVisible(): boolean {
    return !this.element.classList.contains('hidden');
  }
}
