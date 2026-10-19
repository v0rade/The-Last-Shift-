export interface GraphicsQualityPreset {
  pixelRatioMax: number;
  renderScale: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  fogDensity: number;
  bloomEnabled: boolean;
  fxaaEnabled: boolean;
  anisotropy: number;
  msaaSamples: number;
}

export const GRAPHICS_PRESETS: Record<'low' | 'medium' | 'high', GraphicsQualityPreset> = {
  low: {
    pixelRatioMax: 1.0,
    renderScale: 0.9,
    shadowsEnabled: false,
    shadowMapSize: 512,
    fogDensity: 0.023,
    bloomEnabled: false,
    fxaaEnabled: false,
    anisotropy: 2,
    msaaSamples: 0
  },
  medium: {
    pixelRatioMax: 1.0,
    renderScale: 1.0,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    fogDensity: 0.021,
    bloomEnabled: false,
    fxaaEnabled: true,
    anisotropy: 4,
    msaaSamples: 0
  },
  high: {
    pixelRatioMax: 1.25,
    renderScale: 1.0,
    shadowsEnabled: true,
    shadowMapSize: 1024,
    fogDensity: 0.019,
    bloomEnabled: true,
    fxaaEnabled: true,
    anisotropy: 8,
    msaaSamples: 0
  }
};

export const GameConfig = {
  VERSION: '1.0.0',
  SAVE_STORAGE_KEY: 'the_last_shift_save_v1',
  SETTINGS_STORAGE_KEY: 'the_last_shift_settings_v1',

  PLAYER: {
    WALK_SPEED: 3.6,
    SPRINT_SPEED: 6.2,
    CROUCH_SPEED: 2.0,
    STANDING_HEIGHT: 1.72,
    CROUCH_HEIGHT: 1.02,
    RADIUS: 0.36,
    INTERACTION_DISTANCE: 2.8,
    NOISE_CROUCH: 1.8,
    NOISE_WALK: 6.5,
    NOISE_SPRINT: 14.5,
    NOISE_DECOY: 22.0
  },

  STAMINA: {
    MAX: 100,
    DRAIN_PER_SECOND: 22,
    REGEN_PER_SECOND: 16,
    EXHAUSTED_RECOVERY_THRESHOLD: 25
  },

  FLASHLIGHT: {
    MAX_BATTERY: 100,
    DRAIN_PER_SECOND: 1.15,
    LOW_BATTERY_THRESHOLD: 22,
    BATTERY_PICKUP_AMOUNT: 45,
    EMERGENCY_RESERVE_INTENSITY: 1.35,
    FULL_INTENSITY: 11.5,
    OUTER_SPILL_INTENSITY: 3.2,
    DISTANCE: 28,
    ANGLE: Math.PI / 4.4,
    OUTER_ANGLE: Math.PI / 2.6,
    PENUMBRA: 0.62
  },

  MONSTER: {
    IDLE_DURATION: 2.0,
    PATROL_SPEED: 2.45,
    INVESTIGATE_SPEED: 3.25,
    CHASE_SPEED: 5.15,
    SEARCH_SPEED: 2.8,
    FOV_DEGREES: 115,
    SIGHT_RANGE_DARK: 11.5,
    SIGHT_RANGE_LIT: 18.5,
    ATTACK_DISTANCE: 1.38,
    INVESTIGATE_DURATION: 6.5,
    SEARCH_DURATION: 8.0,
    COOLDOWN_DURATION: 4.5,
    STUCK_TIMEOUT: 3.5
  },

  PUZZLES: {
    POWER_TARGET_VOLTAGE: 120,
    SECURITY_KEYPAD_CODE: '2413',
    FINAL_EXIT_CODE: '7904',
    AIRLOCK_CYCLE_DURATION: 6.0
  }
} as const;
