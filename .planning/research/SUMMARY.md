# Project Research Summary

**Project:** Memory-Visualization (browser-based C memory visualizer)
**Domain:** In-browser C interpreter with step-through memory/pointer visualization
**Researched:** 2026-03-18
**Confidence:** MEDIUM (stack HIGH, architecture HIGH, features MEDIUM, pitfalls MEDIUM — no live web access during research)

## Executive Summary

Memory-Visualization is a single-page static web application that interprets C code in the browser, captures an execution trace, and renders that trace as an interactive step-through visualization of the stack, heap, pointer relationships, and register state. The competitive benchmark is Python Tutor — this tool differentiates on Monaco editor quality, C-specific memory model fidelity (explicit simulated hex addresses, SVG pointer arrows, register display), and fully client-side execution requiring no server. The current codebase has the right shape (editor + D3 visualization + step navigation) but has foundational problems: pre-rendered HTML stored as data, D3 loaded as a CDN global, no bundler, and static trace.json instead of a live interpreter.

The recommended approach is a four-layer architecture — Editor (Monaco), Interpreter (pure-JS C subset running in a Web Worker), State Model (ExecutionTrace array with navigation API), and Visualization (D3 panels + SVG pointer overlay) — built in that dependency order. The hardest single decision is the C interpreter strategy: a pure-JS tree-walking interpreter is recommended over WASM options because it allows direct introspection of every execution step without crossing a WASM boundary. The interpreter must be scoped to a strict, documented C subset (C89-style: variables, pointers, malloc/free, structs, functions, basic stdlib stubs) and must never attempt full C standard compliance.

The dominant risks are interpreter scope creep (spending months on C spec edge cases instead of visualization), an incorrect pointer/address model (using JS object references instead of a flat integer address space), and trace snapshot bloat (storing full state per step instead of deltas). All three must be addressed in Phase 1 before any visualization work begins, because they are load-bearing: the visualization schema, D3 rendering, and step-back navigation all depend on the trace format being correct from the start.

---

## Key Findings

### Recommended Stack

The project should be scaffolded with Vite (vanilla TypeScript template) to replace the current unbundled CDN approach. Vite handles Monaco's web worker assets with minimal configuration, produces a static `dist/` directory deployable on GitHub Pages or any static host, and is the standard 2025 choice for no-framework static apps. TypeScript is strongly recommended because the ExecutionTrace/ExecutionSnapshot data model is complex enough that untyped JS produces subtle, hard-to-trace bugs.

For the C interpreter, `jscpp` (pure-JS C interpreter, ~100 KB) is the v1 recommendation. Its execution state is directly accessible as JS objects, making step-by-step trace capture straightforward. `picoc` compiled to WASM is the fallback if `jscpp`'s pointer/malloc support proves insufficient. WASM-based clang (Compiler Explorer style) is explicitly out of scope — too large, too complex for extraction of step traces.

**Core technologies:**
- `vite` ^5.4.0: Build tooling and dev server — handles Monaco worker assets, produces static deployment
- `typescript` ^5.5.0: Type safety for the trace data model — prevents subtle schema bugs
- `monaco-editor` ^0.50.0: Code editor — industry standard, C syntax highlighting, line decorations API
- `d3` ^7.9.0: Visualization — already used in codebase; ES modules in v7; SVG control needed for pointer arrows
- `jscpp` ^2.0.0: C interpreter — pure-JS, directly introspectable for step-trace generation [VERIFY npm]
- `vitest` ^2.0.0: Unit testing — required; no tests exist currently; interpreter logic is algorithmically complex
- `vite-plugin-monaco-editor`: Monaco worker configuration — mandatory to avoid the #1 Monaco integration failure

All versions marked [VERIFY] must be checked against the npm registry before Phase 1 begins. `jscpp` maintenance status and malloc/free support require explicit verification before committing to it.

### Expected Features

The existing codebase covers the basic mechanics (step navigation, variable display, static variables section, step descriptions). What is missing for an MVP are Monaco editor integration with C syntax highlighting, a live in-browser C interpreter, pointer arrow visualization, and proper error display for unsupported code. These four items are the delta between current state and a shippable portfolio tool.

**Must have (table stakes):**
- Monaco editor with C syntax highlighting — current codebase lacks a real editor
- In-browser C interpreter generating a structured execution trace — no live interpreter exists
- Stack frame visualization with frame boundaries — current display is a flat table
- Heap visualization with malloc/free lifecycle — current blocks lack status tracking
- Pointer arrows (SVG overlay) — absent entirely; is the primary C memory concept to illustrate
- Error display for invalid/unsupported C — currently silent failure
- Works fully offline with no server dependency — core architectural constraint

**Should have (competitive differentiators):**
- Explicit simulated hex addresses (0x7fff...) on stack and heap — makes C address model tangible
- Register/PC display — PROJECT.md requirement; no browser tool at this level offers it
- Memory leak highlighting at program end — stub exists in codebase, needs implementation
- Preloaded curated examples (linked list, recursion, malloc/free, dangling pointer) — high educational value
- Diff/change highlighting between steps — teaches what each statement does
- Shareable URL via URL hash encoding — enables classroom and portfolio sharing

**Defer (v2+):**
- Animated transitions (cell value changes, frame push/pop)
- Full C++ support
- Multi-file programs
- Mobile/responsive layout (explicitly out of scope in PROJECT.md)
- User accounts, persistence, collaborative editing

### Architecture Approach

The system is a strict four-layer SPA with no layer reaching through another. The Editor Layer owns Monaco and exposes only `getValue()` and `setLineDecoration()`. The Interpreter Layer owns C parsing and evaluation, exposes `interpret(source): ExecutionTrace`, and runs entirely in a Web Worker. The State Model is the single source of truth — it holds the trace array, current index, and fires `onChange(snapshot)` events. The Visualization Layer owns all D3 panels and the SVG pointer overlay, and only reacts to `onChange`. This separation is what makes the architecture testable: each layer can be unit-tested with hand-crafted fixtures.

**Major components:**
1. `ExecutionStateModel` — trace storage, step navigation, event emission; all other layers depend on its schema
2. `InterpreterWorker` — pure-JS C tree-walk interpreter in a Web Worker; exposes postMessage protocol; includes step budget and timeout-terminate guard
3. `MonacoEditor` wrapper — source input, line decoration, read-only mode during execution
4. `StackPanel`, `HeapPanel`, `StaticsPanel`, `RegistersPanel` — independent D3 panels, each renders from `ExecutionSnapshot` fields
5. `PointerLayer` — SVG overlay; computes arrow coordinates from live `getBoundingClientRect()` after panels render

The `ExecutionSnapshot` schema is the most load-bearing design decision. It must include simulated addresses as integers (not JS object references), pointer target addresses, heap block status (`allocated`/`freed`/`leaked`), and source range (line + column) rather than just line number.

### Critical Pitfalls

1. **Interpreter scope creep into full C compliance** — define a written C subset specification before writing any interpreter code; return clear user-facing errors for unsupported constructs; never attempt to handle preprocessor includes or C99/C11 features in v1

2. **Incorrect pointer address model (JS references instead of flat address space)** — implement a flat integer address space (conceptually a `Uint8Array`) from day one; pointer values are integer addresses, not JS object references; `sizeof`, array indexing, and pointer arithmetic must work correctly; wrong model requires rewriting the visualization layer

3. **Trace snapshot bloat** — store deltas between steps, not full state copies; cap maximum steps (e.g., 10,000); design the delta-based trace format before building the visualization on top of it

4. **Execution steps conflated with source lines** — model steps as AST node evaluations with source range (line + column), not line transitions; for-loop headers, function call/return, and multi-statement lines break a line-only model; extremely hard to retrofit

5. **Monaco integration complexity underestimated** — configure `MonacoEnvironment.getWorkerUrl` before first use; store decoration IDs returned by `deltaDecorations` to clear previous highlights; set editor read-only during step-through; never manipulate Monaco's DOM directly

---

## Implications for Roadmap

Based on the combined research, the architecture research file explicitly recommends a 4-phase build order. This is the clearest signal in the research and should be followed directly.

### Phase 1: Foundation — Data Schema, Editor, and Visualization on Fixture Data

**Rationale:** The `ExecutionSnapshot` schema is load-bearing for every other layer. Getting it wrong requires rewriting the visualization. Proving the visualization works with hand-crafted fixture data decouples visualization debugging from interpreter debugging. Monaco setup belongs here because its integration complexity affects the overall project structure.

**Delivers:** Working Monaco editor, correct ExecutionSnapshot TypeScript schema, D3 visualization panels (Stack, Heap, Statics, Registers) rendering from fixture trace, step navigation working, Vite build pipeline with Monaco worker config, vitest test harness

**Addresses:** C syntax highlighting (Monaco), stack frame display, heap block display, static variable section, step navigation, step descriptions

**Avoids:** Anti-pattern of embedding HTML in trace data (current codebase); Monaco CDN fragility; decoration leak (store decoration IDs); XSS via innerHTML (use textContent)

**Research flag:** Verify npm package versions before starting. Verify Monaco worker configuration pattern for chosen Vite version.

### Phase 2: Interpreter Core

**Rationale:** The interpreter is the highest-risk, highest-complexity component. Building it after the visualization is stable means interpreter bugs can be isolated — the visualization layer is known-good. The Web Worker and step budget must be in place before any user testing.

**Delivers:** Pure-JS C interpreter (lexer, parser, tree-walk evaluator) covering the documented C subset; Web Worker wrapper with step budget and timeout-terminate; pointer/address model using flat integer address space; malloc/free heap simulation with free-list tracking (double-free and use-after-free detection); delta-based trace generation; wire-up of Run button to Worker to State Model to Visualization

**Addresses:** Live C execution (the core missing capability), error display for unsupported constructs

**Avoids:** Interpreter scope creep (write C subset spec first); JS-reference pointer model (use integer address space); line-only step model (use AST node + source range); synchronous main-thread execution (Web Worker required); malloc/free oversimplification

**Research flag:** This phase needs `/gsd:research-phase`. Specifically: verify `jscpp` malloc support and maintenance status before committing; if inadequate, evaluate `picoc` WASM alternative and its instrumentation approach. The C subset specification document should be written as a deliverable at the start of this phase, not during it.

### Phase 3: Pointer Visualization and Memory Model Polish

**Rationale:** Pointer arrows require stable DOM layout from Phase 1 panels and a working interpreter from Phase 2. SVG overlay coordinate resolution uses live `getBoundingClientRect()` calls which depend on panels having rendered correctly first.

**Delivers:** SVG pointer arrow overlay with Bezier curves; address-to-DOMRect resolution from all panels; memory leak highlighting (freed blocks remain visible, leaked blocks highlighted); diff/change highlighting between consecutive steps; stack frame activation record layout (return address, frame pointer fields)

**Addresses:** Pointer arrows (the primary C memory concept), memory leak visualization, visual diff on step change

**Avoids:** Arrow coordinates baked at render time (use live `getBoundingClientRect()`); visual tangle for dense pointer graphs (curved Bezier arrows, consider fallback to target highlighting); full re-render flicker (D3 data join with key function, not clear+rebuild)

**Research flag:** Pointer arrow routing strategies may need research. The tangle problem (Pitfall 10) has no clean universal solution; plan for iteration.

### Phase 4: Polish and Shareability

**Rationale:** All core educational value is delivered in Phases 1-3. This phase adds usability and shareability features that make it portfolio-ready and classroom-useful.

**Delivers:** Preloaded curated example programs (linked list, recursion, malloc/free, dangling pointer); shareable URL via URL hash (base64 or LZ-string encoded program); register/PC display; animated D3 transitions (frame push/pop, value change); accessibility pass (colorblind-safe palette with patterns, not color alone); error squiggles in Monaco via `setModelMarkers`

**Addresses:** Preloaded examples, shareable URLs, register display, animation polish, colorblind accessibility

**Avoids:** Mobile responsive layout (explicitly out of scope); AI code explanation (scope creep); full C++ support (out of scope for v1)

**Research flag:** LZ-string URL encoding is a well-documented pattern; no research needed. Animated D3 transitions are well-documented; no research needed.

### Phase Ordering Rationale

- Schema first: `ExecutionSnapshot` is the contract between interpreter, state model, and visualization. All phases build on it. Wrong schema = rewrite.
- Visualization before interpreter: validates the rendering layer with fixture data; interpreter bugs cannot contaminate visualization debugging during the hardest phase.
- Interpreter in isolation: the Web Worker boundary enforces clean separation; the interpreter can be unit-tested against the schema without any UI running.
- Pointer overlay after both panels and interpreter: requires real trace data to test meaningfully, and stable panel DOM to compute coordinates.
- Polish last: defers non-core complexity (URL encoding, animations, examples) until the core educational value is proven working.

### Research Flags

Phases needing `/gsd:research-phase` during planning:
- **Phase 2 (Interpreter):** `jscpp` npm status, maintenance, and malloc/pointer support must be verified before committing. If inadequate, the `picoc` WASM path requires separate research on instrumentation approach and Emscripten integration with Vite.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** Vite + Monaco + D3 + TypeScript are all well-documented; the integration patterns are established.
- **Phase 3 (Pointer Visualization):** `getBoundingClientRect` + SVG overlay is a known browser pattern; D3 data join is stable API.
- **Phase 4 (Polish):** URL hash encoding, D3 transitions, and Monaco error markers are all well-documented.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vite, Monaco, D3, TypeScript are all stable, well-documented choices. Only `jscpp` is MEDIUM — maintenance status and malloc support require npm/GitHub verification. |
| Features | MEDIUM | Feature gap analysis against current codebase is HIGH confidence. Competitor feature comparisons (Python Tutor, CS50) are from training knowledge without live verification. |
| Architecture | HIGH | Four-layer SPA pattern, Web Worker isolation, event-driven state propagation, and `getBoundingClientRect` pointer overlay are all established patterns with high-quality prior art. |
| Pitfalls | MEDIUM | All pitfalls are grounded in the existing codebase analysis and established interpreter design patterns. Live web research tools were unavailable; claims about Python Tutor C-mode limitations and Monaco worker config should be verified against current documentation. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **`jscpp` viability:** Check `npm show jscpp` and its GitHub last-commit date before Phase 2 planning. If the package is abandoned or lacks malloc/free simulation, the Phase 2 interpreter strategy changes materially (switches to `picoc` WASM, which requires Emscripten toolchain and a different instrumentation approach).
- **C subset specification:** Must be written as a document (not just code) at the start of Phase 2. This document defines what programs the tool claims to support and what user-facing errors are shown for unsupported features. It should be completed before any interpreter code is written.
- **All npm versions:** Run `npm show [package] version` for each dependency before scaffolding. Version numbers in STACK.md are training-knowledge estimates, not live-verified.
- **Monaco worker config for Vite 5:** The `vite-plugin-monaco-editor` plugin's compatibility with the recommended Vite version should be confirmed during Phase 1 setup. If incompatible, manual worker URL configuration is the fallback.

---

## Sources

### Primary (HIGH confidence)
- `/home/chitao/dev/Memory-Visualization/.planning/PROJECT.md` — project requirements, constraints, scope
- `/home/chitao/dev/Memory-Visualization/.planning/codebase/CONCERNS.md` — documented issues in existing codebase
- `/home/chitao/dev/Memory-Visualization/.planning/codebase/ARCHITECTURE.md` — existing code structure analysis
- Monaco editor API — stable since v0.20, well-documented
- Web Worker postMessage protocol — MDN standard
- D3.js v7 enter/update/exit pattern — stable since D3 v5

### Secondary (MEDIUM confidence)
- Training knowledge through August 2025 — npm ecosystem state, Vite configuration patterns, `jscpp` characteristics
- Python Tutor (pythontutor.com) feature comparison — training knowledge, no live verification
- Compiler Explorer (godbolt.org) architecture — training knowledge

### Tertiary (LOW confidence)
- `jscpp` malloc/free support — claimed in training knowledge; must verify against current package
- Monaco version numbers — estimated; must verify against npm registry
- Python Tutor C-mode limitations — asserted from training knowledge; verify against current pythontutor.com

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*
