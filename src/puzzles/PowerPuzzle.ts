import { GameConfig } from '../game/GameConfig';
import { EventBus } from '../utils/EventBus';

export interface PowerSwitchSpec {
  index: number;
  code: string;
  label: string;
  voltage: number;
}

export const POWER_SWITCH_SPECS: PowerSwitchSpec[] = [
  { index: 0, code: 'CIRCUIT-A1', label: 'Primary Corridor & Bio-Lab Bus', voltage: 45 },
  { index: 1, code: 'CIRCUIT-B2', label: 'Cryo-Compressor Array (Faulty)', voltage: 30 },
  { index: 2, code: 'CIRCUIT-C3', label: 'Security Grid & Mag-Lock Relay', voltage: 75 },
  { index: 3, code: 'CIRCUIT-D4', label: 'Incinerator Auxiliary Line', voltage: 50 }
];

export class PowerPuzzle {
  private fuseInserted = false;
  private switches: boolean[] = [false, false, false, false];
  private solved = false;
  private attempts = 0;
  private lastStatusMessage = 'Insert Replacement High-Amp Fuse to initialize routing bus.';

  constructor(private readonly events: EventBus) {}

  isFuseInserted(): boolean {
    return this.fuseInserted;
  }

  insertFuse(): boolean {
    if (this.fuseInserted) return true;
    this.fuseInserted = true;
    this.lastStatusMessage = 'Fuse seated. Balance active circuits to exactly 120V before engaging breaker.';
    return true;
  }

  getSwitches(): boolean[] {
    return [...this.switches];
  }

  toggleSwitch(index: number): boolean {
    if (this.solved) return this.switches[index] ?? false;
    if (index < 0 || index >= this.switches.length) return false;
    this.switches[index] = !this.switches[index];
    const v = this.getCurrentVoltage();
    this.lastStatusMessage = `Bus Load: ${v}V / ${GameConfig.PUZZLES.POWER_TARGET_VOLTAGE}V target.`;
    return this.switches[index];
  }

  setSwitches(states: boolean[]): void {
    for (let i = 0; i < this.switches.length; i++) {
      this.switches[i] = Boolean(states[i]);
    }
  }

  getCurrentVoltage(): number {
    return this.switches.reduce((sum, on, idx) => {
      return sum + (on ? POWER_SWITCH_SPECS[idx].voltage : 0);
    }, 0);
  }

  getTargetVoltage(): number {
    return GameConfig.PUZZLES.POWER_TARGET_VOLTAGE;
  }

  validateConfiguration(switches = this.switches, fuseReady = this.fuseInserted): boolean {
    if (!fuseReady) return false;
    const total = switches.reduce((sum, on, idx) => {
      return sum + (on ? POWER_SWITCH_SPECS[idx].voltage : 0);
    }, 0);
    return total === GameConfig.PUZZLES.POWER_TARGET_VOLTAGE;
  }

  attemptEngageBreaker(): { success: boolean; voltage: number; message: string } {
    this.attempts += 1;
    const voltage = this.getCurrentVoltage();

    if (!this.fuseInserted) {
      this.lastStatusMessage = 'ERROR: Fuse slot B-09 is empty. Locate Replacement Fuse in Storage.';
      return { success: false, voltage, message: this.lastStatusMessage };
    }

    if (voltage < GameConfig.PUZZLES.POWER_TARGET_VOLTAGE) {
      this.lastStatusMessage = `UNDERLOAD (${voltage}V): Insufficient voltage to release Lab Mag-Locks. Target is 120V (A1 45V + C3 75V).`;
      return { success: false, voltage, message: this.lastStatusMessage };
    }

    if (voltage > GameConfig.PUZZLES.POWER_TARGET_VOLTAGE) {
      // Overload trips switches safely without softlocking
      this.switches = [false, false, false, false];
      this.lastStatusMessage = `OVERLOAD (${voltage}V): Breaker tripped safely! Resetting switches. Route exactly 120V (A1 45V + C3 75V).`;
      return { success: false, voltage, message: this.lastStatusMessage };
    }

    this.solved = true;
    this.lastStatusMessage = '120V STABLE: Backup generator online. Research Lab & Security relays powered.';
    this.events.emit('puzzle:solved', { type: 'power', id: 'electrical_routing' });
    this.events.emit('power:restored', { level: 'partial' });
    return { success: true, voltage, message: this.lastStatusMessage };
  }

  isSolved(): boolean {
    return this.solved;
  }

  getLastStatusMessage(): string {
    return this.lastStatusMessage;
  }

  getAttempts(): number {
    return this.attempts;
  }

  restoreState(fuseInserted: boolean, switches: boolean[], solved: boolean): void {
    this.fuseInserted = fuseInserted;
    this.setSwitches(switches);
    this.solved = solved;
    if (solved) {
      this.lastStatusMessage = '120V STABLE: Backup generator online.';
    }
  }

  reset(): void {
    this.fuseInserted = false;
    this.switches = [false, false, false, false];
    this.solved = false;
    this.attempts = 0;
    this.lastStatusMessage = 'Insert Replacement High-Amp Fuse to initialize routing bus.';
  }
}
