# Feature Landscape

**Domain:** Browser-based C memory visualizer / interactive code execution visualizer
**Researched:** 2026-03-18
**Confidence note:** Tool comparison based on training knowledge (Python Tutor, CS50 Sandbox, Compiler Explorer, etc.) with HIGH confidence on core patterns; individual tool claims are MEDIUM confidence without live verification.

---

## Reference Tools Surveyed

| Tool | Focus | Key Differentiator | Weakness |
|------|-------|-------------------|----------|
| Python Tutor (pythontutor.com) | Python/Java/C/JS visualization | Step-through with heap object graphs | C support is basic; no real editor |
| CS50 Sandbox | CS education sandbox | Preloaded examples, safe execution | Server-dependent; not embeddable |
| Compiler Explorer (godbolt.org) | Assembly output | Multi-compiler, diff view | Not memory-focused; output only |
| VisuAlgo | Algorithm animation | Pre-canned algorithm animations | Not general-purpose |
| GDB (terminal) | Full C debugger | Real memory, real execution | Terminal UX; steep learning curve |
| Valgrind | Memory error detection | Real leak detection | CLI-only; not visual |

**Competitive position of this project:** Python Tutor is the closest competitor for the core use case. This tool differentiates on Monaco editor quality, C-specific memory model detail (explicit addresses, pointer arrows, register state), and browser-only execution without a server.

---

## Table Stakes

Features users expect when visiting any code visualizer. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Code display with line highlighting | Every visualizer shows which line is executing | Low | The current codebase already does this via `.highlight` CSS class |
| Step forward / step backward navigation | Core mechanic of any step-through tool | Low | Already exists: Prev/Next buttons |
| Reset to start | Users need to rerun from beginning | Low | Already exists |
| Stack frame display | The entire premise of a C memory tool | Medium | Current: flat table. Target: nested frames per function call |
| Heap block display | Required for any malloc/free demonstration | Medium | Current: D3 blocks. Target: malloc/free lifecycle |
| Variable names with values | Users must see what each memory cell means | Low | Already exists |
| Current step description / annotation | "What just happened?" text | Low | Already exists as `step.description` |
| C syntax highlighting in code panel | Users writing C expect proper coloring | Medium | NOT in current codebase — target uses Monaco which provides this |
| Pointer relationships visible | C pointers are the primary confusion; if not shown, tool is broken | High | NOT in current codebase — must be added |
| Static / global variable section | C programs use globals; omission is conspicuous | Low | Already exists as `StaticsVisualization` |
| Error display when code is invalid | Interpreter must report parse/runtime errors | Medium | Current: silent failure. Target: must surface errors in UI |
| Works without a server | Critical for static hosting; any network dependency breaks the tool | High | Core constraint — in-browser interpreter required |

---

## Differentiators

Features that set this tool apart from Python Tutor and similar tools. Not universally expected, but create meaningful competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Monaco editor (vs textarea) | Professional editing experience: syntax highlighting, line numbers, autocompletion, keybindings — Python Tutor uses a plain textarea | High | Core PROJECT.md requirement |
| Pointer arrows (visual) | Renders pointer variables as SVG arrows to target address — Python Tutor shows pointer values as numbers, not arrows | High | Core PROJECT.md requirement; requires overlay rendering on top of memory panels |
| Explicit memory addresses (hex) | Shows 0x7fff... style addresses on stack and heap — makes C's address model tangible | Low | Already partially present in current table layout |
| Stack frame boundaries | Draws visual frame boundaries between function call frames — teaches call stack depth and frame lifetime | Medium | Python Tutor only shows frame boxes for Python; C support is weaker |
| Register / program counter display | Shows PC, SP values — uniquely useful in a CS architecture course context (this project's stated origin) | Medium | PROJECT.md requirement; no competitor at this level does this for browser tools |
| Step description annotations | Human-readable "what just happened" text per step — helps self-study without an instructor | Low | Already in current codebase; easy to carry forward |
| Diff / change highlighting | Highlights what changed between previous and current step (changed cells turn yellow, new cells glow) | High | Not in current codebase but identified as missing feature in CONCERNS.md |
| Memory leak highlighting | Marks unfreed heap blocks at program end as red/leaked — directly teaches a key C hazard | Medium | Identified in CONCERNS.md as stub returning false; must be implemented |
| Preloaded example programs | Curated examples (linked list, recursion, malloc+free, dangling pointer) let users explore without writing code | Low | Not in current codebase; extremely high educational value for a portfolio tool |
| Shareable URL / permalink | Encode program into URL hash so users can share a specific example | Medium | Not in current codebase; enables viral/classroom sharing |
| Animated transitions | Memory cells animate when values change or frames push/pop — easier to follow causality | High | Not in current codebase; high polish, not core |

---

## Anti-Features

Features to explicitly NOT build. Each has a clear reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Server-side C compilation | Breaks static hosting requirement; adds infrastructure cost and attack surface | Use in-browser C interpreter (e.g., tree-walking interpreter in JS or WASM-based clang) |
| Real native memory addresses | Would expose actual browser memory; not meaningful for education | Simulate plausible hex addresses (e.g., stack at 0x7fff0000 growing down) |
| Full C++ support at launch | C++ templates, RTTI, exceptions, STL containers are massively complex to simulate | Start with C subset (variables, pointers, malloc/free, structs, functions) — add C++ later if warranted |
| Mobile / responsive layout | PROJECT.md explicitly out of scope; side-by-side layout requires screen width | Desktop-only is fine for this use case |
| Multi-file programs | Dramatically increases interpreter complexity with minimal educational gain at this stage | Single-file programs only; use `#include` stubs if needed |
| User accounts / persistence | No backend; static hosting; adds complexity with no roadmap value | Use localStorage for draft code, URL hash for sharing |
| Real-time collaborative editing | Far out of scope; requires WebSocket infrastructure | Not needed for education or portfolio use case |
| AI code explanation | Tempting scope creep; step descriptions already explain what happened | Keep descriptions as authored annotations in examples; don't add AI dependency |
| Syntax autocomplete for all C stdlib | Monaco can suggest everything, creating misleading "will this work?" false positives | Configure Monaco language server carefully; only autocomplete what the interpreter actually supports |
| Performance profiling / timing | Not the purpose; misleading since it's a simulated interpreter | Remove if accidentally included |

---

## Feature Dependencies

```
Monaco editor → C interpreter (editor submits code to interpreter)
C interpreter → step trace (interpreter produces trace before visualization can run)
step trace → stack visualization (visualization reads from trace)
step trace → heap visualization (visualization reads from trace)
step trace → pointer arrows (arrows require knowing which stack cell holds which heap address)
step trace → step descriptions (descriptions come from trace annotations)
pointer arrows → stack frame display (arrows must anchor to specific frame/variable cells)
heap block display → memory leak highlighting (leak detection requires knowing final heap state)
preloaded examples → Monaco editor (examples populate the editor)
shareable URL → C interpreter (URL must encode program that interpreter can execute)
diff/change highlighting → step trace (diff requires two consecutive trace steps)
register display → step trace (PC/SP are fields in the trace step object)
```

---

## MVP Recommendation

The minimum viable product that demonstrates value and is shippable as a portfolio piece.

**Prioritize (must ship):**
1. Monaco editor with C syntax highlighting
2. In-browser C interpreter generating a step trace
3. Step forward/back/reset navigation
4. Stack frame visualization (frame boundaries, variable name/address/value rows)
5. Heap visualization (malloc/free blocks, address, size, status)
6. Static/global variable section
7. Current-line highlighting in editor
8. Step description text
9. Pointer arrows (SVG overlay connecting pointer cells to heap blocks)
10. Error display for invalid/unsupported C code

**Defer to later phases:**
- Register display — useful but not core to C memory model understanding; add after MVP validates
- Memory leak highlighting — the stub exists; implement after basic heap is solid
- Diff/change highlighting — high complexity; add as polish after core works
- Preloaded examples — important for usability but add after interpreter is stable
- Shareable URLs — nice to have; add after examples are in place
- Animated transitions — pure polish; last mile

---

## Complexity Notes for Planning

| Feature | Implementation Notes |
|---------|---------------------|
| C interpreter (in-browser) | Hardest single task. Options: write tree-walking interpreter in JS (full control, high effort), use WASM-compiled clang (large binary, limited sandboxing), or use existing JS C interpreter library (verify if any suitable ones exist in research/STACK.md). Dominates Phase 1. |
| Pointer arrows (SVG overlay) | Requires absolute positioning of SVG layer over the split-pane layout. Coordinates must update on scroll and resize. Non-trivial but well-understood pattern. |
| Monaco integration | Well-documented library; relatively straightforward. Main risk is bundle size (large WASM worker). Must load from CDN or bundle carefully. |
| Diff/change highlighting | Requires comparing two consecutive trace steps — O(n) comparison, not complex algorithmically, but requires UI state for "previous step" |
| Shareable URL | Encode editor content in URL hash using base64 or LZ-string compression. Single-page requirement means hash routing. |

---

## Sources

**Confidence: MEDIUM** — Comparisons to Python Tutor, CS50 Sandbox, Compiler Explorer, and GDB are based on training knowledge (knowledge cutoff August 2025). The feature gap analysis is grounded in the project's own CONCERNS.md and ARCHITECTURE.md (HIGH confidence). Live verification of competitor feature sets was not possible due to tool access restrictions during this research session.

- Project context: `/home/chitao/dev/Memory-Visualization/.planning/PROJECT.md`
- Codebase concerns: `/home/chitao/dev/Memory-Visualization/.planning/codebase/CONCERNS.md`
- Architecture analysis: `/home/chitao/dev/Memory-Visualization/.planning/codebase/ARCHITECTURE.md`
- Python Tutor (pythontutor.com) — feature comparison from training knowledge
- Compiler Explorer (godbolt.org) — feature comparison from training knowledge
