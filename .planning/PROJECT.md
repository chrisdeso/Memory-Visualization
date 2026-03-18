# Memory Visualizer

## What This Is

An interactive browser-based tool that lets users write C/C++ code in a Monaco editor and watch memory allocation, stack frames, pointers, and registers come to life as they step through execution. Built as both a CS education tool and a portfolio showcase piece.

## Core Value

Users write real-looking C code, step through it, and see exactly what's happening in memory — stack, heap, and pointers — without needing any server or build step.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Monaco editor for writing C/C++ code in the browser
- [ ] In-browser C interpreter/simulator that generates execution trace dynamically
- [ ] Step-through execution: line-by-line and statement-by-statement modes
- [ ] Stack frame visualization (function calls, local variables, return addresses)
- [ ] Heap visualization (malloc/free blocks, simulated)
- [ ] Pointer visualization (arrows from pointer variables to targets)
- [ ] Register/program state display (PC, SP, simplified CPU state)
- [ ] Side-by-side layout (editor left, visualization right)
- [ ] Replace existing static trace.json approach entirely

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
- **Execution model**: C interpreter must run in-browser (WASM or pure JS)
- **Existing code**: Full replacement — not extending the current trace.json pipeline

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monaco editor | Industry-standard, syntax highlighting, familiar UX | — Pending |
| Simulated C interpreter (browser) | No server dependency, portable, self-contained | — Pending |
| Side-by-side layout | Code and memory visible simultaneously during stepping | — Pending |
| Replace entirely (not extend) | Clean architecture, no legacy trace.json coupling | — Pending |

---
*Last updated: 2026-03-18 after initialization*
