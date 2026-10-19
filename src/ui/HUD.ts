import { InventoryItem } from '../player/PlayerInventory';
import { InteractionPrompt } from './InteractionPrompt';

export class HUD {
  public readonly element: HTMLElement;
  public readonly prompt: InteractionPrompt;

  private readonly objectiveTitleEl: HTMLElement;
  private readonly objectiveDescEl: HTMLElement;
  private readonly staminaFillEl: HTMLElement;
  private readonly staminaTextEl: HTMLElement;
  private readonly batteryFillEl: HTMLElement;
  private readonly batteryTextEl: HTMLElement;
  private readonly flashlightStatusEl: HTMLElement;
  private readonly inventoryListEl: HTMLElement;
  private readonly threatBadgeEl: HTMLElement;
  private readonly hidingBadgeEl: HTMLElement;
  private readonly crosshairEl: HTMLElement;
  private readonly subtitleEl: HTMLElement;
  private readonly notificationEl: HTMLElement;

  private subtitleTimer: number | null = null;
  private notificationTimer: number | null = null;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.id = 'hud-overlay';
    this.element.className = 'hud-overlay hidden';

    this.element.innerHTML = `
      <div class="hud-top-bar">
        <div class="hud-objective-card" id="hud-objective-card">
          <div class="hud-section-tag">CURRENT DIRECTIVE</div>
          <div class="hud-objective-title" id="hud-objective-title">Inspect Reception</div>
          <div class="hud-objective-desc" id="hud-objective-desc">Explore the reception desk.</div>
        </div>
        <div class="hud-status-badges">
          <div class="hud-badge threat-calm" id="hud-threat-badge">ACOUSTIC STATUS: CLEAR</div>
          <div class="hud-badge hiding-badge hidden" id="hud-hiding-badge">CONCEALED IN LOCKER [E TO EXIT]</div>
        </div>
      </div>

      <div class="hud-center">
        <div class="hud-crosshair" id="hud-crosshair"></div>
      </div>

      <div class="hud-feedback-stack">
        <div class="hud-notification hidden" id="hud-notification"></div>
        <div class="hud-subtitle hidden" id="hud-subtitle"></div>
      </div>

      <div class="hud-bottom-bar">
        <div class="hud-vitals-panel">
          <div class="hud-meter-row">
            <span class="hud-meter-label">STAMINA</span>
            <div class="hud-meter-track">
              <div class="hud-meter-fill stamina-fill" id="hud-stamina-fill" style="width: 100%"></div>
            </div>
            <span class="hud-meter-val" id="hud-stamina-value">100%</span>
          </div>
          <div class="hud-meter-row">
            <span class="hud-meter-label">FLASHLIGHT <small id="hud-flashlight-status">[ON]</small></span>
            <div class="hud-meter-track">
              <div class="hud-meter-fill battery-fill" id="hud-battery-fill" style="width: 100%"></div>
            </div>
            <span class="hud-meter-val" id="hud-battery-value">100%</span>
          </div>
        </div>

        <div class="hud-inventory-panel">
          <div class="hud-section-tag">INVENTORY & CREDENTIALS</div>
          <div class="hud-inventory-list" id="hud-inventory-list">
            <span class="hud-inventory-empty">No items collected</span>
          </div>
        </div>
      </div>

      <div class="hud-controls-strip" id="hud-controls-strip">
        <span><b>WASD</b> Move</span>
        <span><b>Mouse</b> Look</span>
        <span><b>Shift</b> Sprint</span>
        <span><b>Ctrl</b> Crouch</span>
        <span><b>E</b> Interact</span>
        <span><b>F</b> Flashlight</span>
        <span><b>G</b> Throw Decoy</span>
        <span><b>R</b> Checkpoint</span>
        <span><b>Esc</b> Pause</span>
      </div>
    `;

    parent.appendChild(this.element);
    this.prompt = new InteractionPrompt(this.element);

    this.objectiveTitleEl = this.element.querySelector('#hud-objective-title')!;
    this.objectiveDescEl = this.element.querySelector('#hud-objective-desc')!;
    this.staminaFillEl = this.element.querySelector('#hud-stamina-fill')!;
    this.staminaTextEl = this.element.querySelector('#hud-stamina-value')!;
    this.batteryFillEl = this.element.querySelector('#hud-battery-fill')!;
    this.batteryTextEl = this.element.querySelector('#hud-battery-value')!;
    this.flashlightStatusEl = this.element.querySelector('#hud-flashlight-status')!;
    this.inventoryListEl = this.element.querySelector('#hud-inventory-list')!;
    this.threatBadgeEl = this.element.querySelector('#hud-threat-badge')!;
    this.hidingBadgeEl = this.element.querySelector('#hud-hiding-badge')!;
    this.crosshairEl = this.element.querySelector('#hud-crosshair')!;
    this.subtitleEl = this.element.querySelector('#hud-subtitle')!;
    this.notificationEl = this.element.querySelector('#hud-notification')!;
  }

  show(): void {
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }

  updateObjective(title: string, description: string): void {
    this.objectiveTitleEl.textContent = title;
    this.objectiveDescEl.textContent = description;
  }

  updateStamina(stamina: number, maxStamina: number, exhausted: boolean): void {
    const pct = Math.round((stamina / (maxStamina || 100)) * 100);
    this.staminaFillEl.style.width = `${pct}%`;
    this.staminaTextEl.textContent = exhausted ? 'EXHAUSTED' : `${pct}%`;
    this.staminaFillEl.classList.toggle('meter-danger', exhausted || pct < 25);
  }

  updateFlashlight(enabled: boolean, battery: number, malfunctioning: boolean): void {
    const pct = Math.round(battery);
    this.batteryFillEl.style.width = `${pct}%`;
    this.batteryTextEl.textContent = pct <= 0 ? 'RESERVE' : `${pct}%`;
    this.flashlightStatusEl.textContent = malfunctioning
      ? '[INTERFERENCE]'
      : !enabled
        ? '[OFF]'
        : pct <= 0
          ? '[DYNAMO]'
          : '[ON]';
    this.batteryFillEl.classList.toggle('meter-warning', pct < 25 || malfunctioning);
  }

  updateInventory(items: InventoryItem[]): void {
    if (items.length === 0) {
      this.inventoryListEl.innerHTML = '<span class="hud-inventory-empty">No items collected</span>';
      return;
    }

    this.inventoryListEl.innerHTML = items
      .map(
        (it) =>
          `<span class="hud-inventory-chip" data-item-id="${it.id}">${it.name}${
            it.count > 1 ? ` x${it.count}` : ''
          }</span>`
      )
      .join('');
  }

  updateThreatStatus(monsterState: string, active: boolean): void {
    if (!active) {
      this.threatBadgeEl.textContent = 'FACILITY STATUS: POWER FAILURE';
      this.threatBadgeEl.className = 'hud-badge threat-calm';
      return;
    }

    if (monsterState === 'CHASE' || monsterState === 'ATTACK') {
      this.threatBadgeEl.textContent = 'WARNING: SUBJECT 09 HUNTING — BREAK LINE OF SIGHT!';
      this.threatBadgeEl.className = 'hud-badge threat-danger';
    } else if (monsterState === 'INVESTIGATE' || monsterState === 'SEARCH') {
      this.threatBadgeEl.textContent = 'CAUTION: ACOUSTIC ANOMALY SEARCHING NEARBY';
      this.threatBadgeEl.className = 'hud-badge threat-warning';
    } else {
      this.threatBadgeEl.textContent = 'FACILITY STATUS: SUBJECT 09 PATROLLING';
      this.threatBadgeEl.className = 'hud-badge threat-calm';
    }
  }

  updateHidingState(isHiding: boolean): void {
    this.hidingBadgeEl.classList.toggle('hidden', !isHiding);
  }

  updateInteractionTarget(promptText: string | null): void {
    if (promptText) {
      this.prompt.show(promptText);
      this.crosshairEl.classList.add('crosshair-active');
    } else {
      this.prompt.hide();
      this.crosshairEl.classList.remove('crosshair-active');
    }
  }

  showSubtitle(text: string, durationSeconds = 5.0, subtitlesEnabled = true): void {
    if (!subtitlesEnabled) return;
    if (this.subtitleTimer !== null) {
      window.clearTimeout(this.subtitleTimer);
    }
    this.subtitleEl.textContent = text;
    this.subtitleEl.classList.remove('hidden');
    this.subtitleTimer = window.setTimeout(() => {
      this.subtitleEl.classList.add('hidden');
    }, durationSeconds * 1000);
  }

  showNotification(text: string, tone: 'info' | 'warning' | 'danger' | 'success' = 'info'): void {
    if (this.notificationTimer !== null) {
      window.clearTimeout(this.notificationTimer);
    }
    this.notificationEl.textContent = text;
    this.notificationEl.className = `hud-notification tone-${tone}`;
    this.notificationTimer = window.setTimeout(() => {
      this.notificationEl.classList.add('hidden');
    }, 3600);
  }
}
