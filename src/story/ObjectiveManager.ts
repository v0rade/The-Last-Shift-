import { EventBus } from '../utils/EventBus';

export interface ObjectiveStep {
  id: string;
  title: string;
  description: string;
}

export const OBJECTIVE_STEPS: ObjectiveStep[] = [
  {
    id: 'obj_inspect_reception',
    title: 'Inspect the Reception Security Desk',
    description: 'The power failed at 2:13 AM. Use your flashlight [F] and read the Night Shift Directive on the Reception Desk.'
  },
  {
    id: 'obj_find_key_and_fuse',
    title: 'Locate Maintenance Key & Replacement Fuse',
    description: 'Search the Medical Examination Room (West) for the Maintenance Key and the Storage Room (East) for a Replacement Fuse.'
  },
  {
    id: 'obj_restore_power',
    title: 'Restore Backup Power in Electrical Room',
    description: 'Unlock the Basement Service Corridor (East) and balance the Electrical Room breaker to 120V (Circuits A1 + C3).'
  },
  {
    id: 'obj_investigate_lab',
    title: 'Investigate the Research Laboratory',
    description: 'Partial power restored. Enter the Research Lab (West), retrieve the Level-2 Access Card, and find the Security Keypad PIN.'
  },
  {
    id: 'obj_unlock_security',
    title: 'Unlock the North Security Office (PIN: 2413)',
    description: 'Evade Subject 09 using crouch [Ctrl], hiding lockers [E], or decoys [G]. Enter PIN 2413 at the Security Office keypad.'
  },
  {
    id: 'obj_collect_master_card',
    title: 'Retrieve Master Override Keycard & Purge Code',
    description: 'Collect CSO Mercer’s Master Override Keycard in the Security Office and check the Security Terminal for Purge Code 7904.'
  },
  {
    id: 'obj_activate_exit',
    title: 'Unlock the North Quarantine Exit Airlock',
    description: 'Reach the Final Exit Area (North), insert both keycards, and enter Purge Code 7904 at the Airlock Control Console.'
  },
  {
    id: 'obj_escape_facility',
    title: 'Evacuate Through the Open Airlock',
    description: 'The Quarantine Blast Door is open and Subject 09 is converging on the alarm! Interact with the Exterior Hatch to escape.'
  }
];

export interface ProgressionFlags {
  readReceptionNote: boolean;
  hasMaintenanceKey: boolean;
  hasReplacementFuse: boolean;
  powerRestored: boolean;
  hasLevel2Card: boolean;
  foundKeypadClue: boolean;
  securityUnlocked: boolean;
  hasMasterCard: boolean;
  exitReady: boolean;
}

export class ObjectiveManager {
  private currentIndex = 0;
  private completedIds: Set<string> = new Set();

  constructor(private readonly events: EventBus) {}

  evaluateProgression(flags: ProgressionFlags): ObjectiveStep {
    let targetIndex = 0;

    if (flags.readReceptionNote || flags.hasMaintenanceKey || flags.hasReplacementFuse) {
      this.completedIds.add('obj_inspect_reception');
      targetIndex = 1;
    }

    if ((flags.hasMaintenanceKey && flags.hasReplacementFuse) || flags.powerRestored) {
      this.completedIds.add('obj_inspect_reception');
      this.completedIds.add('obj_find_key_and_fuse');
      targetIndex = 2;
    }

    if (flags.powerRestored) {
      this.completedIds.add('obj_restore_power');
      targetIndex = 3;
    }

    if (flags.powerRestored && flags.hasLevel2Card) {
      this.completedIds.add('obj_investigate_lab');
      targetIndex = 4;
    }

    if (flags.powerRestored && flags.hasLevel2Card && flags.securityUnlocked) {
      this.completedIds.add('obj_unlock_security');
      targetIndex = 5;
    }

    if (flags.powerRestored && flags.hasLevel2Card && flags.hasMasterCard) {
      this.completedIds.add('obj_unlock_security');
      this.completedIds.add('obj_collect_master_card');
      targetIndex = 6;
    }

    if (flags.exitReady) {
      this.completedIds.add('obj_activate_exit');
      targetIndex = 7;
    }

    if (targetIndex !== this.currentIndex) {
      this.currentIndex = targetIndex;
      this.emitCurrent();
    }

    return this.getCurrentObjective();
  }

  getCurrentObjective(): ObjectiveStep {
    return OBJECTIVE_STEPS[this.currentIndex] ?? OBJECTIVE_STEPS[0];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCompletedObjectives(): string[] {
    return Array.from(this.completedIds);
  }

  emitCurrent(): void {
    const current = this.getCurrentObjective();
    this.events.emit('objective:updated', {
      id: current.id,
      title: current.title,
      description: current.description,
      stepIndex: this.currentIndex
    });
  }

  restoreState(index: number, completed: string[]): void {
    this.currentIndex = Math.max(0, Math.min(index, OBJECTIVE_STEPS.length - 1));
    this.completedIds = new Set(completed);
    this.emitCurrent();
  }

  reset(): void {
    this.currentIndex = 0;
    this.completedIds.clear();
    this.emitCurrent();
  }
}
