import { beforeEach, describe, expect, it } from 'vitest';
import { Game } from '../../game/Game';

describe('Integration Tests — Full Progression & World Interactions', () => {
  let canvasContainer: HTMLElement;
  let uiRoot: HTMLElement;
  let game: Game;

  beforeEach(async () => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="ui-root"></div>
    `;
    canvasContainer = document.getElementById('canvas-container')!;
    uiRoot = document.getElementById('ui-root')!;
    game = new Game(canvasContainer, uiRoot);
    await game.initialize();
    game.startNewGame(true);
  });

  it('collecting the Maintenance Key unlocks the Basement Service Door', () => {
    const basementDoor = game.levelBuilder.doors.get('door_basement')!;
    expect(basementDoor.isLocked()).toBe(true);

    // Attempt to open while locked without key
    basementDoor.interact();
    expect(basementDoor.isLocked()).toBe(true);
    expect(basementDoor.getIsOpen()).toBe(false);

    // Collect Maintenance Key from Medical Examination Room
    const keyCollectible = game.levelBuilder.collectibles.get('maintenance_key')!;
    keyCollectible.interact();
    expect(game.inventory.hasItem('maintenance_key')).toBe(true);

    // Interact with Basement Door now unlocks and opens it
    basementDoor.interact();
    expect(basementDoor.isLocked()).toBe(false);
    expect(basementDoor.getIsOpen()).toBe(true);
  });

  it('solving the Electrical Routing Puzzle unlocks Research Lab and activates Subject 09', () => {
    const labDoor = game.levelBuilder.doors.get('door_lab')!;
    expect(labDoor.isLocked()).toBe(true);
    expect(game.monster.ai.isActive()).toBe(false);

    // Collect Replacement Fuse
    const fuseCollectible = game.levelBuilder.collectibles.get('replacement_fuse')!;
    fuseCollectible.interact();
    expect(game.inventory.hasItem('replacement_fuse')).toBe(true);

    // Open power puzzle modal (auto-inserts fuse)
    const powerPanel = game.interactionManager.get('puzzle_power_panel')!;
    powerPanel.interact();
    expect(game.powerPuzzle.isFuseInserted()).toBe(true);

    // Toggle switches A1 (0: 45V) and C3 (2: 75V) -> 120V and engage breaker
    game.powerPuzzle.toggleSwitch(0);
    game.powerPuzzle.toggleSwitch(2);
    const engageBtn = document.getElementById('btn-engage-breaker')!;
    engageBtn.click();

    expect(game.powerPuzzle.isSolved()).toBe(true);
    expect(labDoor.isLocked()).toBe(false);
    expect(game.monster.ai.isActive()).toBe(true);
  });

  it('discovering and entering code 2413 unlocks the Security Office door', () => {
    const secDoor = game.levelBuilder.doors.get('door_security')!;
    expect(secDoor.isLocked()).toBe(true);

    const keypadInteractable = game.interactionManager.get('puzzle_security_keypad')!;
    keypadInteractable.interact();

    for (const digit of ['2', '4', '1', '3']) {
      (document.getElementById(`btn-keypad-${digit}`) as HTMLButtonElement).click();
    }
    (document.getElementById('btn-keypad-OK') as HTMLButtonElement).click();

    expect(game.keypadPuzzle.isUnlocked()).toBe(true);
    expect(secDoor.isLocked()).toBe(false);
    expect(secDoor.getIsOpen()).toBe(true);
  });

  it('prevents activating the Final Exit before required objectives are completed, then allows victory once met', () => {
    const escapeHatch = game.interactionManager.get('final_escape_hatch')!;
    escapeHatch.interact();
    // Should open the exit console puzzle instead of triggering victory
    expect(game.state.getState()).toBe('PUZZLE');

    // Attempt purge without requirements
    const purgeBtn = document.getElementById('btn-submit-exit-purge')!;
    purgeBtn.click();
    expect(game.exitSequence.isExitReady()).toBe(false);
    expect(game.state.getState()).not.toBe('VICTORY');

    // Complete prerequisites: Power + Level-2 Card + Master Override Card + Code 7904
    game.levelBuilder.collectibles.get('replacement_fuse')!.interact();
    game.powerPuzzle.insertFuse();
    game.powerPuzzle.toggleSwitch(0);
    game.powerPuzzle.toggleSwitch(2);
    (document.getElementById('btn-engage-breaker') as HTMLButtonElement).click();

    game.levelBuilder.collectibles.get('level2_access_card')!.interact();
    game.levelBuilder.collectibles.get('master_override_card')!.interact();

    game.interactionManager.get('puzzle_exit_console')!.interact();
    for (const digit of ['7', '9', '0', '4']) {
      (document.getElementById(`btn-exit-key-${digit}`) as HTMLButtonElement).click();
    }
    purgeBtn.click();

    expect(game.exitSequence.isExitReady()).toBe(true);

    // Now interacting with the Final Escape Hatch triggers Victory!
    escapeHatch.interact();
    expect(game.state.getState()).toBe('VICTORY');
  });

  it('restores progression from a valid save without duplicating item rewards, and resets cleanly on New Game', () => {
    const keyCol = game.levelBuilder.collectibles.get('maintenance_key')!;
    keyCol.interact();
    expect(game.inventory.hasItem('maintenance_key')).toBe(true);
    expect(keyCol.isEnabled()).toBe(false);

    // Move player and save checkpoint
    game.player.setPositionAndYaw(-6.5, 0, -10.0, 1.5);
    game.saveCurrentProgress('checkpoint_exam_room');

    // Start a new game: transient state resets
    game.startNewGame(true);
    expect(game.inventory.hasItem('maintenance_key')).toBe(false);
    expect(keyCol.isEnabled()).toBe(true);
    expect(game.player.position.z).toBeCloseTo(2.5, 1);

    // Continue from saved checkpoint: restores inventory, position, and disables already-collected world pickup
    const ok = game.continueFromSave();
    expect(ok).toBe(true);
    expect(game.inventory.hasItem('maintenance_key')).toBe(true);
    expect(game.inventory.getItemCount('maintenance_key')).toBe(1);
    expect(keyCol.isEnabled()).toBe(false);
    expect(game.player.position.x).toBeCloseTo(-6.5, 1);
  });
});
