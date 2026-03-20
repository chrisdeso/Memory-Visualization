export const PLAY_SPEEDS = { slow: 1000, medium: 400, fast: 100 } as const;
export type PlaySpeed = keyof typeof PLAY_SPEEDS;

export interface PlayableState {
  stepForward(): void;
  readonly currentIndex: number;
  readonly stepCount: number;
}

export class AutoPlayController {
  private playInterval: ReturnType<typeof setInterval> | null = null;
  private _currentSpeed: PlaySpeed = 'medium';
  private _isPlaying: boolean = false;
  private onPlayStateChange: (() => void) | null = null;

  constructor(
    private state: PlayableState,
    onPlayStateChange?: () => void
  ) {
    this.onPlayStateChange = onPlayStateChange ?? null;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentSpeed(): PlaySpeed {
    return this._currentSpeed;
  }

  set currentSpeed(speed: PlaySpeed) {
    this._currentSpeed = speed;
    if (this._isPlaying) {
      this.startPlay(); // restart with new speed
    }
  }

  startPlay(): void {
    this.stopPlay();
    if (this.state.stepCount === 0) return; // no trace loaded
    this._isPlaying = true;
    this.onPlayStateChange?.();

    this.playInterval = setInterval(() => {
      if (this.state.currentIndex >= this.state.stepCount - 1) {
        this.stopPlay();
        return;
      }
      this.state.stepForward();
    }, PLAY_SPEEDS[this._currentSpeed]);
  }

  stopPlay(): void {
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    this._isPlaying = false;
    this.onPlayStateChange?.();
  }

  togglePlay(): void {
    if (this._isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }
}
