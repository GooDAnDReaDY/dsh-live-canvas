import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('sanitizePath rejects sibling directory traversal attempts', async () => {
  const { sanitizePath } = await import('../lib/sandbox.js');
  const baseDir = path.resolve('/tmp/test-live-canvas-base');
  
  // Sibling folder with same prefix
  assert.throws(() => {
    sanitizePath(baseDir, '../test-live-canvas-base-sibling/secret.txt');
  }, /Security Violation/);

  // Normal relative file
  const safe = sanitizePath(baseDir, 'sub/file.html');
  assert.ok(safe.startsWith(baseDir));
});

test('lib/index.js can be synchronously required without ERR_REQUIRE_ASYNC_MODULE', () => {
  const mod = require('../lib/index.js');
  assert.ok(mod, 'lib/index.js must be requireable synchronously');
  assert.equal(typeof mod.apply, 'function');
  assert.equal(mod.name, '@goodandready/dsh-live-canvas');
});

test('lib/tools.js registers all 30 tools and handles null args without throwing', async () => {
  const { registerLiveCanvasTools } = await import('../lib/tools.js');
  const { PreviewStore } = await import('../lib/store.js');
  const { EventHub } = await import('../lib/events.js');

  const registeredTools = [];
  const mockCtx = {
    tools: {
      register(def) {
        registeredTools.push(def);
      }
    }
  };

  const store = new PreviewStore();
  const eventHub = new EventHub();

  registerLiveCanvasTools(mockCtx, store, eventHub, { workspaceDir: process.cwd() });
  assert.equal(registeredTools.length, 30, 'Should register all 30 tools');

  for (const tool of registeredTools) {
    assert.equal(typeof tool.execute, 'function', `Tool ${tool.name} must have execute function`);
    // Test execution with null - must NOT throw TypeError
    try {
      const res = await tool.execute(null);
      assert.ok(res !== undefined, `Tool ${tool.name} executed cleanly with null`);
    } catch (err) {
      assert.fail(`Tool ${tool.name} threw uncaught error on null: ${err.message}`);
    }
  }
});

test('generator modules gracefully handle null and undefined input', async () => {
  const { buildCrudTemplate } = await import('../lib/crud.js');
  const { buildDeploymentBundle } = await import('../lib/deploy.js');
  const { buildDiagramTemplate } = await import('../lib/diagram.js');
  const { buildPlanTemplate } = await import('../lib/plan.js');
  const { buildPrototypeTemplate } = await import('../lib/prototype.js');
  const { buildTimeTravelViewer } = await import('../lib/timetravel.js');
  const { buildWireframeTemplate } = await import('../lib/wireframe.js');
  const { buildDiffWrapper, buildMatrixWrapper } = await import('../lib/transpiler.js');

  assert.equal(typeof buildCrudTemplate(null), 'string');
  assert.equal(typeof buildDeploymentBundle(null), 'object');
  assert.equal(typeof buildDiagramTemplate(null), 'string');
  assert.equal(typeof buildPlanTemplate(null), 'string');
  assert.equal(typeof buildPrototypeTemplate(null), 'string');
  assert.equal(typeof buildTimeTravelViewer(null), 'string');
  assert.equal(typeof buildWireframeTemplate(null), 'string');
  assert.equal(typeof buildDiffWrapper(null, null), 'string');
  assert.equal(typeof buildMatrixWrapper(null), 'string');
});

test('client.js exports ErrorBoundary and conforms to dsh-clinebot design system', () => {
  const clientPath = path.resolve('lib/client.js');
  const code = fs.readFileSync(clientPath, 'utf8');

  // Must export ErrorBoundary
  assert.ok(code.includes('module.exports.ErrorBoundary = ErrorBoundary;'), 'Must export ErrorBoundary');

  // Zero occurrences of deprecated dark hex colors in styles
  const deprecatedHex = ['#18181b', '#27272a', '#3f3f46', '#09090b'];
  for (const hex of deprecatedHex) {
    assert.ok(!code.includes(hex), `client.js must not contain hardcoded dark hex ${hex}`);
  }

  // Must use native DSH token classes matching dsh-clinebot
  assert.ok(code.includes('.dlc-section-card'), 'Must define .dlc-section-card');
  assert.ok(code.includes('.dlc-badge-ok'), 'Must define .dlc-badge-ok');
  assert.ok(code.includes('.dlc-badge-warn'), 'Must define .dlc-badge-warn');
  assert.ok(code.includes('.dlc-badge-bad'), 'Must define .dlc-badge-bad');
  assert.ok(code.includes('var(--dsw-alias-bg-layer-3)'), 'Must use --dsw-alias-bg-layer-3');
  assert.ok(code.includes('var(--dsw-alias-border-l2)'), 'Must use --dsw-alias-border-l2');
});
