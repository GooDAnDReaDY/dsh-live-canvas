# Task Plan: UI Redesign (dsh-clinebot standard) & Deep Stability Audit

## Goal
1. Complete redesign of `lib/client.js` following `dsh-clinebot` styling archetype and native DSH tokens `--dsw-alias-*`. Eliminate all hardcoded dark hex colors.
2. In-depth stability and quality audit of all 24 backend and frontend modules in `lib/`. Fix bugs, dead code, memory leaks, unhandled rejections, and missing edge-case handling.
3. Add comprehensive tests for newly identified stability edge cases and ensure 100% test pass rate.

## Next Step
Phase 5: Commit changes via `git-antigravity`, push branch, and open Gitea Pull Request for Issue #102.

## Current Phase
Phase 5: Commit, Push & Gitea PR

## Phases

### Phase 1: Code Audit & Discovery
- Status: complete
- Action: Scanned all 24 modules. Identified top-level await in tools.js/index.js causing ERR_REQUIRE_ASYNC_MODULE, path traversal bug in sanitizePath, generator module crashes on null options, lack of null guards in tools, hardcoded dark colors in client.js, and absence of ErrorBoundary.
- Files: `lib/*.js`

### Phase 2: Client UI Redesign to dsh-clinebot Standard
- Status: complete
- Action: Refactored `lib/client.js`:
  - Replaced all 80+ hardcoded dark colors with `--dsw-alias-*` tokens.
  - Implemented `.dlc-section-card`, `.dlc-btn` (matching `.cb-btn`), `.dlc-badge-*` (matching `.cb-badge-*`).
  - Added top-level `ErrorBoundary` with retry capability.
  - Wrapped `PluginCard`, `LiveCanvasWorkspace`, `LiveCanvasFileViewer`, and chat card slot registrations in `ErrorBoundary`.
- Files: `lib/client.js`

### Phase 3: Backend Stability Fixes & Dead Code Elimination
- Status: complete
- Action:
  - Replaced top-level `await import` with `createRequire` in `lib/tools.js` and `lib/index.js`.
  - Fixed path traversal in `lib/sandbox.js:sanitizePath` using `path.relative`.
  - Added safe wrapper in `lib/tools.js:defineTool` guarding all 30 tools against `null` or non-object args.
  - Added defensive `options` normalization across `crud.js`, `deploy.js`, `diagram.js`, `plan.js`, `prototype.js`, `timetravel.js`, `wireframe.js`, and `transpiler.js`.
  - Removed leftover debug `console.error` and added error handling on asset stream in `lib/index.js`.
  - Fixed watcher race condition in `lib/watcher.js`.
- Files: `lib/sandbox.js`, `lib/tools.js`, `lib/index.js`, `lib/crud.js`, `lib/deploy.js`, `lib/diagram.js`, `lib/plan.js`, `lib/prototype.js`, `lib/timetravel.js`, `lib/wireframe.js`, `lib/transpiler.js`, `lib/watcher.js`

### Phase 4: Test Suite Expansion & Verification
- Status: complete
- Action: Created `test/stability_audit_dsh_clinebot.test.mjs` covering sibling path traversal rejection, synchronous module requiring, 30 tools null-safety, generator null-safety, and client design tokens / ErrorBoundary. All 89 tests pass with 0 failures.
- Files: `test/stability_audit_dsh_clinebot.test.mjs`

### Phase 5: Gitea PR, Review & Documentation Update
- Status: in_progress
- Action: Commit via `git-antigravity`, push branch, create Gitea PR, and provide complete evidence report.
