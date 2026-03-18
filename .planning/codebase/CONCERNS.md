# Codebase Concerns

**Analysis Date:** 2026-03-18

## Incomplete Features

**Memory Leak Detection:**
- What's missing: Leak detection is not implemented despite being a core feature goal
- Files: `web/js/heap-visualization.js` (line 76-80), `web/js/timeline-nav.js` (line 129-131)
- Impact: Memory leak visualization cannot properly identify or highlight leaked memory blocks. Both `isLeaked()` methods return hardcoded `false`
- Priority: High - This is a stated educational goal
- Fix approach: Implement leak detection logic that identifies memory blocks that were allocated but never deallocated at program end

**Implementation Overview Missing:**
- What's missing: README indicates "Implementation overview // TODO" at line 41
- Files: `README.md`
- Impact: New contributors/maintainers cannot understand the data pipeline or architecture
- Priority: Medium - Documentation should match actual implementation
- Fix approach: Document the data flow from C++ tracker through JSON generation to web visualization

## Tech Debt

**Duplicate Timeline Navigation Files:**
- Issue: Two separate implementations of timeline navigation exist with same functionality
- Files: `web/js/timeline-nav.js` (160 lines) and `web/js/timeline-navigation.js` (157 lines)
- Impact: Code duplication increases maintenance burden, potential for inconsistent behavior
- Why it happened: Unclear which version is actually used; both have similar but slightly different implementations
- Fix approach: Determine which file is actively used, delete the unused version, consolidate any unique logic

**Unused Visualization.js File:**
- Issue: `web/js/visualization.js` loads data but index.html implements its own inline visualization logic
- Files: `web/js/visualization.js` (imported but functionality duplicated in `index.html` lines 267-385)
- Impact: Confusing codebase with duplicate implementations, potential inconsistency in rendering
- Fix approach: Consolidate into single approach - either use visualization.js module or keep inline implementation, remove the other

## Security Concerns

**XSS Vulnerability - Unsafe innerHTML Usage:**
- Risk: Code directly inserts potentially untrusted data into DOM via `innerHTML`
- Files:
  - `web/index.html` (lines 291, 300, 351): Building HTML from memory data
  - `web/js/controller.js` (lines 19, 28-30): Direct HTML injection of trace data
- Current status: Medium risk - if trace.json contains malicious code embedded in values/names
- Current mitigation: Minimal - assumes trace.json is trusted source
- Recommendations:
  - Use `textContent` for data display instead of `innerHTML`
  - Use `document.createElement()` and `appendChild()` for safe DOM manipulation
  - Add input validation/sanitization for trace data values
  - Example vulnerable code: `document.getElementById('heap-section').innerHTML = s.heap;` (controller.js:30)

**JSON Parsing Without Validation:**
- Risk: Code parses JSON without checking structure/format before accessing properties
- Files:
  - `web/js/heap-visualization.js` (lines 34-36): `JSON.parse(heap)` without try-catch
  - `web/index.html` (line 275): `await response.json()` without validation
- Current status: Low-medium risk if malformed data provided
- Current mitigation: Basic null checks after parsing (`if (heap && heap.memory_blocks)`)
- Recommendations:
  - Wrap JSON.parse() in try-catch blocks
  - Validate JSON structure matches expected schema
  - Add error messages to UI when data is invalid

**Uncaught Promise Rejection:**
- Risk: Fetch errors in `visualization.js` only logged to console, not shown to user
- Files: `web/js/visualization.js` (lines 37-46)
- Impact: Users won't know why visualization failed to load
- Fix approach: Display error message in UI instead of silent console logging

## Missing Error Boundaries

**No validation of memory trace data structure:**
- Files: `web/index.html`, `web/js/controller.js`, `web/js/heap-visualization.js`
- What can go wrong:
  - Missing `steps` array in trace.json
  - Missing memory region objects (stack, heap, static)
  - Malformed addresses or values in memory blocks
- Current state: Code assumes correct structure, will fail silently or show incomplete UI
- Fix approach: Add schema validation for trace.json format before using data

**Unhandled missing trace.json:**
- Files: `web/index.html` (line 274), `web/js/controller.js` (line 34)
- Current behavior: Error shown to user but visualization remains in broken state
- Fix approach: Show user helpful message with instructions on how to generate trace file

## Fragile Areas

**Timeline Navigation State Management:**
- Files: `web/js/timeline-nav.js` and `web/js/timeline-navigation.js`
- Why fragile: Multiple timer intervals can be created if play button clicked rapidly
- Current issue: `setInterval()` created without clearing previous interval in some cases
- Safe modification: Add interval cleanup guard - check if `playInterval` exists before creating new one
- Test coverage: No automated tests exist for rapid-click scenarios

**Memory Visualization HTML Generation:**
- Files: `web/index.html` (lines 343-361)
- Why fragile: Uses template literals with unescaped data directly in HTML
- Risk: Complex memory state objects might contain special characters breaking layout
- Safe modification: Use safe DOM APIs instead of innerHTML/template strings
- Example risk: Memory variable named `<script>` would execute

**D3.js Dependency Implicit:**
- Files: `web/js/heap-visualization.js`, `web/js/stack-visualization.js`, `web/js/statics-visualization.js`, `web/js/timeline-navigation.js`
- Why fragile: All visualization classes assume D3 global is loaded
- Current issue: No error if D3 fails to load; code will throw ReferenceError
- Safe modification: Add guard checks for `window.d3` existence; add `<script>` tag before visualization scripts in HTML
- Current status: `index.html` doesn't include D3 script tag (must be injected separately)

**No null/undefined Guards on Data Access:**
- Files: `web/js/stack-visualization.js` (line 30), `web/js/statics-visualization.js` (line 20)
- Pattern: Code accesses nested properties without checking intermediate values
- Example: `data.stack` accessed without checking if `data` has required structure
- Risk: One missing field crashes entire visualization

## Missing Features

**No auto-scroll or memory region expansion:**
- Issue: Large memory dumps are truncated without indication there's more content
- Files: `web/index.html` CSS (lines 109-113): `overflow: auto` but no UI affordances
- Impact: Students can't see full memory state in complex programs
- Fix approach: Add scrollable memory region UI or implement virtual scrolling for large data sets

**No filtering/search for variables:**
- Issue: Large memory dumps hard to navigate - no way to find specific variable
- Impact: Usability decreases with complex programs
- Fix approach: Add text search box to filter memory regions

**No memory region comparison:**
- Issue: Students can't see what changed between steps
- Files: Currently only shows full state per step
- Impact: Harder to learn what each operation does
- Fix approach: Add diff/comparison view showing before/after state

## Test Coverage Gaps

**No automated tests:**
- What's not tested: Visualization rendering, data loading, timeline navigation, memory calculations
- Files: No test files exist (checked `*.test.*`, `*.spec.*`)
- Risk: Regressions go undetected, refactoring is risky
- Priority: Medium - codebase is small enough to add tests now
- Suggested approach:
  - Add test framework (Jest with jsdom for DOM testing)
  - Test visualization updates with mock trace data
  - Test edge cases: empty memory regions, missing data fields, large data sets
  - Test error scenarios: missing trace.json, malformed JSON

**Manual testing only:**
- Current QA: Depends on running examples manually
- Impact: Hard to catch browser compatibility issues, edge cases
- Fix approach: Set up test suite or at least document manual test cases

## Performance Concerns

**No virtualization for large traces:**
- Issue: Large program traces with thousands of steps could cause lag
- Files: `web/index.html` (lines 319-324): Re-renders entire memory table per step
- Current scale: Works fine for small examples, untested for large programs
- Improvement path: Implement virtual scrolling or pagination for memory regions

**D3 objects recreated on every update:**
- Files: `web/js/heap-visualization.js` (line 23), `web/js/stack-visualization.js` (line 20)
- Pattern: `this.container.html('')` clears and rebuilds entire DOM on each update
- Impact: Unnecessary reflow/repaints, could be slow with many blocks
- Improvement: Update only changed elements using D3 data binding

**Play button timer can accumulate:**
- Files: `web/js/timeline-nav.js` (line 149): Interval set without guaranteed cleanup
- Risk: Rapid clicking could create multiple intervals
- Fix: Use single timer pattern or stop previous before starting new

## Dependencies at Risk

**D3.js not listed in package.json:**
- Risk: Project requires D3 but no dependency management
- Files: D3 loaded via implicit HTML tag (not in `index.html` currently)
- Impact: Missing dependency in documentation, unclear how to properly install
- Migration plan: Either add package.json with D3 dependency and bundler, or document exact D3 version/CDN link required

**No version pinning:**
- Issue: No package.json or dependency lock file
- Impact: Brittle for reproduction - D3 updates could break visualization
- Fix approach: Use npm/yarn with package-lock.json or equivalent

## Known Issues

**Timeline Navigation Files Both Unfinished:**
- Files: `web/js/timeline-nav.js` (line 13): Comment says "highlitgts" (typo)
- Both versions have incomplete leak detection: `return false;` (lines 131 in timeline-nav.js, line 79 in heap-visualization.js)
- Not critical but indicates rushed development

**README.md Shows Deleted C++ Portion:**
- Issue: README references examples (lines 52-69) but git history shows C++ was removed
- Commit: "0ee8d58 remove C++ portion" deleted build system but docs not updated
- Impact: Users follow build instructions for non-existent examples
- Fix: Update README to remove C++ example references or clarify front-end only status

**Hardcoded Colors Not Accessible:**
- Files: `web/index.html` (multiple color definitions), visualization classes
- Issue: Colors chosen without considering colorblind accessibility
- Example: Red (#f44336) and green (#c8e6c9) used to distinguish allocation states
- Impact: ~8% of users can't distinguish allocated from leaked memory
- Fix: Use patterns (stripes, dots) in addition to colors; follow WCAG contrast standards

---

*Concerns audit: 2026-03-18*
