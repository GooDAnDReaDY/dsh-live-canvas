# Findings — Issue #104

- **Audit Findings**:
  - `lib/client.js` had 110 lines of embedded Russian dictionary, violating DSH localization standard.
  - `lib/templates.js` had Russian mock landing/pricing copy.
  - `lib/index.js`, `sandbox.js`, `transpiler.js`, `faker.js` had Cyrillic logs and comments.
  - Package packaging rules correctly exclude tests and docs via `package.json` "files" array.

### Test Server & Production Staging Findings (v0.2.11 Candidate)
- **JSON Schema Strictness in DSH**: DSH tool compiler (@deepseek-ai/dsh-tools) requires any `type: 'object'` schema to explicitly set `additionalProperties` to a boolean (`true` or `false`). Caught on isolated test server 192.168.1.123 when booting `live_canvas_capture_snapshot`. Fixed in `lib/tools.js` and verified with automated test `Schema Audit`.
- **Combo Loader HTTP 200**: DSH serves client bundles via combo loader with cache-busting `&rev=...`. Verified returning HTTP 200 on both test server (192.168.1.123:3082) and production (192.168.1.111:3080).
- **Test Server Cleanup**: Test server cleaned up and restored to `active / DSH_TEST_OK` state.
- **Production Staging**: Staged candidate 0.2.11 in `/home/vadim/.dsh/profiles/web`, restarted `dsh-web.service` cleanly.
