import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';

import { resolveDshHome, apply } from '../lib/index.js';
import { PreviewStore } from '../lib/store.js';
import { bundleMultiFileReact, buildDiffWrapper, buildMatrixWrapper, buildGalleryWrapper } from '../lib/transpiler.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = options.headers || {};

  const res = new EventEmitter();
  res.headers = {};
  res.body = '';
  res.statusCode = 200;
  res.ended = false;

  res.writeHead = (status, headers) => {
    res.statusCode = status;
    res.headers = { ...res.headers, ...headers };
  };
  res.write = (chunk) => {
    res.body += chunk;
    return true;
  };
  res.end = (chunk) => {
    if (chunk) res.body += chunk;
    res.ended = true;
  };

  return { req, res };
}

test('Issue #164: File bindings and imports strictly enforce workspaceRoots', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-block1-roots-'));
  const allowedDir = path.join(tmpDir, 'allowed');
  const forbiddenDir = path.join(tmpDir, 'forbidden');
  fs.mkdirSync(allowedDir, { recursive: true });
  fs.mkdirSync(forbiddenDir, { recursive: true });

  const allowedFile = path.join(allowedDir, 'App.jsx');
  const forbiddenFile = path.join(forbiddenDir, 'Secret.jsx');
  fs.writeFileSync(allowedFile, 'export default function App() { return <div>App</div>; }', 'utf8');
  fs.writeFileSync(forbiddenFile, 'export default function Secret() { return <div>Secret</div>; }', 'utf8');

  // 1. PreviewStore ignores filePath outside workspaceRoots
  const store = new PreviewStore({ workspaceRoots: [allowedDir] });
  const session = store.createOrUpdateSession({
    id: 'test-roots',
    title: 'Test Roots',
    filePath: forbiddenFile,
    content: '<div>Override</div>'
  });
  assert.equal(session.filePath, null, 'filePath outside workspaceRoots must be discarded in createOrUpdateSession');

  // 2. live_canvas_preview agent tool rejects filePath outside roots even if content is provided
  const tools = [];
  const mockCtx = {
    tools: { register: (t) => tools.push(t) }
  };
  registerLiveCanvasTools(mockCtx, store, { broadcast: () => {} }, {
    getWorkspaceRoots: () => [allowedDir]
  });
  const previewTool = tools.find(t => t.name === 'live_canvas_preview');
  assert.ok(previewTool, 'live_canvas_preview tool must be registered');

  const toolResult = await previewTool.execute({
    filePath: forbiddenFile,
    content: '<div>Malicious probe</div>'
  });
  assert.equal(toolResult.success, false, 'live_canvas_preview must reject forbidden filePath');
  assert.equal(toolResult.code, 'ERR_PATH_OUTSIDE_ROOTS');

  // 3. bundleMultiFileReact rejects relative traversal imports resolving outside allowedRoots
  const rootComponent = path.join(allowedDir, 'Root.jsx');
  fs.writeFileSync(rootComponent, "import Secret from '../forbidden/Secret.jsx';\nexport default function Root() { return <Secret />; }", 'utf8');

  const rootCode = fs.readFileSync(rootComponent, 'utf8');
  const bundleResult = bundleMultiFileReact(rootCode, {
    filePath: rootComponent,
    workspaceRoots: [allowedDir]
  });
  assert.ok(bundleResult, 'bundleMultiFileReact returns result');
  assert.ok(!bundleResult.bundledCode.includes('Secret.jsx'), 'Forbidden module path must not be inlined');
  assert.ok(!bundleResult.bundledCode.includes('<div>Secret</div>'), 'Forbidden module code must not be inlined');

  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

test('Issue #165: Browser isolation removes allow-same-origin and prevents parent DOM access', () => {
  const diffHtml = buildDiffWrapper('<h1>A</h1>', '<h1>B</h1>');
  assert.ok(!diffHtml.includes('allow-same-origin'), 'Diff wrapper must not include allow-same-origin');
  assert.ok(diffHtml.includes('sandbox="allow-scripts allow-forms allow-modals"'), 'Diff wrapper must have opaque sandbox');

  const matrixHtml = buildMatrixWrapper('<h1>Matrix</h1>');
  assert.ok(!matrixHtml.includes('allow-same-origin'), 'Matrix wrapper must not include allow-same-origin');
  assert.ok(matrixHtml.includes('sandbox="allow-scripts allow-forms allow-modals"'), 'Matrix wrapper must have opaque sandbox');

  const galleryHtml = buildGalleryWrapper([{ id: 'v1', name: 'Var 1', content: '<h1>Var 1</h1>' }], { title: 'Gallery' });
  assert.ok(!galleryHtml.includes('allow-same-origin'), 'Gallery wrapper must not include allow-same-origin');
  assert.ok(galleryHtml.includes('sandbox="allow-scripts allow-forms allow-modals"'), 'Gallery wrapper must have opaque sandbox');

  // Verify client.js has zero occurrences of allow-same-origin
  const clientJs = fs.readFileSync(path.join(process.cwd(), 'lib/client.js'), 'utf8');
  assert.ok(!clientJs.includes('allow-same-origin'), 'lib/client.js must contain zero occurrences of allow-same-origin');
});

test('Issue #166: Visual reorder preserves non-HTML source and guards outer document structure', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-block1-reorder-'));
  const testDshHome = path.join(tmpDir, 'dsh-home');
  const workspaceDir = path.join(tmpDir, 'workspace');
  fs.mkdirSync(testDshHome, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  const originalDshHome = process.env.DSH_HOME;
  process.env.DSH_HOME = testDshHome;

  const htmlFile = path.join(workspaceDir, 'page.html');
  const jsxFile = path.join(workspaceDir, 'Component.jsx');
  fs.writeFileSync(htmlFile, '<!DOCTYPE html><html><head><title>Test</title></head><body><section>1</section><section>2</section></body></html>', 'utf8');
  const originalJsx = 'export default function Comp() { return <div><section>1</section><section>2</section></div>; }';
  fs.writeFileSync(jsxFile, originalJsx, 'utf8');

  const routes = [];
  const cleanups = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('webServer')) {
        cb({ webServer: { register: (r) => routes.push(r) } });
      }
    },
    tools: { register: () => {} },
    effect: (fn) => {
      const c = fn();
      if (typeof c === 'function') cleanups.push(c);
      return c;
    }
  };

  apply(mockCtx, {
    workspaceDir,
    workspaceRoots: [workspaceDir],
    enableFileWatcher: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route must be registered');

  // Create sessions for both files
  const prevReq1 = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
  const p1 = apiRoute.handler(prevReq1.req, prevReq1.res);
  prevReq1.req.emit('data', JSON.stringify({ filePath: htmlFile }));
  prevReq1.req.emit('end');
  await p1;
  const htmlSession = JSON.parse(prevReq1.res.body);

  const prevReq2 = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
  const p2 = apiRoute.handler(prevReq2.req, prevReq2.res);
  prevReq2.req.emit('data', JSON.stringify({ filePath: jsxFile, componentType: 'react' }));
  prevReq2.req.emit('end');
  await p2;
  const jsxSession = JSON.parse(prevReq2.res.body);

  // Attempt save-reorder on JSX file -> MUST BE REJECTED WITH 400
  const reorderJsxReq = createMockReqRes({ url: '/dsh-live-canvas/api/save-reorder', method: 'POST' });
  const pJsx = apiRoute.handler(reorderJsxReq.req, reorderJsxReq.res);
  reorderJsxReq.req.emit('data', JSON.stringify({
    canvasId: jsxSession.canvasId,
    reorderedHtml: '<section>2</section><section>1</section>'
  }));
  reorderJsxReq.req.emit('end');
  await pJsx;

  assert.equal(reorderJsxReq.res.statusCode, 400, 'save-reorder on non-HTML file must return HTTP 400');
  const jsxAfter = fs.readFileSync(jsxFile, 'utf8');
  assert.equal(jsxAfter, originalJsx, 'JSX file content must remain completely unchanged');

  // Attempt save-reorder on HTML file -> MUST PRESERVE <head> and <!DOCTYPE>
  const reorderHtmlReq = createMockReqRes({ url: '/dsh-live-canvas/api/save-reorder', method: 'POST' });
  const pHtml = apiRoute.handler(reorderHtmlReq.req, reorderHtmlReq.res);
  reorderHtmlReq.req.emit('data', JSON.stringify({
    canvasId: htmlSession.canvasId,
    reorderedHtml: '<section>2</section><section>1</section>'
  }));
  reorderHtmlReq.req.emit('end');
  await pHtml;

  assert.equal(reorderHtmlReq.res.statusCode, 200, 'save-reorder on HTML file must succeed with HTTP 200');
  const htmlAfter = fs.readFileSync(htmlFile, 'utf8');
  assert.ok(htmlAfter.includes('<!DOCTYPE html>'), 'HTML document doctype must be preserved');
  assert.ok(htmlAfter.includes('<title>Test</title>'), 'HTML document head must be preserved');
  assert.ok(htmlAfter.includes('<section>2</section><section>1</section>'), 'Body contents must be reordered');

  for (const c of cleanups) c();
  if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});

test('Issue #176 & #177: Persistence directory strictly respects DSH_HOME', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-home-env-'));
  const originalDshHome = process.env.DSH_HOME;
  try {
    process.env.DSH_HOME = tmpHome;
    const resolved = resolveDshHome();
    assert.equal(resolved, path.resolve(tmpHome), 'resolveDshHome must return DSH_HOME when set');
  } finally {
    if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
  }
});

test('Issue #195: Projects Hub uses safe data-attributes instead of inline string handlers', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-block1-hub-'));
  const testDshHome = path.join(tmpDir, 'dsh-home');
  const workspaceDir = path.join(tmpDir, 'workspace');
  fs.mkdirSync(testDshHome, { recursive: true });
  fs.mkdirSync(workspaceDir, { recursive: true });

  const trickyFile = path.join(workspaceDir, "test' onclick='alert(1)'.html");
  fs.writeFileSync(trickyFile, '<h1>Safe</h1>', 'utf8');

  const originalDshHome = process.env.DSH_HOME;
  process.env.DSH_HOME = testDshHome;

  const routes = [];
  const cleanups = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('webServer')) {
        cb({ webServer: { register: (r) => routes.push(r) } });
      }
    },
    tools: { register: () => {} },
    effect: (fn) => {
      const c = fn();
      if (typeof c === 'function') cleanups.push(c);
      return c;
    }
  };

  apply(mockCtx, {
    workspaceDir,
    workspaceRoots: [workspaceDir],
    enableFileWatcher: false
  });

  const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');
  assert.ok(sandboxRoute, 'Sandbox route must be registered');

  const hubReq = createMockReqRes({ url: '/dsh-live-canvas/sandbox/hub', method: 'GET' });
  await sandboxRoute.handler(hubReq.req, hubReq.res);

  assert.equal(hubReq.res.statusCode, 200);
  const hubHtml = hubReq.res.body;

  // Verify no inline string onclick calls exist for openSession, openFile, loadDemo
  assert.ok(!hubHtml.includes('onclick="openSession('), 'No inline openSession onclick');
  assert.ok(!hubHtml.includes('onclick="openFile('), 'No inline openFile onclick');
  assert.ok(!hubHtml.includes('onclick="loadDemo('), 'No inline loadDemo onclick');

  // Verify data-* attributes and event delegation exist
  assert.ok(hubHtml.includes('data-file-path='), 'Must use data-file-path attribute');
  assert.ok(hubHtml.includes('addEventListener("click"'), 'Must use safe event delegation listener');

  for (const c of cleanups) c();
  if (originalDshHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = originalDshHome;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
});