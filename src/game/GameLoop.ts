export type LoopCallback = (dt: number, elapsed: number) => void;

export class GameLoop {
  private running = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;

  constructor(private readonly onTick: LoopCallback) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  stepManual(dt: number): void {
    const clampedDt = Math.min(Math.max(dt, 0), 0.1);
    this.elapsedTime += clampedDt;
    this.onTick(clampedDt, this.elapsedTime);
  }

  private frame = (timestamp: number): void => {
    if (!this.running) return;
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    const dt = Math.min(Math.max(rawDt, 0.0001), 0.1);
    this.elapsedTime += dt;
    this.onTick(dt, this.elapsedTime);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
