import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';

export class KeypadPuzzle {
  private buffer = '';
  private unlocked = false;
  private errorCount = 0;
  private statusMessage = 'ENTER 4-DIGIT SECURITY PIN';

  constructor(
    private readonly events: EventBus,
    private readonly targetCode: string = GameConfig.PUZZLES.SECURITY_KEYPAD_CODE,
    private readonly puzzleId = 'security_keypad'
  ) {}

  pressDigit(digit: string): string {
    if (this.unlocked) return this.buffer;
    if (!/^[0-9]$/.test(digit)) return this.buffer;
    if (this.buffer.length < 4) {
      this.buffer += digit;
      this.statusMessage = `INPUT: ${this.buffer.padEnd(4, '•')}`;
    }
    return this.buffer;
  }

  backspace(): string {
    if (this.unlocked) return this.buffer;
    this.buffer = this.buffer.slice(0, -1);
    this.statusMessage = this.buffer.length > 0 ? `INPUT: ${this.buffer}` : 'ENTER 4-DIGIT SECURITY PIN';
    return this.buffer;
  }

  clear(): void {
    if (this.unlocked) return;
    this.buffer = '';
    this.statusMessage = 'INPUT CLEARED';
  }

  getBuffer(): string {
    return this.buffer;
  }

  validateCode(code: string): boolean {
    return code.trim() === this.targetCode;
  }

  submit(codeOverride?: string): { success: boolean; message: string } {
    const candidate = codeOverride !== undefined ? codeOverride : this.buffer;
    if (this.validateCode(candidate)) {
      this.unlocked = true;
      this.buffer = this.targetCode;
      this.statusMessage = 'ACCESS GRANTED — SECURITY OFFICE MAG-LOCK DISENGAGED';
      this.events.emit('puzzle:solved', { type: 'keypad', id: this.puzzleId });
      return { success: true, message: this.statusMessage };
    }

    this.errorCount += 1;
    this.buffer = '';
    this.statusMessage = 'ACCESS DENIED — INVALID PIN (Check Research Lab Dr. Vance Memo)';
    return { success: false, message: this.statusMessage };
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  getStatusMessage(): string {
    return this.statusMessage;
  }

  restoreState(unlocked: boolean): void {
    this.unlocked = unlocked;
    if (unlocked) {
      this.buffer = this.targetCode;
      this.statusMessage = 'ACCESS GRANTED — SECURITY OFFICE MAG-LOCK DISENGAGED';
    }
  }

  reset(): void {
    this.buffer = '';
    this.unlocked = false;
    this.errorCount = 0;
    this.statusMessage = 'ENTER 4-DIGIT SECURITY PIN';
  }
}
