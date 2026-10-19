import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';

export interface SaveDataV1 {
  version: string;
  timestamp: number;
  checkpointId: string;
  playerPosition: { x: number; y: number; z: number };
  playerYaw: number;
  flashlightBattery: number;
  flashlightEnabled: boolean;
  currentObjectiveIndex: number;
  completedObjectives: string[];
  inventoryItems: Array<{
    id: string;
    name: string;
    category: 'key' | 'keycard' | 'fuse' | 'decoy' | 'misc';
    count: number;
  }>;
  collectedWorldObjectIds: string[];
  unlockedDoorIds: string[];
  discoveredDocumentIds: string[];
  readTerminalIds: string[];
  triggeredScareIds: string[];
  puzzles: {
    fuseInserted: boolean;
    powerSwitches: boolean[];
    powerRestored: boolean;
    securityKeypadUnlocked: boolean;
    exitCredentialsInserted: boolean;
    exitPurgeCompleted: boolean;
  };
  elapsedPlayTime: number;
}

export class SaveManager {
  constructor(private readonly events: EventBus) {}

  hasValidSave(): boolean {
    return this.loadSave() !== null;
  }

  saveCheckpoint(data: SaveDataV1): boolean {
    try {
      if (!this.validateSaveData(data)) {
        return false;
      }
      const payload: SaveDataV1 = {
        ...data,
        version: GameConfig.VERSION,
        timestamp: Date.now()
      };
      localStorage.setItem(GameConfig.SAVE_STORAGE_KEY, JSON.stringify(payload));
      this.events.emit('checkpoint:saved', {
        checkpointId: payload.checkpointId,
        timestamp: payload.timestamp
      });
      return true;
    } catch {
      return false;
    }
  }

  loadSave(): SaveDataV1 | null {
    try {
      const raw = localStorage.getItem(GameConfig.SAVE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!this.validateSaveData(parsed)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  clearSave(): void {
    try {
      localStorage.removeItem(GameConfig.SAVE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  validateSaveData(data: unknown): data is SaveDataV1 {
    if (!data || typeof data !== 'object') return false;
    const d = data as Partial<SaveDataV1>;

    if (d.version !== GameConfig.VERSION) return false;
    if (typeof d.checkpointId !== 'string' || d.checkpointId.length === 0) return false;
    if (
      !d.playerPosition ||
      typeof d.playerPosition.x !== 'number' ||
      typeof d.playerPosition.y !== 'number' ||
      typeof d.playerPosition.z !== 'number' ||
      Number.isNaN(d.playerPosition.x) ||
      Number.isNaN(d.playerPosition.y) ||
      Number.isNaN(d.playerPosition.z)
    ) {
      return false;
    }
    if (typeof d.playerYaw !== 'number' || Number.isNaN(d.playerYaw)) return false;
    if (typeof d.flashlightBattery !== 'number' || d.flashlightBattery < 0 || d.flashlightBattery > 100) {
      return false;
    }
    if (typeof d.currentObjectiveIndex !== 'number' || d.currentObjectiveIndex < 0) return false;
    if (!Array.isArray(d.completedObjectives)) return false;
    if (!Array.isArray(d.inventoryItems)) return false;
    if (!Array.isArray(d.collectedWorldObjectIds)) return false;
    if (!Array.isArray(d.unlockedDoorIds)) return false;
    if (!Array.isArray(d.discoveredDocumentIds)) return false;
    if (!Array.isArray(d.readTerminalIds)) return false;
    if (!Array.isArray(d.triggeredScareIds)) return false;
    if (!d.puzzles || typeof d.puzzles !== 'object') return false;
    if (typeof d.puzzles.powerRestored !== 'boolean') return false;
    if (typeof d.puzzles.securityKeypadUnlocked !== 'boolean') return false;
    if (!Array.isArray(d.puzzles.powerSwitches)) return false;

    return true;
  }
}
