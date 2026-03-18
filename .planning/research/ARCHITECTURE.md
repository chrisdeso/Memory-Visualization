# Architecture Patterns

**Domain:** Browser-based C interpreter + memory visualizer
**Researched:** 2026-03-18
**Confidence:** HIGH (well-established browser patterns; C interpreter strategy verified against known options)

---

## Recommended Architecture

The system is a single-page application with four distinct layers: editor, interpreter, state model, and visualization. Each layer has a clean boundary and communicates through a defined interface. No layer reaches through another.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                            │
│                                                                  │
│  ┌─────────────────┐        ┌──────────────────────────────┐   │
│  │   Editor Layer   │        │      Visualization Layer      │   │
│  │                  │        │                               │   │
│  │  Monaco Editor   │        │  D3.js panels:                │   │
│  │  - C source      │        │  - StackPanel                 │   │
│  │  - Line markers  │        │  - HeapPanel                  │   │
│  │  - Run/Step UI   │        │  - StaticsPanel               │   │
│  └────────┬─────────┘        │  - PointerArrows              │   │
│           │ source string     │  - RegistersPanel             │   │
│           ▼                   └──────────────▲────────────────┘   │
│  ┌─────────────────┐                         │ ExecutionSnapshot  │
│  │ Interpreter     │        ┌────────────────┴──────────────┐   │
│  │ Layer           │        │       State Model              │   │
│  │                 │ trace  │                                │   │
│  │  C interpreter  │───────▶│  ExecutionTrace[]              │   │
│  │  (WASM/JS)      │        │  - snapshots array             │   │
│  │                 │        │  - currentIndex                │   │
│  └─────────────────┘        │  - navigation API              │   │
│                              │  - event emitter               │   │
│                              └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Editor Layer

| Responsibility | Details |
|----------------|---------|
| Owns | Monaco editor instance, editor DOM container |
| Exposes | `getValue()` — current C source string; `setLineDecoration(lineNo)` — highlight active line |
| Consumes | Line number from State Model (to mark current execution line) |
| Does NOT own | Execution logic, state, visualization |

**Key integration notes:**
- Monaco loads via AMD (`require.config` + `require(['vs/editor/editor.main']...)`) or as an ES module via bundler
- `editor.getModel().getValue()` retrieves source at run time
- `editor.deltaDecorations(oldIds, [{range, options}])` applies line highlight decorations
- Editor emits no events downstream; it is a passive input surface. The Run/Step buttons are outside the editor DOM but logically part of this layer.

### 2. Interpreter Layer

| Responsibility | Details |
|----------------|---------|
| Owns | C parsing, AST construction, evaluation loop, memory simulation |
| Exposes | `interpret(sourceString): ExecutionTrace` — single synchronous or async call |
| Consumes | Raw C source string only |
| Does NOT own | UI, state navigation, visualization |

**Interpreter strategy (recommended: pure-JS interpreter):**

- **Pure JS interpreter** (e.g., a custom treewalk interpreter, or an adapted `jscpp` / `c-interpreter` library): runs entirely in the main thread or a Web Worker. No WASM build chain. Simulates the C memory model rather than executing native code.
- **Emscripten/WASM** (e.g., compiling TCC or a stripped GCC to WASM): produces real execution but requires a large binary, complex async loading, and extracting a trace is non-trivial without instrumentation hooks.

**Recommended choice: pure-JS treewalk interpreter.** Rationale:
1. The goal is pedagogical simulation of the C memory model, not bit-exact execution.
2. A treewalk interpreter can expose fine-grained hooks at every statement/expression evaluation, which is exactly what's needed to build an `ExecutionTrace`.
3. No WASM toolchain overhead for a static site deployment.
4. Simpler to extend for pointer tracking, heap simulation, and error injection.

The interpreter must be isolated in a **Web Worker** to avoid blocking the UI during execution of pathological programs (infinite loops). The main thread posts the source string; the worker posts back the completed trace (or a partial trace + error).

```
Main thread:
  worker.postMessage({ type: 'interpret', source: editorValue })

Worker:
  onmessage = ({ data }) => {
    const trace = interpretC(data.source)   // pure-JS interpreter
    postMessage({ type: 'trace', trace })
  }
```

### 3. State Model

| Responsibility | Details |
|----------------|---------|
| Owns | The `ExecutionTrace` (array of `ExecutionSnapshot`), current index, navigation |
| Exposes | `load(trace)`, `stepForward()`, `stepBackward()`, `reset()`, `currentSnapshot: ExecutionSnapshot`, `onChange(cb)` event |
| Consumes | `ExecutionTrace` from Interpreter Layer |
| Does NOT own | Rendering, editor, interpreter |

The State Model is the single source of truth for what the visualization displays. All navigation (prev/next/reset/jump-to-line) goes through this layer.

**`ExecutionSnapshot` schema:**

```typescript
interface ExecutionSnapshot {
  step: number;           // step index (0-based)
  lineNumber: number;     // active source line (1-based)
  description: string;    // human-readable event description

  stack: StackFrame[];    // ordered from bottom (main) to top (current)
  heap: HeapBlock[];      // all heap blocks, including freed ones
  statics: StaticVar[];   // global / static variables
  registers: {            // simplified CPU state
    pc: number;           // program counter (line number proxy)
    sp: number;           // stack pointer (simulated address)
  };
}

interface StackFrame {
  functionName: string;
  returnAddress: number;  // simulated
  variables: Variable[];
}

interface Variable {
  name: string;
  type: string;           // "int", "char*", etc.
  address: number;        // simulated address
  value: number | string | null;
  isPointer: boolean;
  pointsTo: number | null; // address value points at (if pointer)
}

interface HeapBlock {
  address: number;
  size: number;
  label: string;          // variable name that owns this allocation
  status: 'allocated' | 'freed' | 'leaked';
  value: number | string | null;
}

interface StaticVar {
  name: string;
  type: string;
  address: number;
  value: number | string | null;
}
```

### 4. Visualization Layer

| Responsibility | Details |
|----------------|---------|
| Owns | All D3.js DOM panels, pointer arrow SVG overlay |
| Exposes | `render(snapshot: ExecutionSnapshot)` — full re-render from snapshot |
| Consumes | `ExecutionSnapshot` from State Model via `onChange` callback |
| Does NOT own | State navigation logic, interpreter, editor content |

**Sub-panels (each is an independent class):**

| Panel | Renders | D3 pattern |
|-------|---------|-----------|
| `StackPanel` | Stack frames as stacked boxes, variables inside | `selectAll` on frame array, enter/update/exit |
| `HeapPanel` | Heap blocks as rectangles, color-coded by status | `selectAll` on heap array |
| `StaticsPanel` | Table of static/global variables | `selectAll` on statics array |
| `PointerLayer` | SVG arrows from pointer variable boxes to target address boxes | Computed from all panels' address-to-DOM-position maps |
| `RegistersPanel` | Simple table: PC (line), SP (address) | Direct DOM update |

**Pointer arrows** are the most complex rendering concern. The approach:
1. Each panel reports a map of `{ address: DOMRect }` after rendering.
2. `PointerLayer` receives all these maps, finds pointer variables (where `isPointer: true` and `pointsTo !== null`), looks up source and target `DOMRect`, and draws SVG lines with arrowhead markers in an overlay `<svg>` that spans the full visualization container.
3. Re-render on every snapshot change (no incremental diffing needed at initial scale).

---

## Data Flow

```
User writes C source in Monaco editor
          │
          │ clicks "Run" or "Step"
          ▼
Editor Layer extracts source string via editor.getValue()
          │
          │ source: string
          ▼
Main thread posts message to Web Worker
          │
          │ { type: 'interpret', source }
          ▼
Web Worker: pure-JS C interpreter runs
  - parses source to AST
  - evaluates AST step by step
  - at each statement: captures ExecutionSnapshot
  - builds ExecutionTrace = ExecutionSnapshot[]
          │
          │ { type: 'trace', trace: ExecutionSnapshot[] }
          ▼
Main thread receives trace, passes to State Model
  - State Model stores trace
  - sets currentIndex = 0
  - emits onChange(snapshot[0])
          │
          │ ExecutionSnapshot (current step)
          ▼
Visualization Layer receives snapshot
  - StackPanel.render(snapshot.stack)
  - HeapPanel.render(snapshot.heap)
  - StaticsPanel.render(snapshot.statics)
  - RegistersPanel.render(snapshot.registers)
  - PointerLayer.render(all address maps)
          │
          │ lineNumber from snapshot
          ▼
Editor Layer: editor.deltaDecorations() highlights active line
```

**Step navigation flow (after initial run):**

```
User clicks Prev/Next
          │
          ▼
State Model: stepBackward() / stepForward()
  - updates currentIndex
  - emits onChange(snapshot[newIndex])
          │
          ▼
Visualization Layer re-renders from new snapshot
          │
          ▼
Editor Layer updates line highlight
```

---

## Patterns to Follow

### Pattern 1: Event-Driven State Propagation

**What:** State Model emits a single `onChange(snapshot)` event. All consumers (visualization, editor line highlight) subscribe.
**When:** Always — avoids tight coupling between State Model and its consumers.
**Example:**
```javascript
class ExecutionStateModel {
  constructor() {
    this._listeners = [];
    this._trace = [];
    this._index = 0;
  }
  onChange(cb) { this._listeners.push(cb); }
  _emit() { this._listeners.forEach(cb => cb(this._trace[this._index])); }
  stepForward() {
    if (this._index < this._trace.length - 1) {
      this._index++;
      this._emit();
    }
  }
  load(trace) {
    this._trace = trace;
    this._index = 0;
    this._emit();
  }
}
```

### Pattern 2: Simulated Address Space

**What:** The interpreter assigns sequential fake addresses (e.g., stack starts at `0xBFFFF000` and grows down; heap starts at `0x10000000` and grows up). These never map to real browser memory.
**When:** Whenever a variable is declared or `malloc` is simulated.
**Why:** Makes the memory model feel authentic (addresses look like real C addresses) without requiring actual native memory access.

### Pattern 3: Full Re-render on Each Snapshot

**What:** On every step change, each D3 panel clears and re-renders entirely from the snapshot data. No incremental patching.
**When:** For an educational tool with small data sets (tens of variables), this is simpler and correct.
**Defer:** D3's enter/update/exit pattern with animated transitions is a later enhancement (Phase 2+), not Phase 1.

### Pattern 4: Web Worker Isolation for Interpreter

**What:** Interpreter runs in a dedicated Web Worker. Main thread is never blocked.
**When:** Always — user code may contain infinite loops or expensive recursion.
**Termination:** Main thread can call `worker.terminate()` if execution exceeds a timeout (e.g., 5 seconds), then create a new worker for the next run.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Mutable State Scattered Across Modules

**What:** Current codebase uses `let steps = []; let currentStep = 0;` as module-level globals in `controller.js`.
**Why bad:** Hard to test, hard to extend (e.g., supporting multiple trace sessions), impossible to reason about when event handlers fire out of order.
**Instead:** Encapsulate all execution state in `ExecutionStateModel` class with explicit methods.

### Anti-Pattern 2: Embedding HTML in Trace Data

**What:** Current `trace.json` stores `stack`, `static`, `heap` as pre-rendered HTML strings (`s.stack` is innerHTML).
**Why bad:** Couples the data model to the rendering layer. Prevents D3-driven visualization. Impossible to animate transitions.
**Instead:** Store structured data objects in `ExecutionSnapshot`. Visualization layer owns all rendering decisions.

### Anti-Pattern 3: Running Interpreter on Main Thread

**What:** Calling the interpreter synchronously on a button click, blocking the JS event loop.
**Why bad:** User programs with loops freeze the browser tab. There is no way to cancel or timeout.
**Instead:** Always use a Web Worker with a timeout-and-terminate guard.

### Anti-Pattern 4: Pointer Arrows as Absolute Pixel Coordinates Baked at Render Time

**What:** Calculating arrow start/end positions during initial render and storing them in state.
**Why bad:** Any layout reflow (window resize, panel collapse) invalidates stored positions silently.
**Instead:** Recompute arrow positions from live `getBoundingClientRect()` calls on every render cycle and on `window.resize`.

### Anti-Pattern 5: Monaco via CDN with No Fallback

**What:** Loading Monaco from `cdn.jsdelivr.net` with no local fallback.
**Why bad:** CDN downtime breaks the tool. For a portfolio static site, availability should not depend on third-party CDN uptime.
**Instead:** Bundle Monaco with the project (npm package `monaco-editor`) or use the self-hosted worker setup. Monaco's web workers must be configured to point at the correct base URL.

---

## Component Build Order

Build in this sequence to validate each layer before the next depends on it:

```
Phase 1: Foundation
  1. Execution State Model (data schema + navigation API)
     — can be unit tested with hand-crafted trace arrays
  2. Static trace loader (replaces trace.json fetch with a hardcoded fixture)
     — validates visualization layer independently of interpreter
  3. D3 visualization panels (Stack, Heap, Statics) reading from ExecutionSnapshot
  4. Monaco editor integration (load, getValue, line decoration)
     — editor is a pure input at this stage

Phase 2: Interpreter
  5. Pure-JS C interpreter (lexer → parser → treewalk evaluator)
     — start with: variable declarations, assignment, arithmetic, printf
     — add: if/else, while/for loops
     — add: functions, stack frames
     — add: pointers, address-of, dereference
     — add: malloc/free heap simulation
  6. Web Worker wrapper around interpreter
  7. Wire Run button → worker → State Model → Visualization

Phase 3: Pointer Visualization
  8. PointerLayer SVG overlay (requires panels to be stable first)
  9. Address-to-DOM-rect resolution
  10. Animated transitions (optional, polish)

Phase 4: Polish
  11. RegistersPanel
  12. Error display (parse errors, runtime errors surfaced to UI)
  13. Step-through mode (pre-run full trace, then navigate)
  14. UI layout refinement
```

**Why this order:**
- State Model first: all other layers depend on its schema. Getting the schema wrong is the most expensive mistake.
- Visualization before interpreter: allows visual validation with fixture data. Interpreter bugs do not pollute visualization debugging.
- Interpreter last among core components: it is the most complex piece. The rest of the system being stable reduces interpreter debugging surface area.
- Pointer visualization after panels: requires stable DOM layout from panels to compute arrow coordinates.

---

## Scalability Considerations

| Concern | At 50-line programs | At 500-line programs | At 5000-line programs |
|---------|---------------------|---------------------|----------------------|
| Trace size | Hundreds of snapshots, trivial | Thousands of snapshots, ~1MB JSON | Tens of thousands; lazy evaluation or streaming needed |
| Render time | Negligible | Noticeable if full re-render each step | Must switch to D3 incremental updates |
| Interpreter time | < 100ms in worker | ~500ms, acceptable | May need to cap or warn user |
| Pointer arrows | < 10 arrows, instant | ~50 arrows, acceptable | Layout engine complexity; consider elision |

For a CS education tool, programs are expected to be in the 20-100 line range. The full-re-render and full-trace-ahead model is appropriate and should not be over-engineered toward the large-scale column.

---

## Monaco Integration Detail

Monaco in a bundler-free static site:

1. Load via CDN: `<script src="https://cdn.jsdelivr.net/.../monaco-editor/min/vs/loader.js">` + AMD require.
2. Or: npm install `monaco-editor`, copy `/dist/min/vs/` to static assets, configure `MonacoEnvironment.getWorkerUrl` to point at the local paths.
3. Editor creation: `monaco.editor.create(domElement, { language: 'c', theme: 'vs-dark', value: defaultCode })`.
4. C language support: Monaco includes basic C syntax highlighting out of the box. For semantic highlighting or error markers, use `monaco.editor.setModelMarkers(model, 'interpreter', [{ startLineNumber, endLineNumber, message, severity }])` to surface interpreter errors as red squiggles.
5. Line highlight on step: Use `deltaDecorations` with `isWholeLine: true` and a CSS class for the current-execution-line background color.

Monaco's worker scripts (typescript worker, etc.) must be served from the same origin. For a static deploy, copy them alongside `index.html`.

---

## Sources

- Project context: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`
- Existing codebase patterns: `web/js/controller.js`, `web/js/heap-visualization.js`
- Monaco editor API: training knowledge (HIGH confidence — stable API since v0.20)
- Web Worker communication model: MDN standard (HIGH confidence)
- D3.js enter/update/exit pattern: training knowledge (HIGH confidence — stable since D3 v5)
- Pure-JS C interpreter approach: training knowledge + reasoning from project constraints (MEDIUM confidence — specific library choices need validation in STACK.md phase)
- Pointer arrow layout via getBoundingClientRect: standard browser API (HIGH confidence)
