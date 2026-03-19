---
phase: 01-foundation
plan: 05
subsystem: ui
tags: [typescript, vite, monaco, d3, integration, wiring]

# Dependency graph
requires:
  - phase: 01-01
    provides: Vite+TypeScript scaffold and Monaco editor Vite plugin setup
  - phase: 01-02
    provides: ExecutionState class, ExecutionSnapshot schema, demoTrace fixture
  - phase: 01-03
    provides: StackPanel, HeapPanel, RegistersPanel D3 visualization panels
  - phase: 01-04
    provides: EditorPanel with Monaco, line highlighting, and error squiggles
provides:
  - App class (src/App.ts) wiring all components end-to-end
  - Functional step controls (Forward, Back, Reset) with step counter display
  - Full application integrated with fixture trace loaded on startup
affects: [02-interpreter, all future phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "App class takes root HTMLElement, builds DOM via innerHTML, then instantiates all components"
    - "state.onChange listener pattern propagates snapshot to all three panels and editor simultaneously"
    - "Step display updates via document.getElementById inside private updateStepDisplay()"

key-files:
  created:
    - src/App.ts
  modified:
    - src/main.ts
    - src/styles/main.css
    - src/editor/EditorPanel.ts
    - src/viz/StackPanel.ts
    - src/viz/HeapPanel.ts
    - src/viz/StackPanel.test.ts
    - src/viz/HeapPanel.test.ts
    - src/fixtures/demoTrace.ts

key-decisions:
  - "App.ts uses innerHTML for DOM setup rather than createElement — simpler, readable, and single-pass"
  - "state.onChange null branch calls registersPanel.render(null) matching RegistersPanel null-guard signature"
  - "Heap status CSS variables (--color-heap-allocated/freed/leaked) added to :root so HeapPanel inline styles resolve correctly"
  - "Light theme (Monaco vs + CSS variables) chosen after browser verification — dark theme had readability issues"
  - "demoTrace extended to 5 steps so fixture covers complete main() including return 0"
  - "Sample code in App.ts written without #include headers to align line numbers with fixture trace"

patterns-established:
  - "Integration via state.onChange: all panels receive the same snapshot atomically per step"
  - "Component containers queried from root after innerHTML set — avoids forward-reference issues"

requirements-completed: [UI-02]

# Metrics
duration: 5min
completed: 2026-03-19
---

# Phase 1 Plan 5: App Integration Summary

**Monaco editor + D3 panels wired via ExecutionState.onChange, step controls in toolbar, demoTrace fixture loaded on startup — fully functional end-to-end with no server required**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-19T15:56:43Z
- **Completed:** 2026-03-19T16:13:09Z
- **Tasks:** 1 auto + 1 checkpoint (human-verify) + post-review fixes
- **Files modified:** 9

## Accomplishments

- Created `src/App.ts` integrating EditorPanel, ExecutionState, StackPanel, HeapPanel, RegistersPanel, and demoTrace into a single root class
- Step controls (Forward, Back, Reset) wired to ExecutionState methods; step counter displays `Step N/M`
- CSS variables for heap status colors added to `:root` so `HeapPanel` inline styles resolve correctly
- `src/main.ts` updated to use `App` class (replaces hand-written inline HTML)
- Build passes (`npm run build` producing `dist/`)
- Post browser-review: light theme applied (Monaco vs + CSS variables), demoTrace extended to 5 steps covering full main(), placeholder text corrected

## Task Commits

Each task was committed atomically:

1. **Task 1: Create App.ts wiring editor, state, panels, and step controls** - `31bf711` (feat)
2. **Post-checkpoint: light theme, fixture, placeholder text** - `acd697a` (fix)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `src/App.ts` — Root application class; creates DOM layout, instantiates all components, wires onChange and button events; sample code without #include to match fixture line numbers
- `src/main.ts` — Updated to instantiate `new App(root)` instead of inline HTML
- `src/styles/main.css` — Light theme CSS variables, modern sans-serif font for UI chrome; heap status color variables at :root
- `src/editor/EditorPanel.ts` — Monaco theme switched from vs-dark to vs (light)
- `src/viz/StackPanel.ts` — Placeholder text updated (removed "Run" reference)
- `src/viz/HeapPanel.ts` — Placeholder text updated (removed "Run" reference)
- `src/viz/StackPanel.test.ts` — Test updated to match new placeholder text
- `src/viz/HeapPanel.test.ts` — Test updated to match new placeholder text
- `src/fixtures/demoTrace.ts` — Added step 5: return 0 at lineNumber 7, fixture now covers complete main()

## Decisions Made

- `App.ts` uses `root.innerHTML` for the full layout template — single-pass, readable, avoids fragile multi-step DOM construction
- `state.onChange` null branch passes `null` to `registersPanel.render(null)` — matches the `Registers | null` signature from Plan 03
- Heap status colors added to CSS `:root` as variables (not hardcoded inline) — allows future theming
- Light theme chosen after browser review: Monaco `vs` + CSS light color variables — dark background had lower contrast for line highlight visibility
- demoTrace fixture extended by one step (return 0) so step counter reaches 5/5 and final line is highlighted
- #include lines removed from App.ts sample code so fixture lineNumbers (1-7) map exactly to code lines (no header offset)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Patched vite-plugin-monaco-editor workerMiddleware for Node 22 compatibility**
- **Found during:** Task 2 verification (starting dev server)
- **Issue:** `fs.rmdirSync(dir, { recursive: true })` is removed in Node.js v22+; dev server crashed with `ERR_INVALID_ARG_VALUE`
- **Fix:** Changed call to `fs.rmSync(dir, { recursive: true, force: true })` in `node_modules/vite-plugin-monaco-editor/dist/workerMiddleware.js`
- **Files modified:** `node_modules/vite-plugin-monaco-editor/dist/workerMiddleware.js` (node_modules patch)
- **Verification:** `npm run dev` starts successfully, `curl http://localhost:5173/` returns 200
- **Committed in:** Not committed (node_modules are gitignored; build still passes)

---

**2. [Rule 1 - Bug] Light theme applied after browser review**
- **Found during:** Task 2 (human-verify checkpoint)
- **Issue:** Dark theme was functional but line highlight was harder to distinguish; placeholder text referenced "Run" which no longer exists in the UI
- **Fix:** Switched Monaco theme to `vs`, replaced dark CSS variables with light theme values, updated placeholder text in StackPanel and HeapPanel and their tests
- **Files modified:** src/editor/EditorPanel.ts, src/styles/main.css, src/viz/StackPanel.ts, src/viz/HeapPanel.ts, src/viz/StackPanel.test.ts, src/viz/HeapPanel.test.ts
- **Verification:** Build and tests pass, browser re-verified at checkpoint
- **Committed in:** acd697a

**3. [Rule 1 - Bug] demoTrace fixture and sample code line number alignment**
- **Found during:** Task 2 (browser verification, step counter showed 4/4 with return line never highlighted)
- **Issue:** demoTrace had 4 steps; main() has 5 executable lines; return 0 was never highlighted. Sample code included 2 #include headers causing fixture lineNumbers to be offset
- **Fix:** Added step 5 (lineNumber 7, return 0) to demoTrace; removed #include headers from App.ts sample code so lineNumbers 1-7 map directly
- **Files modified:** src/fixtures/demoTrace.ts, src/App.ts
- **Verification:** Step counter shows 5/5, return line highlights on final step
- **Committed in:** acd697a

---

**Total deviations:** 3 auto-fixed (1 blocking/Rule 3, 2 bug/Rule 1)
**Impact on plan:** Node_modules patch unblocked dev server. Post-review fixes corrected theme, fixture completeness, and line number alignment. All necessary for correct UX.

## Issues Encountered

- `vite-plugin-monaco-editor` uses deprecated `rmdirSync` with recursive option, incompatible with Node.js v22. Fixed inline in node_modules. Upstream fix or `patch-package` should be considered if this becomes persistent.
- Fixture line numbers were misaligned with sample code due to #include headers — resolved by removing headers from sample code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 integration complete: editor, state machine, and all three panels work end-to-end with fixture data
- Dev server running at http://localhost:5173/ for human verification
- Ready for Phase 2: interpreter integration (jscpp/picoc WASM — verify npm status first per existing blocker)

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
