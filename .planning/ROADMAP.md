# Roadmap: Memory Visualizer

## Overview

Starting from a codebase that reads a static `trace.json`, this project delivers a fully interactive browser-based C memory visualizer in four phases. Phase 1 establishes the TypeScript schema and renders visualization panels against fixture data — this is load-bearing, because every downstream layer depends on the ExecutionSnapshot contract being correct before interpreter or pointer work begins. Phase 2 builds the in-browser C interpreter in a Web Worker and wires it to the visualization. Phase 3 adds pointer arrow overlays and memory model polish (leak detection, diff highlighting). Phase 4 completes the portfolio-ready experience with curated examples and a clean visual finish.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Vite + TypeScript scaffold, Monaco editor, ExecutionSnapshot schema, D3 panels rendering from fixture trace (completed 2026-03-19)
- [ ] **Phase 2: Interpreter** - In-browser C/C++ interpreter in Web Worker, full execution control, trace generation
- [ ] **Phase 3: Pointer Visualization** - SVG pointer arrow overlay, memory leak highlighting, step diff display
- [ ] **Phase 4: Polish** - Curated example programs, portfolio-grade visual finish

## Phase Details

### Phase 1: Foundation
**Goal**: Users can write C/C++ code in a Monaco editor and see memory panels (stack, heap, statics, registers) rendering correctly from a fixture trace, with the project building and deployable as a static site
**Depends on**: Nothing (first phase)
**Requirements**: EDIT-01, EDIT-02, EDIT-03, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. User can open the app and type C/C++ code in a Monaco editor with C/C++ syntax highlighting active
  2. User sees the currently-executing line highlighted in the editor when stepping through a fixture trace
  3. User sees parse/runtime error squiggles appear in the editor when invalid code is present
  4. User sees stack frame, heap, statics, and registers panels rendered side-by-side with the editor on a light dev-tool-style theme
  5. Memory state updates instantly when stepping (no visible lag or animation delay)
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold: Vite + TypeScript + Monaco + D3, light theme CSS, static build pipeline
- [ ] 01-02-PLAN.md — ExecutionSnapshot schema, fixture trace, and ExecutionState model
- [ ] 01-03-PLAN.md — D3 visualization panels (StackPanel, HeapPanel, RegistersPanel)
- [ ] 01-04-PLAN.md — Monaco editor integration (C++ syntax, line decoration, error markers)
- [ ] 01-05-PLAN.md — Application wiring: editor + panels + state + step controls

### Phase 2: Interpreter
**Goal**: Users can paste or write a C/C++ program, click Run, and step forward and backward through a live execution trace the interpreter generates entirely in the browser
**Depends on**: Phase 1
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06, EXEC-07
**Success Criteria** (what must be TRUE):
  1. User can click Run on a valid C or C++ program and see the visualization panels populate with live execution state
  2. User can step forward one line at a time and one statement at a time, seeing memory panels update at each step
  3. User can step backward to a previously visited state and see memory panels revert accurately
  4. User can play through execution automatically and adjust the playback speed
  5. An infinite loop in user code does not freeze the browser tab (Web Worker timeout terminates it)
  6. User can write C++ code using classes, references, new/delete, and basic STL (vector, string) and have it execute correctly
**Plans**: 6 plans

Plans:
- [ ] 02-01-PLAN.md — AST node types and lexer (tokenizer) for C++ subset
- [ ] 02-02-PLAN.md — Recursive-descent parser (Token[] -> AST)
- [ ] 02-03-PLAN.md — Memory model and tree-walk evaluator for core C (variables, control flow, functions, pointers, malloc/free)
- [ ] 02-04-PLAN.md — C++ extensions (classes, constructors/destructors, new/delete, STL vector/string/array)
- [ ] 02-05-PLAN.md — Web Worker wrapper and App wiring (Run button, error banner, timeout guard)
- [ ] 02-06-PLAN.md — Auto-play controls, speed presets, and in-app syntax reference panel

### Phase 3: Pointer Visualization
**Goal**: Users can see SVG pointer arrows connecting pointer variables to their target memory locations, with memory leak highlighting and per-step change indicators making the C memory model visually unambiguous
**Depends on**: Phase 2
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05
**Success Criteria** (what must be TRUE):
  1. User sees the full call stack with frame boundaries and all local variables in the stack panel
  2. User sees malloc/free heap blocks with simulated hex addresses in the heap panel
  3. User sees SVG Bezier-curve arrows connecting pointer variables to their target memory addresses across panels
  4. User sees the program counter and stack pointer in a registers panel
  5. User sees heap blocks that were never freed highlighted as memory leaks when the program exits
**Plans**: TBD

Plans:
- [ ] 03-01: Stack panel refinement (frame boundaries, activation record layout, return address fields)
- [ ] 03-02: Heap panel refinement (allocated/freed/leaked block status, simulated hex addresses)
- [ ] 03-03: SVG pointer arrow overlay (address-to-DOMRect resolution, Bezier curves, re-render on step)
- [ ] 03-04: Registers panel (PC, SP display from ExecutionSnapshot)
- [ ] 03-05: Memory leak highlighting and step diff indicators (changed values highlighted between steps)

### Phase 4: Polish
**Goal**: The app is portfolio-ready: a first-time visitor can select a curated example, step through it, and understand C memory concepts without any guidance, and the overall visual design reflects the quality of a professional dev tool
**Depends on**: Phase 3
**Requirements**: EDIT-04, UI-04
**Success Criteria** (what must be TRUE):
  1. User can select a named example program (linked list, recursion, malloc/free, dangling pointer) from a dropdown and have it load immediately into the editor
  2. A visitor to the portfolio page judges the overall visual design as polished and professional without prompting
**Plans**: TBD

Plans:
- [ ] 04-01: Curated example programs (linked list, recursion, malloc/free, dangling pointer) with dropdown loader
- [ ] 04-02: Visual polish pass (typography, spacing, color palette, overall portfolio-grade finish)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete   | 2026-03-19 |
| 2. Interpreter | 1/6 | In Progress|  |
| 3. Pointer Visualization | 0/5 | Not started | - |
| 4. Polish | 0/2 | Not started | - |
