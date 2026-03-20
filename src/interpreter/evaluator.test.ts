import { describe, it, expect } from 'vitest';
import { interpret } from './evaluator';

describe('Evaluator - Basic Execution', () => {
  it('int main() with variable returns non-empty trace', () => {
    const trace = interpret('int main() { int x = 42; return 0; }');
    expect(trace.length).toBeGreaterThan(0);
  });

  it('each snapshot has correct structure', () => {
    const trace = interpret('int main() { int x = 42; return 0; }');
    for (const snap of trace) {
      expect(typeof snap.step).toBe('number');
      expect(typeof snap.lineNumber).toBe('number');
      expect(typeof snap.description).toBe('string');
      expect(Array.isArray(snap.stack)).toBe(true);
      expect(Array.isArray(snap.heap)).toBe(true);
      expect(Array.isArray(snap.pointers)).toBe(true);
      expect(typeof snap.registers.pc).toBe('number');
      expect(typeof snap.registers.sp).toBe('number');
    }
  });

  it('trace contains a snapshot with main stack frame', () => {
    const trace = interpret('int main() { int x = 42; return 0; }');
    const hasMainFrame = trace.some(snap => snap.stack.some(f => f.name === 'main'));
    expect(hasMainFrame).toBe(true);
  });
});

describe('Evaluator - Line-by-line stepping (EXEC-02/EXEC-03)', () => {
  it('each source line produces exactly one snapshot with correct lineNumber', () => {
    // Single-line program — all statements on line 1
    const source = 'int main() { int x = 1; int y = 2; return 0; }';
    const trace = interpret(source);
    // Should have at least 3 snapshots: int x=1, int y=2, return 0
    expect(trace.length).toBeGreaterThanOrEqual(3);
  });

  it('multi-line: each source line produces one execution snapshot with matching lineNumber', () => {
    const source = [
      'int main() {',   // line 1
      '  int x = 1;',   // line 2
      '  int y = 2;',   // line 3
      '  return 0;',    // line 4
      '}',              // line 5
    ].join('\n');
    const trace = interpret(source);
    // Find snapshots for lines 2, 3 — these are unique statement lines (one snapshot each)
    const line2Snaps = trace.filter(s => s.lineNumber === 2);
    const line3Snaps = trace.filter(s => s.lineNumber === 3);
    // Each statement line should produce exactly one snapshot
    expect(line2Snaps).toHaveLength(1);
    expect(line3Snaps).toHaveLength(1);
    // Line 4 (return) should have at least 1 snapshot
    const line4Snaps = trace.filter(s => s.lineNumber === 4);
    expect(line4Snaps.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Evaluator - Variable Operations', () => {
  it('int x = 5; int y = x + 3 — y value is 8', () => {
    const source = 'int main() { int x = 5; int y = x + 3; return 0; }';
    const trace = interpret(source);
    // Find a snapshot where y is in the main frame
    const ySnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'y' && l.value === '8')
      )
    );
    expect(ySnap).toBeDefined();
  });

  it('int x = 10; x = x * 2 — x updates to 20', () => {
    const source = 'int main() { int x = 10; x = x * 2; return 0; }';
    const trace = interpret(source);
    const xSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'x' && l.value === '20')
      )
    );
    expect(xSnap).toBeDefined();
  });
});

describe('Evaluator - Control Flow', () => {
  it('if (1 > 0) { int y = 1; } — y appears in scope', () => {
    const source = 'int main() { if (1 > 0) { int y = 1; } return 0; }';
    const trace = interpret(source);
    const ySnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'y')
      )
    );
    expect(ySnap).toBeDefined();
  });

  it('for loop: sum of 0..2 is 3', () => {
    const source = 'int main() { int sum = 0; for (int i = 0; i < 3; i = i + 1) { sum = sum + i; } return 0; }';
    const trace = interpret(source);
    const sumSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'sum' && l.value === '3')
      )
    );
    expect(sumSnap).toBeDefined();
  });

  it('while loop: x increments to 5', () => {
    const source = 'int main() { int x = 0; while (x < 5) { x = x + 1; } return 0; }';
    const trace = interpret(source);
    const xSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'x' && l.value === '5')
      )
    );
    expect(xSnap).toBeDefined();
  });
});

describe('Evaluator - Functions', () => {
  it('two-function program: callee stack frame appears', () => {
    const source = [
      'int add(int a, int b) { return a + b; }',
      'int main() { int r = add(1, 2); return 0; }',
    ].join('\n');
    const trace = interpret(source);
    const hasAddFrame = trace.some(snap =>
      snap.stack.some(frame => frame.name === 'add')
    );
    expect(hasAddFrame).toBe(true);
  });

  it('callee frame disappears after return', () => {
    const source = [
      'int add(int a, int b) { return a + b; }',
      'int main() { int r = add(1, 2); return 0; }',
    ].join('\n');
    const trace = interpret(source);
    // Find a snapshot after add has returned — should not have add frame
    const lastSnap = trace[trace.length - 1]!;
    const hasAddFrame = lastSnap.stack.some(f => f.name === 'add');
    expect(hasAddFrame).toBe(false);
  });

  it('function call result is correct: add(1,2) === 3', () => {
    const source = [
      'int add(int a, int b) { return a + b; }',
      'int main() { int r = add(1, 2); return 0; }',
    ].join('\n');
    const trace = interpret(source);
    const rSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'r' && l.value === '3')
      )
    );
    expect(rSnap).toBeDefined();
  });
});

describe('Evaluator - Pointers and Heap', () => {
  it('malloc allocates a heap block that appears in snapshots', () => {
    const source = 'int main() { int *p = (int*)malloc(sizeof(int)); free(p); return 0; }';
    const trace = interpret(source);
    const hasHeap = trace.some(snap => snap.heap.length > 0);
    expect(hasHeap).toBe(true);
  });

  it('free marks heap block as freed', () => {
    const source = 'int main() { int *p = (int*)malloc(sizeof(int)); free(p); return 0; }';
    const trace = interpret(source);
    // After free, there should be a snapshot with freed status
    const freedSnap = trace.find(snap =>
      snap.heap.some(b => b.status === 'freed')
    );
    expect(freedSnap).toBeDefined();
  });

  it('pointer link exists from p to heap block', () => {
    const source = 'int main() { int *p = (int*)malloc(4); return 0; }';
    const trace = interpret(source);
    // Should have a pointer link at some point
    const ptrSnap = trace.find(snap => snap.pointers.length > 0);
    expect(ptrSnap).toBeDefined();
  });
});

describe('Evaluator - Addresses', () => {
  it('all LocalVar addresses are positive integers', () => {
    const source = 'int main() { int x = 1; int y = 2; return 0; }';
    const trace = interpret(source);
    for (const snap of trace) {
      for (const frame of snap.stack) {
        for (const local of frame.locals) {
          expect(local.address).toBeGreaterThan(0);
        }
      }
    }
  });

  it('heap addresses are >= 0x1000', () => {
    const source = 'int main() { int *p = (int*)malloc(4); return 0; }';
    const trace = interpret(source);
    for (const snap of trace) {
      for (const block of snap.heap) {
        expect(block.address).toBeGreaterThanOrEqual(0x1000);
      }
    }
  });

  it('stack addresses are <= 0xF000', () => {
    const source = 'int main() { int x = 1; return 0; }';
    const trace = interpret(source);
    for (const snap of trace) {
      for (const frame of snap.stack) {
        for (const local of frame.locals) {
          expect(local.address).toBeLessThanOrEqual(0xF000);
        }
      }
    }
  });
});

describe('Evaluator - Error Handling', () => {
  it('division by zero throws with message containing "divide" or "zero"', () => {
    const source = 'int main() { int x = 1 / 0; return 0; }';
    expect(() => interpret(source)).toThrow(/divide|zero/i);
  });

  it('error object has partialTrace array', () => {
    const source = 'int main() { int x = 1 / 0; return 0; }';
    try {
      interpret(source);
      expect.fail('Expected to throw');
    } catch (err) {
      expect((err as { partialTrace?: unknown[] }).partialTrace).toBeDefined();
      expect(Array.isArray((err as { partialTrace?: unknown[] }).partialTrace)).toBe(true);
    }
  });

  it('step limit: large loop throws with step limit exceeded', () => {
    // Use a very high iteration count that will exceed the step budget
    const source = 'int main() { int i = 0; while (i < 100000) { i = i + 1; } return 0; }';
    expect(() => interpret(source)).toThrow(/step limit|timed out/i);
  });
});

describe('Evaluator - No main() function', () => {
  it('throws when no main function found', () => {
    const source = 'int foo() { return 0; }';
    expect(() => interpret(source)).toThrow(/main/i);
  });
});
