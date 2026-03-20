import type { ExecutionSnapshot, StackFrame, HeapBlock, PointerLink, LocalVar } from '../types/snapshot';

// ─── Address Region Constants ─────────────────────────────────────────────────

export const HEAP_START = 0x1000;  // Heap grows upward from 4096
export const STACK_BASE = 0xF000;  // Stack grows downward from 61440

// ─── Type Sizes ───────────────────────────────────────────────────────────────

export const TYPE_SIZES: Record<string, number> = {
  int: 4,
  float: 4,
  double: 8,
  char: 1,
  bool: 1,
  pointer: 4,
  'int*': 4,
  'float*': 4,
  'double*': 4,
  'char*': 4,
  'void*': 4,
};

function getTypeSize(type: string): number {
  if (type.includes('*') || type.includes('&')) return TYPE_SIZES.pointer ?? 4;
  return TYPE_SIZES[type] ?? 4;
}

function alignTo4(size: number): number {
  return Math.ceil(size / 4) * 4;
}

// ─── Frame Tracking ───────────────────────────────────────────────────────────

interface FrameInfo {
  name: string;
  returnAddr: number;
  stackPointerAtEntry: number;
  locals: Array<{ name: string; type: string; address: number }>;
}

// ─── Memory Class ─────────────────────────────────────────────────────────────

export class Memory {
  private heapCursor: number = HEAP_START;
  private stackPointer: number = STACK_BASE;
  private heapBlocks: Map<number, { size: number; freed: boolean; label?: string }> = new Map();
  private values: Map<number, unknown> = new Map();
  private frames: FrameInfo[] = [];

  // ─── Heap Methods ─────────────────────────────────────────────────────────

  allocHeap(size: number, label?: string): number {
    if (this.heapCursor >= this.stackPointer) {
      throw new Error('Out of memory: heap and stack collision');
    }
    const addr = this.heapCursor;
    const aligned = alignTo4(size);
    this.heapCursor += aligned;
    this.heapBlocks.set(addr, { size, freed: false, label });
    return addr;
  }

  freeHeap(address: number): void {
    const block = this.heapBlocks.get(address);
    if (!block) {
      throw new Error(`invalid free at address 0x${address.toString(16)}`);
    }
    if (block.freed) {
      throw new Error(`double free at address 0x${address.toString(16)}`);
    }
    block.freed = true;
  }

  getHeapBlocks(): HeapBlock[] {
    return this.getHeapBlocksWithLeaked();
  }

  markLeaks(): void {
    for (const [, block] of this.heapBlocks) {
      if (!block.freed) {
        // Mark as leaked — we add a leaked flag to the block
        (block as { freed: boolean; leaked?: boolean }).leaked = true;
      }
    }
  }

  // ─── Stack Methods ────────────────────────────────────────────────────────

  pushFrame(name: string, returnAddr: number): void {
    this.frames.push({
      name,
      returnAddr,
      stackPointerAtEntry: this.stackPointer,
      locals: [],
    });
  }

  allocLocal(name: string, type: string, size: number): number {
    if (this.frames.length === 0) {
      throw new Error('allocLocal called with no active frame');
    }
    const aligned = alignTo4(size);
    this.stackPointer -= aligned;
    if (this.stackPointer <= this.heapCursor) {
      throw new Error('Out of memory: stack overflow into heap');
    }
    const frame = this.frames[this.frames.length - 1];
    if (!frame) throw new Error('allocLocal called with no active frame (frames array empty)');
    frame.locals.push({ name, type, address: this.stackPointer });
    return this.stackPointer;
  }

  popFrame(): void {
    const frame = this.frames.pop();
    if (!frame) {
      throw new Error('popFrame called with no active frame');
    }
    // Remove locals' values from memory
    for (const local of frame.locals) {
      this.values.delete(local.address);
    }
    // Restore stack pointer
    this.stackPointer = frame.stackPointerAtEntry;
  }

  getStackFrames(): StackFrame[] {
    return this.frames.map(frame => ({
      name: frame.name,
      returnAddr: frame.returnAddr,
      locals: frame.locals.map(local => ({
        name: local.name,
        type: local.type,
        value: this.formatValue(this.values.get(local.address)),
        address: local.address,
      })),
    }));
  }

  // ─── Value Access ─────────────────────────────────────────────────────────

  store(address: number, value: unknown): void {
    if (!this.isValidAddress(address)) {
      throw new Error(
        `Segmentation fault: write to invalid address 0x${address.toString(16)} — ` +
        `value ${address} is not a valid pointer (did you forget to use malloc/new?)`
      );
    }
    this.values.set(address, value);
  }

  load(address: number): unknown {
    if (!this.isValidAddress(address)) {
      throw new Error(
        `Segmentation fault: read from invalid address 0x${address.toString(16)} — ` +
        `value ${address} is not a valid pointer (did you forget to use malloc/new?)`
      );
    }
    if (!this.values.has(address)) {
      throw new Error(`read from uninitialized memory at 0x${address.toString(16)}`);
    }
    return this.values.get(address);
  }

  getPointerLinks(): PointerLink[] {
    const links: PointerLink[] = [];
    for (const [addr, value] of this.values) {
      if (typeof value === 'number' && this.isValidAddress(value)) {
        links.push({
          varAddress: addr,
          pointsToAddress: value,
        });
      }
    }
    return links;
  }

  // ─── Registers ────────────────────────────────────────────────────────────

  getRegisters(pc: number): { pc: number; sp: number } {
    return { pc, sp: this.stackPointer };
  }

  // ─── Snapshot Capture ─────────────────────────────────────────────────────

  captureSnapshot(step: number, lineNumber: number, description: string, pc: number): ExecutionSnapshot {
    return {
      step,
      lineNumber,
      description,
      stack: this.getStackFrames(),
      heap: this.getHeapBlocksWithLeaked(),
      pointers: this.getPointerLinks(),
      registers: this.getRegisters(pc),
    };
  }

  // ─── Reset ────────────────────────────────────────────────────────────────

  reset(): void {
    this.heapCursor = HEAP_START;
    this.stackPointer = STACK_BASE;
    this.heapBlocks.clear();
    this.values.clear();
    this.frames = [];
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private isValidAddress(value: number): boolean {
    // Check if value looks like a valid heap or stack address
    return (value >= HEAP_START && value < STACK_BASE);
  }

  private formatValue(value: unknown): string {
    if (value === undefined || value === null) return 'uninitialized';
    return String(value);
  }

  private getHeapBlocksWithLeaked(): HeapBlock[] {
    const result: HeapBlock[] = [];
    for (const [address, block] of this.heapBlocks) {
      const blockWithLeak = block as { freed: boolean; size: number; label?: string; leaked?: boolean };
      let status: HeapBlock['status'];
      if (blockWithLeak.leaked) {
        status = 'leaked';
      } else if (blockWithLeak.freed) {
        status = 'freed';
      } else {
        status = 'allocated';
      }
      result.push({
        address,
        size: block.size,
        status,
        label: block.label,
      });
    }
    return result;
  }

  // ─── Type Size Lookup (for evaluator) ────────────────────────────────────

  getTypeSize(type: string): number {
    return getTypeSize(type);
  }
}
