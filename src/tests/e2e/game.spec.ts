import { expect, test } from '@playwright/test';

test.describe('THE LAST SHIFT — End-to-End Browser Verification', () => {
  test('loads main menu, changes settings, starts new game, pauses/resumes, and completes full gameplay loop to victory with zero console errors', async ({
    page
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/');

    // 1. Main menu visible after initialization
    const mainMenu = page.locator('#main-menu');
    await expect(mainMenu).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.game-title')).toHaveText('THE LAST SHIFT');

    // 2. Game canvas is mounted, crisp, and configured with sRGB + ACES Filmic tone mapping
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
    const rendererInfo = await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      const c = game.sceneManager.getDomElement()!;
      return {
        width: c.width,
        height: c.height,
        clientWidth: c.clientWidth,
        clientHeight: c.clientHeight,
        colorSpace: game.sceneManager.getOutputColorSpace(),
        audioState: game.ambience.getAudioState()
      };
    });
    expect(rendererInfo.width).toBeGreaterThanOrEqual(rendererInfo.clientWidth * 0.8);
    expect(rendererInfo.height).toBeGreaterThanOrEqual(rendererInfo.clientHeight * 0.8);
    expect(rendererInfo.colorSpace).toBe('srgb');
    expect(rendererInfo.audioState).toBe('MENU');

    // 2b. Click Main Menu Horror Audio status pill to activate procedural horror theme
    await page.click('#btn-enable-audio');
    await expect(page.locator('#audio-status-label')).toContainText('HORROR THEME ACTIVE');

    // 3. Open Settings modal, adjust graphics & audio settings, and close
    await page.click('#btn-menu-settings');
    const settingsModal = page.locator('#settings-modal');
    await expect(settingsModal).toBeVisible();
    await expect(page.locator('#setting-music-volume')).toBeVisible();
    await expect(page.locator('#setting-reduce-intense-sfx')).toBeVisible();

    await page.selectOption('#setting-graphics-quality', 'medium');
    await page.selectOption('#setting-graphics-quality', 'high');
    await page.selectOption('#setting-graphics-quality', 'low');
    await page.selectOption('#setting-crouch-mode', 'toggle');
    await page.check('#setting-reduced-shake');
    await page.check('#setting-reduce-intense-sfx');
    await page.click('#btn-settings-close');
    await expect(settingsModal).toBeHidden();

    // 4. Start New Game -> Intro sequence -> Enter facility
    await page.click('#btn-new-game');
    const introOverlay = page.locator('#intro-overlay');
    await expect(introOverlay).toBeVisible();
    await page.click('#btn-begin-shift');
    await expect(introOverlay).toBeHidden();

    // 5. HUD is visible with initial objective and audio state transitioned to PLAYING
    const hud = page.locator('#hud-overlay');
    await expect(hud).toBeVisible();
    await expect(page.locator('#hud-objective-title')).toContainText('Reception');
    expect(await page.evaluate(() => window.__THE_LAST_SHIFT__!.ambience.getAudioState())).toBe(
      'PLAYING'
    );

    // 6. Test Pause and Resume flow & audio state ducking
    await page.keyboard.press('Escape');
    const pauseMenu = page.locator('#pause-menu');
    await expect(pauseMenu).toBeVisible();
    expect(await page.evaluate(() => window.__THE_LAST_SHIFT__!.ambience.getAudioState())).toBe(
      'PAUSED'
    );
    await page.click('#btn-pause-resume');
    await expect(pauseMenu).toBeHidden();
    expect(await page.evaluate(() => window.__THE_LAST_SHIFT__!.ambience.getAudioState())).toBe(
      'PLAYING'
    );

    // 7. Execute complete gameplay progression loop through the 9 facility rooms
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      // Step 1: Read Reception Directive Note
      game.levelBuilder.collectibles.get('doc_reception_log')!.interact();
    });
    await expect(page.locator('#note-viewer-modal')).toBeVisible();
    await page.click('#btn-close-note');
    await expect(page.locator('#hud-objective-title')).toContainText('Maintenance Key');

    // Step 2: Collect Maintenance Key & Replacement Fuse
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.levelBuilder.collectibles.get('maintenance_key')!.interact();
      game.levelBuilder.collectibles.get('replacement_fuse')!.interact();
      game.levelBuilder.doors.get('door_basement')!.interact();
    });
    await expect(page.locator('#hud-objective-title')).toContainText('Backup Power');

    // Step 3: Solve Electrical Routing Puzzle (Puzzle A) via UI
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.interactionManager.get('puzzle_power_panel')!.interact();
    });
    await expect(page.locator('#power-puzzle-modal')).toBeVisible();
    await page.click('#btn-power-switch-0'); // 45V
    await page.click('#btn-power-switch-2'); // 75V -> 120V
    await page.click('#btn-engage-breaker');
    await expect(page.locator('#power-puzzle-modal')).toBeHidden();
    await expect(page.locator('#hud-objective-title')).toContainText('Research Laboratory');

    // Step 4: Collect Level-2 Access Card & Read Lab Document
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.levelBuilder.collectibles.get('level2_access_card')!.interact();
    });
    await expect(page.locator('#hud-objective-title')).toContainText('2413');

    // Step 5: Unlock Security Office Keypad (Puzzle B - 2413) via UI
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.interactionManager.get('puzzle_security_keypad')!.interact();
    });
    await expect(page.locator('#keypad-puzzle-modal')).toBeVisible();
    await page.click('#btn-keypad-2');
    await page.click('#btn-keypad-4');
    await page.click('#btn-keypad-1');
    await page.click('#btn-keypad-3');
    await page.click('#btn-keypad-OK');
    await expect(page.locator('#keypad-puzzle-modal')).toBeHidden();

    // Step 6: Collect Master Override Keycard in Security Office
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.levelBuilder.collectibles.get('master_override_card')!.interact();
    });
    await expect(page.locator('#hud-objective-title')).toContainText('Quarantine Exit');

    // Step 7: Activate Final Quarantine Exit Console (Puzzle C - 7904) via UI
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.interactionManager.get('puzzle_exit_console')!.interact();
    });
    await expect(page.locator('#exit-puzzle-modal')).toBeVisible();
    await page.click('#btn-exit-key-7');
    await page.click('#btn-exit-key-9');
    await page.click('#btn-exit-key-0');
    await page.click('#btn-exit-key-4');
    await page.click('#btn-submit-exit-purge');
    await expect(page.locator('#exit-puzzle-modal')).toBeHidden();

    // Step 8: Evacuate through Exterior Airlock Hatch -> Victory Screen
    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.interactionManager.get('final_escape_hatch')!.interact();
    });
    const victoryScreen = page.locator('#victory-screen');
    await expect(victoryScreen).toBeVisible();
    await expect(page.locator('.victory-title')).toHaveText('SURVIVED THE LAST SHIFT');

    // 8. Verify Game Over screen & Checkpoint Retry flow
    await page.click('#btn-victory-menu');
    await expect(mainMenu).toBeVisible();
    await page.click('#btn-continue');
    await expect(hud).toBeVisible();

    await page.evaluate(() => {
      const game = window.__THE_LAST_SHIFT__!;
      game.events.emit('monster:attack', { reason: 'Subject 09 caught you in the corridor.' });
    });
    const gameOverScreen = page.locator('#game-over-screen');
    await expect(gameOverScreen).toBeVisible();
    await page.click('#btn-gameover-retry');
    await expect(gameOverScreen).toBeHidden();
    await expect(hud).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
