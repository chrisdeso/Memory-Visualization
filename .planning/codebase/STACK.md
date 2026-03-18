# Technology Stack

**Analysis Date:** 2026-03-18

## Languages

**Primary:**
- JavaScript (ES6+) - Frontend visualization and UI interactions (`/web/js/`, `/web/index.html`)
- HTML5 - Frontend markup (`/web/index.html`, `/demo/index.html`)
- CSS3 - Frontend styling (embedded in HTML files)

**Secondary:**
- C++ - (Historically used for memory tracking backend, now removed per recent commit `0ee8d58`)

## Runtime

**Environment:**
- Browser-based (Chromium, Firefox, Safari, Edge)
- HTTP server for static file serving

**Package Manager:**
- npm (implied by `.gitignore` entries and demo setup docs mentioning `npm install -g http-server`)

## Frameworks

**Core:**
- None declared - Pure vanilla JavaScript for visualization layer

**Visualization:**
- D3.js - Data-driven visualization library (`/web/js/heap-visualization.js` line 16: `d3.select()`, `/web/js/visualization.js` comments mention "D3.js Visualizations")

**Build/Dev:**
- Simple HTTP server for development (`http-server` npm package mentioned in `/demo/how-to-run.md`)
- Python's built-in `http.server` module as alternative (`python -m http.server 8000`)

## Key Dependencies

**Critical:**
- D3.js - Core visualization rendering for memory state visualization

**Infrastructure:**
- None - Static HTML/CSS/JavaScript served directly via HTTP

## Configuration

**Environment:**
- No environment configuration files detected
- Static configuration embedded in HTML (`/web/index.html` style tags contain hardcoded colors and layout)

**Build:**
- No build configuration files (webpack, vite, rollup, etc.) detected
- Project serves static assets directly

## Platform Requirements

**Development:**
- Node.js (for `http-server` npm package)
- Python 3+ (alternative server method)
- Git (version control)
- Modern web browser

**Production:**
- Static file hosting via HTTP server (can use Node.js `http-server`, Python `http.server`, or any static hosting provider)
- Generated `trace.json` file in root directory (consumed by visualization)

---

*Stack analysis: 2026-03-18*
