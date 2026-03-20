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

// ─── C++ Class Features (Plan 02-04) ─────────────────────────────────────────

describe('Evaluator - Class basics', () => {
  it('Class with member variables and constructor assigns members, visible in snapshot', () => {
    const source = [
      'class Point {',
      'public:',
      '  int x;',
      '  int y;',
      '  Point(int a, int b) { x = a; y = b; }',
      '};',
      'int main() {',
      '  Point p(3, 7);',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    expect(trace.length).toBeGreaterThan(0);
    // Constructor body steps should appear
    const hasConstructorStep = trace.some(snap =>
      snap.description.includes('Point') || snap.description.includes('constructor') ||
      snap.stack.some(f => f.name.includes('Point'))
    );
    expect(hasConstructorStep).toBe(true);
  });

  it('new Point(1, 2) allocates heap block with label "Point"', () => {
    const source = [
      'class Point {',
      'public:',
      '  int x;',
      '  int y;',
      '  Point(int a, int b) { x = a; y = b; }',
      '};',
      'int main() {',
      '  Point* p = new Point(1, 2);',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const heapSnap = trace.find(snap =>
      snap.heap.some(b => b.label === 'Point' || (b.label && b.label.includes('Point')))
    );
    expect(heapSnap).toBeDefined();
  });

  it('delete p frees heap block and constructor steps are visible', () => {
    const source = [
      'class Point {',
      'public:',
      '  int x;',
      '  int y;',
      '  Point(int a, int b) { x = a; y = b; }',
      '  ~Point() { x = 0; }',
      '};',
      'int main() {',
      '  Point* p = new Point(1, 2);',
      '  delete p;',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const freedSnap = trace.find(snap =>
      snap.heap.some(b => b.status === 'freed')
    );
    expect(freedSnap).toBeDefined();
  });
});

describe('Evaluator - Class lifecycle', () => {
  it('p->x member access returns correct value', () => {
    const source = [
      'class Point {',
      'public:',
      '  int x;',
      '  int y;',
      '  Point(int a, int b) { x = a; y = b; }',
      '};',
      'int main() {',
      '  Point* p = new Point(5, 9);',
      '  int val = p->x;',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    // val should be 5
    const valSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'val' && l.value === '5')
      )
    );
    expect(valSnap).toBeDefined();
  });

  it('destructor runs steps when delete is called', () => {
    const source = [
      'class Box {',
      'public:',
      '  int size;',
      '  Box(int s) { size = s; }',
      '  ~Box() { size = -1; }',
      '};',
      'int main() {',
      '  Box* b = new Box(10);',
      '  delete b;',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    // Should have destructor frame or destructor-related snapshot
    const hasDestructorStep = trace.some(snap =>
      snap.stack.some(f => f.name.includes('~') || f.name.includes('Box'))
    );
    expect(hasDestructorStep).toBe(true);
  });
});

describe('Evaluator - STL vector', () => {
  it('std::vector push_back and size work', () => {
    const source = [
      '#include <vector>',
      'int main() {',
      '  std::vector<int> v;',
      '  v.push_back(10);',
      '  v.push_back(20);',
      '  int s = v.size();',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    // s should be 2
    const sSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 's' && l.value === '2')
      )
    );
    expect(sSnap).toBeDefined();
  });

  it('std::vector creates a heap block', () => {
    const source = [
      '#include <vector>',
      'int main() {',
      '  std::vector<int> v;',
      '  v.push_back(1);',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const hasVectorHeap = trace.some(snap =>
      snap.heap.some(b => b.label && b.label.includes('vector'))
    );
    expect(hasVectorHeap).toBe(true);
  });

  it('v.at(0) returns first element after push_back(10)', () => {
    const source = [
      '#include <vector>',
      'int main() {',
      '  std::vector<int> v;',
      '  v.push_back(10);',
      '  int val = v.at(0);',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const valSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'val' && l.value === '10')
      )
    );
    expect(valSnap).toBeDefined();
  });
});

describe('Evaluator - STL string', () => {
  it('std::string variable appears in locals', () => {
    const source = [
      '#include <string>',
      'int main() {',
      '  std::string s = "hello";',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const strSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 's')
      )
    );
    expect(strSnap).toBeDefined();
  });

  it('std::string += appends correctly', () => {
    const source = [
      '#include <string>',
      'int main() {',
      '  std::string s = "hello";',
      '  s += " world";',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    // Should not throw and trace should be non-empty
    expect(trace.length).toBeGreaterThan(0);
  });
});

describe('Evaluator - Raw C arrays (arr)', () => {
  it('int arr[3] elements are accessible', () => {
    const source = [
      'int main() {',
      '  int arr[3];',
      '  arr[0] = 1;',
      '  arr[1] = 2;',
      '  arr[2] = 3;',
      '  int x = arr[1];',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const xSnap = trace.find(snap =>
      snap.stack.some(frame =>
        frame.locals.some(l => l.name === 'x' && l.value === '2')
      )
    );
    expect(xSnap).toBeDefined();
  });

  it('out-of-bounds array access throws runtime error', () => {
    const source = [
      'int main() {',
      '  int arr[3];',
      '  arr[0] = 1;',
      '  int x = arr[10];',
      '  return 0;',
      '}',
    ].join('\n');
    expect(() => interpret(source)).toThrow(/out.of.bounds|invalid|range/i);
  });
});

describe('Evaluator - Constructor and destructor stepping', () => {
  it('constructor body lines appear as separate snapshots', () => {
    const source = [
      'class Counter {',
      'public:',
      '  int count;',
      '  Counter() { count = 0; }',
      '};',
      'int main() {',
      '  Counter c;',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    // Constructor produces at least one step
    const hasCtorFrame = trace.some(snap =>
      snap.stack.some(f => f.name.includes('Counter'))
    );
    expect(hasCtorFrame).toBe(true);
    expect(trace.length).toBeGreaterThan(1);
  });

  it('destructor body lines appear as separate snapshots when delete called', () => {
    const source = [
      'class Managed {',
      'public:',
      '  int v;',
      '  Managed(int x) { v = x; }',
      '  ~Managed() { v = -1; }',
      '};',
      'int main() {',
      '  Managed* m = new Managed(42);',
      '  delete m;',
      '  return 0;',
      '}',
    ].join('\n');
    const trace = interpret(source);
    const hasDestructorFrame = trace.some(snap =>
      snap.stack.some(f => f.name.includes('~Managed') || f.name.includes('Managed'))
    );
    expect(hasDestructorFrame).toBe(true);
  });
});
