import { ComputerTerminal } from '../interaction/ComputerTerminal';
import { ExitRequirementCheck, ExitSequence } from '../puzzles/ExitSequence';
import { KeypadPuzzle } from '../puzzles/KeypadPuzzle';
import { POWER_SWITCH_SPECS, PowerPuzzle } from '../puzzles/PowerPuzzle';
import { StoryDocument } from '../story/Documents';

export interface InteractivePanelsCallbacks {
  onCloseModal: () => void;
  onPlayAudioTranscript: (transcript: string) => void;
  hasItem: (itemId: string) => boolean;
  consumeItem: (itemId: string) => boolean;
  getExitRequirements: () => ExitRequirementCheck;
  onPowerSolved: () => void;
  onPowerFailed: () => void;
  onKeypadSolved: () => void;
  onKeypadFailed: () => void;
  onExitReady: () => void;
  onUiClick: () => void;
}

export class NoteViewer {
  public readonly noteModal: HTMLElement;
  public readonly terminalModal: HTMLElement;
  public readonly powerModal: HTMLElement;
  public readonly keypadModal: HTMLElement;
  public readonly exitModal: HTMLElement;

  constructor(
    parent: HTMLElement,
    private readonly powerPuzzle: PowerPuzzle,
    private readonly keypadPuzzle: KeypadPuzzle,
    private readonly exitSequence: ExitSequence,
    private readonly callbacks: InteractivePanelsCallbacks
  ) {
    // 1. Note Viewer Modal
    this.noteModal = document.createElement('div');
    this.noteModal.id = 'note-viewer-modal';
    this.noteModal.className = 'screen-overlay modal-overlay hidden';
    this.noteModal.innerHTML = `
      <div class="modal-card note-card">
        <div class="note-meta" id="note-meta">LOCATION // DATE</div>
        <h2 class="modal-title" id="note-title">Document Title</h2>
        <div class="note-author" id="note-author">Author</div>
        <pre class="note-body" id="note-body"></pre>
        <div class="note-clue-box" id="note-clue"></div>
        <button type="button" class="menu-btn primary-btn" id="btn-close-note">CLOSE DOCUMENT [ESC]</button>
      </div>
    `;
    parent.appendChild(this.noteModal);

    // 2. Computer Terminal Modal
    this.terminalModal = document.createElement('div');
    this.terminalModal.id = 'terminal-viewer-modal';
    this.terminalModal.className = 'screen-overlay modal-overlay hidden';
    this.terminalModal.innerHTML = `
      <div class="modal-card terminal-card">
        <div class="terminal-header-bar" id="terminal-header-name">AETHER-OS TERMINAL</div>
        <div class="terminal-tabs" id="terminal-tabs"></div>
        <div class="terminal-screen">
          <div class="terminal-entry-meta" id="terminal-entry-meta"></div>
          <pre class="terminal-entry-body" id="terminal-entry-body"></pre>
          <button type="button" class="menu-btn small-btn hidden" id="btn-play-terminal-audio">PLAY AUDIO RECORDING</button>
        </div>
        <button type="button" class="menu-btn primary-btn" id="btn-close-terminal">DISCONNECT TERMINAL [ESC]</button>
      </div>
    `;
    parent.appendChild(this.terminalModal);

    // 3. Electrical Routing Puzzle Modal (Puzzle A)
    this.powerModal = document.createElement('div');
    this.powerModal.id = 'power-puzzle-modal';
    this.powerModal.className = 'screen-overlay modal-overlay hidden';
    this.powerModal.innerHTML = `
      <div class="modal-card puzzle-card">
        <div class="facility-badge">SUBSTATION B-09 // VOLTAGE ROUTING</div>
        <h2 class="modal-title">BACKUP GENERATOR CONTROL PANEL</h2>
        <div class="puzzle-status-banner" id="power-puzzle-status"></div>

        <div class="fuse-slot-row">
          <span id="fuse-slot-label">HIGH-AMP FUSE SLOT: MISSING</span>
          <button type="button" class="menu-btn small-btn" id="btn-insert-fuse">INSERT REPLACEMENT FUSE</button>
        </div>

        <div class="voltage-readout">
          <span>ACTIVE BUS VOLTAGE: <b id="power-current-voltage">0V</b></span>
          <span>REQUIRED TARGET: <b>120V</b></span>
        </div>

        <div class="power-switches-list" id="power-switches-list"></div>

        <div class="modal-actions">
          <button type="button" class="menu-btn primary-btn" id="btn-engage-breaker">ENGAGE MASTER BREAKER</button>
          <button type="button" class="menu-btn" id="btn-close-power-puzzle">CLOSE PANEL</button>
        </div>
      </div>
    `;
    parent.appendChild(this.powerModal);

    // 4. Security Keypad Modal (Puzzle B)
    this.keypadModal = document.createElement('div');
    this.keypadModal.id = 'keypad-puzzle-modal';
    this.keypadModal.className = 'screen-overlay modal-overlay hidden';
    this.keypadModal.innerHTML = `
      <div class="modal-card keypad-card">
        <div class="facility-badge">NORTH SECURITY OFFICE ACCESS</div>
        <h2 class="modal-title">ARMORED DOOR KEYPAD</h2>
        <div class="keypad-lcd" id="keypad-display">----</div>
        <div class="keypad-status" id="keypad-status">ENTER 4-DIGIT PIN</div>
        <div class="keypad-grid" id="security-keypad-grid">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK']
            .map(
              (k) =>
                `<button type="button" class="keypad-btn" data-key="${k}" id="btn-keypad-${k}">${k}</button>`
            )
            .join('')}
        </div>
        <button type="button" class="menu-btn" id="btn-close-keypad">STEP BACK [ESC]</button>
      </div>
    `;
    parent.appendChild(this.keypadModal);

    // 5. Final Exit Console Modal (Puzzle C)
    this.exitModal = document.createElement('div');
    this.exitModal.id = 'exit-puzzle-modal';
    this.exitModal.className = 'screen-overlay modal-overlay hidden';
    this.exitModal.innerHTML = `
      <div class="modal-card puzzle-card">
        <div class="facility-badge">NORTH QUARANTINE AIRLOCK // FINAL ESCAPE</div>
        <h2 class="modal-title">QUARANTINE OVERRIDE CONSOLE</h2>
        <div class="puzzle-status-banner" id="exit-puzzle-status"></div>

        <div class="exit-checklist" id="exit-checklist"></div>

        <div class="fuse-slot-row">
          <span>STEP 1: AUTHORIZE DUAL KEYCARDS</span>
          <button type="button" class="menu-btn small-btn" id="btn-insert-credentials">INSERT ACCESS & OVERRIDE CARDS</button>
        </div>

        <div class="exit-code-section">
          <div class="keypad-lcd" id="exit-code-display">----</div>
          <div class="keypad-grid" id="exit-keypad-grid">
            ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'OK']
              .map(
                (k) =>
                  `<button type="button" class="keypad-btn" data-exit-key="${k}" id="btn-exit-key-${k}">${k}</button>`
              )
              .join('')}
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="menu-btn primary-btn" id="btn-submit-exit-purge">INITIATE AIRLOCK PURGE</button>
          <button type="button" class="menu-btn" id="btn-close-exit-puzzle">CLOSE CONSOLE</button>
        </div>
      </div>
    `;
    parent.appendChild(this.exitModal);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.noteModal.querySelector('#btn-close-note')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.closeAll();
    });

    this.terminalModal.querySelector('#btn-close-terminal')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.closeAll();
    });

    this.powerModal.querySelector('#btn-close-power-puzzle')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.closeAll();
    });

    this.powerModal.querySelector('#btn-insert-fuse')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      if (this.powerPuzzle.isFuseInserted()) return;
      if (this.callbacks.hasItem('replacement_fuse')) {
        this.callbacks.consumeItem('replacement_fuse');
        this.powerPuzzle.insertFuse();
        this.renderPowerPuzzle();
      } else {
        const statusEl = this.powerModal.querySelector('#power-puzzle-status')!;
        statusEl.textContent = 'Missing Replacement High-Amp Fuse! Search the East Storage Room.';
      }
    });

    this.powerModal.querySelector('#btn-engage-breaker')!.addEventListener('click', () => {
      const res = this.powerPuzzle.attemptEngageBreaker();
      this.renderPowerPuzzle();
      if (res.success) {
        this.callbacks.onPowerSolved();
      } else {
        this.callbacks.onPowerFailed();
      }
    });

    this.keypadModal.querySelector('#btn-close-keypad')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.closeAll();
    });

    this.keypadModal.querySelectorAll('[data-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.key!;
        this.callbacks.onUiClick();
        if (key === 'CLR') {
          this.keypadPuzzle.clear();
          this.renderKeypadPuzzle();
        } else if (key === 'OK') {
          const res = this.keypadPuzzle.submit();
          this.renderKeypadPuzzle();
          if (res.success) {
            this.callbacks.onKeypadSolved();
          } else {
            this.callbacks.onKeypadFailed();
          }
        } else {
          this.keypadPuzzle.pressDigit(key);
          this.renderKeypadPuzzle();
        }
      });
    });

    this.exitModal.querySelector('#btn-close-exit-puzzle')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      this.closeAll();
    });

    this.exitModal.querySelector('#btn-insert-credentials')!.addEventListener('click', () => {
      this.callbacks.onUiClick();
      const reqs = this.callbacks.getExitRequirements();
      this.exitSequence.insertCredentials(reqs);
      this.renderExitPuzzle();
    });

    this.exitModal.querySelectorAll('[data-exit-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.exitKey!;
        this.callbacks.onUiClick();
        if (key === 'CLR') {
          this.exitSequence.clearCode();
          this.renderExitPuzzle();
        } else if (key === 'OK') {
          this.submitExitPurge();
        } else {
          this.exitSequence.pressDigit(key);
          this.renderExitPuzzle();
        }
      });
    });

    this.exitModal.querySelector('#btn-submit-exit-purge')!.addEventListener('click', () => {
      this.submitExitPurge();
    });
  }

  private submitExitPurge(): void {
    const reqs = this.callbacks.getExitRequirements();
    const res = this.exitSequence.attemptActivateExit(reqs);
    this.renderExitPuzzle();
    if (res.success) {
      this.callbacks.onExitReady();
    } else {
      this.callbacks.onKeypadFailed();
    }
  }

  openDocument(doc: StoryDocument): void {
    this.hideAllModals();
    this.noteModal.querySelector('#note-meta')!.textContent = `${doc.location.toUpperCase()} // ${doc.date}`;
    this.noteModal.querySelector('#note-title')!.textContent = doc.title;
    this.noteModal.querySelector('#note-author')!.textContent = `Logged by: ${doc.author}`;
    this.noteModal.querySelector('#note-body')!.textContent = doc.content;
    this.noteModal.querySelector('#note-clue')!.textContent = `KEY CLUE: ${doc.clueSummary}`;
    this.noteModal.classList.remove('hidden');
  }

  openTerminal(terminal: ComputerTerminal): void {
    this.hideAllModals();
    const headerEl = this.terminalModal.querySelector('#terminal-header-name')!;
    const tabsEl = this.terminalModal.querySelector('#terminal-tabs')!;
    const metaEl = this.terminalModal.querySelector('#terminal-entry-meta')!;
    const bodyEl = this.terminalModal.querySelector('#terminal-entry-body')!;
    const audioBtn = this.terminalModal.querySelector('#btn-play-terminal-audio') as HTMLButtonElement;

    headerEl.textContent = terminal.name;

    if (!terminal.canBoot()) {
      tabsEl.innerHTML = '';
      metaEl.textContent = 'SYSTEM STATUS: OFFLINE';
      bodyEl.textContent =
        'INSUFFICIENT BUS POWER. Restore 120V Backup Generator in the Electrical Maintenance Room to boot this workstation.';
      audioBtn.classList.add('hidden');
      this.terminalModal.classList.remove('hidden');
      return;
    }

    const selectEntry = (idx: number) => {
      const entry = terminal.entries[idx];
      if (!entry) return;
      metaEl.textContent = `${entry.timestamp} // AUTHOR: ${entry.author}`;
      bodyEl.textContent = entry.body;

      if (entry.audioTranscript) {
        audioBtn.classList.remove('hidden');
        audioBtn.onclick = () => {
          this.callbacks.onUiClick();
          this.callbacks.onPlayAudioTranscript(entry.audioTranscript!);
        };
      } else {
        audioBtn.classList.add('hidden');
      }

      tabsEl.querySelectorAll('.terminal-tab-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
      });
    };

    tabsEl.innerHTML = terminal.entries
      .map(
        (e, i) =>
          `<button type="button" class="terminal-tab-btn ${
            i === 0 ? 'active' : ''
          }" data-entry-idx="${i}">${e.title}</button>`
      )
      .join('');

    tabsEl.querySelectorAll('.terminal-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.callbacks.onUiClick();
        const idx = Number((btn as HTMLElement).dataset.entryIdx);
        selectEntry(idx);
      });
    });

    selectEntry(0);
    this.terminalModal.classList.remove('hidden');
  }

  openPowerPuzzle(): void {
    this.hideAllModals();
    // Auto-seat fuse if player already collected it
    if (!this.powerPuzzle.isFuseInserted() && this.callbacks.hasItem('replacement_fuse')) {
      this.callbacks.consumeItem('replacement_fuse');
      this.powerPuzzle.insertFuse();
    }
    this.renderPowerPuzzle();
    this.powerModal.classList.remove('hidden');
  }

  private renderPowerPuzzle(): void {
    const statusEl = this.powerModal.querySelector('#power-puzzle-status')!;
    const fuseLabel = this.powerModal.querySelector('#fuse-slot-label')!;
    const fuseBtn = this.powerModal.querySelector('#btn-insert-fuse') as HTMLButtonElement;
    const voltageEl = this.powerModal.querySelector('#power-current-voltage')!;
    const listEl = this.powerModal.querySelector('#power-switches-list')!;

    statusEl.textContent = this.powerPuzzle.getLastStatusMessage();
    const fuseReady = this.powerPuzzle.isFuseInserted();
    fuseLabel.textContent = fuseReady
      ? 'HIGH-AMP FUSE SLOT: 200A FUSE SEATED [OK]'
      : 'HIGH-AMP FUSE SLOT: EMPTY (Requires Replacement Fuse)';
    fuseBtn.disabled = fuseReady;

    const currentV = this.powerPuzzle.getCurrentVoltage();
    voltageEl.textContent = `${currentV}V`;
    const switches = this.powerPuzzle.getSwitches();

    listEl.innerHTML = POWER_SWITCH_SPECS.map((spec, idx) => {
      const isOn = switches[idx];
      return `
        <div class="power-switch-row ${isOn ? 'switch-on' : 'switch-off'}">
          <div class="switch-info">
            <b>${spec.code} (${spec.voltage}V)</b>
            <span>${spec.label}</span>
          </div>
          <button type="button" class="menu-btn small-btn" id="btn-power-switch-${idx}" ${
            this.powerPuzzle.isSolved() ? 'disabled' : ''
          }>
            ${isOn ? 'ON [ACTIVE]' : 'OFF'}
          </button>
        </div>
      `;
    }).join('');

    POWER_SWITCH_SPECS.forEach((spec) => {
      const btn = listEl.querySelector(`#btn-power-switch-${spec.index}`);
      btn?.addEventListener('click', () => {
        this.callbacks.onUiClick();
        this.powerPuzzle.toggleSwitch(spec.index);
        this.renderPowerPuzzle();
      });
    });
  }

  openKeypadPuzzle(): void {
    this.hideAllModals();
    this.renderKeypadPuzzle();
    this.keypadModal.classList.remove('hidden');
  }

  private renderKeypadPuzzle(): void {
    const disp = this.keypadModal.querySelector('#keypad-display')!;
    const status = this.keypadModal.querySelector('#keypad-status')!;
    const buf = this.keypadPuzzle.getBuffer();
    disp.textContent = buf.length > 0 ? buf.padEnd(4, '-') : '----';
    status.textContent = this.keypadPuzzle.getStatusMessage();
  }

  openExitPuzzle(): void {
    this.hideAllModals();
    const reqs = this.callbacks.getExitRequirements();
    if (this.exitSequence.canInsertCredentials(reqs) && !this.exitSequence.isCredentialsInserted()) {
      this.exitSequence.insertCredentials(reqs);
    }
    this.renderExitPuzzle();
    this.exitModal.classList.remove('hidden');
  }

  private renderExitPuzzle(): void {
    const reqs = this.callbacks.getExitRequirements();
    const statusEl = this.exitModal.querySelector('#exit-puzzle-status')!;
    const checklistEl = this.exitModal.querySelector('#exit-checklist')!;
    const codeDisp = this.exitModal.querySelector('#exit-code-display')!;

    statusEl.textContent = this.exitSequence.getStatusMessage();
    checklistEl.innerHTML = `
      <div class="check-item ${reqs.powerRestored ? 'check-ok' : 'check-missing'}">
        [${reqs.powerRestored ? 'OK' : 'MISSING'}] 120V Backup Generator Power Restored
      </div>
      <div class="check-item ${reqs.hasLevel2Card ? 'check-ok' : 'check-missing'}">
        [${reqs.hasLevel2Card ? 'OK' : 'MISSING'}] Level-2 Research Access Card (Research Lab)
      </div>
      <div class="check-item ${reqs.hasMasterOverrideCard ? 'check-ok' : 'check-missing'}">
        [${reqs.hasMasterOverrideCard ? 'OK' : 'MISSING'}] Master Override Keycard (Security Office)
      </div>
    `;

    const buf = this.exitSequence.getCodeBuffer();
    codeDisp.textContent = buf.length > 0 ? buf.padEnd(4, '-') : '----';
  }

  isAnyOpen(): boolean {
    return (
      !this.noteModal.classList.contains('hidden') ||
      !this.terminalModal.classList.contains('hidden') ||
      !this.powerModal.classList.contains('hidden') ||
      !this.keypadModal.classList.contains('hidden') ||
      !this.exitModal.classList.contains('hidden')
    );
  }

  closeAll(): void {
    this.hideAllModals();
    this.callbacks.onCloseModal();
  }

  hideAllModals(): void {
    this.noteModal.classList.add('hidden');
    this.terminalModal.classList.add('hidden');
    this.powerModal.classList.add('hidden');
    this.keypadModal.classList.add('hidden');
    this.exitModal.classList.add('hidden');
  }
}
