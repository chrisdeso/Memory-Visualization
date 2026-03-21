---
phase: 03-pointer-visualization
plan: "03"
subsystem: ui
tags: [svg, bezier, arrows, pointer-visualization, typescript, vitest]

# Dependency graph
requires:
  - phase: 03-pointer-visualization-01
    provides: data-address attrs on .stack-local-row elements for arrow anchoring
  - phase: 03-pointer-visualization-02
    provides: data-address attrs on .heap-block elements for arrow anchoring
provides:
  - SVG Bezier-curve arrow overlay (PointerArrowOverlay) connecting stack pointer vars to heap blocks
  - Scroll listener re-rendering for arrows when stack/heap panels scroll
  - Diff params (previousSnapshot) wired into StackPanel.render() and HeapPanel.render()
  - position:relative on .viz-pane enabling SVG absolute positioning
  - RegistersPanel VIZ-04 compliance verified (no changes needed)
affects: [04-ui-polish, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SVG overlay positioned absolute over container with pointer-events:none prevents blocking mouse events
    - Render panels before overlay in onChange so data-address attrs exist when overlay queries them
    - addScrollListener() pattern for re-rendering overlay on panel scroll using closure over current state
    - destroy() cleanup pattern removes all scroll listeners and removes SVG from DOM

key-files:
  created:
    - src/viz/PointerArrowOverlay.ts
    - src/viz/PointerArrowOverlay.test.ts
  modified:
    - src/App.ts
    - src/styles/main.css

key-decisions:
  - "PointerArrowOverlay queries data-address attrs via getBoundingClientRect for coordinate-free anchoring"
  - "SVG paths cleared by querySelectorAll('path').forEach(remove) preserving defs/marker element"
  - "Scroll listeners use closure over () => this.state.current?.pointers ?? [] for live pointer access"
  - "overlay.render() called after panel renders in onChange to guarantee data-address attrs in DOM"
  - "position:relative declared in CSS (.viz-pane) as authoritative; PointerArrowOverlay also sets it defensively"

patterns-established:
  - "Pattern: DOM-attribute anchoring for SVG overlays — query data-address from live DOM, no coordinate pre-computation"
  - "Pattern: Render-order dependency — panels before overlay ensures DOM is ready for querySelector"

requirements-completed: [VIZ-03, VIZ-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 03 Plan 03: Pointer Arrow Overlay Summary

**SVG Bezier-curve arrow overlay with blue (#2563eb) arrowheads connecting stack pointer variables to heap block targets, wired into App.ts with diff params and scroll re-rendering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T19:29:47Z
- **Completed:** 2026-03-21T19:32:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created PointerArrowOverlay with SVG Bezier curves, arrowhead markers, pointer-events:none, and scroll listener support
- Wired overlay into App.ts: instantiation, scroll listeners on stack/heap panels, render after panel updates
- Passed previousSnapshot diff params to StackPanel.render() and HeapPanel.render() in onChange
- Added `position: relative` to .viz-pane CSS for SVG absolute positioning
- Verified RegistersPanel is VIZ-04 compliant (PC as "line N", SP as "0x{hex}") — no changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PointerArrowOverlay component with SVG Bezier arrows** - `49bd910` (feat + test, TDD)
2. **Task 2: Wire PointerArrowOverlay and diff params into App.ts, polish RegistersPanel** - `30f13fc` (feat)

**Plan metadata:** _(docs commit follows)_

_Note: Task 1 used TDD — tests written first (RED), implementation then made them pass (GREEN)._

## Files Created/Modified
- `src/viz/PointerArrowOverlay.ts` - SVG overlay component: Bezier paths, arrowhead defs, scroll listeners, destroy()
- `src/viz/PointerArrowOverlay.test.ts` - 9 unit tests covering structure, render, edge cases, cleanup
- `src/App.ts` - Import + instantiate overlay, scroll listeners, diff params, overlay.render() in onChange
- `src/styles/main.css` - Added `position: relative` to .viz-pane rule

## Decisions Made
- SVG defs/marker preserved between render calls by only removing `path` elements (not `defs`)
- Scroll listeners use `() => this.state.current?.pointers ?? []` closure for live pointer list
- RegistersPanel left unchanged — already shows PC as "line N" and SP as "0x{hex}" per VIZ-04
- Pre-existing TypeScript strict errors in StackPanel.test.ts (two `possibly 'undefined'` in test file) documented as out-of-scope; not introduced by this plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript strict errors in `src/viz/StackPanel.test.ts` lines 102 and 110 (`NodeListOf` index access possibly undefined). These existed before this plan and are not caused by changes here. Logged as out-of-scope; `npm test` passes fully (189/189 tests).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 3 requirements (VIZ-01 through VIZ-04) are now implemented
- SVG arrows will render live once interpreter emits PointerLink data in snapshots
- Phase 4 (UI polish) can proceed; viz-pane positioning and overlay infrastructure are in place

## Self-Check: PASSED

- FOUND: src/viz/PointerArrowOverlay.ts
- FOUND: src/viz/PointerArrowOverlay.test.ts
- FOUND: .planning/phases/03-pointer-visualization/03-03-SUMMARY.md
- FOUND commit: 49bd910 (Task 1)
- FOUND commit: 30f13fc (Task 2)

---
*Phase: 03-pointer-visualization*
*Completed: 2026-03-21*
