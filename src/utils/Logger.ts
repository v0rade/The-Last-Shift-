export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  system: string;
  message: string;
}

export class Logger {
  private static entries: LogEntry[] = [];
  private static maxEntries = 200;
  private static enabled = true;

  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  static log(level: LogLevel, system: string, message: string): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      system,
      message
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    if (!this.enabled) return;
    const prefix = `[THE LAST SHIFT][${system}]`;
    if (level === 'error') {
      console.error(prefix, message);
    } else if (level === 'warn') {
      console.warn(prefix, message);
    }
  }

  static info(system: string, message: string): void {
    this.log('info', system, message);
  }

  static warn(system: string, message: string): void {
    this.log('warn', system, message);
  }

  static error(system: string, message: string): void {
    this.log('error', system, message);
  }

  static getEntries(): ReadonlyArray<LogEntry> {
    return this.entries;
  }
}
