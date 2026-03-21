import type { ExecutionSnapshot } from '../types/snapshot';

type ChangeCallback = (snapshot: ExecutionSnapshot | null) => void;

export class ExecutionState {
  private trace: ExecutionSnapshot[] = [];
  private index = 0;
  private listeners: ChangeCallback[] = [];

  onChange(cb: ChangeCallback): void {
    this.listeners.push(cb);
  }

  private emit(): void {
    const snap = this.trace[this.index] ?? null;
    this.listeners.forEach(cb => cb(snap));
  }

  load(trace: ExecutionSnapshot[]): void {
    this.trace = trace;
    this.index = 0;
    this.emit();
  }

  stepForward(): void {
    if (this.index < this.trace.length - 1) {
      this.index++;
      this.emit();
    }
  }

  stepBackward(): void {
    if (this.index > 0) {
      this.index--;
      this.emit();
    }
  }

  reset(): void {
    this.index = 0;
    this.emit();
  }

  get current(): ExecutionSnapshot | null {
    return this.trace[this.index] ?? null;
  }

  get stepCount(): number {
    return this.trace.length;
  }

  get currentIndex(): number {
    return this.index;
  }

  get previousSnapshot(): ExecutionSnapshot | null {
    return this.trace[this.index - 1] ?? null;
  }
}
