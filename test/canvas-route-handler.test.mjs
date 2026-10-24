import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const path = new URL('../lib/index.js', import.meta.url);
const source = fs.readFileSync(path, 'utf8');
const start = source.indexOf('const unregSandbox =');
const handlerStart = source.indexOf('handler:', start) + 'handler:'.length;
const handlerEnd = source.indexOf('\n      });', handlerStart);
const context = {
  getRejectionStatus: () => undefined, getConnection: () => ({}),
  store: { getSession: id => id === 'canvas-a' ? { id } : null, getLatestSession() { throw new Error('Unexpected fallback'); } },
  watcher: { workspaceDir: '/test' }, buildProjectsHubHtml: () => '<h1>Hub</h1>',
  transpileAndWrap: session => `<h1>${session.id}</h1>`, injectSandboxRuntime: html => html,
  getSandboxHeaders: () => ({ 'Content-Type': 'text/html' })
};
vm.createContext(context);
vm.runInContext('this.handler = ' + source.slice(handlerStart, handlerEnd), context);
function request(url) {
  const result = {};
  context.handler({ url }, { writeHead: status => { result.status = status; }, end: body => { result.body = body; } });
  return result;
}
assert.equal(request('/dsh-live-canvas/sandbox/canvas-a?t=123').status, 200);
const missing = request('/dsh-live-canvas/sandbox/missing-canvas');
assert.equal(missing.status, 404);
assert.equal(missing.body, 'Canvas session not found');
assert.equal(request('/dsh-live-canvas/sandbox/%ZZ').status, 400);
for (const id of ['', 'hub', 'default']) {
  const response = request('/dsh-live-canvas/sandbox/' + id);
  assert.equal(response.status, 200);
  assert.equal(response.body, '<h1>Hub</h1>');
}
for (const status of [401, 403]) {
  context.getRejectionStatus = () => status;
  assert.equal(request('/dsh-live-canvas/sandbox/canvas-a').status, status);
}
console.log('PASS: sandbox handler returns 404 for missing IDs, 400 for invalid encoding, preserves Hub and forwards auth/origin rejections.');
