import { GameSettings, SettingsManager } from '../persistence/SettingsManager';

export class SettingsMenu {
  public readonly element: HTMLElement;

  private readonly sensInput: HTMLInputElement;
  private readonly sensVal: HTMLElement;
  private readonly masterInput: HTMLInputElement;
  private readonly masterVal: HTMLElement;
  private readonly musicInput: HTMLInputElement;
  private readonly musicVal: HTMLElement;
  private readonly ambienceInput: HTMLInputElement;
  private readonly ambienceVal: HTMLElement;
  private readonly sfxInput: HTMLInputElement;
  private readonly sfxVal: HTMLElement;
  private readonly qualitySelect: HTMLSelectElement;
  private readonly crouchSelect: HTMLSelectElement;
  private readonly shakeCheck: HTMLInputElement;
  private readonly flashCheck: HTMLInputElement;
  private readonly intenseSfxCheck: HTMLInputElement;
  private readonly subtitlesCheck: HTMLInputElement;

  constructor(
    parent: HTMLElement,
    private readonly settingsManager: SettingsManager,
    private readonly onUiSound: () => void
  ) {
    this.element = document.createElement('div');
    this.element.id = 'settings-modal';
    this.element.className = 'screen-overlay modal-overlay hidden';

    this.element.innerHTML = `
      <div class="modal-card settings-card">
        <h2 class="modal-title">SYSTEM, GRAPHICS & AUDIO SETTINGS</h2>

        <div class="settings-form">
          <label class="setting-row">
            <span>Mouse Look Sensitivity (<b id="val-sensitivity">1.0</b>)</span>
            <input type="range" id="setting-sensitivity" min="0.2" max="3.0" step="0.1" value="1.0" />
          </label>

          <label class="setting-row">
            <span>Master Volume (<b id="val-master-volume">85%</b>)</span>
            <input type="range" id="setting-master-volume" min="0" max="1" step="0.05" value="0.85" />
          </label>

          <label class="setting-row">
            <span>Music Volume (<b id="val-music-volume">78%</b>)</span>
            <input type="range" id="setting-music-volume" min="0" max="1" step="0.05" value="0.78" />
          </label>

          <label class="setting-row">
            <span>Ambience Volume (<b id="val-ambience-volume">72%</b>)</span>
            <input type="range" id="setting-ambience-volume" min="0" max="1" step="0.05" value="0.72" />
          </label>

          <label class="setting-row">
            <span>Effects Volume (<b id="val-sfx-volume">85%</b>)</span>
            <input type="range" id="setting-sfx-volume" min="0" max="1" step="0.05" value="0.85" />
          </label>

          <label class="setting-row">
            <span>Graphics Quality Preset</span>
            <select id="setting-graphics-quality">
              <option value="low">Low (Performance — 0.9x Scale, Minimal FX)</option>
              <option value="medium">Medium (Balanced — 1.0x Scale, FXAA + Shadows)</option>
              <option value="high">High (Cinematic — Up to 2x DPR, MSAA + FXAA + Bloom)</option>
            </select>
          </label>

          <label class="setting-row">
            <span>Crouch Input Mode</span>
            <select id="setting-crouch-mode">
              <option value="hold">Hold Ctrl / C</option>
              <option value="toggle">Toggle Ctrl / C</option>
            </select>
          </label>

          <label class="setting-row checkbox-row">
            <span>Reduced Screen Shake</span>
            <input type="checkbox" id="setting-reduced-shake" />
          </label>

          <label class="setting-row checkbox-row">
            <span>Reduced Flashing & Flicker</span>
            <input type="checkbox" id="setting-reduced-flashing" />
          </label>

          <label class="setting-row checkbox-row">
            <span>Reduce Intense Sound Effects</span>
            <input type="checkbox" id="setting-reduce-intense-sfx" />
          </label>

          <label class="setting-row checkbox-row">
            <span>Subtitles for Audio & Horror Cues</span>
            <input type="checkbox" id="setting-subtitles" checked />
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="menu-btn" id="btn-settings-reset">RESET DEFAULTS</button>
          <button type="button" class="menu-btn primary-btn" id="btn-settings-close">APPLY & CLOSE</button>
        </div>
      </div>
    `;

    parent.appendChild(this.element);

    this.sensInput = this.element.querySelector('#setting-sensitivity')!;
    this.sensVal = this.element.querySelector('#val-sensitivity')!;
    this.masterInput = this.element.querySelector('#setting-master-volume')!;
    this.masterVal = this.element.querySelector('#val-master-volume')!;
    this.musicInput = this.element.querySelector('#setting-music-volume')!;
    this.musicVal = this.element.querySelector('#val-music-volume')!;
    this.ambienceInput = this.element.querySelector('#setting-ambience-volume')!;
    this.ambienceVal = this.element.querySelector('#val-ambience-volume')!;
    this.sfxInput = this.element.querySelector('#setting-sfx-volume')!;
    this.sfxVal = this.element.querySelector('#val-sfx-volume')!;
    this.qualitySelect = this.element.querySelector('#setting-graphics-quality')!;
    this.crouchSelect = this.element.querySelector('#setting-crouch-mode')!;
    this.shakeCheck = this.element.querySelector('#setting-reduced-shake')!;
    this.flashCheck = this.element.querySelector('#setting-reduced-flashing')!;
    this.intenseSfxCheck = this.element.querySelector('#setting-reduce-intense-sfx')!;
    this.subtitlesCheck = this.element.querySelector('#setting-subtitles')!;

    this.bindEvents();
    this.syncFromSettings(this.settingsManager.getSettings());
  }

  private bindEvents(): void {
    const pushChanges = () => {
      const updated = this.settingsManager.updateSettings({
        mouseSensitivity: parseFloat(this.sensInput.value),
        masterVolume: parseFloat(this.masterInput.value),
        musicVolume: parseFloat(this.musicInput.value),
        ambienceVolume: parseFloat(this.ambienceInput.value),
        sfxVolume: parseFloat(this.sfxInput.value),
        graphicsQuality: this.qualitySelect.value as 'low' | 'medium' | 'high',
        crouchMode: this.crouchSelect.value as 'hold' | 'toggle',
        reducedScreenShake: this.shakeCheck.checked,
        reducedFlashing: this.flashCheck.checked,
        reduceIntenseSfx: this.intenseSfxCheck.checked,
        subtitlesEnabled: this.subtitlesCheck.checked
      });
      this.syncFromSettings(updated);
    };

    this.sensInput.addEventListener('input', pushChanges);
    this.masterInput.addEventListener('input', pushChanges);
    this.musicInput.addEventListener('input', pushChanges);
    this.ambienceInput.addEventListener('input', pushChanges);
    this.sfxInput.addEventListener('input', pushChanges);
    this.qualitySelect.addEventListener('change', pushChanges);
    this.crouchSelect.addEventListener('change', pushChanges);
    this.shakeCheck.addEventListener('change', pushChanges);
    this.flashCheck.addEventListener('change', pushChanges);
    this.intenseSfxCheck.addEventListener('change', pushChanges);
    this.subtitlesCheck.addEventListener('change', pushChanges);

    this.element.querySelector('#btn-settings-reset')!.addEventListener('click', () => {
      this.onUiSound();
      const defaults = this.settingsManager.resetToDefaults();
      this.syncFromSettings(defaults);
    });

    this.element.querySelector('#btn-settings-close')!.addEventListener('click', () => {
      this.onUiSound();
      this.hide();
    });
  }

  syncFromSettings(s: GameSettings): void {
    this.sensInput.value = s.mouseSensitivity.toFixed(1);
    this.sensVal.textContent = s.mouseSensitivity.toFixed(1);
    this.masterInput.value = s.masterVolume.toString();
    this.masterVal.textContent = `${Math.round(s.masterVolume * 100)}%`;
    this.musicInput.value = s.musicVolume.toString();
    this.musicVal.textContent = `${Math.round(s.musicVolume * 100)}%`;
    this.ambienceInput.value = s.ambienceVolume.toString();
    this.ambienceVal.textContent = `${Math.round(s.ambienceVolume * 100)}%`;
    this.sfxInput.value = s.sfxVolume.toString();
    this.sfxVal.textContent = `${Math.round(s.sfxVolume * 100)}%`;
    this.qualitySelect.value = s.graphicsQuality;
    this.crouchSelect.value = s.crouchMode;
    this.shakeCheck.checked = s.reducedScreenShake;
    this.flashCheck.checked = s.reducedFlashing;
    this.intenseSfxCheck.checked = s.reduceIntenseSfx;
    this.subtitlesCheck.checked = s.subtitlesEnabled;
  }

  show(): void {
    this.syncFromSettings(this.settingsManager.getSettings());
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }

  isVisible(): boolean {
    return !this.element.classList.contains('hidden');
  }
}
