import * as THREE from 'three';
import { MathUtils } from '../utils/MathUtils';

export class AudioManager {
  public readonly listener: THREE.AudioListener | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private masterVolume = 0.85;
  private musicVolume = 0.78;
  private ambienceVolume = 0.72;
  private sfxVolume = 0.85;
  private reduceIntenseSfx = false;
  private unlocked = false;
  private unlockListeners: Set<() => void> = new Set();

  constructor() {
    try {
      const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
      if (!isJsdom && typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window)) {
        this.listener = new THREE.AudioListener();
      }
    } catch {
      this.listener = null;
    }
  }

  onUnlocked(cb: () => void): () => void {
    this.unlockListeners.add(cb);
    if (this.unlocked) {
      cb();
    }
    return () => this.unlockListeners.delete(cb);
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  ensureUnlocked(): boolean {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioCtx =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      this.ctx = this.listener?.context ?? new AudioCtx();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.ambienceGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.syncGainValues();
      this.unlocked = true;

      for (const cb of Array.from(this.unlockListeners)) {
        cb();
      }
      return true;
    } catch {
      return false;
    }
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getMusicDestination(): AudioNode | null {
    return this.musicGain;
  }

  getAmbienceDestination(): AudioNode | null {
    return this.ambienceGain;
  }

  getSfxDestination(): AudioNode | null {
    return this.sfxGain;
  }

  setVolumes(master: number, ambience: number, sfx: number, music = this.musicVolume): void {
    this.masterVolume = MathUtils.clamp(master, 0, 1);
    this.ambienceVolume = MathUtils.clamp(ambience, 0, 1);
    this.sfxVolume = MathUtils.clamp(sfx, 0, 1);
    this.musicVolume = MathUtils.clamp(music, 0, 1);
    this.syncGainValues();
  }

  setMusicVolume(music: number): void {
    this.musicVolume = MathUtils.clamp(music, 0, 1);
    this.syncGainValues();
  }

  setReduceIntenseSfx(reduced: boolean): void {
    this.reduceIntenseSfx = reduced;
  }

  isReduceIntenseSfx(): boolean {
    return this.reduceIntenseSfx;
  }

  getVolumes(): { master: number; music: number; ambience: number; sfx: number } {
    return {
      master: this.masterVolume,
      music: this.musicVolume,
      ambience: this.ambienceVolume,
      sfx: this.sfxVolume
    };
  }

  private syncGainValues(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.ambienceGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.masterVolume, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVolume, now, 0.03);
    this.ambienceGain.gain.setTargetAtTime(this.ambienceVolume, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.03);
  }

  playFootstep(mode: 'walk' | 'sprint' | 'crouch'): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const baseFreq = mode === 'sprint' ? 105 : mode === 'crouch' ? 62 : 82;
    const peakGain = mode === 'sprint' ? 0.18 : mode === 'crouch' ? 0.05 : 0.11;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq + (Math.random() * 10 - 5), now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.095);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(mode === 'sprint' ? 380 : 240, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playDoorSound(opening: boolean, locked = false): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (locked) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.setValueAtTime(92, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.24);
      return;
    }

    osc.type = 'sine';
    osc.frequency.setValueAtTime(opening ? 78 : 124, now);
    osc.frequency.linearRampToValueAtTime(opening ? 138 : 66, now + 0.34);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playPickupSound(): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(690, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playUiClick(isPause = false): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isPause ? 280 : 390, now);
    osc.frequency.exponentialRampToValueAtTime(isPause ? 190 : 520, now + 0.065);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  playElectricalFeedback(success: boolean): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = success ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(success ? 110 : 85, now);
    osc.frequency.linearRampToValueAtTime(success ? 320 : 52, now + 0.38);

    const scale = this.reduceIntenseSfx ? 0.5 : 1.0;
    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playGlassShatter(): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const scale = this.reduceIntenseSfx ? 0.45 : 1.0;
    const freqs = [920, 1360, 1780, 2210];
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqs[i], now + i * 0.02);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.45, now + 0.22);
      gain.gain.setValueAtTime(0.09 * scale, now + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.02);
      osc.stop(now + 0.26);
    }
  }

  playMonsterVocalization(mode: 'alert' | 'chase' | 'search' | 'attack'): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    const startFreq = mode === 'attack' ? 165 : mode === 'chase' ? 128 : 72;
    const endFreq = mode === 'attack' ? 58 : mode === 'chase' ? 185 : 48;
    const duration = mode === 'attack' ? 0.65 : 0.52;

    osc1.frequency.setValueAtTime(startFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    osc2.frequency.setValueAtTime(startFreq * 1.03, now);
    osc2.frequency.exponentialRampToValueAtTime(endFreq * 0.97, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(mode === 'attack' ? 680 : 420, now);

    const scale = this.reduceIntenseSfx ? 0.45 : 1.0;
    const peak = (mode === 'attack' ? 0.22 : 0.14) * scale;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.02);
    osc2.stop(now + duration + 0.02);
  }

  playDistantImpact(distanceFactor = 1.0): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.exponentialRampToValueAtTime(22, now + 0.65);

    const scale = (this.reduceIntenseSfx ? 0.45 : 1.0) * MathUtils.clamp(distanceFactor, 0.15, 1.0);
    gain.gain.setValueAtTime(0.2 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  playPipeKnock(distanceFactor = 0.6): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const base = 240 + Math.random() * 80;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.72, now + 0.18);

    const scale = (this.reduceIntenseSfx ? 0.4 : 0.8) * MathUtils.clamp(distanceFactor, 0.1, 1.0);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.065 * scale, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ambienceGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playEndingSting(type: 'gameover' | 'victory'): void {
    if (!this.ensureUnlocked() || !this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const notes =
      type === 'victory'
        ? [146.83, 220.0, 293.66, 369.99] // Warm resolved D major / atmospheric pad
        : [73.42, 77.78, 110.0, 155.56];  // Dark dissonant D-Eb-A cluster

    const scale = this.reduceIntenseSfx ? 0.5 : 1.0;

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = type === 'victory' ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(notes[i], now + i * 0.08);
      if (type === 'gameover') {
        osc.frequency.linearRampToValueAtTime(notes[i] * 0.88, now + 2.8);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'victory' ? 900 : 360, now);

      gain.gain.setValueAtTime(0.0005, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.075 * scale, now + i * 0.08 + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 3.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now + i * 0.08);
      osc.stop(now + 3.3);
    }
  }
}
