# Memory Visualizer

## What This Is

An interactive browser-based tool that lets users write C/C++ code in a Monaco editor and watch memory allocation, stack frames, pointers, and registers come to life as they step through execution. Supports a modern C++ subset (classes, references, new/delete, basic STL). Built as both a CS education tool and a portfolio showcase piece.

## Core Value

Users write C/C++ code, step through it, and see exactly what's happening in memory — stack, heap, and pointers — without needing any server or build step.

## Requirements

### Validated

Validated in Phase 1: Foundation (2026-03-19)
- [x] Monaco editor for writing C/C++ code in the browser (C++ syntax highlighting, line decoration, error markers)
- [x] Stack frame visualization (function calls, local variables, return addresses)
- [x] Heap visualization (malloc/free blocks, simulated hex addresses)
- [x] Register/program state display (PC, SP)
- [x] Side-by-side layout (editor left, visualization right)
- [x] Light theme with professional dev-tool aesthetic (user preference, overrides initial dark theme plan)
- [x] ExecutionSnapshot TypeScript schema — load-bearing contract for all downstream phases

### Validated

Validated in Phase 2: Interpreter (2026-03-20)
- [x] In-browser C/C++ interpreter/simulator that generates execution trace dynamically
- [x] Modern C++ subset support: classes, references, new/delete, basic STL (vector, string)
- [x] Step-through execution: line-by-line and statement-by-statement modes
- [x] Replace existing static trace.json approach entirely

Validated in Phase 3: Pointer Visualization (2026-03-21)
- [x] Pointer visualization (SVG Bezier-curve arrows from pointer variables to target memory locations)
- [x] Memory leak highlighting (gold LEAK badge, yellow tint on unreleased heap blocks)
- [x] Per-step diff highlighting (changed values highlighted between steps in stack and heap panels)
- [x] Frame boundary dividers with return address rows in stack panel
- [x] Registers panel showing PC and SP

### Active

### Out of Scope

- Server-side code execution — browser-only by design
- Actual native memory tracking — simulated/interpreted only
- Languages other than C/C++ — focus on C memory model first
- Mobile layout — desktop web app for now

## Context

The existing codebase (`master` branch) is a D3.js visualization that reads from a static `trace.json` file and renders a timeline-based memory view. This is being replaced entirely with a dynamic, editor-driven experience.

Codebase map is at `.planning/codebase/` — ARCHITECTURE.md and STACK.md are most relevant.

The project will eventually be hosted as a static page on the owner's personal website, so the entire experience must be self-contained (no backend, no build-time secrets).

## Constraints

- **Runtime**: Browser-only — no server, no backend execution engine
- **Hosting**: Static site compatible (personal website deployment)
- **Execution model**: C/C++ interpreter must run in-browser (WASM or pure JS)
- **C++ scope**: Modern subset only — classes, references, new/delete, vector, string; no templates, no full STL
- **Existing code**: Full replacement — not extending the current trace.json pipeline

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monaco editor | Industry-standard, syntax highlighting, familiar UX | Shipped in Phase 1 — cpp mode, vs theme, line decorations, error markers |
| Simulated C interpreter (browser) | No server dependency, portable, self-contained | Shipped in Phase 2 — lexer, parser, evaluator, Web Worker, auto-play, segfault detection |
| Side-by-side layout | Code and memory visible simultaneously during stepping | Shipped in Phase 1 — editor left, panels right |
| Replace entirely (not extend) | Clean architecture, no legacy trace.json coupling | Shipped in Phase 1 — legacy web/ deleted |
| Light theme | User preference over original dark theme plan | Shipped in Phase 1 — white/grey palette, system sans-serif UI font, JetBrains Mono in editor |
| SVG overlay for pointer arrows | Visual clarity of C memory model — pointer relationships unambiguous | Shipped in Phase 3 — Bezier curves, arrowheads, data-address anchoring, scroll re-render |

---
*Last updated: 2026-03-21 — Phase 3 complete*
