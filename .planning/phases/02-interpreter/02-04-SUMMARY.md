---
phase: 02-interpreter
plan: 04
subsystem: interpreter
tags: [typescript, c++, classes, stl, vector, string, array, evaluator, tdd]

# Dependency graph
requires:
  - phase: 02-interpreter
    provides: "02-03 — tree-walk evaluator with Memory model, snapshot production, malloc/free"
provides:
  - "StdLib simulation module (StdVector, StdString, StdArray) with heap integration"
  - "Extended evaluator: C++ classes with constructors/destructors producing execution steps"
  - "new/delete lifecycle with constructor/destructor step visibility"
  - "Member access (obj.member and ptr->member) for class instances"
  - "Raw C array bounds checking using arrayBounds map"
affects:
  - 03-visualization
  - 04-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "STL facade pattern: StdLib.callMethod dispatches to StdVector/StdString/StdArray"
    - "ClassInstance runtime type: address -> Map<memberName, address>"
    - "invokeMethod binds this + member addresses into scope before executing function body"
    - "arrayBounds Map enables bounds checking without per-element tracking"
    - "lvalue-based array base lookup: evalArrayAccess uses evalLValue not evalExpr for stack arrays"

key-files:
  created:
    - src/interpreter/stdlib.ts
  modified:
    - src/interpreter/evaluator.ts
    - src/interpreter/evaluator.test.ts

key-decisions:
  - "ClassInstance stores member name -> address map; invokeMethod binds members directly into scope so constructor body can assign x = a without this-> prefix"
  - "Array base address retrieved via evalLValue (env address) not evalExpr (stored value) — critical for bounds detection; stack array variable address IS the base address"
  - "StdLib.callMethod facade centralizes dispatch: evaluator never calls vector/string/array methods directly"

patterns-established:
  - "TDD: RED commit (test) -> GREEN commit (feat) pattern maintained"
  - "Signal class pattern (ReturnSignal/BreakSignal/ContinueSignal) for control flow through throw/catch"

requirements-completed: [EXEC-07]

# Metrics
duration: 12min
completed: 2026-03-20
---

# Phase 2 Plan 4: C++ Classes and STL Support Summary

**C++ class evaluator with constructors/destructors producing execution steps, heap-integrated STL simulation (vector/string/array), and bounds-checked raw C arrays — all 37 tests pass**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-20T13:30:00Z
- **Completed:** 2026-03-20T13:34:00Z
- **Tasks:** 2 (Task 1 prior session, Task 2 this session)
- **Files modified:** 4 (stdlib.ts created, evaluator.ts extended, evaluator.test.ts extended, ast.ts + parser.ts updated for class parsing)

## Accomplishments
- StdLib simulation module with StdVector, StdString, StdArray exposing public C++ API
- Evaluator extended with ClassInstance runtime type, class registration, member address maps
- new/delete lifecycle: heap allocation, constructor invocation with own stack frame (produces steps), destructor invocation, freeHeap
- Member access for both dot notation (obj.member) and arrow notation (ptr->member)
- Raw C array bounds checking using arrayBounds map keyed by base address
- All 37 evaluator tests pass including 14 new C++ class/STL/array tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create STL simulation module** - `b9f5dfd` (feat)
2. **Task 2 RED: Add failing tests** - `d58f01e` (test)
3. **Task 2 GREEN: Extend evaluator** - `0b917b6` (feat — includes Rule 1 auto-fix)

## Files Created/Modified
- `src/interpreter/stdlib.ts` - StdVector, StdString, StdArray, StdLib facade classes
- `src/interpreter/evaluator.ts` - ClassInstance type, allocClassInstance, invokeMethod, NewExpr/DeleteExpr/MemberExpr handlers, STL delegation, array bounds fix
- `src/interpreter/evaluator.test.ts` - 14 new tests: class basics, lifecycle, STL vector, STL string, raw arrays, constructor/destructor stepping
- `src/interpreter/ast.ts` - Minor additions for class parsing support
- `src/interpreter/parser.ts` - Class declaration parsing updates

## Decisions Made
- ClassInstance members bound directly into invokeMethod scope so `x = a` works without `this->x = a` — matches user expectation for simple class examples
- Array base via `evalLValue` not `evalExpr`: discovered during test investigation that `evalExpr` on an array identifier loads the stored value (first element), not the base address

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed out-of-bounds detection for raw C stack arrays**
- **Found during:** Task 2 GREEN (test run revealed 1 failing test)
- **Issue:** `evalArrayAccess` called `evalExpr(node.array)` to get base address, which loaded the value stored at the array variable's address (i.e., `arr[0]`). `ctx.arrayBounds` is keyed by the allocLocal address, but `evalExpr` returned the element value instead. Bounds check was never triggered.
- **Fix:** `evalArrayAccess` and `evalLValue ArrayAccess` now try `evalLValue(array)` first; if that address is in `arrayBounds`, use it as the array base. Otherwise fall back to `evalExpr` for pointer subscripts.
- **Files modified:** `src/interpreter/evaluator.ts`
- **Verification:** `out-of-bounds array access throws runtime error` test now passes; `int arr[3] elements are accessible` still passes
- **Committed in:** `0b917b6` (part of Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary for correctness — bounds checking is a plan requirement. No scope creep.

## Issues Encountered
- The array base address issue was subtle: stack-allocated arrays store their elements at consecutive addresses starting at the variable's env address. The variable itself holds no separate "pointer" value — the env address IS the base. This distinction between lvalue (env address) and rvalue (stored value) needed careful handling in both the read and write paths.

## Next Phase Readiness
- Interpreter fully supports C++ subset: primitives, pointers, classes with constructors/destructors, new/delete, STL vector/string/array, raw C arrays
- All 37 evaluator tests green; no new TypeScript errors introduced
- Ready for Phase 03 visualization integration

---
*Phase: 02-interpreter*
*Completed: 2026-03-20*
