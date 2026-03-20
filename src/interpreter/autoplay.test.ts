import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoPlayController, PLAY_SPEEDS } from './AutoPlayController';
import type { PlayableState } from './AutoPlayController';

function makeMockState(stepCount: number, startIndex = 0): PlayableState & { stepForward: ReturnType<typeof vi.fn>; _index: number } {
  const mock = {
    _index: startIndex,
    stepCount,
    get currentIndex() { return mock._index; },
    stepForward: vi.fn(() => {
      if (mock._index < stepCount - 1) {
        mock._index++;
      }
    }),
  };
  return mock;
}

describe('AutoPlayController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('startPlay calls stepForward on each interval tick', () => {
    const state = makeMockState(5, 0);
    const ctrl = new AutoPlayController(state);

    ctrl.startPlay();

    // Advance by one interval (medium = 400ms)
    vi.advanceTimersByTime(PLAY_SPEEDS.medium);
    expect(state.stepForward).toHaveBeenCalledTimes(1);

    // Advance by another interval
    vi.advanceTimersByTime(PLAY_SPEEDS.medium);
    expect(state.stepForward).toHaveBeenCalledTimes(2);
  });

  it('stopPlay clears the interval so stepForward is not called after stop', () => {
    const state = makeMockState(10, 0);
    const ctrl = new AutoPlayController(state);

    ctrl.startPlay();
    vi.advanceTimersByTime(PLAY_SPEEDS.medium);
    const callsBeforeStop = (state.stepForward as ReturnType<typeof vi.fn>).mock.calls.length;

    ctrl.stopPlay();

    // Advance time well beyond another interval — should not call stepForward again
    vi.advanceTimersByTime(PLAY_SPEEDS.medium * 5);
    expect(state.stepForward).toHaveBeenCalledTimes(callsBeforeStop);
  });

  it('play stops automatically when currentIndex reaches stepCount - 1', () => {
    const state = makeMockState(3, 0);
    const ctrl = new AutoPlayController(state);

    ctrl.startPlay();

    // Advance enough time to reach the end (3 steps, need 2 ticks: 0->1->2)
    vi.advanceTimersByTime(PLAY_SPEEDS.medium * 2);
    expect(state._index).toBe(2); // reached end

    // Advance one more tick to trigger the stop condition
    vi.advanceTimersByTime(PLAY_SPEEDS.medium);
    expect(ctrl.isPlaying).toBe(false);

    // No more calls after stop
    const callsAtStop = (state.stepForward as ReturnType<typeof vi.fn>).mock.calls.length;
    vi.advanceTimersByTime(PLAY_SPEEDS.medium * 5);
    expect(state.stepForward).toHaveBeenCalledTimes(callsAtStop);
  });

  it('speed selection changes the setInterval delay', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const state = makeMockState(10, 0);
    const ctrl = new AutoPlayController(state);

    // Test slow speed
    ctrl.currentSpeed = 'slow';
    ctrl.startPlay();
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), PLAY_SPEEDS.slow);
    ctrl.stopPlay();

    // Test medium speed
    ctrl.currentSpeed = 'medium';
    ctrl.startPlay();
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), PLAY_SPEEDS.medium);
    ctrl.stopPlay();

    // Test fast speed
    ctrl.currentSpeed = 'fast';
    ctrl.startPlay();
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), PLAY_SPEEDS.fast);
    ctrl.stopPlay();
  });

  it('togglePlay starts when stopped and stops when playing', () => {
    const state = makeMockState(5, 0);
    const ctrl = new AutoPlayController(state);

    expect(ctrl.isPlaying).toBe(false);

    // Toggle to start
    ctrl.togglePlay();
    expect(ctrl.isPlaying).toBe(true);

    // Toggle to stop
    ctrl.togglePlay();
    expect(ctrl.isPlaying).toBe(false);
  });

  it('startPlay does nothing when stepCount is 0', () => {
    const state = makeMockState(0, 0);
    const ctrl = new AutoPlayController(state);

    ctrl.startPlay();
    expect(ctrl.isPlaying).toBe(false);
  });
});
