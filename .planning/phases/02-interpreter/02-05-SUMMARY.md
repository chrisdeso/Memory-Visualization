---
phase: 02-interpreter
plan: 05
subsystem: interpreter-worker
tags: [web-worker, interpreter, app-wiring, error-handling]
dependency_graph:
  requires: [02-04]
  provides: [worker-protocol, run-button, error-banner, live-execution]
  affects: [App.ts, interpreter/worker.ts, interpreter/types.ts]
tech_stack:
  added: []
  patterns: [Web Worker with new URL(), terminated-flag timeout guard, discriminated union WorkerResult]
key_files:
  created:
    - src/interpreter/types.ts
    - src/interpreter/worker.ts
    - src/interpreter/worker-protocol.test.ts
  modified:
    - src/App.ts
    - src/styles/main.css
    - src/interpreter/lexer.ts
    - src/interpreter/parser.ts
    - src/interpreter/lexer.test.ts
    - src/interpreter/parser.test.ts
decisions:
  - "Worker created fresh per Run click (new URL pattern) — avoids state leakage across runs"
  - "terminated flag guards against late messages after worker.terminate() race condition"
  - "Worker protocol tests use extracted handler function (not real Worker) — avoids Pitfall 4 vitest/Worker incompatibility"
  - "App starts with empty state (no demo trace) — user must click Run to populate panels"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_changed: 8
---

# Phase 02 Plan 05: Worker Integration and Run Button Summary

**One-liner:** Web Worker wrapping interpret() with 5s timeout guard, Run button, and red error banner with partial trace preservation.

## What Was Built

### Task 1: Worker protocol types, Web Worker entry point, and protocol tests (ad75702)

- `src/interpreter/types.ts` — `WorkerRequest` and `WorkerResult` discriminated union protocol types
- `src/interpreter/worker.ts` — thin Web Worker entry point: receives `{source}`, calls `interpret()`, posts `WorkerResult` back
- `src/interpreter/worker-protocol.test.ts` — 9 tests covering handler logic, timeout guard, terminated flag, and discriminated union type safety

### Task 2: App.ts Run button, worker integration, error banner (e67d23b)

- `src/App.ts` — Run button in toolbar, `runProgram()` method with Web Worker lifecycle, `showErrorBanner`/`hideErrorBanner`, empty state on load
- `src/styles/main.css` — `.error-banner` (red left border, light red background), `#btn-run` (green button)

## Decisions Made

- **New Worker per run:** A fresh worker is created on every Run click. This avoids state leakage and makes `worker.terminate()` unconditionally safe.
- **terminated flag:** A boolean `terminated` guards `worker.onmessage` against late messages received after the timeout fires and calls `worker.terminate()` — per Research Pitfall 3.
- **new URL() pattern over ?worker suffix:** Used `new Worker(new URL('./interpreter/worker.ts', import.meta.url), {type:'module'})` for better cross-browser reliability.
- **Handler function extracted for testing:** `worker.ts` is intentionally thin. The handler logic is replicated as a pure function in the test file to avoid vitest/Worker incompatibility (Research Pitfall 4).
- **Empty state on app load:** Removed `demoTrace` fixture loading. User clicks Run to populate panels with live execution state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing TypeScript errors blocking `npm run build`**
- **Found during:** Task 2 build verification
- **Issue:** `noUncheckedIndexedAccess: true` in tsconfig caused `string | undefined` and `Token | undefined` errors in `lexer.ts`, `parser.ts`, and their test files — blocking `tsc && vite build`
- **Fix:** Added `?? ''` null-coalescing to `lexer.ts` advance(), added `!` non-null assertions to `parser.ts` peek/advance/isTypeTokenAt/isCastLookAhead, added `!` to all direct array element accesses in both test files
- **Files modified:** `src/interpreter/lexer.ts`, `src/interpreter/parser.ts`, `src/interpreter/lexer.test.ts`, `src/interpreter/parser.test.ts`
- **Commit:** e67d23b

**2. [Rule 1 - Bug] Fixed App.ts `lineMatch[1]` possibly undefined**
- **Found during:** Task 2 TypeScript check
- **Issue:** `lineMatch[1]` is `string | undefined` with `noUncheckedIndexedAccess`
- **Fix:** Added `lineMatch[1] !== undefined` guard before `parseInt`
- **Files modified:** `src/App.ts`
- **Commit:** e67d23b

## Verification Results

- `npm test -- src/interpreter/worker-protocol.test.ts`: 9/9 tests pass
- `npm test`: 159/159 tests pass (all suites)
- `npm run build`: succeeds — Vite bundles worker as separate chunk (`dist/assets/worker-B6_EUUTv.js`)
- `npx tsc --noEmit`: zero errors

## Self-Check: PASSED

- All 5 key files exist on disk
- Both task commits verified: ad75702, e67d23b
- 159 tests pass, build succeeds
