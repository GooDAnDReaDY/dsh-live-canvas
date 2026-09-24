# dsh-live-canvas

Current release line: **0.2.x** (interactive live preview + security + developer experience).

## Purpose
Real-time Live Canvas preview for DeepSeek Harness (DSH):
- Multi-format in-memory compilation: React 18 Babel Standalone, Vue 3, HTML5 + Tailwind CSS, Lucide Icons, SVG, Mermaid diagrams, and Markdown.
- Interactive WYSIWYG editor and style tweaker with two-way workspace file sync.
- Multi-device matrix preview (Mobile 375px, Tablet 768px, Desktop 1024px) with synchronized scrolling.
- Visual inspection, DOM element annotations, and console telemetry streaming.
- Isolated iframe sandboxing with strict Content Security Policy (CSP) and `SAMEORIGIN`.

## Status
- Package: `@goodandready/dsh-live-canvas`
- Version: see `package.json`
- Verified: `npm test` (all unit test suites pass, 0 fail)

## Paths
- DEV root: `/mnt/external/Project/DEV/dhsplugins/dsh-live-canvas`
- Worktrees: `.worktrees/<branch>` only; DEV root checkout is read-only
- Gitea: `goodandready/dsh-live-canvas` (internal source of truth)
- GitHub: `GooDAnDReaDY/dsh-live-canvas` (sanitized public product mirror only)
- Public showcase: `https://goodandready.app/`
- Production service: `dsh-web.service` on MiniAI (`192.168.1.111`), port 3080

## Entry Points
- Server entry: `lib/index.js` (Cordis plugin `apply`, 25 API routes, WebServer handlers)
- Client entry: `lib/client.js` (Browser bundle for DSH `window.__ModuleLoader__.load()`)
- Bundle patch: `cordis.patch.yml`

## Modules
- `lib/transpiler.js` — In-memory compiler for React, Vue, HTML, SVG, Mermaid, Markdown with LRU cache
- `lib/sandbox.js` — Sandbox security headers (CSP, SAMEORIGIN), DOM inspector runtime, postMessage bridge
- `lib/store.js` — In-memory session store with LRU eviction, snapshots, inspections, logs, disk persistence
- `lib/watcher.js` — Real-time workspace file watcher (`fs.watch`) with debouncing and cached file listing
- `lib/events.js` — Server-Sent Events (SSE) bus for live client reload and event broadcasting
- `lib/security.js` — Loopback address verification and `isTrustedRequest` gate
- `lib/packager.js` — Vite/React project ZIP builder and standalone HTML bundler
- `lib/tools.js` / `lib/tool_defs/*` — AI agent tool definitions (< 600 lines each)
- `lib/updater.js` — In-app plugin updater (`/api/dsh-live-canvas/update`)
