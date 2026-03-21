---
phase: 03-pointer-visualization
plan: 01
subsystem: ui
tags: [d3, stack-panel, diff-highlighting, data-address, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-interpreter
    provides: ExecutionSnapshot schema with flat integer addresses and StackFrame/LocalVar types
provides:
  - StackPanel with frame boundary dividers, return address rows, data-address attrs, diff highlight
  - ExecutionState.previousSnapshot getter for diff computation
  - CSS --color-diff-highlight variable for step change highlighting
affects: [03-02, 03-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "changedAddrs Set pattern: compare current vs prevLocals by address, collect changed addresses before rendering"
    - "data-address attribute stamps enable SVG arrow anchoring without DOM coordinate queries"
    - "jsdom color normalization: test assertions use regex to accept both hex and rgb() forms"

key-files:
  created: []
  modified:
    - src/viz/StackPanel.ts
    - src/viz/StackPanel.test.ts
    - src/state/ExecutionState.ts
    - src/styles/main.css

key-decisions:
  - "render() second parameter prevFrames defaults to [] — backward compatible, callers pass state.previousSnapshot?.stack"
  - "changedAddrs built from address-keyed lookup (not name) — addresses are stable unique identifiers across steps"
  - "Test 5 border-top assertion uses regex to handle jsdom hex-to-rgb() color normalization"

patterns-established:
  - "Frame boundary: border-top 1px solid #d0d0d0 on .stack-frame, NOT border-bottom — avoids double-border between frames"
  - "Return addr: em dash (\u2014) when returnAddr === 0 (main frame convention)"

requirements-completed: [VIZ-01]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 03 Plan 01: Stack Panel Frame Boundaries and Diff Highlighting Summary

**StackPanel refined with frame boundary dividers, return address rows, data-address attrs for SVG anchoring, and step-diff yellow highlighting via changedAddrs set computed from previousSnapshot**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-21T19:21:13Z
- **Completed:** 2026-03-21T19:23:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- ExecutionState.previousSnapshot getter allows panels to compute what changed between steps
- StackPanel.render() accepts optional prevFrames and highlights changed locals with yellow background
- Every local variable row has data-address attribute enabling Plan 03-03 SVG pointer arrows to anchor to DOM elements
- Frame headers now show uppercase bold function names with stack-border color and a return address row (hex or em dash for main)
- All 180 tests pass including 8 new StackPanel tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add previousSnapshot getter and --color-diff-highlight CSS variable** - `58e70e2` (feat)
2. **Task 2 RED: Add failing tests for StackPanel refinements** - `f4423ff` (test)
3. **Task 2 GREEN: Implement refined StackPanel** - `623dcf8` (feat)

## Files Created/Modified

- `src/state/ExecutionState.ts` - Added previousSnapshot getter returning trace[index-1] ?? null
- `src/styles/main.css` - Added --color-diff-highlight: rgba(255, 200, 0, 0.35) to :root
- `src/viz/StackPanel.ts` - Refined render() with prevFrames param, changedAddrs, frame boundaries, return addr row, data-address attrs
- `src/viz/StackPanel.test.ts` - Added Tests 5-12 covering all new behaviors; changed sampleFrames main.returnAddr to 0

## Decisions Made

- render() second parameter `prevFrames` defaults to `[]` — backward compatible; callers supply `state.previousSnapshot?.stack ?? []`
- changedAddrs keyed by address (not name) — addresses are stable unique identifiers across execution steps
- Test border-top assertion uses regex to accept both `#d0d0d0` and jsdom-normalized `rgb(208, 208, 208)` forms

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Test 5 assertion to handle jsdom color normalization**
- **Found during:** Task 2 GREEN (StackPanel implementation)
- **Issue:** jsdom normalizes `#d0d0d0` to `rgb(208, 208, 208)` in style properties; test expected exact hex string
- **Fix:** Changed `toBe('1px solid #d0d0d0')` to `.toMatch(/1px solid (#d0d0d0|rgb\(208, 208, 208\))/)`
- **Files modified:** src/viz/StackPanel.test.ts
- **Verification:** All 12 StackPanel tests pass after fix
- **Committed in:** 623dcf8 (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test assertion)
**Impact on plan:** Minor test correctness fix. No scope changes.

## Issues Encountered

None beyond the jsdom color normalization handled above.

## Next Phase Readiness

- data-address attributes are on every .stack-local-row — Plan 03-03 SVG arrows can use `querySelector('[data-address="..."]')` to find anchor elements
- previousSnapshot getter ready for App.ts to pass `state.previousSnapshot?.stack ?? []` to StackPanel.render()
- CSS --color-diff-highlight ready for HeapPanel to use in Plan 03-02

---
*Phase: 03-pointer-visualization*
*Completed: 2026-03-21*
