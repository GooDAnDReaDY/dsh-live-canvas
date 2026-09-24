# AGENTS.md — @goodandready/dsh-live-canvas

Project-specific rules only. Root `/mnt/external/Project/DEV/AGENTS.md` still applies.

## Identity
- Package name: `@goodandready/dsh-live-canvas` (must match `package.json`, `cordis.patch.yml` `name:`, client `id: '@goodandready/dsh-live-canvas'`, and server `export const name = '@goodandready/dsh-live-canvas'`)
- Gitea: `goodandready/dsh-live-canvas`
- Agent git wrapper: `git-<agent>` on MiniAI (`/home/vadim/.ssh/bin/git-antigravity`); never bare `git` for commit/push

## Layout & Worktrees
- Root checkout is read-only. All modifications happen strictly in `.worktrees/<branch>`
- Single DEV folder + single production profile (`dsh-web.service` on MiniAI)
- Client bundle: `lib/client.js` must remain self-contained (DSH ModuleLoader serves one browser entry without an in-browser bundler)

## Commands
```bash
npm test
# Equivalent to: node --test test/*.test.mjs
```
- Tests must execute locally without DSH harness and without external network connectivity
- Zero failures permitted in automated test suites

## Security & Architectural Constraints
- Loopback isolation: all mutating POST routes and private endpoints require validation via `isTrustedRequest` (fail-closed, loopback/host origin verification)
- No wildcard CORS: `Access-Control-Allow-Origin: *` is strictly forbidden
- Zero empty catches: all `catch` blocks in `lib/` must either log or contain explicit intention comments (`/* ignoreOptionalFailure */`, `/* bestEffort */`, `/* intentional */`)
- Zero Cyrillic: `lib/*.js` must not contain Cyrillic characters; user-facing strings belong in locale files and client UI translations
- Module size budget: tool definitions in `lib/tool_defs/` must remain < 600 lines; monolithic core files (`client.js`, `index.js`, `transpiler.js`, `sandbox.js`) must maintain architectural rationale in `docs/design/DESIGN.md` Section 13

## Publication Safety (MUST NOT)
- `AGENTS.md`, `index.md`, and `deploy.sh` are internal project documentation and MUST NEVER be published to npm or mirrored to public GitHub
- Exclusion is guaranteed by `package.json` `files` allowlist (`lib/`, `cordis.patch.yml`, `README.md`, `LICENSE`) and `scripts/publish-github.sh` `FORBIDDEN` list
- Do not use force flags (`--force`, `git push -f`, `npm publish --force`) under any circumstances
