import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';

export interface ExitRequirementCheck {
  powerRestored: boolean;
  hasLevel2Card: boolean;
  hasMasterOverrideCard: boolean;
}

export class ExitSequence {
  private credentialsInserted = false;
  private overrideCodeVerified = false;
  private codeBuffer = '';
  private statusMessage = 'QUARANTINE LOCKDOWN ACTIVE — CREDENTIALS REQUIRED';

  constructor(private readonly events: EventBus) {}

  getMissingRequirements(state: ExitRequirementCheck): string[] {
    const missing: string[] = [];
    if (!state.powerRestored) {
      missing.push('Restore Backup Generator Power in Electrical Room');
    }
    if (!state.hasLevel2Card) {
      missing.push('Collect Level-2 Research Access Card (Research Lab)');
    }
    if (!state.hasMasterOverrideCard) {
      missing.push('Collect Master Override Keycard (Security Office)');
    }
    return missing;
  }

  canInsertCredentials(state: ExitRequirementCheck): boolean {
    return this.getMissingRequirements(state).length === 0;
  }

  insertCredentials(state: ExitRequirementCheck): { success: boolean; message: string } {
    const missing = this.getMissingRequirements(state);
    if (missing.length > 0) {
      this.statusMessage = `MISSING REQUIREMENTS: ${missing.join(' | ')}`;
      return { success: false, message: this.statusMessage };
    }
    this.credentialsInserted = true;
    this.statusMessage = 'DUAL KEYCARDS ACCEPTED — ENTER LOCKDOWN PURGE CODE (7904)';
    return { success: true, message: this.statusMessage };
  }

  pressDigit(digit: string): string {
    if (this.overrideCodeVerified) return this.codeBuffer;
    if (!/^[0-9]$/.test(digit)) return this.codeBuffer;
    if (this.codeBuffer.length < 4) {
      this.codeBuffer += digit;
    }
    return this.codeBuffer;
  }

  clearCode(): void {
    if (this.overrideCodeVerified) return;
    this.codeBuffer = '';
  }

  getCodeBuffer(): string {
    return this.codeBuffer;
  }

  attemptActivateExit(
    state: ExitRequirementCheck,
    codeInput = this.codeBuffer
  ): { success: boolean; message: string } {
    const missing = this.getMissingRequirements(state);
    if (missing.length > 0) {
      this.statusMessage = `LOCKDOWN ENGAGED — Missing: ${missing.join(', ')}`;
      return { success: false, message: this.statusMessage };
    }

    this.credentialsInserted = true;

    if (codeInput.trim() !== GameConfig.PUZZLES.FINAL_EXIT_CODE) {
      this.codeBuffer = '';
      this.statusMessage = 'INVALID PURGE CODE — Check Security Office Terminal #2 (Code: 7904)';
      return { success: false, message: this.statusMessage };
    }

    this.overrideCodeVerified = true;
    this.codeBuffer = GameConfig.PUZZLES.FINAL_EXIT_CODE;
    this.statusMessage = 'QUARANTINE SEAL RELEASED — AIRLOCK EVACUATION READY';
    this.events.emit('puzzle:solved', { type: 'exit', id: 'final_exit' });
    return { success: true, message: this.statusMessage };
  }

  isCredentialsInserted(): boolean {
    return this.credentialsInserted;
  }

  isExitReady(): boolean {
    return this.credentialsInserted && this.overrideCodeVerified;
  }

  getStatusMessage(): string {
    return this.statusMessage;
  }

  restoreState(credentialsInserted: boolean, overrideCodeVerified: boolean): void {
    this.credentialsInserted = credentialsInserted;
    this.overrideCodeVerified = overrideCodeVerified;
    if (overrideCodeVerified) {
      this.codeBuffer = GameConfig.PUZZLES.FINAL_EXIT_CODE;
      this.statusMessage = 'QUARANTINE SEAL RELEASED — AIRLOCK EVACUATION READY';
    }
  }

  reset(): void {
    this.credentialsInserted = false;
    this.overrideCodeVerified = false;
    this.codeBuffer = '';
    this.statusMessage = 'QUARANTINE LOCKDOWN ACTIVE — CREDENTIALS REQUIRED';
  }
}
