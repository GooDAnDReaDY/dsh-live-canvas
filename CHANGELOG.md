# Changelog

Notable changes to `@goodandready/dsh-live-canvas`.

## 0.2.28

### Fixed
- **Mobile QR Code ISO/IEC 18004 Compliance**: Replaced custom hand-rolled QR generator with standard `qrcode` dependency, guaranteeing 100% ZXing decoding accuracy for arbitrary URL lengths and payloads (#181).
- **Multi-File ESM Bundler Scoping & Repeated Imports**: Wrapped inlined modules in IIFE closures with exported scope objects to eliminate top-level identifier collisions across modules; resolved repeated imports from the same file and JSON named import aliases (#194).
- **Session Dependency Cache Invalidation**: Extended cache key fingerprinting to hash imported local child files, automatically invalidating transpile cache upon dependency file modifications (#174).
- **Vue 3 SFC Preview Engine**: Added support for `<script setup>` top-level variable extraction and automatic exposure to `<template>`; corrected Options API server-side `export default` transformation; guarded Tailwind initialization for offline environments (#178).
- **DOM Class Persistence & Precise Targeting**: Updated `save-classes` handler to target elements by exact selector ID/class and preserved pristine class names before DOM mutation (#168).
- **Standalone HTML Export Offline Self-Containment**: Pre-rendered static component markup directly into `<div id="root">` / `<div id="app">` for immediate offline preview fallback without network access (#179).
- **Visual Audit Viewport & CSS Inspection**: Added support for specific viewports (`mobile`, `tablet`, `desktop`); added inspection of CSS `inline-size`, `min-inline-size`, `width`, and `min-width` in `<style>` blocks and inline styles, failing audit on viewport overflow (#183).
- **Vision Import Contract Alignment**: Reconciled documentation and tool schemas across READMEs, DESIGN.md, and tool definitions to clarify reference import scaffolding (#182).
- **Projects Hub Demo Serialization**: Serialized demo source templates (`CALC_DEMO_CODE`, `DASH_DEMO_CODE`) into Projects Hub client script (#208).
- **Console Telemetry Bridge**: Routed validated sandbox log events from trusted parent client to `/dsh-live-canvas/api/logs` via same-origin POST (#209).
- **Test Environment & Options Contract**: Created `test/_setup.mjs` ensuring complete isolation of test runs from caller's `~/.dsh` environment; updated workspace roots option contract (#177, #207).

## 0.2.27

### Added
- **Design System Themes Selector & Dynamic CSS Variables**: Added interactive theme dropdown selector in Studio toolbar populated from `THEME_PRESETS`; updated `GET /dsh-live-canvas/api/themes` with ready-to-use `cssVariables`, and added `dlc_set_theme_preset` message handling in sandbox iframe to dynamically apply theme CSS variables (#193).
- **Interactive Artifact Templates API**: Added `GET /dsh-live-canvas/api/artifact-template?type=(wireframe|plan|diagram|prototype)` endpoint generating live, interactive HTML artifacts using domain model engines (`wireframe.js`, `plan.js`, `diagram.js`, `prototype.js`) instead of static stubs (#192).
- **Full Studio Feedback i18n Localization**: Localized all toast feedback notifications in `lib/client.js` with 100% key parity across `en` (161 keys) and `zh` (161 keys) dictionaries, maintaining strictly zero Cyrillic characters in `lib/*.js` (#196).

### Fixed
- **Vision Import Path Validation & Genuine Visual Reference Layout**: Updated `live_canvas_vision_import` to validate `imagePath` and `imageUrl` fail-closed; if no pre-generated code is supplied, imports a genuine visual reference layout embedding the verified image (`reference_import` mode) rather than fabricating dummy UI layouts (#182).
- **Visual Audit DOM & Structural Verification**: Refactored `live_canvas_visual_audit` to reject non-existent or empty canvas sessions (fail-closed); performs comprehensive inspections for missing image `alt` tags, empty buttons, unlabelled inputs, and fixed mobile viewport width overflows (`w-[...px]` > 360px), calculating real scores and reporting unverified dynamic runtime criteria (#183).
- **Studio Populate Mock Integration & Sandbox Interceptor**: Connected the «⚡ Mocks» toolbar button to `POST /dsh-live-canvas/api/mock` to persist datasets to session state, postMessage `dlc_set_mock_data` to sandbox iframe, and dynamically intercept matching fetch requests (#189).

## 0.2.26

### Added
- **Vue 3 SFC Preview Support**: Added full support for Vue 3 Single File Components with `<template>` and `<script setup>` syntax, automatic component detection in `autoDetectType`, live runtime compilation via Vue 3 global CDN in `buildVueWrapper`, and officially added `'vue'` to the `componentType` schema enum (#178).
- **Scannable ISO/IEC 18004 Mobile QR Code**: Replaced placeholder box styling with a pure-JS QR code matrix generator (`createQrMatrix` & `generateSimpleQrSvg`) in `lib/share.js`, encoding the actual canvas URL into a scannable SVG (#181).
- **W3C Design Tokens DTCG Integration**: Extended `parseDesignTokens` to support W3C DTCG `$value`/`$type` syntax without emitting metadata CSS variables; added `apply_tokens` action in `live_canvas_figma_bridge` and `POST /dsh-live-canvas/api/tokens` HTTP endpoint (#191).
- **Host Web Audio FX & SSE Sound Playback**: Integrated Web Audio synthesizer into host client (`lib/client.js`), added SSE `sound` event broadcasting to `eventHub` and `live_canvas_sound_fx`, and enabled tactical audio feedback (#185).

### Fixed
- **Multi-File Bundler Default Import Alias Bug**: Fixed unexpanded literal `$1` emission in `bundleMultiFileReact`; properly aliases default exported functions and classes to imported identifiers (`const Alias = OrigName`), and added local `.json` file inlining and named aliases (`import { orig as alias }`) (#194).
- **Standalone HTML Bundle React/JSX Execution**: Updated `buildStandaloneHtmlBundle` to compile React components using React 18, Babel runtime, and root mount point instead of dumping uncompiled JSX inside a static div (#179).
- **Figma Export Artifact Delivery**: Updated `live_canvas_figma_bridge` to return `figmaSvg`, `title`, and `instructions` in the tool output schema and execution response instead of discarding the artifact (#184).

## 0.2.25

### Added
- **Split-View Code Editor Drawer**: Implemented collapsible `dlc-code-drawer` panel in client UI with keyboard shortcut <kbd>Ctrl+S</kbd> / <kbd>Cmd+S</kbd>, live code loading from `GET /api/sessions?canvasId=...`, and disk-backed persistence (#186).
- **Two-Way Tailwind Class Persistence**: Implemented disk-backed element class persistence in `POST /api/save-classes` for both HTML (`class="..."`) and JSX/TSX (`className="..."`), broadcasting both `classes_updated` and `update` SSE events (#168).

### Fixed
- **Content Saving and Text Insertion API**: Supported `fullContent`, `content`, `appendContent`, and `mode` (`replace`, `insert`, `append`), with strict payload validation (400 on empty, 422 with `{ replaced: false }` if text to replace is not found) and disk synchronization (#167).
- **Relative Path Session Persistence & Empty File Cache Invalidation**: Allowed relative paths within `workspaceRoots` to survive harness restart in `PreviewStore._loadFromDisk()`. Ensured empty files (`""`) update session state cleanly without leaving stale cached previews (#175).
- **Canary Content in HTML Snapshots**: Overloaded `buildStandaloneHtml` to accept session objects or strings; ensured `live_canvas_capture_snapshot` passes session metadata and returns full rendered HTML (#180).
- **Settings Enforcement**: Wired `defaultViewport`, `enableHotReload`, `enableFileWatcher`, and `autoOpenOnHtmlGen` settings into `PreviewStore`, `WorkspaceWatcher`, and client UI (#190).

## 0.2.24

### Security & Isolation
- **Eliminated `allow-same-origin` from All Sandboxed Iframes**: Removed the final remaining `allow-same-origin` sandbox directive from `lib/timetravel.js`, achieving zero occurrences across the entire package. All frame interactions (`save_text_edit`, `save_classes`, `save_reorder`, `annotate`, `inspect`) now communicate via a secure `postMessage` bridge with the parent host frame (#198).
- **Private LAN Mode Support (`dsh-lanmode`) & Fail-Closed Guard**: Added `isPrivateLanAddress` recognizing RFC 1918 private subnets in `isTrustedRequest`, eliminating HTTP 403 Forbidden errors when accessing canvas previews across the local network. Fixed fail-open socket bug when remoteAddress cannot be resolved (#199, #156).
- **Restricted Internal API Read Routes**: Enforced `isTrustedRequest` on all internal `/dsh-live-canvas/api/*` endpoints (including `GET /api/sessions`, `/api/workspace-files`, `/api/logs`), protecting workspace structure and active sessions from cross-site discovery (#157).
- **Strict Sandbox CSP & Framing Policy**: Enforced `X-Frame-Options: SAMEORIGIN` and strict CSP headers on preview endpoints (#161).

### Fixed
- **Safe Substring Replacement for WYSIWYG Saves**: Implemented `safeReplaceSubstring` to prevent regex replacement pattern expansion (`$1`, `$&`, `$'`) from user text, and added `occurrenceIndex` targeting matching DOM elements to avoid corrupting duplicate text (#159, #200).
- **Accurate Buffer Byte Accounting & Persistence Limits**: Rewrote `parseBody` to check `Content-Length` headers before streaming and measure bytes by `Buffer.byteLength` rather than UTF-16 code units. Enforced a 5 MB per session content limit and 10 MB maximum file size on `sessions.json` (#158, #201).
- **Unlink on Disk Wipe in PreviewStore**: Fixed `store.clear(wipeDisk = true)` to remove the persistence file using `fs.unlinkSync` instead of saving cleared maps (#160).
- **Valid npm Package Name Sanitization**: Added `sanitizeNpmPackageName` in `packager.js` prefixing purely numeric names and Node core builtins with `pkg-`, and filtering invalid characters (#162).
- **Cordis Logger Integration**: Created `lib/logger.js` bound to `ctx.logger('dsh-live-canvas')` and cleaned up direct `console.*` calls across host modules (#150).

## 0.2.23

### Added
- **Dedicated Time-Travel Route**: Registered standalone timeline viewer endpoint `/dsh-live-canvas/timetravel/:id` on webServer and API router with automatic unregister disposer (#153).
- **WorkspaceWatcher Agent Tool Injection**: Forwarded live watcher instance into `registerLiveCanvasTools` for direct operational control via `live_canvas_watch` (#172).
- **Flexible PreviewStore Compatibility Layer**: Added `addInspection`, `addLog`, `addAnnotation`, `setControlValues`, `getControls`, `getControlValues`, `createSession`, `getInspections` aliases supporting both multi-argument and unified record formats (#154).
- **Universal Export Endpoint**: Supported `GET /dsh-live-canvas/api/export?canvasId=...` alongside path-based `/api/export/:id`, and updated chat cards to link directly to export (#188).

### Fixed
- **Sandbox Browser Runtime Syntax & Reorder**: Removed duplicate `origLog` declaration and duplicate telemetry block; bound reorder POST handler to declared `SAVE_REORDER_API` constant (#163, #170).
- **Cordis Configuration Volatile Wrapping**: Implemented `.volatile()` polyfill on `Schema.prototype` and marked all plugin settings as volatile to avoid unwanted persistence of dynamic config (#149).
- **REST API Route URL Parsing**: Declared `urlObj`, `url`, and `urlPath` in API handler, resolving `ReferenceError: url is not defined` on standalone export route (#152).
- **Design Tools Safety**: Imported `fs` and `resolveSafePath` into design tools, fixing unhandled reference errors in `live_canvas_refine_element` and `live_canvas_insert_block` (#155).
- **Agent Tool Standalone HTML Export**: Imported `buildStandaloneHtml` into `preview_tools.js` for `live_canvas_export` (#171).
- **Nullable Schemas for DSH Agent Tools**: Converted `inspected`, `lastAnnotation`, and `writtenDir` output schemas to `oneOf: [{ type: '...' }, { type: 'null' }]` for strict validator compliance (#173).
- **Transpiler Cache Key & Timestamp Invalidation**: Switched cache key generation to SHA-256 digest covering full source code, custom CSS, custom JS, variants, and workspace dir, and refreshed session timestamp when disk files change (#174).
- **Client Active Session Resolution**: Removed synthetic `file_*` identifier creation, falling back cleanly to real session IDs or the hub (#187).
- **Security, Frame Isolation & Workspace Roots (Block 1)**: Enforced strict root boundaries (#164), removed `allow-same-origin` from sandboxed iframes (#165), protected non-HTML files from visual reorder overwrite (#166), canonicalized `DSH_HOME` data persistence (#176, #177), and secured Projects Hub click handlers (#195).

## 0.2.22

### Added
- **DSH 0.1.7 Settings Policy Configuration**: Host half now uses `settings.configure({ auto: false }, ctx.fiber)` managed under `ctx.effect` with cleanup disposer, eliminating calls to removed `settings.register` (#142).
- **Canonical Updater Routes and Aliases**: Client card now targets canonical `/api/dsh-live-canvas/update`, while the host registers both `/api/dsh-live-canvas/update` and `/dsh-live-canvas/api/update` alias in router and `API_ROUTE_METHODS` for seamless compatibility (#144).
- **Reactive Settings Snapshot Subscription**: Client settings card subscribes to `configForms` scope invalidations via `scope.subscribe` and `React.useSyncExternalStore` (#146).

### Fixed
- **POST Route Body Parsers & JSON Error Handling**: Unified `parseBody` with full `new Promise((resolve, reject))` error rejection, defined `readJsonBody` alias, and eliminated `ReferenceError` on `save-reorder` and `annotations/resolve` routes (#143).
- **Locale Registration Effect Ownership**: Client i18n dictionaries are registered under `ctx.effect('dsh-live-canvas: locale')` with cleanup disposer, preventing duplicate collisions during HMR and repeat apply (#145).
- **Tool Stability Test Contract Alignment**: Adjusted `stability_audit_dsh_clinebot.test.mjs` to test invalid model arguments against `@deepseek-ai/dsh-tools` validation contracts without bypassing runtime schemas (#147).

## 0.2.21

### Added
- **LRU In-Memory Compilation Caching in `transpiler.js`**: `transpileAndWrap` caches up to 50 compiled documents using a composite key (`id`, `updatedAt`, `theme`, `componentType`, content signature), delivering O(1) instantaneous responses during multi-device matrix rendering (`/matrix`), tab switching, and SSE reloads (#131).
- **HTTP 405 Method Not Allowed Handling**: Declarative `API_ROUTE_METHODS` map for all 25 canvas API endpoints returning canonical HTTP 405 with `Allow` headers when routes are requested with unsupported HTTP verbs (#132).
- **Workspace File Listing Cache in `watcher.js`**: Short-lived 3000ms TTL cache for `listWorkspaceFiles` with automated invalidation on `fs.watch` events, eliminating synchronous directory scan spikes during file picker drawer toggling (#134).
- **Internal DEV Contract Documentation**: Added `AGENTS.md`, `index.md`, and executable `deploy.sh` verification and deployment script; strictly excluded from npm and mirror distributions (#137).

### Fixed
- **UI Design System Color Conformance**: Replaced 4 hardcoded hex colors (`#ffffff` and `#fff`) in `client.js` with semantic DSH design token `var(--dsw-alias-text-contrast)` (#133).

## 0.2.20

### Fixed
- Settings no longer wait on the removed settingsScope service. The client uses configForms (#135).

## 0.2.19

### Fixed
- **Settings form can open.** The host registered the package name as the
  settings namespace. That name contains `@` and `/`, and the settings service
  only accepts a lowercase hyphenated identifier, so the form stayed on
  "unavailable". The namespace is now `dsh-live-canvas` on both sides.

## 0.2.18

### Fixed
- **Plugin page opens instead of showing a component error.** The settings card
  read the settings service before the client declared it, and the Plugins page
  mounts that card twice: once as the one-line description and once as the form.
  Both copies crashed. The client now declares the settings service. The
  description stays a single line under the title, and the form shows a loading
  or unavailable state when the service is not ready.

## 0.2.17

### Fixed
- **Settings reachable again on the plugin's own page**: the current DSH core
  (0.1.6-alpha.2) renders a plugin's configuration page only for entries registered
  in the plugin-list seat `plugins.item`. The view-aware card is now registered there
  (`id: 'dsh-live-canvas'`, order 60, static label); the row seat and the legacy
  `settings.plugin.item` card stay as fallbacks.

## 0.2.16

### Fixed
- **Settings reachable again**: the card registered into `settings.plugin.item`, a
  slot the current DSH core (0.1.6-alpha.2) no longer renders, so the plugin's
  settings were unreachable. The surface now registers into the Plugins page row
  seat `plugins.row.config` first, keyed
  `@goodandready/dsh-live-canvas#dsh-live-canvas` (`rowConfigKey(package, rowId)`):
  the plugin's row gains a configure control whose page is the settings form
  (`view: 'page'`, open and without our card chrome — the host page draws the title,
  icon, crumb and padding) plus a one-line state for `view: 'summary'`. The legacy
  seat stays registered as a fallback for older cores.

### Added
- This changelog.
