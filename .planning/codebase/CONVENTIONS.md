# Coding Conventions

**Analysis Date:** 2026-03-18

## Naming Patterns

**Files:**
- Lowercase with hyphens for multi-word files: `heap-visualization.js`, `stack-visualization.js`, `timeline-navigation.js`
- Descriptive names following pattern: `{context}-{type}.js`
- Main controller files: `controller.js`, `visualization.js`

**Functions:**
- camelCase for function names: `renderStep()`, `loadTrace()`, `updateDisplay()`, `createMemoryRegion()`
- Verb-first naming for actions: `render*`, `load*`, `update*`, `setup*`, `create*`
- Private methods in classes use camelCase without underscore prefix

**Variables:**
- camelCase for all variables: `currentStep`, `sourceCode`, `traceData`, `memoryContainer`, `currentIndex`
- Plural form for collections: `steps`, `frames`, `blocks`, `statics`, `items`
- Prefixed getters: `currentTimeIndex`, `totalStates`, `onTimeChange` (callback properties)

**Types:**
- Class names use PascalCase: `MemoryVisualization`, `HeapVisualization`, `StackVisualization`, `StaticsVisualization`, `TimelineNavigation`
- Constructor properties use camelCase: `this.memoryData`, `this.heapViz`, `this.currentStep`
- Data structure keys use snake_case (matching JSON format): `memory_blocks`, `is_deallocated`, `function_name`, `line_number`

## Code Style

**Formatting:**
- 4-space indentation for JavaScript files
- HTML style blocks embedded directly in index.html use consistent spacing
- No automated formatter detected (no .prettierrc, eslint config, or biome.json)
- Trailing semicolons consistently used in JavaScript

**Linting:**
- No linter config found (no .eslintrc, eslint.config.js, biome.json)
- Code adheres to basic conventions organically but no enforced standards

## Import Organization

**Not applicable:** Project uses vanilla JavaScript with no module system (no import/export statements)

**External Scripts:**
- D3.js included as global library via script tag in HTML
- Script order in HTML:
  1. Inline styles (in `<style>` tag)
  2. Inline event handlers and page logic (in `<script>` tag at bottom of body)
  3. External visualization classes loaded after DOM ready

**Path Aliases:**
- Not used. All files reference relative paths like `'trace.json'` for data and simple file names for JavaScript

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: See `visualization.js` lines 37-46 and `index.html` lines 273-280
- Graceful fallback on data load failure: Sets empty steps/data and displays error message
- Error messages logged to console: `console.error('Error loading memory data:', error)`
- DOM manipulation safeguards: Check for data existence before rendering: `if (!data) return;`
- Bounds checking before array access: `if (!steps.length)` before accessing `steps[idx]`

## Logging

**Framework:** Console API (browser native)

**Patterns:**
- Error logging only: `console.error('Error message:', error)`
- No debug/info/warn levels used
- Errors logged during async operations (fetch failures)
- No structured logging or log levels implemented

## Comments

**When to Comment:**
- File headers explain purpose: See all files start with `// {filename}` followed by brief description
- Inline comments explain complex logic or non-obvious operations
- Block comments for sections that do specific work (e.g., "Render code with highlight")
- Educational comments present (written for student audience): "We learned about DOMContentLoaded in our web class"

**JSDoc/TSDoc:**
- Not used in this codebase
- No formal documentation format for function parameters or return types

## Function Design

**Size:**
- Small, focused functions 10-30 lines typical
- Visualization classes have methods 15-60 lines maximum
- Example: `renderStep()` = 16 lines, `update()` in visualization classes = 10-20 lines

**Parameters:**
- 1-3 parameters typical: `renderStep(idx)`, `update(data)`, `createButton(id, x, y, symbol, onClick)`
- Callback functions passed as parameters: `onClick` in `createButton()`
- No destructuring of parameters observed

**Return Values:**
- Implicit undefined for void methods (common in JavaScript)
- Explicit returns for data-returning functions
- No return type annotations (vanilla JS, no TypeScript)
- Null/undefined returned to indicate "no data": `if (!data) return;`

## Module Design

**Exports:**
- Not applicable: Vanilla JavaScript with global class definitions
- Classes auto-register globally when script loads
- No module bundler or named exports used

**Barrel Files:**
- Not applicable: No module system
- All classes instantiated directly from global scope

## Class Structure Patterns

**Constructor initialization:**
- Lightweight constructors that initialize properties and call setup methods
- Call `init()` or `initTable()` from constructor
- Example from `MemoryVisualization`: Lines 14-27 initialize properties, instantiate sub-components, call `init()`

**Separation of concerns:**
- Data loading separate from rendering: `loadMemoryData()` vs `updateVisualizations()`
- Event setup separate: `setupEventListeners()`
- Visualization classes handle their own DOM updates: `HeapVisualization` manages heap table only

**D3.js patterns:**
- Store D3 selections as instance properties: `this.container`, `this.table`, `this.sliderHandle`
- Chain D3 methods for element creation and styling
- Use `.attr()` and `.style()` for setting properties
- Use `.on()` for event binding
