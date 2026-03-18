# Technology Stack

**Project:** Memory-Visualization (browser-based C memory visualizer)
**Researched:** 2026-03-18
**Confidence note:** Web access and npm registry were unavailable during research. Versions and ecosystem state reflect training knowledge through August 2025. All versions marked [VERIFY] must be checked against npm registry before use.

---

## Recommended Stack

### Core Editor

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `monaco-editor` | ^0.50.0 [VERIFY] | C/C++ code editor in-browser | Industry-standard editor (powers VS Code). Ships C/C++ syntax highlighting, IntelliSense stubs, and tokenizer out of the box. The `@monaco-editor/react` wrapper exists but introduces React coupling — use vanilla Monaco since this is a no-framework project |

**Important:** Monaco requires its web worker files to be served as static assets. Vite has a known integration pattern for this (`vite-plugin-monaco-editor` or manual worker URL config). This is the most common setup pain point — budget time for it.

### In-Browser C Execution

This is the critical architectural choice. Options compared below.

**Recommended: `picoc` compiled to WASM via Emscripten, or `c-wasm` / `webassembly-clang` shim**

| Option | Approach | Pros | Cons | Confidence |
|--------|----------|------|------|------------|
| **`c-wasm` / Emscripten + clang** | Compile real clang/LLVM subset to WASM | Handles real C semantics; malloc/free work as expected | Large binary (~10-30 MB); complex setup | MEDIUM |
| **`picoc`** | Lightweight C interpreter ported to WASM | Small (~500 KB); handles C89/C90 well; good for educational subset | No C99/C11 features; no full stdlib | HIGH |
| **`cheerpj` / CheerpX** | Commercial WASM-based execution | High fidelity; works for complex programs | Licensing restrictions; overkill for educational tool | LOW |
| **Pure JS C interpreter (e.g., `jscpp`)** | JS reimplementation of C semantics | Zero WASM; easy to intercept execution steps; introspectable | Incomplete semantics; diverges from real C in edge cases | MEDIUM |
| **`CS:APP`-style simulation** | Hand-written JS C memory model | Full control over memory layout; designed for education | You build everything; must accurately model C semantics | HIGH (if scope is limited) |

**Recommendation: Use `jscpp` (pure JS C interpreter) for v1.**

Rationale: The project's goal is educational visualization, not executing arbitrary production C. `jscpp` runs in JS, which means you can hook into every step of execution (variable assignment, malloc, function call, return) without WASM boundary crossings. This makes building the step-through execution trace significantly simpler. WASM-based options treat the interpreter as a black box — extracting execution state requires complex instrumentation.

For v2 or if `jscpp` proves too incomplete: compile `picoc` to WASM and instrument it via a JavaScript wrapper that exposes a step() API.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `jscpp` | ^2.0.0 [VERIFY] | Pure-JS C interpreter | Introspectable execution; no WASM boundary; designed for educational C; exposes symbol table and execution state at each step |

**Flag for phase research:** Verify `jscpp`'s support for `malloc`/`free` simulation and pointer arithmetic before committing. If it can't model pointers adequately, `picoc` WASM becomes mandatory.

### Visualization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `d3` | ^7.9.0 [VERIFY] | Memory layout diagrams, pointer arrows, stack frames | Already used in existing codebase; v7 is the stable current major; SVG-based rendering is ideal for pointer arrows (SVG `<line>` / `<path>` with arrowhead markers); no alternative rivals D3 for this level of custom data-linked diagram control |

D3 v7 uses ES modules natively. Import as `import * as d3 from 'd3'` — do not use CDN globals. This eliminates the fragile implicit-global pattern in the current codebase.

### Build Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `vite` | ^5.4.0 [VERIFY] | Dev server + production bundler | Zero-config for vanilla JS/TS; handles ES modules; output is static assets deployable anywhere; HMR for fast development. Alternative (webpack) is significantly more complex to configure for Monaco workers. Vite is the standard 2025 choice for no-framework static apps |
| `typescript` | ^5.5.0 [VERIFY] | Type safety | Optional but strongly recommended. The execution trace data model (stack frames, heap blocks, pointer links) is complex enough that untyped JS causes subtle bugs. TS interfaces document the trace schema as executable code |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^2.0.0 [VERIFY] | Unit testing | Test the C interpreter wrapper, trace generation, and D3 rendering logic in isolation. Required — no tests exist in current codebase and the interpreter logic is algorithmically complex |
| `@types/d3` | ^7.4.0 [VERIFY] | TypeScript types for D3 | Always, when using TypeScript with D3 |

---

## In-Browser C Execution: Full Comparison

### Option A: `jscpp` (Recommended for v1)

`jscpp` is a JavaScript implementation of C semantics. It parses C source, evaluates expressions, manages a simulated symbol table.

**Strengths:**
- Execution state (variables, scope, call stack) is directly accessible as JS objects
- Can intercept every statement before execution — perfect for step-through
- No WASM setup; no worker threads required
- ~100 KB bundle size
- Actively used in educational tools (CS50, similar projects reference it)

**Weaknesses:**
- Incomplete C standard library
- Pointer arithmetic is partially simulated (addresses are synthetic integers)
- No actual memory addresses — you define the memory layout model yourself
- `malloc`/`free` support may be incomplete [requires verification]

**Confidence:** MEDIUM — jscpp is the right category of tool, but its current maintenance status and malloc support need verification before committing.

### Option B: `picoc` compiled to WASM

`picoc` is a real C interpreter (C source), small enough (~8 KLOC) to compile with Emscripten.

**Strengths:**
- Handles real C including pointer arithmetic
- Has been compiled to WASM by multiple open-source projects
- More complete C semantics than pure-JS options

**Weaknesses:**
- Extracting step-by-step execution state from WASM requires a messaging protocol
- Must pipe stdout/stdin through WASM memory
- Build complexity: Emscripten toolchain required at dev time
- Pre-built WASM binaries for picoc exist but are not in npm — requires manual distribution

**Confidence:** MEDIUM — viable but significantly more engineering effort for the step-through visualization goal.

### Option C: Emscripten + Clang subset (e.g., `wasm-clang` playground style)

Used by the Compiler Explorer (godbolt.org), LLVM WASM demos.

**Strengths:**
- Real compiler semantics
- Handles complex C including full stdlib

**Weaknesses:**
- WASM binary is 10-40 MB
- Not designed for step-through visualization
- Extracting execution trace requires DWARF debug info parsing — extremely complex
- Not appropriate for a self-contained static site education tool

**Verdict:** Do not use for this project.

### Option D: Hand-written C memory model simulator

Build a C-subset interpreter from scratch in TypeScript, modeling only what the visualizer needs: stack frames, `malloc`/`free`, pointers, basic arithmetic.

**Strengths:**
- Full control over execution trace format
- Can model exactly the memory layout shown in CS education materials
- No third-party interpreter dependency
- Can define "virtual addresses" (e.g., stack starts at 0x7fff0000, heap at 0x20000000)

**Weaknesses:**
- Significant initial build time (parsing C with a real parser like `nearley` or `chevrotain` is non-trivial)
- Risk of semantic drift from real C

**Verdict:** Best long-term option if the project grows, but too much scope for initial phases. Start with `jscpp`; plan migration path to custom simulator.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Editor | `monaco-editor` | CodeMirror 6 | Monaco is explicitly listed in requirements; CodeMirror is lighter but less familiar to users used to VS Code |
| Editor | `monaco-editor` | Ace Editor | Ace is older, has less active development, and lacks Monaco's LSP integration story |
| Visualization | D3.js v7 | Vis.js | Vis.js is higher-level but less suited to custom memory layout diagrams; D3 gives full SVG control for pointer arrows |
| Visualization | D3.js v7 | Konva (Canvas) | Canvas-based; harder to hit-test for interactive tooltips; SVG is better for this type of diagram |
| Bundler | Vite | Webpack | Webpack requires significantly more config for Monaco worker files; Vite handles it with less ceremony |
| Bundler | Vite | Parcel | Parcel is simpler but less ecosystem support for Monaco worker config |
| C Execution | jscpp | CheerpX | CheerpX is commercial, large runtime; overkill for educational C subset |
| Framework | None (vanilla TS) | React | React adds complexity with no clear benefit for a single-page tool; D3 and Monaco both prefer direct DOM control |
| Framework | None (vanilla TS) | Svelte | Tempting for reactivity, but adds build complexity and abstraction layer over D3 |

---

## Static Site Deployment

This project must deploy as a static site with no server-side execution.

### Build output

Vite produces a `dist/` directory of static HTML/CSS/JS assets. All files are self-contained. No server-side rendering, no API routes.

```
dist/
  index.html
  assets/
    index-[hash].js       ← bundled application
    index-[hash].css
    monaco-editor/        ← Monaco worker files (must be copied as static assets)
      editor.worker.js
      ts.worker.js
```

### Monaco worker configuration

Monaco's language workers must be served as separate JS files (not bundled). Vite config must use `new URL('./node_modules/monaco-editor/...', import.meta.url)` pattern or `vite-plugin-monaco-editor`. This is mandatory for Monaco to function and is the #1 integration issue.

### WASM assets (if using picoc/WASM path)

If a WASM C interpreter is used, the `.wasm` file must be included in `dist/` and served with `Content-Type: application/wasm`. Vite handles this automatically when the WASM file is imported via `?url` or through a Vite WASM plugin.

### Hosting requirements

- Any static host works: GitHub Pages, Netlify, Vercel static, personal web server
- No server-side computation required
- Recommended: Set appropriate cache headers for the large Monaco worker files

---

## Installation

```bash
# Initialize project
npm create vite@latest memory-viz -- --template vanilla-ts
cd memory-viz

# Core dependencies
npm install d3 monaco-editor jscpp

# Type definitions
npm install -D @types/d3 typescript

# Testing
npm install -D vitest

# Monaco Vite integration
npm install -D vite-plugin-monaco-editor
```

---

## Confidence Assessment

| Component | Confidence | Reason |
|-----------|------------|--------|
| Monaco Editor | HIGH | Stable, widely used, version trajectory is well-known; only version number needs npm verification |
| D3.js v7 | HIGH | v7 has been stable for years; ES module support is confirmed; current minor version needs npm verification |
| Vite | HIGH | Dominant bundler for vanilla/TS static apps as of mid-2025; version needs npm verification |
| TypeScript | HIGH | No uncertainty here |
| jscpp as C interpreter | MEDIUM | Category is correct (pure-JS C interpreter); malloc support and current maintenance status need verification before Phase 1 commit |
| picoc WASM fallback | MEDIUM | Architecture is well-understood; specific pre-built binaries need discovery before use |
| Vitest | HIGH | Standard test runner for Vite projects |

---

## Sources

- Training knowledge through August 2025 (no live web access during research session)
- Existing codebase analysis: `/home/chitao/dev/Memory-Visualization/web/` — confirms D3 usage, no existing bundler, no package.json
- Project requirements: `.planning/PROJECT.md` — confirms no-server, static hosting, Monaco + D3 constraints
- Codebase concerns: `.planning/codebase/CONCERNS.md` — confirms D3 implicit global is a known fragile point; test infrastructure missing

**Versions to verify before Phase 1:**
- `monaco-editor` current version: `npm show monaco-editor version`
- `d3` current version: `npm show d3 version`
- `vite` current version: `npm show vite version`
- `jscpp` existence and maintenance status: `npm show jscpp`; check GitHub last commit date
- `vite-plugin-monaco-editor` current version: `npm show vite-plugin-monaco-editor version`
