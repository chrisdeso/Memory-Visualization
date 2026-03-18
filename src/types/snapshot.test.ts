import { describe, it, expect } from 'vitest';
import { demoTrace } from '../fixtures/demoTrace';

describe('demoTrace fixture', () => {
  it('Test 1: demoTrace is an array with length >= 4', () => {
    expect(Array.isArray(demoTrace)).toBe(true);
    expect(demoTrace.length).toBeGreaterThanOrEqual(4);
  });

  it('Test 2: each snapshot has required fields', () => {
    for (const snapshot of demoTrace) {
      expect(snapshot).toHaveProperty('step');
      expect(snapshot).toHaveProperty('lineNumber');
      expect(snapshot).toHaveProperty('description');
      expect(snapshot).toHaveProperty('stack');
      expect(snapshot).toHaveProperty('heap');
      expect(snapshot).toHaveProperty('pointers');
      expect(snapshot).toHaveProperty('registers');
    }
  });

  it('Test 3: stack addresses are >= 0x7fff0000', () => {
    for (const snapshot of demoTrace) {
      for (const frame of snapshot.stack) {
        for (const local of frame.locals) {
          expect(local.address).toBeGreaterThanOrEqual(0x7fff0000);
        }
      }
    }
  });

  it('Test 4: heap addresses are >= 0x20000000', () => {
    for (const snapshot of demoTrace) {
      for (const block of snapshot.heap) {
        expect(block.address).toBeGreaterThanOrEqual(0x20000000);
      }
    }
  });

  it('Test 5: at least one snapshot has non-empty stack, heap, and pointers', () => {
    const hasStack = demoTrace.some(s => s.stack.length > 0);
    const hasHeap = demoTrace.some(s => s.heap.length > 0);
    const hasPointers = demoTrace.some(s => s.pointers.length > 0);
    expect(hasStack).toBe(true);
    expect(hasHeap).toBe(true);
    expect(hasPointers).toBe(true);
  });
});
