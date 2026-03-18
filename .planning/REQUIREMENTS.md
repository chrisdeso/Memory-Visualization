# Requirements: Memory Visualizer

**Defined:** 2026-03-18
**Core Value:** Users write C/C++ code, step through it, and see exactly what's happening in memory — stack, heap, and pointers — without needing any server or build step.

## v1 Requirements

### Editor

- [ ] **EDIT-01**: User can write C/C++ code in a Monaco editor with C/C++ syntax highlighting
- [ ] **EDIT-02**: User sees the currently-executing line highlighted in the editor during stepping
- [ ] **EDIT-03**: User sees error squiggles and diagnostics for parse/runtime errors
- [ ] **EDIT-04**: User can load a preloaded example program from a dropdown

### Execution

- [ ] **EXEC-01**: User can run the program and generate a full execution trace
- [ ] **EXEC-02**: User can step forward one line at a time (line-by-line mode)
- [ ] **EXEC-03**: User can step forward one statement at a time (statement mode)
- [ ] **EXEC-04**: User can step backward through previously visited states
- [ ] **EXEC-05**: User can play through execution automatically with speed control
- [ ] **EXEC-06**: Interpreter runs in a Web Worker so infinite loops do not freeze the browser
- [ ] **EXEC-07**: Interpreter supports a modern C++ subset: classes, objects, constructors/destructors, references, new/delete, and basic STL (vector, string)

### Visualization

- [ ] **VIZ-01**: User sees a stack frames panel showing the current call stack and local variables
- [ ] **VIZ-02**: User sees a heap panel showing simulated malloc/free blocks with addresses
- [ ] **VIZ-03**: User sees SVG pointer arrows connecting pointer variables to their target memory locations
- [ ] **VIZ-04**: User sees a registers/program state panel showing PC and SP
- [ ] **VIZ-05**: User sees memory leak highlighting on heap blocks not freed before program exit

### UI / Visual Design

- [x] **UI-01**: Application uses a dark theme with a professional dev-tool aesthetic
- [x] **UI-02**: Layout is side-by-side: Monaco editor on the left, memory visualization panels on the right
- [x] **UI-03**: Memory state updates are instant (no animation lag during stepping)
- [ ] **UI-04**: Overall visual design is polished enough to showcase on a personal portfolio site

## v2 Requirements

### Sharing

- **SHARE-01**: User can share a program via URL hash encoding
- **SHARE-02**: User can copy a permalink to the current step

### Extended Language Support

- **LANG-01**: Visualizer supports a broader C subset (structs, arrays of pointers, function pointers)
- **LANG-02**: Visualizer supports a simulated C++ subset (classes, new/delete)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side code execution | Browser-only by design; no backend |
| Real native memory tracking | Simulated/interpreted C only |
| Mobile layout | Desktop web app; portfolio use case |
| Animation / transitions during stepping | User preference: instant updates |
| Languages beyond C/C++ (Python, Java, etc.) | C/C++ memory model focus for v1 |
| Full C++ (templates, complex STL beyond vector/string) | Scope control — simulate core C++ memory concepts, not the full language |
| Multi-file programs | Scope control; single-file is sufficient for educational use |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-01 | Phase 1 | Pending |
| EDIT-02 | Phase 1 | Pending |
| EDIT-03 | Phase 1 | Pending |
| EDIT-04 | Phase 4 | Pending |
| EXEC-01 | Phase 2 | Pending |
| EXEC-02 | Phase 2 | Pending |
| EXEC-03 | Phase 2 | Pending |
| EXEC-04 | Phase 2 | Pending |
| EXEC-05 | Phase 2 | Pending |
| EXEC-06 | Phase 2 | Pending |
| EXEC-07 | Phase 2 | Pending |
| VIZ-01 | Phase 3 | Pending |
| VIZ-02 | Phase 3 | Pending |
| VIZ-03 | Phase 3 | Pending |
| VIZ-04 | Phase 3 | Pending |
| VIZ-05 | Phase 3 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| UI-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after roadmap creation*
