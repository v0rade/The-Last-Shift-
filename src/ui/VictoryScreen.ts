import { StoryDocument } from '../story/Documents';

export interface VictorySummaryData {
  elapsedSeconds: number;
  discoveredDocs: StoryDocument[];
  totalDocs: number;
  accessedTerminalsCount: number;
  totalTerminals: number;
  deathCount: number;
}

export interface VictoryCallbacks {
  onPlayAgain: () => void;
  onReturnMainMenu: () => void;
  onUiSound: () => void;
}

export class VictoryScreen {
  public readonly element: HTMLElement;

  constructor(parent: HTMLElement, private readonly callbacks: VictoryCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'victory-screen';
    this.element.className = 'screen-overlay victory-screen hidden';

    this.element.innerHTML = `
      <div class="modal-card victory-card">
        <div class="facility-badge success-badge">QUARANTINE AIRLOCK BREACHED // 02:44 AM</div>
        <h2 class="victory-title">SURVIVED THE LAST SHIFT</h2>
        <p class="victory-epilogue" id="victory-epilogue">
          The heavy pneumatic blast doors slam shut behind you as the purge siren echoes through the pine valley.
          Cold mountain air fills your lungs. Inside Sector B-09, Subject 09 hammers once against the reinforced steel—sealed inside.
        </p>

        <div class="victory-stats-grid">
          <div class="stat-box">
            <span class="stat-label">SHIFT DURATION</span>
            <strong class="stat-val" id="victory-time">00:00</strong>
          </div>
          <div class="stat-box">
            <span class="stat-label">DOCUMENTS RECOVERED</span>
            <strong class="stat-val" id="victory-docs-count">0 / 7</strong>
          </div>
          <div class="stat-box">
            <span class="stat-label">TERMINALS DECRYPTED</span>
            <strong class="stat-val" id="victory-terminals-count">0 / 2</strong>
          </div>
          <div class="stat-box">
            <span class="stat-label">INVESTIGATION RATING</span>
            <strong class="stat-val" id="victory-truth-status">SURVIVOR</strong>
          </div>
        </div>

        <div class="victory-discoveries-section">
          <div class="hud-section-tag">RECOVERED EVIDENCE ARCHIVE</div>
          <ul class="victory-discovered-list" id="victory-discovered-list"></ul>
        </div>

        <div class="modal-actions">
          <button type="button" class="menu-btn primary-btn" id="btn-victory-play-again">PLAY NEW SHIFT</button>
          <button type="button" class="menu-btn" id="btn-victory-menu">RETURN TO MAIN MENU</button>
        </div>
      </div>
    `;

    parent.appendChild(this.element);

    this.element.querySelector('#btn-victory-play-again')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onPlayAgain();
    });

    this.element.querySelector('#btn-victory-menu')!.addEventListener('click', () => {
      this.callbacks.onUiSound();
      this.callbacks.onReturnMainMenu();
    });
  }

  show(summary: VictorySummaryData): void {
    const mins = Math.floor(summary.elapsedSeconds / 60);
    const secs = Math.floor(summary.elapsedSeconds % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.element.querySelector('#victory-time')!.textContent = timeStr;
    this.element.querySelector('#victory-docs-count')!.textContent =
      `${summary.discoveredDocs.length} / ${summary.totalDocs}`;
    this.element.querySelector('#victory-terminals-count')!.textContent =
      `${summary.accessedTerminalsCount} / ${summary.totalTerminals}`;

    const fullTruth =
      summary.discoveredDocs.length >= 5 && summary.accessedTerminalsCount >= 2;
    this.element.querySelector('#victory-truth-status')!.textContent = fullTruth
      ? 'WHISTLEBLOWER (FULL TRUTH)'
      : 'SURVIVOR (ESCAPED)';

    const listEl = this.element.querySelector('#victory-discovered-list')!;
    if (summary.discoveredDocs.length === 0) {
      listEl.innerHTML = '<li>Escaped without archiving physical documents.</li>';
    } else {
      listEl.innerHTML = summary.discoveredDocs
        .map((d) => `<li><b>${d.title}</b> — <span>${d.location}</span></li>`)
        .join('');
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
