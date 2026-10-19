import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';

export interface GameSettings {
  mouseSensitivity: number;
  masterVolume: number;
  musicVolume: number;
  ambienceVolume: number;
  sfxVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  crouchMode: 'hold' | 'toggle';
  reducedScreenShake: boolean;
  reducedFlashing: boolean;
  reduceIntenseSfx: boolean;
  subtitlesEnabled: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mouseSensitivity: 1.0,
  masterVolume: 0.85,
  musicVolume: 0.78,
  ambienceVolume: 0.72,
  sfxVolume: 0.85,
  graphicsQuality: 'medium',
  crouchMode: 'hold',
  reducedScreenShake: false,
  reducedFlashing: false,
  reduceIntenseSfx: false,
  subtitlesEnabled: true
};

export class SettingsManager {
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  constructor(private readonly events: EventBus) {
    this.load();
  }

  getSettings(): Readonly<GameSettings> {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<GameSettings>): GameSettings {
    const merged = this.sanitize({ ...this.settings, ...partial });
    this.settings = merged;
    this.save();
    this.events.emit('settings:changed', { ...this.settings });
    return this.getSettings();
  }

  resetToDefaults(): GameSettings {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    this.events.emit('settings:changed', { ...this.settings });
    return this.getSettings();
  }

  load(): GameSettings {
    try {
      const raw = localStorage.getItem(GameConfig.SETTINGS_STORAGE_KEY);
      if (!raw) {
        this.settings = { ...DEFAULT_SETTINGS };
        return this.getSettings();
      }
      const parsed = JSON.parse(raw);
      this.settings = this.sanitize(parsed);
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.getSettings();
  }

  save(): void {
    try {
      localStorage.setItem(GameConfig.SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage quota errors
    }
  }

  private sanitize(input: any): GameSettings {
    if (!input || typeof input !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    const quality =
      input.graphicsQuality === 'low' || input.graphicsQuality === 'medium' || input.graphicsQuality === 'high'
        ? input.graphicsQuality
        : DEFAULT_SETTINGS.graphicsQuality;

    const crouchMode =
      input.crouchMode === 'hold' || input.crouchMode === 'toggle'
        ? input.crouchMode
        : DEFAULT_SETTINGS.crouchMode;

    return {
      mouseSensitivity:
        typeof input.mouseSensitivity === 'number' && !Number.isNaN(input.mouseSensitivity)
          ? MathUtils.clamp(input.mouseSensitivity, 0.2, 3.0)
          : DEFAULT_SETTINGS.mouseSensitivity,
      masterVolume:
        typeof input.masterVolume === 'number' && !Number.isNaN(input.masterVolume)
          ? MathUtils.clamp(input.masterVolume, 0, 1)
          : DEFAULT_SETTINGS.masterVolume,
      musicVolume:
        typeof input.musicVolume === 'number' && !Number.isNaN(input.musicVolume)
          ? MathUtils.clamp(input.musicVolume, 0, 1)
          : DEFAULT_SETTINGS.musicVolume,
      ambienceVolume:
        typeof input.ambienceVolume === 'number' && !Number.isNaN(input.ambienceVolume)
          ? MathUtils.clamp(input.ambienceVolume, 0, 1)
          : DEFAULT_SETTINGS.ambienceVolume,
      sfxVolume:
        typeof input.sfxVolume === 'number' && !Number.isNaN(input.sfxVolume)
          ? MathUtils.clamp(input.sfxVolume, 0, 1)
          : DEFAULT_SETTINGS.sfxVolume,
      graphicsQuality: quality,
      crouchMode,
      reducedScreenShake: Boolean(input.reducedScreenShake),
      reducedFlashing: Boolean(input.reducedFlashing),
      reduceIntenseSfx: Boolean(input.reduceIntenseSfx),
      subtitlesEnabled: input.subtitlesEnabled !== undefined ? Boolean(input.subtitlesEnabled) : true
    };
  }
}
