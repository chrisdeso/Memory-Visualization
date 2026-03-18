# Domain Pitfalls: Browser-Based C Memory Visualizer

**Domain:** In-browser C interpreter with memory/pointer visualization
**Researched:** 2026-03-18
**Confidence:** MEDIUM — based on codebase analysis, domain expertise in interpreter design, browser tooling, and established patterns from comparable projects (Python Tutor, OnlineGDB, CS:APP visualization tools). Web research tools unavailable during this session; claims marked where live verification would increase confidence.

---

## Critical Pitfalls

Mistakes that cause rewrites, fundamental correctness problems, or render the educational value invalid.

---

### Pitfall 1: Scope Creep into a Real C Compiler

**What goes wrong:** The interpreter starts as "simulate basic C" and gradually accumulates attempts to handle the full C spec — preprocessor macros, `#include` of arbitrary headers, casting rules, undefined behavior edge cases, `setjmp`/`longjmp`, variadic functions, bitfields, unions, `volatile`. The project bogs down in language spec details instead of delivering the core visual experience.

**Why it happens:** Every demo program a user tries to run fails for a slightly different C feature. The natural response is "let me just add support for that." This iterates indefinitely because the C spec is enormous.

**Consequences:**
- Months spent on parser edge cases instead of visualization polish
- Incomplete C support is delivered anyway (impossible to complete), but late and buggy
- The educational value (showing memory model) is orthogonal to full language compliance

**Prevention:**
- Define a strict supported-C subset *before* any interpreter code is written. Write it down explicitly. Example: "C89 subset: arithmetic types, arrays, structs, pointers, malloc/free, printf (stubbed), no preprocessor except `#define` constants."
- Return a clear user-facing error for unsupported constructs rather than silently misbehaving.
- Treat the subset boundary as a feature, not a limitation. Python Tutor's C mode explicitly documents its subset.
- Do not add stdlib functions beyond what the demo programs need.

**Detection (warning signs):**
- You are writing code to handle C standard conformance details (integer promotion rules, strict aliasing, sequence points).
- The interpreter handles `#include <stdio.h>` by trying to parse the real header.
- Phase planning discussions start referencing the C99 or C11 spec.

**Phase mapping:** Address in Phase 1 (interpreter core). Define the subset spec as a written document before any code is written. Revisit in Phase 2 when connecting interpreter output to visualization.

---

### Pitfall 2: Simulating Pointers with Incorrect Address-Space Model

**What goes wrong:** Pointer values are implemented as JavaScript object references or array indices that look like addresses in the UI but don't behave like a flat byte-addressed memory space. This breaks pointer arithmetic, pointer casting, array indexing via pointer, and `sizeof`. Users see misleading or nonsensical address values.

**Why it happens:** The easiest implementation is `{ type, value }` objects with JS references for pointers. This works for simple cases but collapses when any pointer arithmetic is attempted, or when showing that `arr[i]` and `*(arr + i)` are identical.

**Consequences:**
- Pointer arithmetic silently gives wrong results (educational tool teaches incorrect behavior)
- `sizeof` returns wrong sizes; alignment is invisible
- Impossible to show that struct field addresses are contiguous
- Heap fragmentation and padding cannot be illustrated

**Prevention:**
- Implement a flat simulated address space as a `Uint8Array` (or equivalently, a logical address allocator that assigns monotonically increasing integer addresses). Every variable, heap block, and stack frame gets a real simulated address.
- Pointer values are integers (addresses) stored in the byte buffer, not JS references.
- `sizeof`, pointer arithmetic, and array decay all operate on this address space.
- Stack grows downward (higher to lower address) — model this from day one or it will be wrong in visualizations.

**Detection (warning signs):**
- Pointer variables are stored as JS references rather than integer address values.
- `sizeof(int)` is not 4 (or whatever the simulated platform says).
- `arr + 1` is not `arr + sizeof(*arr)`.

**Phase mapping:** Address in Phase 1 (interpreter core) before any visualization work. The address model is load-bearing; changing it later requires rewriting the visualization layer.

---

### Pitfall 3: Trace Snapshot Bloat Freezing the Browser

**What goes wrong:** Every execution step snapshots the entire memory state (full stack, full heap, all variables) and stores all snapshots in a JS array. Even moderately complex programs with loops produce thousands of steps, each with multi-kilobyte snapshots. The browser runs out of memory or the UI becomes unresponsive.

**Why it happens:** The existing codebase already has this pattern (full re-render on each step, full state stored per step). The static trace.json approach offloads storage to a file, but an in-browser dynamic interpreter storing everything in RAM hits the wall faster.

**Consequences:**
- A program with a 1000-iteration loop produces 1000+ snapshots, potentially 10-50MB of JS objects
- Navigation becomes sluggish; GC pauses create jank
- Step-back (reverse execution) seems to require all snapshots, making the problem worse

**Prevention:**
- Store *deltas* between steps, not full snapshots. Only record what changed (variables written, heap blocks allocated/freed, stack frames pushed/popped).
- Reconstruct state at step N by replaying deltas from step 0 (or from a nearest checkpoint).
- Cap the maximum number of steps (e.g., 10,000) with a user-visible error. This also prevents infinite loop hangs.
- For step-back, maintain a rolling checkpoint every N steps and replay deltas forward from there.

**Detection (warning signs):**
- Each trace step object contains the full contents of every variable.
- A program with a loop noticeably lags when you step through it.
- Memory usage in DevTools climbs with each execution run.

**Phase mapping:** Address in Phase 2 (interpreter-to-visualization bridge / trace format design). The trace data model must be defined before the visualization layer is built on top of it.

---

### Pitfall 4: Monaco Editor Integration Complexity Underestimated

**What goes wrong:** Monaco is a large, complex library that requires careful loading, worker configuration, and lifecycle management. Common mistakes: loading from CDN without worker setup causes console errors and degrades performance; disposing and re-creating editor instances leaks memory; editor-to-interpreter synchronization gets implemented ad hoc and breaks on edge cases (empty files, rapid typing, paste events).

**Why it happens:** Monaco's "getting started" example looks simple (5 lines). The production concerns are only visible when integrating with a stepping debugger (cursor-on-current-line, decoration updates, read-only mode while running).

**Consequences:**
- Workers not configured → Monaco falls back to main-thread parsing, causing UI jank during typing
- Line highlight decorations accumulate (each step adds a decoration without removing the previous)
- Editor content goes out of sync with the interpreter's copy of the source
- Disposing editor on re-run causes flicker or silent failures

**Prevention:**
- Use Monaco's `require.config({ paths: { vs: '...' } })` with AMD loader or the `@monaco-editor/loader` package. Configure `MonacoEnvironment.getWorkerUrl` for the language worker before instantiation.
- Store decoration IDs returned by `editor.deltaDecorations()` and pass them back to clear previous decorations on the next step.
- Treat the editor as the single source of truth for source code. The interpreter always reads from `editor.getValue()` at run time, never caches it separately.
- During step-through execution, set the editor to read-only (`editor.updateOptions({ readOnly: true })`) to prevent source modification mid-execution.

**Detection (warning signs):**
- `MonacoEnvironment` is not configured in the HTML/JS setup.
- Line highlight logic uses `innerHTML` or class manipulation on editor DOM elements directly (bypassing Monaco's decoration API).
- Running the same program twice without page reload accumulates decorations.

**Phase mapping:** Address in Phase 1 (editor setup) or Phase 2 (editor-interpreter integration). The decoration/sync pattern must be correct before stepping is built.

---

### Pitfall 5: Conflating "Execution Steps" with "Source Lines"

**What goes wrong:** The stepper maps each step to a source line number. This seems natural but breaks on: multi-statement lines, for-loop headers (init/condition/increment are separate steps), function call/return (two events on same line), expressions with side effects (`i++ + i++`), and nested function calls. Users see the wrong line highlighted or the step count jumps unexpectedly.

**Why it happens:** The existing trace format uses `line_number` as the primary step identifier. This is a shallow model.

**Consequences:**
- Stepping through `for (int i = 0; i < 10; i++)` shows confusing behavior (cursor appears to jump back to the for line repeatedly)
- Function call and return on the same line are indistinguishable
- Users cannot understand what a "step" means

**Prevention:**
- Model execution steps as AST node evaluations, not line transitions. Each step corresponds to a statement or sub-expression evaluation.
- Track source range (start line, start column, end line, end column), not just line number.
- Separate "step into" (descend into function call) from "step over" (treat call as atomic).
- The AST evaluator emits a trace event at the start of evaluating each *statement*, not each line.

**Detection (warning signs):**
- The interpreter walks the source line-by-line rather than evaluating AST nodes.
- Trace events only carry `line_number` with no column information.
- A for-loop header produces a single trace event.

**Phase mapping:** Address in Phase 1 (interpreter core / AST evaluator design). Very hard to retrofit.

---

## Moderate Pitfalls

---

### Pitfall 6: malloc/free Simulation That Doesn't Model Fragmentation or Double-Free

**What goes wrong:** `malloc` is implemented as a simple counter that assigns the next address. `free` does nothing (or removes the block from a list). This means double-free has no effect, use-after-free looks like a working pointer, and there is no heap fragmentation to show. The tool loses its value for teaching memory safety.

**Prevention:**
- Model the free list explicitly. `free` marks the block as freed but keeps its entry in the heap map.
- Detect double-free (block already marked free) and show a visual error.
- Detect use-after-free (read/write to a freed block's address range) and highlight it.
- Show freed blocks in the visualization as "freed" (greyed out, strikethrough) rather than removing them immediately — this illustrates dangling pointer behavior.

**Phase mapping:** Phase 2 (heap simulation, connected to visualization).

---

### Pitfall 7: Stack Frame Visualization Not Showing Activation Record Layout

**What goes wrong:** Stack frames are shown as key-value tables of local variables. This is correct but incomplete: it doesn't show the return address, saved frame pointer, or padding. Students learn "the stack has variables" but not "the stack is a contiguous memory region with a specific layout."

**Prevention:**
- Show the return address field in each frame (even if it's a simulated value).
- Show the saved base pointer (or frame pointer equivalent).
- Draw frames as contiguous memory blocks in the address space, not as floating boxes.
- This is aspirational for MVP but should be architecturally possible from day one if the address space model is correct (Pitfall 2).

**Phase mapping:** Phase 3 (visualization polish). Requires correct address model from Phase 1.

---

### Pitfall 8: Re-rendering the Entire Visualization on Every Step

**What goes wrong:** Every step change clears all DOM nodes and rebuilds them from scratch (the existing codebase already does this: `this.container.html('')`). This causes visible flicker, loses scroll position in large memory views, and causes GC pressure from discarded DOM nodes.

**Prevention:**
- Use D3's data join pattern (`.data(items, d => d.address)` with a key function). D3 will update changed elements, enter new ones, and exit removed ones — no full clear needed.
- Or: use a virtual DOM approach (React/Preact) where reconciliation handles minimal DOM updates.
- Preserve scroll position of memory region panels across steps.
- Animate changes (new blocks slide in, freed blocks fade out) to make the diff legible.

**Phase mapping:** Phase 2-3 (visualization layer). The existing code has the anti-pattern; it should not be carried forward.

---

### Pitfall 9: Infinite Loop Hanging the Browser Tab

**What goes wrong:** A user writes `while(1) {}`. The interpreter runs synchronously in the main thread. The tab freezes. The user has no recourse except closing the tab.

**Prevention:**
- Run the interpreter in a Web Worker. The main thread remains responsive.
- Implement a step budget: after N AST node evaluations without a user-visible pause, terminate with an error ("execution limit exceeded").
- The step-limit error should be user-configurable (power users writing larger programs need a higher limit).
- Alternatively, use a time budget: if execution has been running for >100ms without yielding, terminate.

**Detection (warning signs):**
- The interpreter runs synchronously on the main thread.
- There is no step counter or timeout guard in the evaluation loop.

**Phase mapping:** Phase 1 (interpreter core). Must be in place before any user testing.

---

### Pitfall 10: Pointer Arrows Becoming a Visual Tangle

**What goes wrong:** The visualization draws SVG arrows from pointer variables to their targets. With more than 3-4 pointers (linked list node example, tree node example), the arrows cross, overlap, and become illegible. This is the hardest UI problem in the domain — Python Tutor struggles with it even after years of iteration.

**Prevention:**
- Use curved Bezier arrows with bend direction based on source/target position (left-to-right for heap objects, downward for stack-to-heap).
- Show pointer targets as highlighted borders on the target block rather than lines, as a fallback for dense cases.
- Allow users to drag memory blocks to reposition them (reduces crossing lines).
- Limit the number of simultaneous arrows drawn for MVP; add routing logic in a later phase.

**Phase mapping:** Phase 3+ (visualization polish). Design the rendering layer with arrow routing in mind from Phase 2.

---

### Pitfall 11: Type System Implementation Drift

**What goes wrong:** The interpreter's internal type representation starts inconsistent: sometimes `int` is stored as a JS `number`, sometimes as a tagged object `{ type: 'int', value: 42 }`, sometimes as bytes in the Uint8Array. Code that checks types uses ad-hoc `typeof` checks. Structs and arrays are especially prone to this.

**Prevention:**
- Define a canonical internal value representation before writing interpreter code. Every C value in the interpreter is a typed record: `{ ctype: CType, address: number }` where the value is always read from the simulated byte buffer at `address`.
- Arithmetic operations read bytes, compute, write bytes back. No "shortcut" JS arithmetic on raw values.
- CType carries size, alignment, and kind (primitive, pointer, array, struct, function pointer).

**Phase mapping:** Phase 1 (interpreter core). This decision is foundational; retrofitting causes cascading bugs.

---

## Minor Pitfalls

---

### Pitfall 12: XSS from User Code Display

**What goes wrong:** User-written C code is displayed back in the visualization panel using `innerHTML`. A user types `int x = 0; // <script>alert(1)</script>` and the script executes.

**Prevention:**
- Always use `textContent` (not `innerHTML`) when displaying user-authored code or variable names/values in the UI.
- If HTML is needed for syntax highlighting, use a dedicated sanitizer or Monaco's own rendering.
- This issue already exists in the current codebase (`controller.js` line 30, `index.html` lines 291, 300, 351) — do not carry this pattern forward.

**Phase mapping:** Phase 1 (editor setup). Zero-cost fix if done correctly from the start.

---

### Pitfall 13: Monaco Version Mismatch Between CDN and Local

**What goes wrong:** Monaco is loaded from CDN in development. Production deployment uses a different version pinned locally. The API surface differs slightly (method renamed, option key changed). Decorations or language features break in production only.

**Prevention:**
- Pin Monaco to a specific version in both development and production from day one.
- Use a package manager (`npm install monaco-editor`) and bundle it, rather than relying on CDN.
- If CDN is used for simplicity, use a version-pinned URL: `https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/...` not `@latest`.

**Phase mapping:** Phase 1 (editor setup).

---

### Pitfall 14: Hardcoded Colors Without Semantic Meaning

**What goes wrong:** Memory regions are colored red/green/blue, but the color choices are arbitrary. Colorblind users cannot distinguish heap from stack. The existing codebase uses red+green combinations that fail deuteranopia tests.

**Prevention:**
- Assign colors by region type using CSS custom properties (variables), not hardcoded hex values.
- Use patterns (diagonal stripes for stack, dots for heap) in addition to color.
- Test with a colorblind simulator before finalizing the palette.

**Phase mapping:** Phase 2-3 (visualization design). Cheap to fix if CSS variables are used from the start.

---

### Pitfall 15: No Step "Undo" Because State Was Not Designed for It

**What goes wrong:** Stepping forward works. Stepping backward requires the previous state. If the interpreter is implemented as a mutating state machine (one mutable state object modified in place), stepping back is impossible without re-running from the start — which is slow and may time out for long programs.

**Prevention:**
- Use the delta-based trace model (Pitfall 3 prevention). Stepping back replays from a recent checkpoint + forward deltas.
- Alternatively, use immutable state with structural sharing (each step produces a new state object that shares unchanged sub-trees). This is more complex but makes undo trivially O(1).
- Never design the interpreter as a single mutable global state object.

**Phase mapping:** Phase 1 (interpreter core / trace data model). The data model determines whether undo is possible.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| C subset definition | Scope creep (Pitfall 1) | Write subset spec as a document before code |
| Address space / pointer model | Incorrect pointer arithmetic (Pitfall 2) | Use flat integer address space with Uint8Array |
| Trace data format design | Snapshot bloat (Pitfall 3) | Design delta-based trace from day one |
| Monaco editor setup | Worker misconfiguration, decoration leaks (Pitfall 4) | Configure MonacoEnvironment; store decoration IDs |
| Interpreter AST evaluator | Line-based stepping (Pitfall 5) | Step on AST node evaluation, not line change |
| Interpreter execution loop | Infinite loop tab freeze (Pitfall 9) | Web Worker + step budget required before user testing |
| Heap simulation | malloc/free correctness (Pitfall 6) | Model free list; detect double-free and use-after-free |
| Visualization render layer | Full re-render flicker (Pitfall 8) | D3 data join with key function; never clear+rebuild |
| Pointer arrow rendering | Visual tangle (Pitfall 10) | Plan routing strategy before building arrow layer |
| Internal type system | Type representation drift (Pitfall 11) | Define canonical CType record before interpreter code |
| Code/value display | XSS via innerHTML (Pitfall 12) | Use textContent everywhere; existing bug, do not repeat |
| Step navigation | No undo possible (Pitfall 15) | Delta-based trace or immutable state model |

---

## Sources

- Codebase analysis of existing implementation: `/home/chitao/dev/Memory-Visualization/.planning/codebase/CONCERNS.md`, `ARCHITECTURE.md`, `STACK.md`
- Domain expertise: C interpreter design, browser JS execution constraints, Monaco editor API, D3.js rendering patterns, Python Tutor design decisions (public documentation)
- Confidence: MEDIUM — live web research tools were unavailable for this session. Claims about Monaco worker configuration and Python Tutor C-mode limitations should be verified against current official documentation before finalizing phase plans.
