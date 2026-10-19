import * as THREE from 'three';
import { Interactable } from './Interactable';

export interface TerminalEntry {
  id: string;
  title: string;
  timestamp: string;
  author: string;
  body: string;
  audioTranscript?: string;
}

export interface ComputerTerminalConfig {
  id: string;
  name: string;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  entries: TerminalEntry[];
  requiresPower?: boolean;
  isPowerActive?: () => boolean;
  onAccess: (terminal: ComputerTerminal) => void;
}

export class ComputerTerminal implements Interactable {
  public readonly id: string;
  public readonly name: string;
  public readonly position: THREE.Vector3;
  public readonly mesh: THREE.Object3D;
  public readonly entries: TerminalEntry[];
  public readonly interactionRadius = 2.6;

  private readonly requiresPower: boolean;
  private readonly isPowerActive: () => boolean;
  private readonly onAccess: (terminal: ComputerTerminal) => void;
  private accessed = false;

  constructor(config: ComputerTerminalConfig) {
    this.id = config.id;
    this.name = config.name;
    this.position = config.position.clone();
    this.mesh = config.mesh;
    this.entries = config.entries;
    this.requiresPower = config.requiresPower ?? false;
    this.isPowerActive = config.isPowerActive ?? (() => true);
    this.onAccess = config.onAccess;
  }

  isEnabled(): boolean {
    return true;
  }

  hasBeenAccessed(): boolean {
    return this.accessed;
  }

  markAccessed(): void {
    this.accessed = true;
  }

  reset(): void {
    this.accessed = false;
  }

  canBoot(): boolean {
    return !this.requiresPower || this.isPowerActive();
  }

  getPromptText(): string {
    if (!this.canBoot()) {
      return `Press E to Inspect ${this.name} (Offline — Restore Backup Power)`;
    }
    return `Press E to Access ${this.name}`;
  }

  interact(): void {
    if (this.canBoot()) {
      this.accessed = true;
    }
    this.onAccess(this);
  }
}
