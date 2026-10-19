import * as THREE from 'three';
import { AmbienceController } from '../audio/AmbienceController';
import { AudioManager } from '../audio/AudioManager';
import { Monster } from '../enemy/Monster';
import { Collectible } from '../interaction/Collectible';
import { ComputerTerminal } from '../interaction/ComputerTerminal';
import { HidingSpot } from '../interaction/HidingSpot';
import { InteractionManager } from '../interaction/InteractionManager';
import { SaveDataV1, SaveManager } from '../persistence/SaveManager';
import { SettingsManager } from '../persistence/SettingsManager';
import { Flashlight } from '../player/Flashlight';
import { PlayerCamera } from '../player/PlayerCamera';
import { PlayerController } from '../player/PlayerController';
import { PlayerInteraction } from '../player/PlayerInteraction';
import { PlayerInventory } from '../player/PlayerInventory';
import { StaminaSystem } from '../player/StaminaSystem';
import { ExitRequirementCheck, ExitSequence } from '../puzzles/ExitSequence';
import { KeypadPuzzle } from '../puzzles/KeypadPuzzle';
import { PowerPuzzle } from '../puzzles/PowerPuzzle';
import { NarrativeManager } from '../story/NarrativeManager';
import { ObjectiveManager } from '../story/ObjectiveManager';
import { ScareDirector } from '../story/ScareDirector';
import { GameOverScreen } from '../ui/GameOverScreen';
import { HUD } from '../ui/HUD';
import { MainMenu } from '../ui/MainMenu';
import { NoteViewer } from '../ui/NoteViewer';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsMenu } from '../ui/SettingsMenu';
import { VictoryScreen } from '../ui/VictoryScreen';
import { EventBus } from '../utils/EventBus';
import { Logger } from '../utils/Logger';
import { CollisionWorld } from '../world/CollisionWorld';
import { LevelBuilder } from '../world/LevelBuilder';
import { NavigationGraph } from '../world/NavigationGraph';
import { AssetManager } from './AssetManager';
import { GameConfig } from './GameConfig';
import { GameLoop } from './GameLoop';
import { GameStateManager } from './GameState';
import { SceneManager } from './SceneManager';

export class Game {
  public readonly events = new EventBus();
  public readonly state = new GameStateManager(this.events);
  public readonly settingsManager = new SettingsManager(this.events);
  public readonly saveManager = new SaveManager(this.events);
  public readonly assets = new AssetManager();
  public readonly sceneManager = new SceneManager();
  public readonly collisionWorld = new CollisionWorld();
  public readonly navGraph = new NavigationGraph();
  public readonly interactionManager = new InteractionManager();
  public readonly audio = new AudioManager();
  public readonly ambience: AmbienceController;

  public readonly stamina: StaminaSystem;
  public readonly flashlight: Flashlight;
  public readonly inventory: PlayerInventory;
  public readonly playerCamera: PlayerCamera;
  public readonly player: PlayerController;
  public readonly playerInteraction: PlayerInteraction;

  public readonly powerPuzzle: PowerPuzzle;
  public readonly keypadPuzzle: KeypadPuzzle;
  public readonly exitSequence: ExitSequence;

  public readonly objectives: ObjectiveManager;
  public readonly narrative: NarrativeManager;
  public readonly scares: ScareDirector;

  public readonly levelBuilder: LevelBuilder;
  public readonly monster: Monster;

  public readonly mainMenu: MainMenu;
  public readonly hud: HUD;
  public readonly pauseMenu: PauseMenu;
  public readonly settingsMenu: SettingsMenu;
  public readonly noteViewer: NoteViewer;
  public readonly gameOverScreen: GameOverScreen;
  public readonly victoryScreen: VictoryScreen;

  private readonly gameLoop: GameLoop;
  private unbindInput: (() => void) | null = null;
  private collectedWorldObjectIds: Set<string> = new Set();
  private unlockedDoorIds: Set<string> = new Set();
  private lastCheckpointId = 'checkpoint_reception';
  private menuCameraAngle = 0;

  constructor(
    private readonly canvasContainer: HTMLElement,
    private readonly uiRoot: HTMLElement
  ) {
    this.ambience = new AmbienceController(this.audio);
    this.stamina = new StaminaSystem(this.events);
    this.flashlight = new Flashlight(this.events);
    this.inventory = new PlayerInventory(this.events);
    this.playerCamera = new PlayerCamera(16 / 9);
    this.player = new PlayerController(
      this.playerCamera,
      this.stamina,
      this.flashlight,
      this.inventory,
      this.collisionWorld,
      this.events
    );
    this.playerInteraction = new PlayerInteraction(this.player, this.interactionManager);

    this.powerPuzzle = new PowerPuzzle(this.events);
    this.keypadPuzzle = new KeypadPuzzle(this.events);
    this.exitSequence = new ExitSequence(this.events);

    this.objectives = new ObjectiveManager(this.events);
    this.narrative = new NarrativeManager(this.events);
    this.scares = new ScareDirector(this.events);

    this.levelBuilder = new LevelBuilder(
      this.assets,
      this.collisionWorld,
      this.navGraph,
      this.interactionManager,
      this.events
    );
    this.monster = new Monster(this.navGraph, this.collisionWorld, this.events);

    this.mainMenu = new MainMenu(this.uiRoot, {
      onNewGame: () => this.startNewGame(false),
      onContinueGame: () => this.continueFromSave(),
      onOpenSettings: () => this.settingsMenu.show(),
      onResetSave: () => {
        this.saveManager.clearSave();
        this.mainMenu.showMenu(false);
      },
      onCompleteIntro: () => this.completeIntroSequence(),
      onUiSound: () => this.audio.playUiClick(),
      onEnableAudio: () => this.unlockAndStartAudio()
    });

    this.audio.onUnlocked(() => {
      this.ambience.start();
      this.syncAudioStateWithGame();
      this.mainMenu.updateAudioStatus(true);
    });

    this.hud = new HUD(this.uiRoot);

    this.pauseMenu = new PauseMenu(this.uiRoot, {
      onResume: () => this.resumeGame(),
      onOpenSettings: () => this.settingsMenu.show(),
      onOpenControls: () => this.mainMenu.showControlsModal(),
      onRestartCheckpoint: () => this.reloadCheckpoint(),
      onReturnMainMenu: () => this.returnToMainMenu(),
      onUiSound: () => this.audio.playUiClick(true)
    });

    this.settingsMenu = new SettingsMenu(this.uiRoot, this.settingsManager, () =>
      this.audio.playUiClick()
    );

    this.noteViewer = new NoteViewer(
      this.uiRoot,
      this.powerPuzzle,
      this.keypadPuzzle,
      this.exitSequence,
      {
        onCloseModal: () => {
          this.state.closeModalToGameplay();
          this.player.requestPointerLock(this.sceneManager.getDomElement());
        },
        onPlayAudioTranscript: (transcript) => {
          this.hud.showSubtitle(
            transcript,
            6.5,
            this.settingsManager.getSettings().subtitlesEnabled
          );
        },
        hasItem: (id) => this.inventory.hasItem(id),
        consumeItem: (id) => this.inventory.consumeItem(id, 1),
        getExitRequirements: () => this.getExitRequirementState(),
        onPowerSolved: () => this.handlePowerRestored(),
        onPowerFailed: () => {
          this.audio.playElectricalFeedback(false);
        },
        onKeypadSolved: () => this.handleSecurityKeypadSolved(),
        onKeypadFailed: () => {
          this.audio.playDoorSound(false, true);
        },
        onExitReady: () => this.handleExitConsoleSolved(),
        onUiClick: () => this.audio.playUiClick()
      }
    );

    this.gameOverScreen = new GameOverScreen(this.uiRoot, {
      onRetryCheckpoint: () => this.reloadCheckpoint(),
      onNewGame: () => this.startNewGame(true),
      onReturnMainMenu: () => this.returnToMainMenu(),
      onUiSound: () => this.audio.playUiClick()
    });

    this.victoryScreen = new VictoryScreen(this.uiRoot, {
      onPlayAgain: () => this.startNewGame(true),
      onReturnMainMenu: () => this.returnToMainMenu(),
      onUiSound: () => this.audio.playUiClick()
    });

    this.gameLoop = new GameLoop((dt, elapsed) => this.tick(dt, elapsed));
  }

  public unlockAndStartAudio(): void {
    this.audio.ensureUnlocked();
    this.ambience.start();
    this.syncAudioStateWithGame();
    this.mainMenu.updateAudioStatus(true);
  }

  private syncAudioStateWithGame(): void {
    const current = this.state.getState();
    if (current === 'MENU' || current === 'LOADING' || current === 'INTRO') {
      this.ambience.setAudioState('MENU');
    } else if (current === 'PLAYING') {
      this.ambience.setAudioState('PLAYING');
    } else if (current === 'PAUSED' || current === 'READING' || current === 'PUZZLE') {
      this.ambience.setAudioState('PAUSED');
    } else if (current === 'GAME_OVER') {
      this.ambience.setAudioState('GAME_OVER');
    } else if (current === 'VICTORY') {
      this.ambience.setAudioState('VICTORY');
    }
  }

  async initialize(): Promise<void> {
    try {
      const settings = this.settingsManager.getSettings();
      const ok = this.sceneManager.initialize(this.canvasContainer, settings.graphicsQuality);
      if (!ok) {
        this.state.triggerError();
        this.mainMenu.showError('Failed to initialize 3D WebGL renderer.');
        return;
      }

      await this.assets.initialize((pct, label) => {
        this.mainMenu.updateLoadingProgress(pct, label);
      });

      this.flashlight.attachToCamera(this.playerCamera.camera, this.sceneManager.scene);
      if (this.audio.listener) {
        this.playerCamera.camera.add(this.audio.listener);
      }

      this.levelBuilder.buildFacility({
        hasItem: (id) => this.inventory.hasItem(id),
        isPowerRestored: () => this.powerPuzzle.isSolved(),
        isSecurityUnlocked: () => this.keypadPuzzle.isUnlocked(),
        isExitReady: () => this.exitSequence.isExitReady(),
        onCollectItem: (c) => this.handleCollectItem(c),
        onReadDocument: (docId) => this.handleReadDocument(docId),
        onAccessTerminal: (t) => this.handleAccessTerminal(t),
        onOpenPowerPuzzle: () => this.openPowerPuzzleModal(),
        onOpenKeypadPuzzle: () => this.openKeypadPuzzleModal(),
        onOpenExitPuzzle: () => this.openExitPuzzleModal(),
        onTriggerFinalEscape: () => this.handleTriggerVictory(),
        onToggleHiding: (spot) => this.handleToggleHiding(spot),
        isPlayerHidingIn: (spotId) => this.player.getHidingSpotId() === spotId,
        onDoorUnlocked: (doorId) => {
          this.unlockedDoorIds.add(doorId);
          this.audio.playDoorSound(true, false);
        }
      });

      this.sceneManager.scene.add(this.levelBuilder.root);
      this.sceneManager.scene.add(this.monster.group);

      this.bindSystemEvents();
      this.applySettings(settings);

      const onUserGestureUnlock = () => {
        this.unlockAndStartAudio();
      };
      window.addEventListener('pointerdown', onUserGestureUnlock, { passive: true });
      window.addEventListener('keydown', onUserGestureUnlock, { passive: true });

      const canvas = this.sceneManager.getDomElement();
      if (canvas) {
        this.unbindInput = this.player.bindInput(canvas);
        canvas.addEventListener('click', () => {
          if (this.state.getState() === 'PLAYING') {
            this.unlockAndStartAudio();
            this.player.requestPointerLock(canvas);
          }
        });
      }

      this.player.setCallbacks({
        onInteract: () => {
          if (this.state.getState() === 'INTRO') {
            this.completeIntroSequence();
            return;
          }
          if (this.state.getState() === 'PLAYING') {
            this.playerInteraction.interactCurrent();
          }
        },
        onReloadCheckpoint: () => {
          if (this.state.getState() === 'PLAYING') {
            this.reloadCheckpoint();
          }
        },
        onPauseRequest: () => this.handleEscapeKey(),
        onFootstep: (mode) => this.audio.playFootstep(mode)
      });

      this.state.returnToMenu();
      this.syncAudioStateWithGame();
      this.mainMenu.showMenu(this.saveManager.hasValidSave());
      this.gameLoop.start();
    } catch (err) {
      Logger.error('Game', `Initialization error: ${(err as Error).message}`);
      this.state.triggerError();
      this.mainMenu.showError((err as Error).message);
    }
  }

  private bindSystemEvents(): void {
    this.events.on('state:changed', () => {
      this.syncAudioStateWithGame();
    });

    this.events.on('settings:changed', () => {
      this.applySettings(this.settingsManager.getSettings());
    });

    this.events.on('objective:updated', (payload) => {
      this.hud.updateObjective(payload.title, payload.description);
    });

    this.events.on('player:stamina', (payload) => {
      this.hud.updateStamina(payload.stamina, payload.maxStamina, payload.exhausted);
    });

    this.events.on('player:flashlight', (payload) => {
      this.hud.updateFlashlight(payload.enabled, payload.battery, payload.malfunctioning);
    });

    this.events.on('inventory:updated', (payload) => {
      this.hud.updateInventory(payload.items as any);
    });

    this.events.on('player:hiding', (payload) => {
      this.hud.updateHidingState(payload.isHiding);
    });

    this.events.on('player:noise', (payload) => {
      if (payload.source === 'decoy') {
        this.audio.playGlassShatter();
      }
      this.monster.ai.notifySoundEvent(payload.x, payload.z, payload.radius, payload.source);
    });

    this.events.on('door:state', (payload) => {
      this.audio.playDoorSound(payload.isOpen, payload.locked);
    });

    this.events.on('monster:state', (payload) => {
      this.hud.updateThreatStatus(payload.state, this.monster.ai.isActive());
      if (payload.state === 'CHASE') {
        this.audio.playMonsterVocalization('chase');
        this.playerCamera.addTrauma(0.45);
      } else if (payload.state === 'INVESTIGATE') {
        this.audio.playMonsterVocalization('alert');
      } else if (payload.state === 'SEARCH') {
        this.audio.playMonsterVocalization('search');
      }
    });

    this.events.on('monster:attack', (payload) => {
      this.handlePlayerCaught(payload.reason);
    });

    this.events.on('scare:triggered', (payload) => {
      this.audio.playDistantImpact();
      this.levelBuilder.lighting.triggerDisturbance(payload.duration ?? 2.0);
      this.flashlight.triggerMalfunction(1.6);
      this.playerCamera.addTrauma(0.35);
    });

    this.events.on('subtitle:show', (payload) => {
      this.hud.showSubtitle(
        payload.text,
        payload.duration ?? 5.0,
        this.settingsManager.getSettings().subtitlesEnabled
      );
    });

    this.events.on('notification:show', (payload) => {
      this.hud.showNotification(payload.text, payload.tone ?? 'info');
    });
  }

  private applySettings(s = this.settingsManager.getSettings()): void {
    this.playerCamera.setSensitivity(s.mouseSensitivity);
    this.playerCamera.setReducedScreenShake(s.reducedScreenShake);
    this.player.setCrouchMode(s.crouchMode);
    this.flashlight.setReducedFlashing(s.reducedFlashing);
    this.levelBuilder.lighting.setReducedFlashing(s.reducedFlashing);
    this.sceneManager.applyQualityPreset(s.graphicsQuality);
    this.assets.setMaxAnisotropy(this.sceneManager.getMaxAnisotropy());
    this.audio.setReduceIntenseSfx(s.reduceIntenseSfx);
    this.audio.setVolumes(s.masterVolume, s.ambienceVolume, s.sfxVolume, s.musicVolume);
  }

  startNewGame(skipIntro = false): void {
    this.unlockAndStartAudio();

    this.resetWorldAndTransientState();
    this.player.setPositionAndYaw(0, 0, 2.5, Math.PI);
    this.lastCheckpointId = 'checkpoint_reception';

    this.hideAllScreens();
    this.state.startNewGame(skipIntro);

    if (skipIntro) {
      this.hud.show();
      this.objectives.emitCurrent();
      if (!this.saveManager.hasValidSave()) {
        this.saveCurrentProgress('checkpoint_reception');
      }
      this.player.requestPointerLock(this.sceneManager.getDomElement());
    } else {
      this.mainMenu.showIntro();
    }
  }

  completeIntroSequence(): void {
    this.mainMenu.hideIntro();
    this.state.completeIntro();
    this.hud.show();
    this.objectives.emitCurrent();
    this.hud.showSubtitle(
      '[02:13 AM]: Emergency locks active. Inspect the Reception Security Desk ahead.',
      5.5,
      this.settingsManager.getSettings().subtitlesEnabled
    );
    if (!this.saveManager.hasValidSave()) {
      this.saveCurrentProgress('checkpoint_reception');
    }
    this.player.requestPointerLock(this.sceneManager.getDomElement());
  }

  continueFromSave(): boolean {
    const saved = this.saveManager.loadSave();
    if (!saved) return false;

    this.audio.ensureUnlocked();
    this.ambience.start();
    this.restoreFromSaveData(saved);

    this.hideAllScreens();
    this.state.setState('PLAYING');
    this.hud.show();
    this.hud.showNotification('Checkpoint restored.', 'info');
    this.player.requestPointerLock(this.sceneManager.getDomElement());
    return true;
  }

  reloadCheckpoint(): boolean {
    if (this.saveManager.hasValidSave()) {
      return this.continueFromSave();
    }
    this.startNewGame(true);
    return true;
  }

  pauseGame(): void {
    if (this.state.pause()) {
      this.player.releasePointerLock();
      this.player.clearInputState();
      this.noteViewer.hideAllModals();
      this.pauseMenu.show();
    }
  }

  resumeGame(): void {
    if (this.state.resume()) {
      this.pauseMenu.hide();
      this.settingsMenu.hide();
      this.mainMenu.controlsModal.classList.add('hidden');
      this.hud.show();
      this.player.requestPointerLock(this.sceneManager.getDomElement());
    }
  }

  returnToMainMenu(): void {
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.hideAllScreens();
    this.state.returnToMenu();
    this.mainMenu.showMenu(this.saveManager.hasValidSave());
  }

  private handleEscapeKey(): void {
    const current = this.state.getState();
    if (this.settingsMenu.isVisible()) {
      this.settingsMenu.hide();
      return;
    }
    if (!this.mainMenu.controlsModal.classList.contains('hidden')) {
      this.mainMenu.controlsModal.classList.add('hidden');
      return;
    }
    if (current === 'READING' || current === 'PUZZLE') {
      this.noteViewer.closeAll();
      return;
    }
    if (current === 'PLAYING') {
      this.pauseGame();
    } else if (current === 'PAUSED') {
      this.resumeGame();
    }
  }

  private handleCollectItem(collectible: Collectible): void {
    this.collectedWorldObjectIds.add(collectible.id);
    this.audio.playPickupSound();

    if (collectible.kind === 'battery') {
      this.flashlight.recharge(GameConfig.FLASHLIGHT.BATTERY_PICKUP_AMOUNT);
      this.hud.showNotification('Flashlight battery recharged (+45%)', 'success');
    } else if (collectible.kind === 'decoy') {
      const qty = collectible.id.includes('storage') ? 3 : 2;
      this.inventory.addItem({
        id: 'decoy_bottle',
        name: 'Glass Decoy Bottle',
        category: 'decoy',
        count: qty,
        stackable: true
      });
      this.hud.showNotification(`Picked up ${qty}x Glass Acoustic Decoys [Press G to Throw]`, 'info');
    } else if (collectible.kind === 'key' || collectible.kind === 'keycard' || collectible.kind === 'fuse') {
      this.inventory.addItem({
        id: collectible.id,
        name: collectible.name,
        category: collectible.kind,
        count: 1
      });
      this.hud.showNotification(`Collected: ${collectible.name}`, 'success');
    }

    this.evaluateObjectivesAndSave(`checkpoint_${collectible.id}`);
  }

  private handleReadDocument(docId: string): void {
    const doc = this.narrative.markDocumentRead(docId);
    if (!doc) return;
    this.audio.playPickupSound();
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.state.openReading();
    this.noteViewer.openDocument(doc);
    this.evaluateObjectivesAndSave(`checkpoint_${docId}`);
  }

  private handleAccessTerminal(terminal: ComputerTerminal): void {
    this.audio.playUiClick();
    if (terminal.canBoot()) {
      this.narrative.markTerminalAccessed(terminal.id);
    }
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.state.openReading();
    this.noteViewer.openTerminal(terminal);
    this.evaluateObjectivesAndSave(`checkpoint_${terminal.id}`);
  }

  private openPowerPuzzleModal(): void {
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.state.openPuzzle();
    this.noteViewer.openPowerPuzzle();
  }

  private openKeypadPuzzleModal(): void {
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.state.openPuzzle();
    this.noteViewer.openKeypadPuzzle();
  }

  private openExitPuzzleModal(): void {
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.state.openPuzzle();
    this.noteViewer.openExitPuzzle();
  }

  private handlePowerRestored(): void {
    this.audio.playElectricalFeedback(true);
    this.levelBuilder.lighting.setPowerRestored(true);

    const labDoor = this.levelBuilder.doors.get('door_lab');
    if (labDoor && labDoor.isLocked()) {
      labDoor.unlock(false);
      this.unlockedDoorIds.add('door_lab');
    }

    // Activate Subject 09 in the Research Lab / North Corridor
    if (!this.monster.ai.isActive()) {
      this.monster.activate(new THREE.Vector3(-10.5, 0, -20));
    }

    this.noteViewer.closeAll();
    this.hud.showNotification(
      '120V Backup Power Online — Research Lab Unlocked. Subject 09 is active!',
      'danger'
    );
    this.hud.showSubtitle(
      '[CONTAINMENT ALARM]: Subject 09 has entered the main wing! Use crouch [Ctrl] and lockers [E].',
      6.0,
      this.settingsManager.getSettings().subtitlesEnabled
    );
    this.evaluateObjectivesAndSave('checkpoint_power_restored');
  }

  private handleSecurityKeypadSolved(): void {
    this.audio.playElectricalFeedback(true);
    const secDoor = this.levelBuilder.doors.get('door_security');
    if (secDoor && secDoor.isLocked()) {
      secDoor.unlock(true);
      this.unlockedDoorIds.add('door_security');
    }
    this.noteViewer.closeAll();
    this.hud.showNotification('Security Office Keypad Unlocked (PIN 2413)', 'success');
    this.evaluateObjectivesAndSave('checkpoint_security_unlocked');
  }

  private handleExitConsoleSolved(): void {
    this.audio.playElectricalFeedback(true);
    this.noteViewer.closeAll();
    this.hud.showNotification(
      'QUARANTINE SEAL RELEASED! Interact with the Exterior Airlock Hatch to escape!',
      'success'
    );
    this.hud.showSubtitle(
      '[AIRLOCK SIREN]: Quarantine blast doors opening—Subject 09 is converging on the North Hall!',
      5.5,
      this.settingsManager.getSettings().subtitlesEnabled
    );

    // Create final escape tension by alerting Subject 09 toward the North Corridor
    if (this.monster.ai.isActive()) {
      this.monster.ai.notifySoundEvent(0, -32, 28, 'interaction');
    }
    this.evaluateObjectivesAndSave('checkpoint_exit_ready');
  }

  private handleToggleHiding(spot: HidingSpot): void {
    this.audio.playDoorSound(!this.player.isHiding(), false);
    if (this.player.isHiding()) {
      this.player.exitHiding();
    } else {
      this.monster.ai.notifyPlayerEnteredHiding(this.player.position);
      this.player.enterHiding(spot.id, spot.hidePosition, spot.exitPosition, spot.exitYaw);
    }
  }

  private handlePlayerCaught(reason: string): void {
    if (this.state.getState() === 'GAME_OVER' || this.state.getState() === 'VICTORY') return;
    this.audio.playMonsterVocalization('attack');
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.noteViewer.hideAllModals();
    this.hud.hide();
    this.state.triggerDefeat();
    this.gameOverScreen.show(reason);
  }

  public handleTriggerVictory(): void {
    if (this.state.getState() === 'VICTORY') return;
    this.audio.playElectricalFeedback(true);
    this.player.releasePointerLock();
    this.player.clearInputState();
    this.noteViewer.hideAllModals();
    this.hud.hide();
    this.state.triggerVictory();

    this.victoryScreen.show({
      elapsedSeconds: this.state.getElapsedPlayTime(),
      discoveredDocs: this.narrative.getDiscoveredDocuments(),
      totalDocs: this.narrative.getTotalDocumentCount(),
      accessedTerminalsCount: this.narrative.getAccessedTerminalIds().length,
      totalTerminals: this.narrative.getTotalTerminalCount(),
      deathCount: this.state.getDeathCount()
    });
  }

  public getExitRequirementState(): ExitRequirementCheck {
    return {
      powerRestored: this.powerPuzzle.isSolved(),
      hasLevel2Card: this.inventory.hasItem('level2_access_card'),
      hasMasterOverrideCard: this.inventory.hasItem('master_override_card')
    };
  }

  public evaluateObjectivesAndSave(checkpointId?: string): void {
    this.objectives.evaluateProgression({
      readReceptionNote: this.narrative.hasReadDocument('doc_reception_log'),
      hasMaintenanceKey:
        this.inventory.hasItem('maintenance_key') || this.unlockedDoorIds.has('door_basement'),
      hasReplacementFuse:
        this.inventory.hasItem('replacement_fuse') || this.powerPuzzle.isFuseInserted(),
      powerRestored: this.powerPuzzle.isSolved(),
      hasLevel2Card: this.inventory.hasItem('level2_access_card'),
      foundKeypadClue:
        this.narrative.hasReadDocument('doc_lab_experiment') ||
        this.narrative.getAccessedTerminalIds().includes('terminal_lab'),
      securityUnlocked: this.keypadPuzzle.isUnlocked(),
      hasMasterCard: this.inventory.hasItem('master_override_card'),
      exitReady: this.exitSequence.isExitReady()
    });

    if (checkpointId) {
      this.lastCheckpointId = checkpointId;
      this.saveCurrentProgress(checkpointId);
    }
  }

  public saveCurrentProgress(checkpointId = this.lastCheckpointId): boolean {
    const saveData: SaveDataV1 = {
      version: GameConfig.VERSION,
      timestamp: Date.now(),
      checkpointId,
      playerPosition: {
        x: this.player.position.x,
        y: this.player.position.y,
        z: this.player.position.z
      },
      playerYaw: this.playerCamera.getYaw(),
      flashlightBattery: this.flashlight.getBattery(),
      flashlightEnabled: this.flashlight.isEnabled(),
      currentObjectiveIndex: this.objectives.getCurrentIndex(),
      completedObjectives: this.objectives.getCompletedObjectives(),
      inventoryItems: this.inventory.getAllItems(),
      collectedWorldObjectIds: Array.from(this.collectedWorldObjectIds),
      unlockedDoorIds: Array.from(this.unlockedDoorIds),
      discoveredDocumentIds: this.narrative.getDiscoveredDocumentIds(),
      readTerminalIds: this.narrative.getAccessedTerminalIds(),
      triggeredScareIds: this.scares.getTriggeredIds(),
      puzzles: {
        fuseInserted: this.powerPuzzle.isFuseInserted(),
        powerSwitches: this.powerPuzzle.getSwitches(),
        powerRestored: this.powerPuzzle.isSolved(),
        securityKeypadUnlocked: this.keypadPuzzle.isUnlocked(),
        exitCredentialsInserted: this.exitSequence.isCredentialsInserted(),
        exitPurgeCompleted: this.exitSequence.isExitReady()
      },
      elapsedPlayTime: this.state.getElapsedPlayTime()
    };

    return this.saveManager.saveCheckpoint(saveData);
  }

  public restoreFromSaveData(data: SaveDataV1): void {
    this.resetWorldAndTransientState();

    this.lastCheckpointId = data.checkpointId;
    this.player.setPositionAndYaw(
      data.playerPosition.x,
      data.playerPosition.y,
      data.playerPosition.z,
      data.playerYaw
    );
    this.flashlight.setBattery(data.flashlightBattery);
    this.flashlight.setEnabled(data.flashlightEnabled);
    this.inventory.restoreItems(data.inventoryItems);

    this.collectedWorldObjectIds = new Set(data.collectedWorldObjectIds);
    for (const id of this.collectedWorldObjectIds) {
      const col = this.levelBuilder.collectibles.get(id);
      if (col) {
        col.markCollected();
      }
    }

    this.unlockedDoorIds = new Set(data.unlockedDoorIds);
    for (const doorId of this.unlockedDoorIds) {
      const door = this.levelBuilder.doors.get(doorId);
      if (door) {
        door.unlock(false);
      }
    }

    this.powerPuzzle.restoreState(
      data.puzzles.fuseInserted,
      data.puzzles.powerSwitches,
      data.puzzles.powerRestored
    );
    this.keypadPuzzle.restoreState(data.puzzles.securityKeypadUnlocked);
    this.exitSequence.restoreState(
      data.puzzles.exitCredentialsInserted,
      data.puzzles.exitPurgeCompleted
    );

    if (data.puzzles.powerRestored) {
      this.levelBuilder.lighting.setPowerRestored(true);
      const labDoor = this.levelBuilder.doors.get('door_lab');
      if (labDoor && labDoor.isLocked()) {
        labDoor.unlock(false);
      }
      // Spawn monster at farthest patrol waypoint from restored player position to prevent unavoidable death
      const safeNode = this.navGraph.getFarthestPatrolNode(this.player.position);
      this.monster.activate(safeNode ? safeNode.position : new THREE.Vector3(-10.5, 0, -20));
    }

    if (data.puzzles.securityKeypadUnlocked) {
      const secDoor = this.levelBuilder.doors.get('door_security');
      if (secDoor && secDoor.isLocked()) {
        secDoor.unlock(false);
      }
    }

    this.narrative.restoreState(data.discoveredDocumentIds, data.readTerminalIds);
    this.scares.restoreState(data.triggeredScareIds);
    this.objectives.restoreState(data.currentObjectiveIndex, data.completedObjectives);
    this.state.setElapsedPlayTime(data.elapsedPlayTime);
  }

  private resetWorldAndTransientState(): void {
    this.collectedWorldObjectIds.clear();
    this.unlockedDoorIds.clear();

    for (const col of this.levelBuilder.collectibles.values()) {
      col.reset();
    }
    for (const term of this.levelBuilder.terminals.values()) {
      term.reset();
    }
    for (const [id, door] of this.levelBuilder.doors.entries()) {
      door.setOpen(false);
      if (id === 'door_basement' || id === 'door_lab' || id === 'door_security') {
        (door as any).locked = true;
      }
    }

    this.stamina.reset();
    this.flashlight.setBattery(GameConfig.FLASHLIGHT.MAX_BATTERY);
    this.flashlight.setEnabled(true);
    this.inventory.clear();

    this.powerPuzzle.reset();
    this.keypadPuzzle.reset();
    this.exitSequence.reset();
    this.levelBuilder.lighting.setPowerRestored(false);

    this.monster.deactivate();
    this.objectives.reset();
    this.narrative.reset();
    this.scares.reset();
  }

  private hideAllScreens(): void {
    this.mainMenu.hideMenu();
    this.mainMenu.hideIntro();
    this.hud.hide();
    this.pauseMenu.hide();
    this.settingsMenu.hide();
    this.noteViewer.hideAllModals();
    this.gameOverScreen.hide();
    this.victoryScreen.hide();
  }

  public tick(dt: number, _elapsed: number): void {
    const mode = this.state.getState();

    if (mode === 'MENU' || mode === 'LOADING') {
      this.menuCameraAngle += dt * 0.18;
      this.playerCamera.camera.position.set(
        Math.sin(this.menuCameraAngle) * 1.65,
        1.72 + Math.sin(this.menuCameraAngle * 1.7) * 0.04,
        2.1 + Math.cos(this.menuCameraAngle * 0.65) * 0.75
      );
      this.playerCamera.camera.lookAt(
        Math.sin(this.menuCameraAngle * 0.5) * 0.8,
        1.42,
        -6.5
      );
      this.levelBuilder.update(dt);
      this.sceneManager.render(this.playerCamera.camera, dt);
      return;
    }

    this.state.updatePlayTime(dt);

    if (mode === 'PLAYING') {
      this.player.update(dt);
      this.playerInteraction.update();
      this.hud.updateInteractionTarget(this.playerInteraction.getPromptText());
      this.scares.update(this.player.position, this.powerPuzzle.isSolved());

      this.monster.update(dt, {
        position: this.player.position,
        isHiding: this.player.isHiding(),
        isCrouching: this.player.isCrouching(),
        flashlightLit: this.flashlight.isEffectivelyLit()
      });

      const distToMonster = this.monster.ai.isActive()
        ? this.player.position.distanceTo(this.monster.ai.position)
        : 999;
      this.ambience.updateTension(this.monster.ai.getState(), distToMonster, false, dt);
    } else {
      this.ambience.updateTension(this.monster.ai.getState(), 999, true, dt);
    }

    this.levelBuilder.update(dt);
    this.sceneManager.render(this.playerCamera.camera, dt);
  }

  dispose(): void {
    this.gameLoop.stop();
    this.unbindInput?.();
    this.ambience.stop();
    this.sceneManager.dispose();
    this.assets.dispose();
  }
}
