import { describe, it, expect, beforeEach } from 'vitest';
import { Memory, HEAP_START, STACK_BASE } from './memory';

describe('Memory - Heap Allocation', () => {
  let mem: Memory;

  beforeEach(() => {
    mem = new Memory();
  });

  it('allocHeap returns address >= HEAP_START (0x1000)', () => {
    const addr = mem.allocHeap(4);
    expect(addr).toBeGreaterThanOrEqual(HEAP_START);
  });

  it('two consecutive allocHeap(4) calls return non-overlapping addresses', () => {
    const first = mem.allocHeap(4);
    const second = mem.allocHeap(4);
    expect(second).toBeGreaterThanOrEqual(first + 4);
  });

  it('allocHeap alignment: allocHeap(3) advances heapCursor by 4 (aligned to 4 bytes)', () => {
    const first = mem.allocHeap(3);
    const second = mem.allocHeap(4);
    // second should start at first + 4 (aligned), not first + 3
    expect(second - first).toBe(4);
  });

  it('freeHeap marks block as freed in getHeapBlocks()', () => {
    const addr = mem.allocHeap(4);
    mem.freeHeap(addr);
    const blocks = mem.getHeapBlocks();
    const block = blocks.find(b => b.address === addr);
    expect(block).toBeDefined();
    expect(block!.status).toBe('freed');
  });

  it('freeHeap on already-freed address throws "double free"', () => {
    const addr = mem.allocHeap(4);
    mem.freeHeap(addr);
    expect(() => mem.freeHeap(addr)).toThrow(/double free/i);
  });

  it('freeHeap on invalid address throws "invalid free"', () => {
    expect(() => mem.freeHeap(0xDEAD)).toThrow(/invalid free/i);
  });

  it('markLeaks changes allocated blocks to leaked status', () => {
    const addr = mem.allocHeap(4);
    // Do NOT free it
    mem.markLeaks();
    const blocks = mem.getHeapBlocks();
    const block = blocks.find(b => b.address === addr);
    expect(block).toBeDefined();
    expect(block!.status).toBe('leaked');
  });
});

describe('Memory - Stack Frames', () => {
  let mem: Memory;

  beforeEach(() => {
    mem = new Memory();
  });

  it('pushFrame adds a frame visible in getStackFrames()', () => {
    mem.pushFrame('main', 0);
    const frames = mem.getStackFrames();
    expect(frames).toHaveLength(1);
    expect(frames[0].name).toBe('main');
  });

  it('popFrame removes the top frame from getStackFrames()', () => {
    mem.pushFrame('main', 0);
    mem.pushFrame('foo', 1);
    mem.popFrame();
    const frames = mem.getStackFrames();
    expect(frames).toHaveLength(1);
    expect(frames[0].name).toBe('main');
  });

  it('allocLocal returns stack-region address (within stack region)', () => {
    mem.pushFrame('main', 0);
    const addr = mem.allocLocal('x', 'int', 4);
    expect(addr).toBeLessThanOrEqual(STACK_BASE);
    expect(addr).toBeGreaterThanOrEqual(STACK_BASE - 4);
  });

  it('getStackFrames returns bottom of stack first (main at index 0)', () => {
    mem.pushFrame('main', 0);
    mem.pushFrame('foo', 1);
    const frames = mem.getStackFrames();
    expect(frames[0].name).toBe('main');
    expect(frames[1].name).toBe('foo');
  });
});

describe('Memory - Address Regions (no overlap)', () => {
  it('heap addresses are < stack addresses (no overlap)', () => {
    const mem = new Memory();
    mem.pushFrame('main', 0);
    const heapAddr = mem.allocHeap(4);
    const stackAddr = mem.allocLocal('x', 'int', 4);
    expect(heapAddr).toBeLessThan(stackAddr);
  });
});

describe('Memory - Value Access', () => {
  let mem: Memory;

  beforeEach(() => {
    mem = new Memory();
  });

  it('store and load round-trip returns stored value', () => {
    mem.pushFrame('main', 0);
    const addr = mem.allocLocal('x', 'int', 4);
    mem.store(addr, 42);
    expect(mem.load(addr)).toBe(42);
  });

  it('getPointerLinks detects pointer values (stack address containing heap address)', () => {
    mem.pushFrame('main', 0);
    const stackAddr = mem.allocLocal('p', 'int*', 4);
    const heapAddr = mem.allocHeap(4);
    // Store the heap address as the value at the stack address (pointer)
    mem.store(stackAddr, heapAddr);
    const links = mem.getPointerLinks();
    const link = links.find(l => l.varAddress === stackAddr && l.pointsToAddress === heapAddr);
    expect(link).toBeDefined();
  });
});

describe('Memory - Snapshot Capture', () => {
  it('captureSnapshot returns valid ExecutionSnapshot structure', () => {
    const mem = new Memory();
    mem.pushFrame('main', 0);
    mem.allocLocal('x', 'int', 4);
    mem.allocHeap(8);

    const snap = mem.captureSnapshot(0, 1, 'test', 1);
    expect(snap.step).toBe(0);
    expect(snap.lineNumber).toBe(1);
    expect(snap.description).toBe('test');
    expect(Array.isArray(snap.stack)).toBe(true);
    expect(Array.isArray(snap.heap)).toBe(true);
    expect(Array.isArray(snap.pointers)).toBe(true);
    expect(snap.registers).toBeDefined();
    expect(typeof snap.registers.pc).toBe('number');
    expect(typeof snap.registers.sp).toBe('number');
  });
});
