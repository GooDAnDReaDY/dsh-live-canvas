import { isPrivateLanAddress, safeReplaceSubstring, isTrustedRequest } from '../lib/security.js';
import { sanitizeNpmPackageName } from '../lib/packager.js';
import { setLogger, logger } from '../lib/logger.js';
import { getSandboxHeaders } from '../lib/sandbox.js';
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
  req.socket = options.socket || { remoteAddress: '127.0.0.1' };

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
test('Issue #198: Zero allow-same-origin occurrences in all lib files and client postMessage bridge', () => {
  const libDir = path.join(process.cwd(), 'lib');
  const files = fs.readdirSync(libDir, { recursive: true }).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(libDir, f), 'utf8');
    assert.ok(
      !content.includes('allow-same-origin'),
      `File lib/${f} must contain zero occurrences of allow-same-origin`
    );
  }

  // Client message bridge handlers
  const clientJs = fs.readFileSync(path.join(libDir, 'client.js'), 'utf8');
  assert.ok(clientJs.includes("e.data.type === 'dlc_save_text_edit'"), 'client.js must handle dlc_save_text_edit');
  assert.ok(clientJs.includes("e.data.type === 'dlc_save_classes'"), 'client.js must handle dlc_save_classes');
  assert.ok(clientJs.includes("e.data.type === 'dlc_save_reorder'"), 'client.js must handle dlc_save_reorder');
});

test('Issue #199 & #156: isTrustedRequest accepts private LAN IP and strictly rejects absent sockets', () => {
  // #156: Absent socket must fail-closed
  assert.equal(isTrustedRequest({}), false, 'Request with no socket/connection must be rejected');
  assert.equal(isTrustedRequest({ socket: {} }), false, 'Request with empty socket must be rejected');
  assert.equal(isTrustedRequest({ socket: { remoteAddress: null } }), false, 'Request with null remoteAddress must be rejected');

  // #199: Private LAN IPs
  assert.equal(isPrivateLanAddress('192.168.1.100'), true);
  assert.equal(isPrivateLanAddress('10.0.0.5'), true);
  assert.equal(isPrivateLanAddress('172.20.0.1'), true);
  assert.equal(isPrivateLanAddress('8.8.8.8'), false);

  const lanReq = {
    headers: { host: '192.168.1.111:3080', origin: 'http://192.168.1.111:3080' },
    socket: { remoteAddress: '192.168.1.50' }
  };
  assert.equal(isTrustedRequest(lanReq), true, 'Private LAN request with matching host/origin must be trusted');

  const lanCrossSite = {
    headers: { host: '192.168.1.111:3080', origin: 'http://evil.com', 'sec-fetch-site': 'cross-site' },
    socket: { remoteAddress: '192.168.1.50' }
  };
  assert.equal(isTrustedRequest(lanCrossSite), false, 'Cross-site request from LAN must be rejected');
});

test('Issue #157: GET routes on /dsh-live-canvas/api/* reject untrusted origins', async () => {
  const routes = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('webServer')) {
        cb({ webServer: { register: (r) => routes.push(r) } });
      }
    },
    tools: { register: () => {} },
    effect: (fn) => fn()
  };

  apply(mockCtx, { workspaceRoots: [process.cwd()] });
  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route must be registered');

  // Untrusted GET request (cross-site origin)
  const untrustedGet = createMockReqRes({
    url: '/dsh-live-canvas/api/sessions',
    method: 'GET',
    headers: { origin: 'http://evil.com', 'sec-fetch-site': 'cross-site', host: 'localhost:3000' }
  });
  await apiRoute.handler(untrustedGet.req, untrustedGet.res);
  assert.equal(untrustedGet.res.statusCode, 403, 'Untrusted GET /api/sessions must return 403 Forbidden');
});

test('Issue #159 & #200: safeReplaceSubstring avoids $ pattern expansion and handles duplicate text', () => {
  // #159: No pattern expansion
  const source = 'const price = "OLD_PRICE";';
  const replaced = safeReplaceSubstring(source, 'OLD_PRICE', '$100 & $&');
  assert.equal(replaced, 'const price = "$100 & $&";', 'Must not expand $1 or $& patterns');

  // #200: Duplicate text handling via occurrenceIndex
  const htmlDoc = '<div>Button</div><p>Description</p><div>Button</div>';
  const replacedFirst = safeReplaceSubstring(htmlDoc, 'Button', 'Save', { occurrenceIndex: 0 });
  assert.equal(replacedFirst, '<div>Save</div><p>Description</p><div>Button</div>', 'Must replace only the first occurrence');

  const replacedSecond = safeReplaceSubstring(htmlDoc, 'Button', 'Cancel', { occurrenceIndex: 1 });
  assert.equal(replacedSecond, '<div>Button</div><p>Description</p><div>Cancel</div>', 'Must replace only the second occurrence');

  // replaceAll option
  const replacedAll = safeReplaceSubstring(htmlDoc, 'Button', 'Action', { replaceAll: true });
  assert.equal(replacedAll, '<div>Action</div><p>Description</p><div>Action</div>', 'Must replace all occurrences when replaceAll=true');
});

test('Issue #158 & #201: parseBody rejects Content-Length overflow and store limits size', async () => {
  const routes = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('webServer')) {
        cb({ webServer: { register: (r) => routes.push(r) } });
      }
    },
    tools: { register: () => {} },
    effect: (fn) => fn()
  };
  apply(mockCtx, { workspaceRoots: [process.cwd()] });
  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');

  // #158: Content-Length header exceeding limit rejects immediately
  const reqOverflow = createMockReqRes({
    url: '/dsh-live-canvas/api/preview',
    method: 'POST',
    headers: { 'content-length': String(30 * 1024 * 1024) }
  });
  await apiRoute.handler(reqOverflow.req, reqOverflow.res);
  assert.equal(reqOverflow.res.statusCode, 400, 'Content-Length exceeding 25MB must reject with 400');

  // #201: Store content limit
  const store = new PreviewStore();
  const hugeContent = 'a'.repeat(6 * 1024 * 1024); // 6MB
  const session = store.createOrUpdateSession({ id: 'huge-test', content: hugeContent });
  assert.ok(Buffer.byteLength(session.content, 'utf8') <= 5 * 1024 * 1024, 'Session content must be capped at 5MB');
});

test('Issue #160: store.clear(wipeDisk = true) unlinks persistence file from disk', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-wipe-test-'));
  const persistencePath = path.join(tmpDir, 'sessions.json');
  try {
    const store = new PreviewStore({ persistencePath });
    store.createOrUpdateSession({ id: 's1', content: '<div>Hello</div>' });
    store.flush();
    assert.ok(fs.existsSync(persistencePath), 'Persistence file must exist after flush');

    // clear with wipeDisk=true
    store.clear(true);
    assert.ok(!fs.existsSync(persistencePath), 'Persistence file must be unlinked after clear(true)');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

test('Issue #161: Sandbox headers include strict CSP and SAMEORIGIN frame protection', () => {
  const headers = getSandboxHeaders();
  assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN');
  assert.ok(headers['Content-Security-Policy'].includes("default-src 'self'"), 'CSP must restrict default-src');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

test('Issue #162: sanitizeNpmPackageName ensures valid npm package naming', () => {
  assert.equal(sanitizeNpmPackageName('123'), 'pkg-123', 'Purely numeric name must be prefixed');
  assert.equal(sanitizeNpmPackageName('---'), 'live-project', 'Invalid symbols must fall back');
  assert.equal(sanitizeNpmPackageName('fs'), 'pkg-fs', 'Node builtin must be prefixed');
  assert.equal(sanitizeNpmPackageName('My Cool Project!'), 'my-cool-project', 'Special chars must be sanitized');
  assert.equal(sanitizeNpmPackageName(''), 'live-project', 'Empty title must fall back');
});

test('Issue #150: Logger abstraction captures warnings and errors without raw console noise', () => {
  let loggedWarn = null;
  setLogger({
    warn: (msg) => { loggedWarn = msg; },
    info: () => {},
    error: () => {}
  });

  logger.warn('Test logger warning');
  assert.equal(loggedWarn, 'Test logger warning');
  setLogger(console);
});
