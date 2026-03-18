# Integrations

## External APIs

None. This is a pure client-side visualization tool with no external API calls.

## Databases

None. Data is sourced from a static `trace.json` file loaded at runtime.

## Auth Providers

None. No authentication layer.

## Data Sources

| Source | Type | Notes |
|--------|------|-------|
| `trace.json` | Static file | Memory trace data, loaded via HTTP |

## HTTP Server

No dedicated server. Static files served via:
- Python: `python3 -m http.server`
- Node.js: `npx serve` or similar

## Webhooks

None.

## Browser APIs

- `fetch` / XHR — loads `trace.json`
- Browser console — error handling output only

## Notes

All integration is file-based. No network dependencies at runtime beyond serving static assets.
