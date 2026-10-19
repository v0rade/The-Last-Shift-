import { EventBus } from '../utils/EventBus';

export type GameModeState =
  | 'LOADING'
  | 'MENU'
  | 'INTRO'
  | 'PLAYING'
  | 'PAUSED'
  | 'READING'
  | 'PUZZLE'
  | 'GAME_OVER'
  | 'VICTORY'
  | 'ERROR';

export class GameStateManager {
  private currentState: GameModeState = 'LOADING';
  private previousState: GameModeState = 'LOADING';
  private elapsedPlayTimeSeconds = 0;
  private deathCount = 0;

  constructor(private readonly events: EventBus) {}

  getState(): GameModeState {
    return this.currentState;
  }

  getPreviousState(): GameModeState {
    return this.previousState;
  }

  setState(next: GameModeState): void {
    if (this.currentState === next) return;
    const prev = this.currentState;
    this.previousState = prev;
    this.currentState = next;
    this.events.emit('state:changed', { from: prev, to: next });
  }

  startNewGame(skipIntro = false): void {
    this.elapsedPlayTimeSeconds = 0;
    this.setState(skipIntro ? 'PLAYING' : 'INTRO');
  }

  completeIntro(): void {
    if (this.currentState === 'INTRO') {
      this.setState('PLAYING');
    }
  }

  pause(): boolean {
    if (
      this.currentState === 'PLAYING' ||
      this.currentState === 'READING' ||
      this.currentState === 'PUZZLE' ||
      this.currentState === 'INTRO'
    ) {
      this.setState('PAUSED');
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.currentState === 'PAUSED') {
      this.setState('PLAYING');
      return true;
    }
    return false;
  }

  openReading(): void {
    if (this.currentState === 'PLAYING') {
      this.setState('READING');
    }
  }

  openPuzzle(): void {
    if (this.currentState === 'PLAYING') {
      this.setState('PUZZLE');
    }
  }

  closeModalToGameplay(): void {
    if (this.currentState === 'READING' || this.currentState === 'PUZZLE') {
      this.setState('PLAYING');
    }
  }

  triggerDefeat(): void {
    if (this.currentState === 'GAME_OVER' || this.currentState === 'VICTORY') return;
    this.deathCount += 1;
    this.setState('GAME_OVER');
  }

  triggerVictory(): void {
    if (this.currentState === 'VICTORY') return;
    this.setState('VICTORY');
  }

  triggerError(): void {
    this.setState('ERROR');
  }

  returnToMenu(): void {
    this.setState('MENU');
  }

  isGameplayActive(): boolean {
    return this.currentState === 'PLAYING';
  }

  isSimulationRunning(): boolean {
    return this.currentState === 'PLAYING' || this.currentState === 'PUZZLE';
  }

  updatePlayTime(dt: number): void {
    if (this.currentState === 'PLAYING' || this.currentState === 'PUZZLE' || this.currentState === 'READING') {
      this.elapsedPlayTimeSeconds += dt;
    }
  }

  getElapsedPlayTime(): number {
    return this.elapsedPlayTimeSeconds;
  }

  setElapsedPlayTime(seconds: number): void {
    this.elapsedPlayTimeSeconds = Math.max(0, seconds);
  }

  getDeathCount(): number {
    return this.deathCount;
  }
}
