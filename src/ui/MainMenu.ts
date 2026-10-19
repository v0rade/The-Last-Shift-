export interface MainMenuCallbacks {
  onNewGame: () => void;
  onContinueGame: () => void;
  onOpenSettings: () => void;
  onResetSave: () => void;
  onCompleteIntro: () => void;
  onUiSound: () => void;
  onEnableAudio?: () => void;
}

export class MainMenu {
  public readonly loadingElement: HTMLElement;
  public readonly menuElement: HTMLElement;
  public readonly introElement: HTMLElement;
  public readonly controlsModal: HTMLElement;
  public readonly creditsModal: HTMLElement;
  public readonly errorElement: HTMLElement;

  private readonly progressBarEl: HTMLElement;
  private readonly progressTextEl: HTMLElement;
  private readonly continueBtn: HTMLButtonElement;
  private readonly resetSaveBtn: HTMLButtonElement;
  private readonly confirmResetBox: HTMLElement;
  private readonly audioStatusBtn: HTMLButtonElement;

  constructor(parent: HTMLElement, private readonly callbacks: MainMenuCallbacks) {
    // 1. Loading Screen
    this.loadingElement = document.createElement('div');
    this.loadingElement.id = 'loading-screen';
    this.loadingElement.className = 'screen-overlay loading-screen';
    this.loadingElement.innerHTML = `
      <div class="loading-box">
        <div class="facility-code">AETHER-9 BIOMEDICAL RESEARCH WING</div>
        <h1 class="loading-title">THE LAST SHIFT</h1>
        <div class="loading-bar-track">
          <div class="loading-bar-fill" id="loading-progress-bar" style="width: 0%"></div>
        </div>
        <div class="loading-status" id="loading-status">Initializing facility systems... 0%</div>
      </div>
    `;
    parent.appendChild(this.loadingElement);

    this.progressBarEl = this.loadingElement.querySelector('#loading-progress-bar')!;
    this.progressTextEl = this.loadingElement.querySelector('#loading-status')!;

    // 2. Main Menu
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'main-menu';
    this.menuElement.className = 'screen-overlay main-menu hidden';
    this.menuElement.innerHTML = `
      <div class="menu-panel">
        <div class="menu-header">
          <div class="menu-telemetry-row">
            <span class="facility-badge">SECTOR B-09 // NIGHT SECURITY LOG 02:13 AM</span>
            <span class="rec-indicator"><span class="rec-dot"></span>CAM-01 LIVE</span>
          </div>
          <h1 class="game-title">THE LAST SHIFT</h1>
          <p class="game-tagline">First-Person Psychological Survival Horror</p>
          <button type="button" class="audio-status-pill" id="btn-enable-audio">
            <span class="audio-pulse-dot"></span>
            <span id="audio-status-label">CLICK TO ENABLE HORROR THEME AUDIO</span>
          </button>
        </div>

        <nav class="menu-nav" aria-label="Main Menu">
          <button type="button" class="menu-btn primary-btn" id="btn-new-game">NEW GAME</button>
          <button type="button" class="menu-btn" id="btn-continue" disabled>CONTINUE SHIFT</button>
          <button type="button" class="menu-btn" id="btn-menu-settings">SETTINGS</button>
          <button type="button" class="menu-btn" id="btn-menu-controls">CONTROLS</button>
          <button type="button" class="menu-btn" id="btn-menu-credits">CREDITS</button>
          <button type="button" class="menu-btn danger-outline-btn" id="btn-reset-save">RESET SAVE DATA</button>
        </nav>

        <div class="confirm-reset-box hidden" id="confirm-reset-box">
          <span>Permanently erase saved checkpoint progression?</span>
          <div class="confirm-reset-actions">
            <button type="button" class="menu-btn small-btn danger-btn" id="btn-confirm-reset-save">CONFIRM ERASE</button>
            <button type="button" class="menu-btn small-btn" id="btn-cancel-reset-save">CANCEL</button>
          </div>
        </div>

        <div class="menu-footer">
          <span>STATUS: EMERGENCY GENERATOR OFFLINE // CONTAINMENT SEAL LOCKED</span>
          <span>CONTROLS: WASD + MOUSE | [F] FLASHLIGHT | [E] INTERACT | [G] DECOY</span>
        </div>
      </div>
    `;
    parent.appendChild(this.menuElement);

    this.continueBtn = this.menuElement.querySelector('#btn-continue')!;
    this.resetSaveBtn = this.menuElement.querySelector('#btn-reset-save')!;
    this.confirmResetBox = this.menuElement.querySelector('#confirm-reset-box')!;
    this.audioStatusBtn = this.menuElement.querySelector('#btn-enable-audio')!;

    // 3. Intro Sequence Overlay
    this.introElement = document.createElement('div');
    this.introElement.id = 'intro-overlay';
    this.introElement.className = 'screen-overlay intro-overlay hidden';
    this.introElement.innerHTML = `
      <div class="intro-card">
        <div class="intro-timestamp">OCTOBER 18 — 02:13:09 AM // AETHER-9 FACILITY</div>
        <h2 class="intro-heading">SUBSTATION FAILURE DETECTED</h2>
        <p class="intro-paragraph">
          You are Night Shift Security Officer <b>Hale</b>. Moments ago, the primary substation tripped,
          plunging the nocturnal research wing into darkness and engaging the exterior quarantine blast seals.
        </p>
        <p class="intro-paragraph">
          Down the corridor, reinforced acrylic just shattered inside Containment Lab 09. Something is moving
          through the dark—hunting by sound and light.
        </p>
        <p class="intro-directive">
          Restore the 120V backup generator, uncover what happened to the research staff, retrieve the override credentials, and escape.
        </p>
        <button type="button" class="menu-btn primary-btn" id="btn-begin-shift">ENTER FACILITY [CLICK OR E]</button>
      </div>
    `;
    parent.appendChild(this.introElement);

    // 4. Controls Modal
    this.controlsModal = document.createElement('div');
    this.controlsModal.id = 'controls-modal';
    this.controlsModal.className = 'screen-overlay modal-overlay hidden';
    this.controlsModal.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">OPERATOR CONTROLS</h2>
        <div class="controls-grid">
          <div class="control-item"><kbd>W A S D</kbd><span>Move Forward / Back / Strafe</span></div>
          <div class="control-item"><kbd>Mouse / Arrows</kbd><span>Look Around</span></div>
          <div class="control-item"><kbd>Shift</kbd><span>Sprint (Consumes Stamina, Loud)</span></div>
          <div class="control-item"><kbd>Ctrl / C</kbd><span>Crouch (Quiet Movement, Low Profile)</span></div>
          <div class="control-item"><kbd>E</kbd><span>Interact / Pick Up / Hide in Locker</span></div>
          <div class="control-item"><kbd>F</kbd><span>Toggle Flashlight Beam</span></div>
          <div class="control-item"><kbd>G</kbd><span>Throw Glass Sound Decoy</span></div>
          <div class="control-item"><kbd>R</kbd><span>Reload Last Saved Checkpoint</span></div>
          <div class="control-item"><kbd>Esc</kbd><span>Pause Game / Close Panel</span></div>
        </div>
        <button type="button" class="menu-btn primary-btn" id="btn-close-controls">CLOSE</button>
      </div>
    `;
    parent.appendChild(this.controlsModal);

    // 5. Credits Modal
    this.creditsModal = document.createElement('div');
    this.creditsModal.id = 'credits-modal';
    this.creditsModal.className = 'screen-overlay modal-overlay hidden';
    this.creditsModal.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">CREDITS — THE LAST SHIFT</h2>
        <p class="credits-line"><b>Game Direction, Engineering & Level Design</b><br/>Aether-9 Interactive Prototype</p>
        <p class="credits-line"><b>3D Engine & Shaders</b><br/>Three.js WebGL PBR Pipeline</p>
        <p class="credits-line"><b>Procedural Audio Synthesis</b><br/>Web Audio API Spatial & Dynamic Tension Engine</p>
        <p class="credits-line"><b>Narrative & AI Systems</b><br/>Original Survival Horror Prototype ("Project Echolocation")</p>
        <button type="button" class="menu-btn primary-btn" id="btn-close-credits">CLOSE</button>
      </div>
    `;
    parent.appendChild(this.creditsModal);

    // 6. Error Screen
    this.errorElement = document.createElement('div');
    this.errorElement.id = 'error-screen';
    this.errorElement.className = 'screen-overlay modal-overlay hidden';
    this.errorElement.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">SYSTEM INITIALIZATION ERROR</h2>
        <p id="error-message-text">Unable to initialize 3D graphics context.</p>
      </div>
    `;
    parent.appendChild(this.errorElement);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.menuElement.querySelector('#btn-new-game')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onNewGame();
    });

    this.continueBtn.addEventListener('click', () => {
      if (this.continueBtn.disabled) return;
      this.callbacks.onUiSound();
      this.callbacks.onContinueGame();
    });

    this.menuElement.querySelector('#btn-menu-settings')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onOpenSettings();
    });

    this.menuElement.querySelector('#btn-menu-controls')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.showControlsModal();
    });

    this.menuElement.querySelector('#btn-menu-credits')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.creditsModal.classList.remove('hidden');
    });

    this.resetSaveBtn.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.confirmResetBox.classList.remove('hidden');
    });

    this.menuElement.querySelector('#btn-confirm-reset-save')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onResetSave();
      this.confirmResetBox.classList.add('hidden');
    });

    this.menuElement.querySelector('#btn-cancel-reset-save')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.confirmResetBox.classList.add('hidden');
    });

    this.introElement.querySelector('#btn-begin-shift')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onCompleteIntro();
    });

    this.controlsModal.querySelector('#btn-close-controls')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.controlsModal.classList.add('hidden');
    });

    this.creditsModal.querySelector('#btn-close-credits')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.creditsModal.classList.add('hidden');
    });

    this.audioStatusBtn.addEventListener('click', () => {
      this.callbacks.onEnableAudio?.();
      this.callbacks.onUiSound();
    });
  }

  updateAudioStatus(active: boolean): void {
    const label = this.menuElement.querySelector('#audio-status-label');
    if (label) {
      label.textContent = active
        ? 'HORROR THEME ACTIVE // AETHER-9'
        : 'CLICK TO ENABLE HORROR THEME AUDIO';
    }
    this.audioStatusBtn.classList.toggle('audio-active', active);
  }

  updateLoadingProgress(pct: number, label: string): void {
    this.progressBarEl.style.width = `${pct}%`;
    this.progressTextEl.textContent = `${label} (${pct}%)`;
  }

  hideLoading(): void {
    this.loadingElement.classList.add('hidden');
  }

  showMenu(hasSave: boolean): void {
    this.hideLoading();
    this.introElement.classList.add('hidden');
    this.menuElement.classList.remove('hidden');
    this.continueBtn.disabled = !hasSave;
    this.resetSaveBtn.disabled = !hasSave;
    this.confirmResetBox.classList.add('hidden');
  }

  hideMenu(): void {
    this.menuElement.classList.add('hidden');
  }

  showIntro(): void {
    this.hideMenu();
    this.introElement.classList.remove('hidden');
  }

  hideIntro(): void {
    this.introElement.classList.add('hidden');
  }

  showControlsModal(): void {
    this.controlsModal.classList.remove('hidden');
  }

  showError(message: string): void {
    this.hideLoading();
    this.hideMenu();
    const textEl = this.errorElement.querySelector('#error-message-text');
    if (textEl) textEl.textContent = message;
    this.errorElement.classList.remove('hidden');
  }
}
