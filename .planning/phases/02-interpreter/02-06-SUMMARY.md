---
phase: 02-interpreter
plan: 06
subsystem: ui
tags: [auto-play, setInterval, vitest, fake-timers, syntax-reference, collapsible-panel]

# Dependency graph
requires:
  - phase: 02-interpreter
    provides: App.ts with RunProgram, error banner, and step controls (Plan 05)
  - phase: 02-interpreter
    provides: ExecutionState.stepForward/stepBackward/currentIndex/stepCount (Plan 01)
provides:
  - AutoPlayController class with startPlay/stopPlay/togglePlay and PLAY_SPEEDS presets
  - Play/Pause button and Speed selector in App toolbar
  - SyntaxReference collapsible panel showing full supported C++ subset
  - 6 unit tests for auto-play behavioral correctness (vitest fake timers)
  - Bug fixes: segfault detection in Memory.store/load, class size calculation, syntax-ref DOM placement
  - Phase 2 browser-verified end-to-end (Run, Play, Step, Error banner, Syntax reference all working)
affects: [03-polish, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AutoPlayController extracted from App for DOM-independent testability"
    - "vi.useFakeTimers() + setInterval spy for timing-dependent unit tests"
    - "PlayableState interface for state duck-typing in controller"

key-files:
  created:
    - src/interpreter/AutoPlayController.ts
    - src/interpreter/autoplay.test.ts
    - src/components/SyntaxReference.ts
  modified:
    - src/App.ts
    - src/styles/main.css
    - src/interpreter/memory.ts
    - src/interpreter/evaluator.ts

key-decisions:
  - "AutoPlayController extracted as standalone class (not inlined in App) to enable DOM-independent unit tests with fake timers"
  - "PlayableState interface (stepForward, currentIndex, stepCount) allows mock injection in tests without full ExecutionState"
  - "SyntaxReference placed in viz-pane below registers panel — scrollable, collapsible, does not affect core viz layout"
  - "Memory.store/load guard with isValidAddress to throw segfault errors rather than silent corruption"
  - "Class stack vars use computed member field sizes instead of fixed 4 bytes"

patterns-established:
  - "Controller extraction pattern: extract logic with side effects (setInterval) into testable class with injected dependencies"

requirements-completed: [EXEC-05]

# Metrics
duration: 25min
completed: 2026-03-20
---

# Phase 2 Plan 6: Auto-Play Controls and Syntax Reference Summary

**setInterval-based auto-play with Slow/Medium/Fast presets and collapsible in-app C++ syntax reference panel — Phase 2 UI complete**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-20T18:48:18Z
- **Completed:** 2026-03-20T19:14:00Z
- **Tasks:** 3 of 3 (Task 3 human-verify: approved by user)
- **Files modified:** 7

## Accomplishments
- Auto-play controller with Slow (1000ms), Medium (400ms), Fast (100ms) speed presets — user can play through full trace hands-free
- Play/Pause button toggles correctly; speed selector restarts interval at new speed; manual Back/Forward/Reset/Run all stop auto-play
- SyntaxReference collapsible panel shows 9 sections: Types, Pointers, Arrays, Control Flow, Functions, Classes, STL Containers, Operators, Not Supported
- 6 unit tests using vi.useFakeTimers() verify all auto-play behavior: interval ticking, stop, auto-stop at end, speed delay, togglePlay, empty-trace guard

## Task Commits

Each task was committed atomically:

1. **Task 1: Auto-play controls with speed presets and unit tests** - `cc72be4` (feat)
2. **Task 2: In-app syntax reference panel** - `5d62ccc` (feat)
3. **Task 3: Browser verification bug fixes** - `4963a48` (fix) — applied after human-verify approved

## Files Created/Modified
- `src/interpreter/AutoPlayController.ts` - AutoPlayController class with PLAY_SPEEDS, PlayableState interface, startPlay/stopPlay/togglePlay
- `src/interpreter/autoplay.test.ts` - 6 unit tests for auto-play behavioral correctness
- `src/components/SyntaxReference.ts` - Collapsible syntax reference showing full supported C++ subset
- `src/App.ts` - Added play button, speed selector, SyntaxReference component, auto-play stop on manual actions, Ctrl+S shortcut, fixed syntax-ref DOM nesting
- `src/styles/main.css` - Styles for #btn-play, #speed-select, and all .syntax-ref-* classes; removed clipping overflow from syntax-ref-body
- `src/interpreter/memory.ts` - Added isValidAddress guard in store/load for segfault detection
- `src/interpreter/evaluator.ts` - Compute class member sizes from field declarations instead of fixed 4 bytes

## Decisions Made
- **AutoPlayController extracted as standalone class** — enables DOM-independent unit testing with vi.useFakeTimers(); inlining in App would require mocking the entire App DOM
- **PlayableState interface for mock injection** — duck-typed interface (stepForward, currentIndex, stepCount) lets tests provide lightweight mock state without importing ExecutionState
- **SyntaxReference in viz-pane below registers** — collapsible so it doesn't consume fixed vertical space; placement keeps all C++ reference near the visualization context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Created AutoPlayController.ts as extracted class**
- **Found during:** Task 1 (auto-play implementation)
- **Issue:** Plan noted "extracted-class approach is preferred for testability" — followed this recommendation
- **Fix:** Created `src/interpreter/AutoPlayController.ts` with `PlayableState` interface instead of inlining in App.ts
- **Files modified:** src/interpreter/AutoPlayController.ts (new)
- **Verification:** All 6 tests pass with mock state injection
- **Committed in:** cc72be4 (Task 1 commit)

---

**Total deviations:** 1 (following plan's recommended approach, not truly a deviation)
**Impact on plan:** AutoPlayController extraction is cleaner and exactly what the plan recommended. No scope creep.

## Deviations from Plan

### Auto-fixed Issues (post human-verify)

**1. [Rule 1 - Bug] Fixed segfault-silent-corruption in Memory.store/load**
- **Found during:** Task 3 (browser verification)
- **Issue:** Writing to an invalid address silently inserted into values map with no error, making debugging impossible
- **Fix:** Added isValidAddress guard in store() and load() to throw descriptive runtime segfault error messages
- **Files modified:** src/interpreter/memory.ts
- **Verification:** All 165 tests pass
- **Committed in:** 4963a48

**2. [Rule 1 - Bug] Fixed class stack variable allocated with wrong size**
- **Found during:** Task 3 (browser verification)
- **Issue:** Stack-allocated class objects used hardcoded 4-byte size regardless of member count
- **Fix:** Computed classSize by summing member field sizes (Math.max(typeSizeOf(field), 4) per field)
- **Files modified:** src/interpreter/evaluator.ts
- **Verification:** All 165 tests pass; class addresses no longer overlap
- **Committed in:** 4963a48

**3. [Rule 1 - Bug] Fixed syntax-ref DOM nesting and CSS scroll clipping**
- **Found during:** Task 3 (browser verification)
- **Issue:** syntax-ref container was outside registers-panel div (broken layout); max-height clipped content
- **Fix:** Moved #syntax-ref inside registers-panel div; removed max-height/overflow-y from .syntax-ref-body
- **Files modified:** src/App.ts, src/styles/main.css
- **Verification:** Build passes, renders at correct position
- **Committed in:** 4963a48

---

**Total deviations:** 3 auto-fixed post-verification (all Rule 1 - Bug)
**Impact on plan:** All fixes necessary for correct operation. No scope creep.

## Issues Encountered
- Task 1 `App.ts` imported `SyntaxReference` (Task 2's file) before it existed, causing `npm run build` to fail on Task 1's changes. Resolution: implemented both tasks before Task 1 commit, then committed them separately. Build succeeds after both commits.
- Browser verification revealed three bugs (segfault detection, class sizing, DOM nesting) fixed in `4963a48`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 complete: Run, Step Forward/Back, Reset, Auto-Play, Error Banner, Syntax Reference all verified in browser
- All 165 tests pass; build succeeds
- Phase 3 (polish) ready to begin
- No blockers

---
*Phase: 02-interpreter*
*Completed: 2026-03-20*
