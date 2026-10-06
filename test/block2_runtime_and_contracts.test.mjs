import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';

import { Config, apply } from '../lib/index.js';
import { PreviewStore } from '../lib/store.js';
import { injectSandboxRuntime } from '../lib/sandbox.js';
import { getSessionCacheKey } from '../lib/transpiler.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = options.headers || {
    host: '127.0.0.1:3000',
    origin: 'http://127.0.0.1:3000'
  };
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

test('Issue #163 & #170: injectSandboxRuntime produces valid JS without duplicate const and uses SAVE_REORDER_API', () => {
  const dummyHtml = '<html><head></head><body><h1>Test</h1></body></html>';
  const injected = injectSandboxRuntime(dummyHtml, {
    canvasId: 'c123',
    saveReorderApiUrl: '/dsh-live-canvas/api/save-reorder',
    annotateApiUrl: '/dsh-live-canvas/api/annotate'
  });

  // Extract all script tags
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptCount = 0;
  while ((match = scriptRegex.exec(injected)) !== null) {
    const code = match[1];
    if (code.trim()) {
      scriptCount++;
      // Check syntax validity via vm.Script
      assert.doesNotThrow(() => {
        new vm.Script(code);
      }, `Runtime script ${scriptCount} should parse without syntax errors (#163)`);
    }
  }
  assert.ok(scriptCount > 0, 'Should have injected at least one script');

  // Verify no duplicate const origLog
  const countOrigLog = (injected.match(/const origLog\b/g) || []).length;
  assert.equal(countOrigLog, 1, 'Should have exactly 1 declaration of const origLog (#163)');

  // Verify SAVE_REORDER_API is declared and used (#170)
  assert.ok(injected.includes('SAVE_REORDER_API = "/dsh-live-canvas/api/save-reorder"'), 'SAVE_REORDER_API constant must be declared');
  assert.ok(!injected.includes('fetch(saveReorderApiUrl'), 'saveReorderApiUrl bare variable must not be referenced inside IIFE scope (#170)');
  assert.ok(injected.includes('fetch(SAVE_REORDER_API'), 'fetch should use SAVE_REORDER_API constant');
});

test('Issue #149: Config schema fields are marked volatile', () => {
  const fields = [
    'defaultViewport',
    'autoOpenOnHtmlGen',
    'enableHotReload',
    'maxSessionCache',
    'enableFileWatcher',
    'workspaceDir',
    'workspaceRoots'
  ];

  for (const field of fields) {
    const prop = Config.dict[field];
    assert.ok(prop, `Config schema must have property ${field}`);
    assert.equal(
      prop.meta?.volatile ?? prop.extra?.volatile,
      true,
      `Config property ${field} must be volatile (#149)`
    );
  }
});

test('Issue #154: PreviewStore provides compatibility methods without TypeError', () => {
  const store = new PreviewStore();
  const session = store.createSession({
    title: 'Store Test',
    content: '<div>Store Test</div>'
  });

  // addInspection
  assert.doesNotThrow(() => {
    store.addInspection(session.id, { tagName: 'div', selector: 'div.test' });
  }, 'addInspection should not throw');
  const inspections = store.getInspections(session.id);
  assert.equal(inspections.length, 1);
  assert.equal(inspections[0].tagName, 'div');

  // addLog
  assert.doesNotThrow(() => {
    store.addLog(session.id, { level: 'info', message: 'Hello runtime' });
  }, 'addLog should not throw');
  const logs = store.getLogs(session.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].message, 'Hello runtime');

  // addAnnotation
  assert.doesNotThrow(() => {
    store.addAnnotation(session.id, { x: 50, y: 100, comment: 'Nice button' });
  }, 'addAnnotation should not throw');
  const annotations = store.getAnnotations(session.id);
  assert.equal(annotations.length, 1);
  assert.equal(annotations[0].comment, 'Nice button');

  // setControls, setControlValues, getControls, getControlValues
  assert.doesNotThrow(() => {
    store.setControls(session.id, [{ name: 'label', type: 'string' }]);
    store.setControlValues(session.id, { label: 'Click me', count: 42 });
  }, 'setControls & setControlValues should not throw');
  const values = store.getControlValues(session.id);
  assert.deepEqual(values, { label: 'Click me', count: 42 });
  const controls = store.getControls(session.id);
  assert.ok(Array.isArray(controls));
  assert.equal(controls[0].name, 'label');
});

test('Issue #174: Transpiler cache SHA256 digest detects middle changes and CSS; store updates session.updatedAt on disk edit', async () => {
  // Test cache keys with same length but different middle content
  const c1 = 'export default function App() { return <div>Alpha AAA 1234567890</div>; }';
  const c2 = 'export default function App() { return <div>Alpha ZZZ 1234567890</div>; }';
  assert.equal(c1.length, c2.length, 'Length should be identical');

  const s1 = { id: 'test-1', content: c1, customCss: '', customJs: '', variants: [], workspaceDir: '' };
  const s2 = { id: 'test-1', content: c2, customCss: '', customJs: '', variants: [], workspaceDir: '' };
  const s3 = { id: 'test-1', content: c1, customCss: '.btn { color: red; }', customJs: '', variants: [], workspaceDir: '' };

  const key1 = getSessionCacheKey(s1);
  const key2 = getSessionCacheKey(s2);
  const key3 = getSessionCacheKey(s3);

  assert.notEqual(key1, key2, 'Cache key must change when middle content changes with same length (#174)');
  assert.notEqual(key1, key3, 'Cache key must change when customCss changes (#174)');

  // Test store.getSession updates session.updatedAt when file changes on disk
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-store-174-'));
  const testFile = path.join(tmpDir, 'test_component.jsx');
  fs.writeFileSync(testFile, 'export default function C() { return <h1>V1</h1>; }');

  const store = new PreviewStore();
  const session = store.createSession({
    title: 'Disk Tracked',
    content: 'export default function C() { return <h1>V1</h1>; }',
    filePath: testFile
  });

  const initialUpdatedAt = session.updatedAt;
  assert.ok(initialUpdatedAt);

  // Wait a small amount to ensure distinct timestamp
  await new Promise(r => setTimeout(r, 20));
  fs.writeFileSync(testFile, 'export default function C() { return <h1>V2 MODIFIED</h1>; }');

  const reloaded = store.getSession(session.id);
  assert.equal(reloaded.content, 'export default function C() { return <h1>V2 MODIFIED</h1>; }');
  assert.ok(new Date(reloaded.updatedAt).getTime() >= new Date(initialUpdatedAt).getTime(), 'updatedAt must be refreshed on disk change (#174)');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Issue #152, #153, #169, #172, #188: HTTP routes and API handlers run without ReferenceError', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-routes-b2-'));
  const routes = [];
  const tools = [];
  const effects = [];

  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('settings')) cb({ settings: { configure: () => () => {} } });
      if (deps.includes('webServer')) {
        cb({
          webServer: {
            register: (route) => {
              routes.push(route);
              return () => {
                const idx = routes.indexOf(route);
                if (idx !== -1) routes.splice(idx, 1);
              };
            }
          }
        });
      }
    },
    tools: {
      register: (tool) => tools.push(tool)
    },
    effect: (fn) => {
      const cleanup = fn();
      effects.push(cleanup);
      return cleanup;
    }
  };

  apply(mockCtx, {
    workspaceDir: tmpDir,
    workspaceRoots: [tmpDir]
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route must be registered');

  // Create a session via POST /dsh-live-canvas/api/preview
  const postPrev = createMockReqRes({
    url: '/dsh-live-canvas/api/preview',
    method: 'POST'
  });
  const prevPromise = apiRoute.handler(postPrev.req, postPrev.res);
  postPrev.req.emit('data', JSON.stringify({
    title: 'Block 2 Session',
    content: '<div>Block 2</div>',
    componentType: 'html'
  }));
  postPrev.req.emit('end');
  await prevPromise;
  assert.equal(postPrev.res.statusCode, 200);
  const { canvasId } = JSON.parse(postPrev.res.body);
  assert.ok(canvasId);

  // #152: GET /dsh-live-canvas/api/standalone?canvasId=...
  const reqStandalone = createMockReqRes({
    url: `/dsh-live-canvas/api/standalone?canvasId=${canvasId}`,
    method: 'GET'
  });
  await apiRoute.handler(reqStandalone.req, reqStandalone.res);
  assert.equal(reqStandalone.res.statusCode, 200, 'Standalone route should return 200 (#152)');
  assert.ok(reqStandalone.res.body.includes('<!DOCTYPE html>'), 'Standalone response should be HTML (#152)');

  // #153: GET /dsh-live-canvas/api/sound-presets
  const reqSound = createMockReqRes({
    url: '/dsh-live-canvas/api/sound-presets',
    method: 'GET'
  });
  await apiRoute.handler(reqSound.req, reqSound.res);
  assert.equal(reqSound.res.statusCode, 200, 'Sound presets route should return 200 (#153)');
  const soundData = JSON.parse(reqSound.res.body);
  assert.ok(soundData.presets, 'Sound presets should be present');
  assert.ok(soundData.presets.click, 'click preset should be defined');

  // #153: GET /dsh-live-canvas/api/deploy
  const reqDeploy = createMockReqRes({
    url: `/dsh-live-canvas/api/deploy?canvasId=${canvasId}&target=vercel`,
    method: 'GET'
  });
  await apiRoute.handler(reqDeploy.req, reqDeploy.res);
  assert.equal(reqDeploy.res.statusCode, 200, 'Deploy route should return 200 (#153)');
  const deployData = JSON.parse(reqDeploy.res.body);
  assert.equal(deployData.success, true);
  assert.ok(deployData.bundle);

  // #153: GET /dsh-live-canvas/timetravel/:id via dedicated route and API route
  const ttRoute = routes.find(r => r.path === '/dsh-live-canvas/timetravel');
  assert.ok(ttRoute, 'Time-travel route should be registered');
  const reqTT = createMockReqRes({
    url: `/dsh-live-canvas/timetravel/${canvasId}`,
    method: 'GET'
  });
  await ttRoute.handler(reqTT.req, reqTT.res);
  assert.equal(reqTT.res.statusCode, 200, 'Time travel viewer should return 200 (#153)');
  assert.ok(reqTT.res.body.includes('Time-Travel Timeline') || reqTT.res.body.includes('timeline'), 'Time travel HTML generated');

  // #169: POST /dsh-live-canvas/api/annotations
  const reqAnnotate = createMockReqRes({
    url: '/dsh-live-canvas/api/annotations',
    method: 'POST'
  });
  const annotatePromise = apiRoute.handler(reqAnnotate.req, reqAnnotate.res);
  reqAnnotate.req.emit('data', JSON.stringify({
    canvasId,
    comment: 'Check padding here',
    x: 120,
    y: 80
  }));
  reqAnnotate.req.emit('end');
  await annotatePromise;
  assert.equal(reqAnnotate.res.statusCode, 200, 'POST /dsh-live-canvas/api/annotations should return 200 (#169)');
  const annotateData = JSON.parse(reqAnnotate.res.body);
  assert.equal(annotateData.success, true);

  // #188: GET /dsh-live-canvas/api/export?canvasId=...
  const reqExportQuery = createMockReqRes({
    url: `/dsh-live-canvas/api/export?canvasId=${canvasId}`,
    method: 'GET'
  });
  await apiRoute.handler(reqExportQuery.req, reqExportQuery.res);
  assert.equal(reqExportQuery.res.statusCode, 200, 'GET /dsh-live-canvas/api/export?canvasId=... should return 200 (#188)');
  assert.ok(reqExportQuery.res.body.includes('<!DOCTYPE html>'));

  // #172: live_canvas_watch tool has watcher injected
  const watchTool = tools.find(t => t.name === 'live_canvas_watch');
  assert.ok(watchTool, 'live_canvas_watch tool must be registered');
  const watchStatus = await watchTool.execute({ action: 'status' });
  assert.equal(watchStatus.success, true);
  assert.ok(watchStatus.status, 'status object must be present');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Issue #155 & #171: design_tools and preview_tools execute without missing fs, resolveSafePath, or buildStandaloneHtml', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-tools-b2-'));
  const testCompFile = path.join(tmpDir, 'MyComponent.jsx');
  fs.writeFileSync(testCompFile, 'export default function MyComponent() {\n  return <div className="card">Hello</div>;\n}\n');

  const tools = [];
  const mockCtx = {
    tools: {
      register: (tool) => tools.push(tool)
    }
  };

  const store = new PreviewStore();
  const session = store.createSession({
    title: 'Tools Test',
    content: fs.readFileSync(testCompFile, 'utf8'),
    filePath: testCompFile
  });

  registerLiveCanvasTools(mockCtx, store, { broadcast: () => {} }, {
    workspaceDir: tmpDir,
    workspaceRoots: [tmpDir]
  });

  // #171: live_canvas_export tool using buildStandaloneHtml
  const exportTool = tools.find(t => t.name === 'live_canvas_export');
  assert.ok(exportTool, 'live_canvas_export tool must be registered');
  const exportRes = await exportTool.execute({
    canvasId: session.id,
    format: 'html'
  });
  assert.equal(exportRes.success, true);
  assert.ok(exportRes.htmlPreview.includes('<!DOCTYPE html>'));

  // #155: live_canvas_refine_element tool using fs and resolveSafePath
  const refineTool = tools.find(t => t.name === 'live_canvas_refine_element');
  assert.ok(refineTool, 'live_canvas_refine_element tool must be registered');
  const refineRes = await refineTool.execute({
    canvasId: session.id,
    filePath: 'MyComponent.jsx',
    selector: 'div.card',
    newCode: '<div className="card-refined">Hello Refined</div>'
  });
  assert.equal(refineRes.success, true);
  assert.ok(refineRes.filePath.includes('MyComponent.jsx'));
  const patchedContent = fs.readFileSync(testCompFile, 'utf8');
  assert.ok(patchedContent.includes('card-refined'));

  // #155: live_canvas_insert_block tool using fs and resolveSafePath
  const insertTool = tools.find(t => t.name === 'live_canvas_insert_block');
  assert.ok(insertTool, 'live_canvas_insert_block tool must be registered');
  const insertRes = await insertTool.execute({
    canvasId: session.id,
    blockId: 'hero-mesh-glow',
    targetFile: 'MyComponent.jsx'
  });
  assert.equal(insertRes.success, true);
  const insertedContent = fs.readFileSync(testCompFile, 'utf8');
  assert.ok(insertedContent.includes('hero-mesh-glow') || insertedContent.length > patchedContent.length);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Issue #173: Tool schemas allow null for inspected, lastAnnotation, writtenDir', async () => {
  const tools = [];
  const mockCtx = {
    tools: {
      register: (tool) => tools.push(tool)
    }
  };
  const store = new PreviewStore();

  registerLiveCanvasTools(mockCtx, store, { broadcast: () => {} }, {
    workspaceDir: '/tmp',
    workspaceRoots: ['/tmp']
  });

  const inspectTool = tools.find(t => t.name === 'live_canvas_inspect');
  const annotateTool = tools.find(t => t.name === 'live_canvas_annotations');
  const packTool = tools.find(t => t.name === 'live_canvas_pack');

  assert.ok(inspectTool && annotateTool && packTool);

  // Check inspected property schema
  const inspectedSchema = (inspectTool.output?.schema || inspectTool.outputSchema)?.properties?.inspected;
  assert.ok(inspectedSchema?.oneOf, 'inspected property must use oneOf for nullability (#173)');
  const inspectedNullType = inspectedSchema.oneOf.some(s => s.type === 'null');
  assert.ok(inspectedNullType, 'inspected schema oneOf must include null type');

  // Check lastAnnotation property schema
  const annotSchema = (annotateTool.output?.schema || annotateTool.outputSchema)?.properties?.lastAnnotation;
  assert.ok(annotSchema?.oneOf, 'lastAnnotation property must use oneOf for nullability (#173)');
  const annotNullType = annotSchema.oneOf.some(s => s.type === 'null');
  assert.ok(annotNullType, 'lastAnnotation schema oneOf must include null type');

  // Check writtenDir property schema
  const writtenDirSchema = (packTool.output?.schema || packTool.outputSchema)?.properties?.writtenDir;
  assert.ok(writtenDirSchema?.oneOf, 'writtenDir property must use oneOf for nullability (#173)');
  const writtenDirNullType = writtenDirSchema.oneOf.some(s => s.type === 'null');
  assert.ok(writtenDirNullType, 'writtenDir schema oneOf must include null type');
});

test('Issue #187 & #188: Client activeId logic and chat card export link', () => {
  const clientCode = fs.readFileSync(path.resolve('lib/client.js'), 'utf8');

  // #187: Verify activeId does not invent file_*
  assert.ok(
    !clientCode.includes("'file_' + activeFile"),
    'client.js must not invent synthetic file_* IDs (#187)'
  );
  assert.ok(
    clientCode.includes("activeId = canvasId || (sessions[0] && sessions[0].id) || 'hub';"),
    'client.js activeId must fall back to real session id or hub (#187)'
  );

  // #188: Verify chat card export URL points to /dsh-live-canvas/api/export/
  assert.ok(
    clientCode.includes("'/dsh-live-canvas/api/export/' + data.canvasId") ||
    clientCode.includes('`/dsh-live-canvas/api/export/${data.canvasId}`'),
    'Chat card HTML must link to /dsh-live-canvas/api/export/ (#188)'
  );
});
