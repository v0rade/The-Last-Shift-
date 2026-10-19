import { Game } from './game/Game';

declare global {
  interface Window {
    __THE_LAST_SHIFT__?: Game;
  }
}

async function bootstrap(): Promise<void> {
  const canvasContainer = document.getElementById('canvas-container');
  const uiRoot = document.getElementById('ui-root');
  if (!canvasContainer || !uiRoot) return;

  const game = new Game(canvasContainer, uiRoot);
  window.__THE_LAST_SHIFT__ = game;
  await game.initialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bootstrap();
  });
} else {
  bootstrap();
}
