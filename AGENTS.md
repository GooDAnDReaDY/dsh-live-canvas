# AGENTS.md for dsh-live-canvas

## Project Scope
- Plugin: `@goodandready-private/dsh-live-canvas`
- Architecture: DeepSeek Harness Cordis plugin + Web client
- Base Directory: `dhsplugins/dsh-live-canvas`

## Rules
- Tests must pass: `node --test test/*.test.mjs`
- Settings registered only via `settings.plugin.item` card format.
- No infrastructure paths or credentials hardcoded.
