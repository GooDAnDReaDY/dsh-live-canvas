# Task Plan — Issue #104

## Goal
Implement comprehensive functional expansion of Live Canvas:
1. Purge in-plugin Russian from `lib/` and strictly enforce canonical English + Chinese.
2. In-Canvas Mini-Console (intercept iframe console & uncaught errors).
3. In-Canvas Style & Typography Micro-Tweaker.
4. State Presets Switcher (`Default`, `Loading`, `Empty`, `Error`, `Overflow`).
5. Agent Vision Snapshot Loop (`live_canvas_capture_snapshot`).
6. Standalone Single-file HTML export & W3C Design Tokens parser.
7. External Russian localization issue in `goodandready/dsh-russian-lang`.
8. Tests, Documentation, Release preparation.

## Tasks
- [ ] 1. Cleanse `lib/` of Russian text, remove `ru` dict from `lib/client.js`, translate `lib/templates.js` and server messages to English.
- [ ] 2. Implement Mini-Console runtime log bridge in `lib/index.js` and UI in `lib/client.js`.
- [ ] 3. Implement Style Micro-Tweaker in `lib/client.js`.
- [ ] 4. Implement State Presets Switcher in `lib/client.js`.
- [ ] 5. Implement `live_canvas_capture_snapshot` in `lib/tools.js`.
- [ ] 6. Implement standalone HTML export in `lib/packager.js` and W3C tokens in `lib/figma.js`.
- [ ] 7. Add automated test suite `test/features_and_locale_audit.test.mjs`.
- [ ] 8. Register issue in `goodandready/dsh-russian-lang`.
- [ ] 9. Update DESIGN.md and READMEs (en, zh, ru).
- [ ] 10. Run tests and verify zero packaging leaks.
