# Findings & Audit Log

## Discovered Issues & Resolved Actions
1. **Top-Level Await (`ERR_REQUIRE_ASYNC_MODULE`)**:
   - `lib/tools.js:27` and `lib/index.js:19` contained top-level `await import` which transformed CJS/ESM modules into async ESM graphs in Node.js 24, breaking synchronous `require()`.
   - Resolved by switching to `createRequire(import.meta.url)`. Synchronous `require('./lib/index.js')` now succeeds.
2. **Path Traversal Sibling Vulnerability (`sanitizePath`)**:
   - `lib/sandbox.js` used `resolved.startsWith(normalizedBase)`. Sibling directories sharing prefix (e.g. `/workspace-sibling`) bypassed check.
   - Resolved with `path.relative(normalizedBase, resolved)` check (`relative.startsWith('..') || path.isAbsolute(relative)`).
3. **Null-Safety Across All 30 Tools**:
   - Default parameter `args = {}` did not protect against explicit `null` calls.
   - Resolved by wrapping `defineTool` execution to normalize args to `{}` for all 30 tools.
4. **Generator Modules Crashing on Null**:
   - `crud.js`, `deploy.js`, `diagram.js`, `plan.js`, `prototype.js`, `timetravel.js`, `wireframe.js`, and `transpiler.js` crashed on null input.
   - Resolved by adding defensive input normalization in all generator functions.
5. **Hardcoded Dark Hex Colors in UI**:
   - Found 80+ occurrences of `#18181b`, `#27272a`, `#3f3f46`, `#09090b` in `lib/client.js`.
   - Converted all rules and inline styles to native DSH tokens (`--dsw-alias-*`), making the UI natively compatible with both Light and Dark modes.
6. **Missing ErrorBoundary in Client UI**:
   - Added `createErrorBoundary()` and wrapped `PluginCard`, `LiveCanvasWorkspace`, `LiveCanvasFileViewer`, and chat card slot registrations.
