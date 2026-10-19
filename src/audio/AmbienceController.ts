import { MathUtils } from '../utils/MathUtils';
import { AudioManager } from './AudioManager';

export type SoundtrackState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

interface ThemeNoteStep {
  freq: number;
  harmonyFreq?: number;
  duration: number;
  velocity: number;
  reverseSwell?: boolean;
  subImpact?: boolean;
}

// Original minimalist psychological horror theme in D Phrygian / diminished (unresolved endings)
const HORROR_THEME_PHRASE: ThemeNoteStep[] = [
  { freq: 146.83, harmonyFreq: 73.42, duration: 3.4, velocity: 0.14, subImpact: true }, // D3 + D2
  { freq: 220.0, duration: 2.8, velocity: 0.11 },                                      // A3
  { freq: 155.56, harmonyFreq: 110.0, duration: 3.8, velocity: 0.13, reverseSwell: true }, // Eb3 (minor 2nd dissonance)
  { freq: 146.83, duration: 3.2, velocity: 0.1 },                                       // D3
  { freq: 233.08, harmonyFreq: 116.54, duration: 3.5, velocity: 0.12 },                // Bb3
  { freq: 207.65, duration: 3.1, velocity: 0.11, reverseSwell: true },                 // G#3 (tritone tension)
  { freq: 174.61, harmonyFreq: 87.31, duration: 3.6, velocity: 0.12, subImpact: true }, // F3 + F2
  { freq: 155.56, harmonyFreq: 207.65, duration: 4.4, velocity: 0.11 }                 // Unresolved Eb3 + G#3
];

export class AmbienceController {
  private running = false;
  private currentState: SoundtrackState = 'MENU';

  // Music synthesis nodes
  private musicStateGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;

  // Environmental ambience nodes
  private ambienceStateGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private buzzOsc: OscillatorNode | null = null;
  private ventSource: AudioBufferSourceNode | null = null;
  private tensionOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private buzzGain: GainNode | null = null;
  private ventGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;

  private phraseStepIndex = 0;
  private phraseTimerId: number | null = null;
  private envEventCooldown = 14.0;

  constructor(private readonly audio: AudioManager) {}

  start(): void {
    if (this.running) return;
    if (!this.audio.ensureUnlocked()) return;
    const ctx = this.audio.getContext();
    const musicDest = this.audio.getMusicDestination();
    const ambDest = this.audio.getAmbienceDestination();
    if (!ctx || !musicDest || !ambDest) return;

    try {
      const now = ctx.currentTime;

      // 1. Music Bus & Reverb/Delay Network for Haunting Piano & Reversed Swells
      this.musicStateGain = ctx.createGain();
      this.musicStateGain.gain.setValueAtTime(0.001, now);
      this.musicStateGain.gain.linearRampToValueAtTime(1.0, now + 1.8);
      this.musicStateGain.connect(musicDest);

      this.delayNode = ctx.createDelay(2.0);
      this.delayNode.delayTime.value = 0.46;
      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = 0.52;
      this.delayFilter = ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 1150;

      this.delayNode.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayFilter.connect(this.musicStateGain);

      // Evolving Low-Frequency Drone (D1 36.71Hz + A1 55.0Hz)
      this.droneOsc1 = ctx.createOscillator();
      this.droneOsc2 = ctx.createOscillator();
      this.droneLfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      this.droneFilter = ctx.createBiquadFilter();
      this.droneGain = ctx.createGain();

      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.value = 36.71; // D1
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.value = 55.0;  // A1

      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.value = 125;

      this.droneLfo.type = 'sine';
      this.droneLfo.frequency.value = 0.11; // 9-second slow breathing cycle
      lfoGain.gain.value = 55;
      this.droneLfo.connect(lfoGain);
      lfoGain.connect(this.droneFilter.frequency);

      this.droneGain.gain.value = 0.12;
      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.musicStateGain);

      this.droneOsc1.start(now);
      this.droneOsc2.start(now);
      this.droneLfo.start(now);

      // 2. Environmental Ambience Bus (Electrical Hum, Fluorescent Buzz, Ventilation Wind, Chase Tension)
      this.ambienceStateGain = ctx.createGain();
      this.ambienceStateGain.gain.setValueAtTime(0.45, now);
      this.ambienceStateGain.connect(ambDest);

      this.humOsc = ctx.createOscillator();
      this.humGain = ctx.createGain();
      this.humOsc.type = 'sine';
      this.humOsc.frequency.value = 60;
      this.humGain.gain.value = 0.055;
      this.humOsc.connect(this.humGain);
      this.humGain.connect(this.ambienceStateGain);
      this.humOsc.start(now);

      this.buzzOsc = ctx.createOscillator();
      this.buzzGain = ctx.createGain();
      this.buzzOsc.type = 'triangle';
      this.buzzOsc.frequency.value = 120;
      this.buzzGain.gain.value = 0.012;
      this.buzzOsc.connect(this.buzzGain);
      this.buzzGain.connect(this.ambienceStateGain);
      this.buzzOsc.start(now);

      // Filtered noise buffer for distant ventilation air
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      }
      this.ventSource = ctx.createBufferSource();
      this.ventSource.buffer = noiseBuffer;
      this.ventSource.loop = true;
      const ventFilter = ctx.createBiquadFilter();
      ventFilter.type = 'bandpass';
      ventFilter.frequency.value = 210;
      ventFilter.Q.value = 1.8;
      this.ventGain = ctx.createGain();
      this.ventGain.gain.value = 0.08;
      this.ventSource.connect(ventFilter);
      ventFilter.connect(this.ventGain);
      this.ventGain.connect(this.ambienceStateGain);
      this.ventSource.start(now);

      // Dynamic threat/chase tension oscillator
      this.tensionOsc = ctx.createOscillator();
      this.tensionGain = ctx.createGain();
      const tensionFilter = ctx.createBiquadFilter();
      tensionFilter.type = 'lowpass';
      tensionFilter.frequency.value = 260;
      this.tensionOsc.type = 'sawtooth';
      this.tensionOsc.frequency.value = 68;
      this.tensionGain.gain.value = 0.0;
      this.tensionOsc.connect(tensionFilter);
      tensionFilter.connect(this.tensionGain);
      this.tensionGain.connect(this.ambienceStateGain);
      this.tensionOsc.start(now);

      this.running = true;
      this.applyStateMix();
      this.scheduleNextThemeStep();
    } catch {
      this.running = false;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getState(): SoundtrackState {
    return this.currentState;
  }

  getAudioState(): SoundtrackState {
    return this.currentState;
  }

  setAudioState(state: SoundtrackState): void {
    const prev = this.currentState;
    this.currentState = state;
    if (!this.running) {
      this.start();
    }
    this.applyStateMix();

    if (state === 'GAME_OVER' && prev !== 'GAME_OVER') {
      this.audio.playEndingSting('gameover');
    } else if (state === 'VICTORY' && prev !== 'VICTORY') {
      this.audio.playEndingSting('victory');
    }
  }

  private applyStateMix(): void {
    const ctx = this.audio.getContext();
    if (!ctx || !this.musicStateGain || !this.ambienceStateGain) return;
    const now = ctx.currentTime;

    switch (this.currentState) {
      case 'MENU':
        this.musicStateGain.gain.setTargetAtTime(1.0, now, 0.5);
        this.ambienceStateGain.gain.setTargetAtTime(0.42, now, 0.5);
        break;
      case 'PLAYING':
        // During exploration, keep sparse dark music underscore at 36% and bring facility ambience to 100%
        this.musicStateGain.gain.setTargetAtTime(0.36, now, 0.8);
        this.ambienceStateGain.gain.setTargetAtTime(1.0, now, 0.6);
        break;
      case 'PAUSED':
        // Duck audio smoothly while paused
        this.musicStateGain.gain.setTargetAtTime(0.22, now, 0.2);
        this.ambienceStateGain.gain.setTargetAtTime(0.18, now, 0.2);
        break;
      case 'GAME_OVER':
      case 'VICTORY':
        this.musicStateGain.gain.setTargetAtTime(0.25, now, 0.4);
        this.ambienceStateGain.gain.setTargetAtTime(0.25, now, 0.4);
        break;
    }
  }

  private scheduleNextThemeStep(): void {
    if (!this.running) return;
    const ctx = this.audio.getContext();
    if (!ctx || !this.musicStateGain || !this.delayNode) return;

    const step = HORROR_THEME_PHRASE[this.phraseStepIndex % HORROR_THEME_PHRASE.length];
    this.phraseStepIndex += 1;

    // Play piano note + subtle variation
    if (this.currentState === 'MENU' || this.currentState === 'PLAYING' || this.currentState === 'PAUSED') {
      const detuneFactor = this.phraseStepIndex % 16 >= 8 ? 0.998 : 1.0;
      this.triggerPianoTone(step.freq * detuneFactor, step.duration, step.velocity);

      if (step.harmonyFreq) {
        this.triggerPianoTone(step.harmonyFreq, step.duration * 1.15, step.velocity * 0.58);
      }

      if (step.reverseSwell && this.currentState === 'MENU') {
        this.triggerMetallicSwell(step.freq * 2.0, step.duration * 0.85, step.velocity * 0.45);
      }

      if (step.subImpact && this.currentState === 'MENU') {
        this.triggerSubPulse(step.duration);
      }
    }

    const intervalMs = Math.round(step.duration * 1000);
    if (typeof window !== 'undefined') {
      this.phraseTimerId = window.setTimeout(() => this.scheduleNextThemeStep(), intervalMs);
    }
  }

  private triggerPianoTone(freq: number, duration: number, velocity: number): void {
    const ctx = this.audio.getContext();
    if (!ctx || !this.musicStateGain || !this.delayNode) return;

    const now = ctx.currentTime;
    const mainOsc = ctx.createOscillator();
    const overtoneOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    // Soft felt piano timbre: fundamental sine + detuned triangle harmonic
    mainOsc.type = 'sine';
    mainOsc.frequency.setValueAtTime(freq, now);

    overtoneOsc.type = 'triangle';
    overtoneOsc.frequency.setValueAtTime(freq * 2.002, now);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.18, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + duration);

    env.gain.setValueAtTime(0.0005, now);
    env.gain.linearRampToValueAtTime(velocity, now + 0.035);
    env.gain.exponentialRampToValueAtTime(velocity * 0.28, now + 0.65);
    env.gain.exponentialRampToValueAtTime(0.0005, now + duration + 0.6);

    mainOsc.connect(filter);
    overtoneOsc.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(env);

    env.connect(this.musicStateGain);
    env.connect(this.delayNode);

    mainOsc.start(now);
    overtoneOsc.start(now);
    mainOsc.stop(now + duration + 0.65);
    overtoneOsc.stop(now + duration + 0.65);
  }

  private triggerMetallicSwell(freq: number, duration: number, peakGain: number): void {
    const ctx = this.audio.getContext();
    if (!ctx || !this.delayNode) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.98, now);
    osc.frequency.linearRampToValueAtTime(freq, now + duration * 0.85);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.value = 4.0;

    // Reversed-envelope swell that crescendos then cuts softly into reverb tail
    gain.gain.setValueAtTime(0.0005, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + duration * 0.82);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.delayNode);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  private triggerSubPulse(duration: number): void {
    const ctx = this.audio.getContext();
    if (!ctx || !this.musicStateGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(52, now);
    osc.frequency.exponentialRampToValueAtTime(31, now + 1.4);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + Math.min(2.2, duration));

    osc.connect(gain);
    gain.connect(this.musicStateGain);
    osc.start(now);
    osc.stop(now + Math.min(2.25, duration));
  }

  updateTension(monsterState: string, distanceToPlayer: number, isPaused: boolean, dt = 0.016): void {
    if (!this.running) return;
    const ctx = this.audio.getContext();
    if (!ctx || !this.tensionGain || !this.tensionOsc || !this.humGain) return;

    const now = ctx.currentTime;
    if (isPaused) {
      this.tensionGain.gain.setTargetAtTime(0, now, 0.12);
      return;
    }

    // Controlled environmental pipe knock scheduling during exploration
    if (this.currentState === 'PLAYING' && monsterState !== 'CHASE') {
      this.envEventCooldown -= dt;
      if (this.envEventCooldown <= 0) {
        this.envEventCooldown = 12 + Math.random() * 10;
        this.audio.playPipeKnock(0.35 + Math.random() * 0.35);
      }
    }

    const proximity = MathUtils.clamp(1 - distanceToPlayer / 20, 0, 1);
    let targetGain = 0.0;
    let targetFreq = 68;

    if (monsterState === 'CHASE') {
      targetGain = 0.12 + proximity * 0.08;
      targetFreq = 96 + proximity * 34;
    } else if (monsterState === 'SEARCH' || monsterState === 'INVESTIGATE') {
      targetGain = 0.048 + proximity * 0.04;
      targetFreq = 78 + proximity * 16;
    } else {
      targetGain = proximity * 0.025;
      targetFreq = 65;
    }

    this.tensionGain.gain.setTargetAtTime(targetGain, now, 0.15);
    this.tensionOsc.frequency.setTargetAtTime(targetFreq, now, 0.15);
  }

  stop(): void {
    if (this.phraseTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.phraseTimerId);
      this.phraseTimerId = null;
    }
    try {
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
      this.droneLfo?.stop();
      this.humOsc?.stop();
      this.buzzOsc?.stop();
      this.ventSource?.stop();
      this.tensionOsc?.stop();
    } catch {
      // Ignore already stopped
    }
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneLfo = null;
    this.humOsc = null;
    this.buzzOsc = null;
    this.ventSource = null;
    this.tensionOsc = null;
    this.running = false;
  }
}
