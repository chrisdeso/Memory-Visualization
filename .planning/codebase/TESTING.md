# Testing

## Framework

**None.** No test framework is configured in this project.

- No Jest, Vitest, Mocha, or other test runner detected
- No `test` script in package.json (no package.json exists)
- No test configuration files

## Test Files

**None.** Zero test files exist in the codebase.

- 535 lines of JavaScript across 7 files
- Inline `<script>` blocks in HTML
- 0% automated test coverage

## Testing Approach

**Manual only.** Students and developers visually inspect visualization output against expected memory states from `trace.json`.

## Coverage Gaps

| Area | Risk | Notes |
|------|------|-------|
| Data loading (`trace.json` parsing) | High | No validation of malformed JSON |
| Timeline navigation | High | Slider drag behavior untested |
| D3.js rendering | High | DOM output not verified programmatically |
| Event handling | Medium | Click/drag handlers have no test coverage |
| State transitions | Medium | Timeline step changes unverified |

## Highest Risk Areas

1. **Timeline slider drag** — complex D3 interaction, fragile if DOM changes
2. **JSON trace parsing** — no schema validation, silent failures possible
3. **D3.js visualization rendering** — correctness depends on visual inspection only

## Recommendations

- Add Vitest or Jest for unit testing
- Test trace parsing logic in isolation
- Add smoke tests for timeline navigation state
- Consider Playwright/Cypress for E2E visual regression
