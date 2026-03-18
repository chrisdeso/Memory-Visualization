import { describe, it, expect, vi } from 'vitest';
import { ExecutionState } from './ExecutionState';
import { demoTrace } from '../fixtures/demoTrace';
import type { ExecutionSnapshot } from '../types/snapshot';

describe('ExecutionState', () => {
  it('Test 1: load(trace) sets current to first snapshot and emits to listeners', () => {
    const state = new ExecutionState();
    const received: (ExecutionSnapshot | null)[] = [];
    state.onChange(snap => received.push(snap));

    state.load(demoTrace);

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(demoTrace[0]);
    expect(state.current).toEqual(demoTrace[0]);
  });

  it('Test 2: stepForward() advances index and emits next snapshot', () => {
    const state = new ExecutionState();
    const received: (ExecutionSnapshot | null)[] = [];
    state.load(demoTrace);
    state.onChange(snap => received.push(snap));

    state.stepForward();

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(demoTrace[1]);
    expect(state.current).toEqual(demoTrace[1]);
    expect(state.currentIndex).toBe(1);
  });

  it('Test 3: stepForward() at end does nothing', () => {
    const state = new ExecutionState();
    state.load(demoTrace);
    // Advance to last step
    for (let i = 0; i < demoTrace.length - 1; i++) {
      state.stepForward();
    }
    const emitCount = { count: 0 };
    state.onChange(() => emitCount.count++);

    state.stepForward(); // at end — should do nothing

    expect(emitCount.count).toBe(0);
    expect(state.currentIndex).toBe(demoTrace.length - 1);
  });

  it('Test 4: stepBackward() decrements index and emits previous snapshot', () => {
    const state = new ExecutionState();
    const received: (ExecutionSnapshot | null)[] = [];
    state.load(demoTrace);
    state.stepForward(); // now at index 1
    state.onChange(snap => received.push(snap));

    state.stepBackward();

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(demoTrace[0]);
    expect(state.currentIndex).toBe(0);
  });

  it('Test 5: stepBackward() at index 0 does nothing', () => {
    const state = new ExecutionState();
    state.load(demoTrace);
    const emitCount = { count: 0 };
    state.onChange(() => emitCount.count++);

    state.stepBackward(); // at start — should do nothing

    expect(emitCount.count).toBe(0);
    expect(state.currentIndex).toBe(0);
  });

  it('Test 6: reset() returns to index 0 and emits', () => {
    const state = new ExecutionState();
    const received: (ExecutionSnapshot | null)[] = [];
    state.load(demoTrace);
    state.stepForward();
    state.stepForward();
    state.onChange(snap => received.push(snap));

    state.reset();

    expect(received.length).toBe(1);
    expect(received[0]).toEqual(demoTrace[0]);
    expect(state.currentIndex).toBe(0);
  });

  it('Test 7: onChange callback receives ExecutionSnapshot | null', () => {
    const state = new ExecutionState();
    const received: (ExecutionSnapshot | null)[] = [];
    state.onChange(snap => received.push(snap));

    state.load(demoTrace);
    expect(received[0]).not.toBeNull();
    expect(typeof received[0]).toBe('object');
  });

  it('Test 8: stepCount returns trace.length', () => {
    const state = new ExecutionState();
    state.load(demoTrace);
    expect(state.stepCount).toBe(demoTrace.length);
  });

  it('Test 9: currentIndex returns current position', () => {
    const state = new ExecutionState();
    state.load(demoTrace);
    expect(state.currentIndex).toBe(0);

    state.stepForward();
    expect(state.currentIndex).toBe(1);

    state.stepForward();
    expect(state.currentIndex).toBe(2);
  });
});
