import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { AmbienceController } from '../../audio/AmbienceController';
import { AudioManager } from '../../audio/AudioManager';
import { MonsterAI } from '../../enemy/MonsterAI';
import { MonsterNavigation } from '../../enemy/MonsterNavigation';
import { MonsterPerception } from '../../enemy/MonsterPerception';
import { AssetManager } from '../../game/AssetManager';
import { GameConfig, GRAPHICS_PRESETS } from '../../game/GameConfig';
import { GameStateManager } from '../../game/GameState';
import { SaveDataV1, SaveManager } from '../../persistence/SaveManager';
import { SettingsManager } from '../../persistence/SettingsManager';
import { PlayerInventory } from '../../player/PlayerInventory';
import { StaminaSystem } from '../../player/StaminaSystem';
import { ExitSequence } from '../../puzzles/ExitSequence';
import { KeypadPuzzle } from '../../puzzles/KeypadPuzzle';
import { PowerPuzzle } from '../../puzzles/PowerPuzzle';
import { ObjectiveManager } from '../../story/ObjectiveManager';
import { EventBus } from '../../utils/EventBus';
import { CollisionWorld } from '../../world/CollisionWorld';
import { NavigationGraph } from '../../world/NavigationGraph';

describe('Unit Tests — Core Gameplay Systems', () => {
  let events: EventBus;

  beforeEach(() => {
    events = new EventBus();
    localStorage.clear();
  });

  describe('StaminaSystem', () => {
    it('consumes stamina while sprinting and moving, and regenerates when resting', () => {
      const stamina = new StaminaSystem(events);
      expect(stamina.getStamina()).toBe(100);

      const sprinting = stamina.update(1.0, true, true);
      expect(sprinting).toBe(true);
      expect(stamina.getStamina()).toBeCloseTo(100 - GameConfig.STAMINA.DRAIN_PER_SECOND, 2);

      const resting = stamina.update(0.5, false, true);
      expect(resting).toBe(false);
      expect(stamina.getStamina()).toBeGreaterThan(100 - GameConfig.STAMINA.DRAIN_PER_SECOND);
    });

    it('enters exhaustion at 0 stamina and recovers after passing threshold', () => {
      const stamina = new StaminaSystem(events);
      stamina.update(5.0, true, true);
      expect(stamina.getStamina()).toBe(0);
      expect(stamina.isExhausted()).toBe(true);
      expect(stamina.canSprint()).toBe(false);

      // Partial recovery below threshold (25) keeps exhausted true
      stamina.update(1.0, false, false);
      expect(stamina.isExhausted()).toBe(true);

      // Recover above threshold (25)
      stamina.update(1.0, false, false);
      expect(stamina.getStamina()).toBeGreaterThanOrEqual(
        GameConfig.STAMINA.EXHAUSTED_RECOVERY_THRESHOLD
      );
      expect(stamina.isExhausted()).toBe(false);
      expect(stamina.canSprint()).toBe(true);
    });
  });

  describe('PowerPuzzle (Puzzle A)', () => {
    it('requires fuse insertion and exact 120V configuration (A1 45V + C3 75V)', () => {
      const puzzle = new PowerPuzzle(events);
      expect(puzzle.isSolved()).toBe(false);

      // Fail without fuse
      const noFuseRes = puzzle.attemptEngageBreaker();
      expect(noFuseRes.success).toBe(false);

      puzzle.insertFuse();
      expect(puzzle.isFuseInserted()).toBe(true);

      // Underload (45V only)
      puzzle.toggleSwitch(0);
      expect(puzzle.getCurrentVoltage()).toBe(45);
      expect(puzzle.attemptEngageBreaker().success).toBe(false);

      // Overload (45V + 75V + 50V = 170V) trips switches safely without softlocking
      puzzle.toggleSwitch(2);
      puzzle.toggleSwitch(3);
      expect(puzzle.getCurrentVoltage()).toBe(170);
      const overloadRes = puzzle.attemptEngageBreaker();
      expect(overloadRes.success).toBe(false);
      expect(puzzle.getCurrentVoltage()).toBe(0);

      // Valid 120V configuration: Switch 0 (45V) + Switch 2 (75V)
      puzzle.toggleSwitch(0);
      puzzle.toggleSwitch(2);
      expect(puzzle.validateConfiguration()).toBe(true);
      const solvedRes = puzzle.attemptEngageBreaker();
      expect(solvedRes.success).toBe(true);
      expect(puzzle.isSolved()).toBe(true);
    });
  });

  describe('KeypadPuzzle (Puzzle B) & ExitSequence (Puzzle C)', () => {
    it('validates 4-digit PIN 2413 and rejects wrong codes without softlocking', () => {
      const keypad = new KeypadPuzzle(events);
      keypad.pressDigit('1');
      keypad.pressDigit('1');
      keypad.pressDigit('1');
      keypad.pressDigit('1');
      expect(keypad.submit().success).toBe(false);
      expect(keypad.isUnlocked()).toBe(false);
      expect(keypad.getBuffer()).toBe('');

      keypad.pressDigit('2');
      keypad.pressDigit('4');
      keypad.pressDigit('1');
      keypad.pressDigit('3');
      expect(keypad.submit().success).toBe(true);
      expect(keypad.isUnlocked()).toBe(true);
    });

    it('enforces all prerequisites and purge code 7904 on ExitSequence', () => {
      const exit = new ExitSequence(events);
      const incomplete = {
        powerRestored: true,
        hasLevel2Card: true,
        hasMasterOverrideCard: false
      };
      expect(exit.getMissingRequirements(incomplete).length).toBe(1);
      expect(exit.attemptActivateExit(incomplete, '7904').success).toBe(false);

      const complete = {
        powerRestored: true,
        hasLevel2Card: true,
        hasMasterOverrideCard: true
      };
      expect(exit.attemptActivateExit(complete, '0000').success).toBe(false);
      expect(exit.attemptActivateExit(complete, '7904').success).toBe(true);
      expect(exit.isExitReady()).toBe(true);
    });
  });

  describe('PlayerInventory', () => {
    it('collects unique key items once and stacks decoy consumables', () => {
      const inv = new PlayerInventory(events);
      expect(
        inv.addItem({ id: 'maintenance_key', name: 'Maintenance Key', category: 'key' })
      ).toBe(true);
      // Duplicate non-stackable key rejected
      expect(
        inv.addItem({ id: 'maintenance_key', name: 'Maintenance Key', category: 'key' })
      ).toBe(false);
      expect(inv.getItemCount('maintenance_key')).toBe(1);

      // Stackable decoys
      inv.addItem({ id: 'decoy_bottle', name: 'Decoy', category: 'decoy', count: 2 });
      inv.addItem({ id: 'decoy_bottle', name: 'Decoy', category: 'decoy', count: 3 });
      expect(inv.getItemCount('decoy_bottle')).toBe(5);

      expect(inv.consumeItem('decoy_bottle', 2)).toBe(true);
      expect(inv.getItemCount('decoy_bottle')).toBe(3);
    });
  });

  describe('ObjectiveManager', () => {
    it('progresses through all objective milestones as conditions are met', () => {
      const obj = new ObjectiveManager(events);
      expect(obj.getCurrentObjective().id).toBe('obj_inspect_reception');

      obj.evaluateProgression({
        readReceptionNote: true,
        hasMaintenanceKey: false,
        hasReplacementFuse: false,
        powerRestored: false,
        hasLevel2Card: false,
        foundKeypadClue: false,
        securityUnlocked: false,
        hasMasterCard: false,
        exitReady: false
      });
      expect(obj.getCurrentObjective().id).toBe('obj_find_key_and_fuse');

      obj.evaluateProgression({
        readReceptionNote: true,
        hasMaintenanceKey: true,
        hasReplacementFuse: true,
        powerRestored: true,
        hasLevel2Card: true,
        foundKeypadClue: true,
        securityUnlocked: true,
        hasMasterCard: true,
        exitReady: true
      });
      expect(obj.getCurrentObjective().id).toBe('obj_escape_facility');
    });
  });

  describe('MonsterAI State Machine & Perception', () => {
    it('transitions IDLE -> PATROL -> INVESTIGATE -> CHASE -> SEARCH -> COOLDOWN and respects walls/hiding', () => {
      const collision = new CollisionWorld();
      const navGraph = new NavigationGraph();
      navGraph.addNode('n1', 0, 0, 'r1', true);
      navGraph.addNode('n2', 0, -10, 'r1', true);
      navGraph.connect('n1', 'n2');

      const perception = new MonsterPerception(collision);
      const nav = new MonsterNavigation(navGraph, collision);
      const ai = new MonsterAI(perception, nav, navGraph, events);

      ai.setActive(true, new THREE.Vector3(0, 0, 0));
      expect(ai.getState()).toBe('PATROL');

      // Sound event transitions PATROL -> INVESTIGATE
      const heard = ai.notifySoundEvent(0, -6, 12, 'sprint');
      expect(heard).toBe(true);
      expect(ai.getState()).toBe('INVESTIGATE');

      // Direct line of sight transitions INVESTIGATE -> CHASE
      ai.update(0.1, {
        position: new THREE.Vector3(0, 0, 5),
        isHiding: false,
        isCrouching: false,
        flashlightLit: true
      });
      expect(ai.getState()).toBe('CHASE');

      // Add a solid wall between monster and player: loses sight and transitions CHASE -> SEARCH
      collision.addBox('wall_block', 0, 1.5, 2.5, 6, 3, 0.4, {
        enabled: true,
        blocksSight: true
      });
      ai.update(0.1, {
        position: new THREE.Vector3(0, 0, 5),
        isHiding: false,
        isCrouching: false,
        flashlightLit: true
      });
      expect(ai.getState()).toBe('SEARCH');

      // Search timer expires -> transitions to COOLDOWN
      ai.update(GameConfig.MONSTER.SEARCH_DURATION + 0.5, {
        position: new THREE.Vector3(0, 0, 5),
        isHiding: true,
        isCrouching: true,
        flashlightLit: false
      });
      expect(ai.getState()).toBe('COOLDOWN');
    });
  });

  describe('SaveManager & GameStateManager', () => {
    it('serializes, validates, and rejects corrupted save data', () => {
      const saveManager = new SaveManager(events);
      expect(saveManager.hasValidSave()).toBe(false);

      const validSave: SaveDataV1 = {
        version: GameConfig.VERSION,
        timestamp: Date.now(),
        checkpointId: 'checkpoint_test',
        playerPosition: { x: 0, y: 0, z: 2 },
        playerYaw: 3.14,
        flashlightBattery: 85,
        flashlightEnabled: true,
        currentObjectiveIndex: 2,
        completedObjectives: ['obj_inspect_reception'],
        inventoryItems: [{ id: 'maintenance_key', name: 'Key', category: 'key', count: 1 }],
        collectedWorldObjectIds: ['maintenance_key'],
        unlockedDoorIds: ['door_basement'],
        discoveredDocumentIds: ['doc_reception_log'],
        readTerminalIds: [],
        triggeredScareIds: [],
        puzzles: {
          fuseInserted: true,
          powerSwitches: [true, false, true, false],
          powerRestored: true,
          securityKeypadUnlocked: false,
          exitCredentialsInserted: false,
          exitPurgeCompleted: false
        },
        elapsedPlayTime: 42
      };

      expect(saveManager.saveCheckpoint(validSave)).toBe(true);
      expect(saveManager.hasValidSave()).toBe(true);
      const loaded = saveManager.loadSave();
      expect(loaded?.checkpointId).toBe('checkpoint_test');

      // Corrupt save in localStorage
      localStorage.setItem(GameConfig.SAVE_STORAGE_KEY, '{"version":"wrong"}');
      expect(saveManager.loadSave()).toBeNull();
    });

    it('manages pause, resume, victory, and defeat state transitions', () => {
      const gsm = new GameStateManager(events);
      gsm.startNewGame(true);
      expect(gsm.getState()).toBe('PLAYING');

      expect(gsm.pause()).toBe(true);
      expect(gsm.getState()).toBe('PAUSED');

      expect(gsm.resume()).toBe(true);
      expect(gsm.getState()).toBe('PLAYING');

      gsm.triggerDefeat();
      expect(gsm.getState()).toBe('GAME_OVER');
      expect(gsm.getDeathCount()).toBe(1);

      gsm.startNewGame(true);
      gsm.triggerVictory();
      expect(gsm.getState()).toBe('VICTORY');
    });
  });

  describe('Graphics Presets, PBR AssetManager & Audio/Settings Systems', () => {
    it('defines Low, Medium, and High graphics presets with renderScale, AA, bloom, and anisotropy', () => {
      expect(GRAPHICS_PRESETS.low.renderScale).toBeCloseTo(0.9, 2);
      expect(GRAPHICS_PRESETS.low.bloomEnabled).toBe(false);
      expect(GRAPHICS_PRESETS.medium.renderScale).toBe(1.0);
      expect(GRAPHICS_PRESETS.medium.fxaaEnabled).toBe(true);
      expect(GRAPHICS_PRESETS.high.renderScale).toBe(1.0);
      expect(GRAPHICS_PRESETS.high.bloomEnabled).toBe(true);
      expect(GRAPHICS_PRESETS.high.anisotropy).toBe(8);
    });

    it('creates 512x512 procedural sRGB color textures and linear bump maps with anisotropy in AssetManager', async () => {
      const assets = new AssetManager();
      await assets.initialize();
      assets.setMaxAnisotropy(8);

      const floorMat = assets.getMaterial('floor_tile') as THREE.MeshStandardMaterial;
      expect(floorMat.map).toBeDefined();
      expect(floorMat.map?.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(floorMat.map?.anisotropy).toBe(8);
      expect(floorMat.bumpMap).toBeDefined();
      expect(floorMat.bumpMap?.colorSpace).toBe(THREE.NoColorSpace);

      assets.dispose();
    });

    it('persists musicVolume, ambienceVolume, sfxVolume, masterVolume, and reduceIntenseSfx in SettingsManager', () => {
      const settingsMgr = new SettingsManager(events);
      expect(settingsMgr.getSettings().graphicsQuality).toBe('medium');
      expect(settingsMgr.getSettings().musicVolume).toBeCloseTo(0.78, 2);
      expect(settingsMgr.getSettings().reduceIntenseSfx).toBe(false);

      settingsMgr.updateSettings({
        musicVolume: 0.45,
        ambienceVolume: 0.65,
        sfxVolume: 0.55,
        masterVolume: 0.9,
        reduceIntenseSfx: true,
        graphicsQuality: 'medium'
      });

      const reloaded = new SettingsManager(events);
      expect(reloaded.getSettings().musicVolume).toBeCloseTo(0.45, 2);
      expect(reloaded.getSettings().ambienceVolume).toBeCloseTo(0.65, 2);
      expect(reloaded.getSettings().sfxVolume).toBeCloseTo(0.55, 2);
      expect(reloaded.getSettings().masterVolume).toBeCloseTo(0.9, 2);
      expect(reloaded.getSettings().reduceIntenseSfx).toBe(true);
      expect(reloaded.getSettings().graphicsQuality).toBe('medium');
    });

    it('transitions AmbienceController cleanly across MENU, PLAYING, PAUSED, GAME_OVER, and VICTORY', () => {
      const audio = new AudioManager();
      audio.setVolumes(0.8, 0.7, 0.85, 0.6);
      audio.setReduceIntenseSfx(true);
      expect(audio.isReduceIntenseSfx()).toBe(true);

      const ambience = new AmbienceController(audio);
      expect(ambience.getAudioState()).toBe('MENU');

      ambience.setAudioState('PLAYING');
      expect(ambience.getAudioState()).toBe('PLAYING');

      ambience.setAudioState('PAUSED');
      expect(ambience.getAudioState()).toBe('PAUSED');

      ambience.setAudioState('GAME_OVER');
      expect(ambience.getAudioState()).toBe('GAME_OVER');

      ambience.setAudioState('VICTORY');
      expect(ambience.getAudioState()).toBe('VICTORY');

      ambience.stop();
    });
  });
});
