# Architecture

**Analysis Date:** 2026-03-18

## Pattern Overview

**Overall:** Model-View-Controller (MVC) with data serialization pipeline

**Key Characteristics:**
- Separation between data generation (trace) and visualization (web client)
- Frontend-focused visualization with D3.js for interactive memory diagrams
- JSON as the canonical data exchange format between trace generation and rendering
- Modular visualization components for different memory regions (stack, heap, static)

## Layers

**Backend / Trace Generation Layer (C++):**
- Purpose: Instrument user programs to capture memory state at each execution step
- Location: Not present in current codebase (referenced in architecture.md docs but C++ code removed)
- Contains: Memory tracking logic, function call hooks, memory operation wrappers
- Depends on: User C++ program with memory operations
- Used by: Produces trace.json consumed by frontend

**Data Serialization Layer:**
- Purpose: Convert in-memory trace data to JSON format for web consumption
- Location: Generated trace.json file (not in repo, created at runtime)
- Contains: Step-by-step memory state snapshots
- Depends on: Backend trace generation
- Used by: Web frontend visualization

**Frontend / Visualization Layer:**
- Purpose: Display memory state through interactive UI components
- Location: `web/index.html`, `web/js/` directory
- Contains: HTML markup, CSS styling, JavaScript controllers and visualizations
- Depends on: trace.json, D3.js library
- Used by: Web browsers via HTTP

## Data Flow

**Program Execution to Visualization:**

1. User C++ program runs with instrumentation hooks
2. Memory operations (allocation, deallocation, variable assignment) trigger callbacks
3. Backend captures stack frames, heap blocks, static variables at each step
4. Backend serializes memory state to `trace.json` with source code mapping
5. Web server serves `index.html` and JavaScript modules
6. Browser loads trace.json via fetch() in `visualization.js`
7. `controller.js` or inline script in `index.html` parses trace.json
8. Visualization components (`HeapVisualization`, `StackVisualization`, `StaticsVisualization`) render memory regions
9. User navigates timeline with Previous/Next/Reset buttons
10. Current step index updates all visualizations to show memory state at that execution point

**State Management:**
- Global state in `controller.js`: `steps` array, `currentStep` index
- Or inline state in `index.html`: `currentStep`, `traceData`, `sourceCode`
- Trigger for updates: Button clicks (prev/next/reset) update `currentStep` then call `renderStep()` or `updateDisplay()`
- Memory regions re-render entirely on each step change (no diffing or incremental updates)

## Key Abstractions

**MemoryRegion:**
- Purpose: Represents a contiguous memory area (stack, heap, or static segment)
- Examples: `StackVisualization`, `HeapVisualization`, `StaticsVisualization` classes
- Pattern: Each region is a class that renders a table with name/address/value columns, color-coded by memory region type

**VisualizationComponent:**
- Purpose: Encapsulates rendering logic for a specific memory region
- Examples: `HeapVisualization`, `StackVisualization`, `StaticsVisualization`
- Pattern: Constructor takes containerId (CSS selector), `initTable()` initializes DOM structure, `update(data)` re-renders with new memory state

**TraceData Structure:**
- Purpose: Standard JSON format for serializing execution trace
- Structure: `{ steps: [{ line_number, description, code, stack, static, heap }] }`
- OR: `{ steps: [{ step, desc, code (array), highlight, stack (HTML), static (HTML), heap (HTML) }] }`

**Timeline Navigation:**
- Purpose: Controls progress through memory state sequence
- Examples: `TimelineNavigation`, `TimelineNavigation` (note: two versions in codebase)
- Pattern: Manages currentIndex, enforces bounds, triggers callbacks on state change

## Entry Points

**`web/index.html`:**
- Location: `web/index.html`
- Triggers: Page load (DOMContentLoaded)
- Responsibilities:
  - Inline script parses trace.json
  - Sets up event listeners for navigation buttons
  - Renders initial memory state
  - Provides rendering functions: `createMemoryRegion()`, `createMemoryTable()`

**Alternative: `controller.js` Pattern:**
- Location: `web/js/controller.js`
- Triggers: DOMContentLoaded
- Responsibilities:
  - Loads trace.json
  - Manages step array and current step
  - Provides renderStep() function for re-rendering all UI elements

**Alternative: `visualization.js` Pattern:**
- Location: `web/js/visualization.js`
- Triggers: DOMContentLoaded
- Responsibilities:
  - Instantiates visualization component classes
  - Loads trace.json
  - Calls update() on each component when current time changes

## Error Handling

**Strategy:** Minimal error handling present; assumes well-formed trace.json

**Patterns:**
- `controller.js`: try-catch on fetch, falls back to empty steps array, shows error message in UI
- `visualization.js`: console.error on load failure, continues silently without visualization
- `index.html`: fetch().catch() logs error, tries to continue

## Cross-Cutting Concerns

**Logging:** Not implemented; uses console.error for debugging only

**Validation:** No validation of trace.json structure; assumes conformance to expected format

**Authentication:** Not applicable (client-side visualization tool)

**Code Highlighting:** Implemented in both patterns - compares step.line_number or step.highlight to mark current execution line in code display

**Memory Region Color Coding:**
- Stack: Pink (#e91e63, #ffebee background)
- Static/Global: Orange (#ff9800, #fff3e0 background)
- Heap: Blue (#2196f3, #e3f2fd background)
- Highlights: Orange/yellow (#ffe0b2) for current line

---

*Architecture analysis: 2026-03-18*
