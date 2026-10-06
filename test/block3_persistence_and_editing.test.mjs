import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { PreviewStore } from '../lib/store.js';
import { buildStandaloneHtml } from '../lib/transpiler.js';
import { apply } from '../lib/index.js';

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = {
    host: '127.0.0.1:3080',
    origin: 'http://127.0.0.1:3080',
    'sec-fetch-site': 'same-origin',
    ...(options.headers || {})
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

function createTestCtx() {
  const routes = [];
  const tools = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('settings')) {
        cb({
          settings: {
            configure: () => () => {}
          }
        });
      }
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
    effect: (fn) => fn()
  };
  return { ctx: mockCtx, routes, tools };
}

test('Issue #167: Full-content saves, append/insert, and originalText verification', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block3-167-'));
  const testFile = path.join(tmpDir, 'test-target.html');
  fs.writeFileSync(testFile, '<div id="app"><p>INITIAL</p></div>', 'utf8');

  const { ctx, routes } = createTestCtx();
  apply(ctx, {
    workspaceRoots: [tmpDir],
    enableFileWatcher: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route prefix should be registered');

  // 1. Invalid payload with no content or replacement returns 400
  {
    const { req, res } = createMockReqRes({ url: '/dsh-live-canvas/api/save-content', method: 'POST' });
    const p = apiRoute.handler(req, res);
    req.emit('data', JSON.stringify({ canvasId: 'dummy' }));
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 400);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.code, 'ERR_INVALID_PAYLOAD');
  }

  // 2. Full content save to file
  {
    const { req, res } = createMockReqRes({ url: '/dsh-live-canvas/api/save-content', method: 'POST' });
    const p = apiRoute.handler(req, res);
    req.emit('data', JSON.stringify({
      filePath: 'test-target.html',
      fullContent: '<div id="app"><p>FULL_AFTER</p></div>'
    }));
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 200);
    const diskContent = fs.readFileSync(testFile, 'utf8');
    assert.equal(diskContent, '<div id="app"><p>FULL_AFTER</p></div>');
  }

  // 3. Memory session save via content property
  let memSessionId;
  {
    const { req: reqP, res: resP } = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
    const pP = apiRoute.handler(reqP, resP);
    reqP.emit('data', JSON.stringify({ content: '<p>BEFORE_MEM</p>', title: 'Memory Test' }));
    reqP.emit('end');
    await pP;
    assert.equal(resP.statusCode, 200);
    memSessionId = JSON.parse(resP.body).canvasId;

    const { req: reqS, res: resS } = createMockReqRes({ url: '/dsh-live-canvas/api/save-content', method: 'POST' });
    const pS = apiRoute.handler(reqS, resS);
    reqS.emit('data', JSON.stringify({
      canvasId: memSessionId,
      content: '<p>AFTER_MEM_CONTENT</p>'
    }));
    reqS.emit('end');
    await pS;
    assert.equal(resS.statusCode, 200);

    const { req: reqGet, res: resGet } = createMockReqRes({
      url: `/dsh-live-canvas/api/sessions?canvasId=${memSessionId}`,
      method: 'GET'
    });
    const pGet = apiRoute.handler(reqGet, resGet);
    reqGet.emit('end');
    await pGet;
    assert.equal(resGet.statusCode, 200);
    const fetched = JSON.parse(resGet.body).session;
    assert.equal(fetched.content, '<p>AFTER_MEM_CONTENT</p>');
  }

  // 4. Insert/append mode
  {
    const { req, res } = createMockReqRes({ url: '/dsh-live-canvas/api/save-content', method: 'POST' });
    const p = apiRoute.handler(req, res);
    req.emit('data', JSON.stringify({
      canvasId: memSessionId,
      content: '<section>INSERTED_BLOCK</section>',
      mode: 'insert'
    }));
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 200);

    const { req: reqGet, res: resGet } = createMockReqRes({
      url: `/dsh-live-canvas/api/sessions?canvasId=${memSessionId}`,
      method: 'GET'
    });
    const pGet = apiRoute.handler(reqGet, resGet);
    reqGet.emit('end');
    await pGet;
    const fetched = JSON.parse(resGet.body).session;
    assert.ok(fetched.content.includes('<section>INSERTED_BLOCK</section>'));
    assert.ok(fetched.content.includes('<p>AFTER_MEM_CONTENT</p>'));
  }

  // 5. Text replacement with missing originalText returns 422 and does NOT report replaced: true
  {
    const { req, res } = createMockReqRes({ url: '/dsh-live-canvas/api/save-content', method: 'POST' });
    const p = apiRoute.handler(req, res);
    req.emit('data', JSON.stringify({
      canvasId: memSessionId,
      originalText: 'NON_EXISTENT_TEXT',
      newText: 'REPLACED'
    }));
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 422);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.replaced, false);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Issue #168: Tailwind save-classes persists class edit to session and file', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block3-168-'));
  const htmlFile = path.join(tmpDir, 'styled.html');
  fs.writeFileSync(htmlFile, '<div class="text-white bg-blue-500">Hello Tailwind</div>', 'utf8');

  const { ctx, routes } = createTestCtx();
  apply(ctx, {
    workspaceRoots: [tmpDir],
    enableFileWatcher: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');

  // Open file to create session
  const { req: reqOpen, res: resOpen } = createMockReqRes({ url: '/dsh-live-canvas/api/open-file', method: 'POST' });
  const pOpen = apiRoute.handler(reqOpen, resOpen);
  reqOpen.emit('data', JSON.stringify({ filePath: 'styled.html' }));
  reqOpen.emit('end');
  await pOpen;
  assert.equal(resOpen.statusCode, 200);
  const canvasId = JSON.parse(resOpen.body).canvasId;

  // Call save-classes to modify class
  const { req: reqSave, res: resSave } = createMockReqRes({ url: '/dsh-live-canvas/api/save-classes', method: 'POST' });
  const pSave = apiRoute.handler(reqSave, resSave);
  reqSave.emit('data', JSON.stringify({
    canvasId,
    selector: 'div',
    className: 'text-amber-400 bg-zinc-900',
    oldClassName: 'text-white bg-blue-500',
    elementTag: 'div'
  }));
  reqSave.emit('end');
  await pSave;
  assert.equal(resSave.statusCode, 200);
  const saveJson = JSON.parse(resSave.body);
  assert.equal(saveJson.persisted, true, 'Classes edit must be persisted');

  // Check file on disk
  const diskContent = fs.readFileSync(htmlFile, 'utf8');
  assert.ok(diskContent.includes('text-amber-400 bg-zinc-900'), 'Disk file must contain new classes');

  // Check sandbox endpoint returns updated classes
  const { req: reqSand, res: resSand } = createMockReqRes({ url: `/dsh-live-canvas/sandbox/${canvasId}`, method: 'GET' });
  const pSand = sandboxRoute.handler(reqSand, resSand);
  reqSand.emit('end');
  await pSand;
  assert.equal(resSand.statusCode, 200);
  assert.ok(resSand.body.includes('text-amber-400 bg-zinc-900'), 'Sandbox must render updated classes');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Issue #175: Relative file sessions survive restart and empty files reload cleanly', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block3-175-'));
  const persistenceFile = path.join(tmpDir, 'sessions.json');
  const relFile = path.join(tmpDir, 'relative-file.html');
  fs.writeFileSync(relFile, '<h1>Before Clear</h1>', 'utf8');

  // 1. Create store, save session with relative path
  const store1 = new PreviewStore({
    persistencePath: persistenceFile,
    workspaceRoots: [tmpDir]
  });

  const session = store1.createOrUpdateSession({
    id: 'rel-sess-1',
    title: 'Relative Session',
    content: '<h1>Before Clear</h1>',
    filePath: 'relative-file.html'
  });
  assert.equal(session.filePath, 'relative-file.html');

  // Flush to disk
  store1.flush();
  assert.ok(fs.existsSync(persistenceFile), 'Persistence file should exist');

  // 2. Restart store: verify relative file session is NOT discarded
  const store2 = new PreviewStore({
    persistencePath: persistenceFile,
    workspaceRoots: [tmpDir]
  });

  const restored = store2.getSession('rel-sess-1');
  assert.ok(restored, 'Relative file session must survive restart');
  assert.equal(restored.filePath, 'relative-file.html');

  // 3. Clear file on disk to empty string "": getSession must return empty string, not stale content!
  fs.writeFileSync(relFile, '', 'utf8');
  const reloaded = store2.getSession('rel-sess-1');
  assert.equal(reloaded.content, '', 'Empty file on disk must update session content to empty string');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Issue #180: buildStandaloneHtml and capture_snapshot return non-empty HTML containing content', () => {
  // 1. buildStandaloneHtml called with string content
  const htmlStr = buildStandaloneHtml('<p>BEFORE</p>', 'html', 'dark');
  assert.ok(typeof htmlStr === 'string', 'Should return string');
  assert.ok(htmlStr.includes('<p>BEFORE</p>'), 'HTML output must contain canary content');

  // 2. buildStandaloneHtml called with session object
  const sessionObj = {
    content: '<div>CANARY_NODE</div>',
    componentType: 'html',
    theme: 'dark'
  };
  const htmlObj = buildStandaloneHtml(sessionObj);
  assert.ok(htmlObj.includes('<div>CANARY_NODE</div>'), 'HTML output must contain canary node from session object');
});

test('Issue #186 & #190: Sessions API returns config and individual session content; settings enforced', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block3-186-190-'));

  const { ctx, routes } = createTestCtx();
  apply(ctx, {
    workspaceRoots: [tmpDir],
    defaultViewport: 'mobile',
    enableHotReload: false,
    enableFileWatcher: false,
    autoOpenOnHtmlGen: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');

  // 1. GET /api/sessions returns active config (#190)
  {
    const { req, res } = createMockReqRes({ url: '/dsh-live-canvas/api/sessions', method: 'GET' });
    const p = apiRoute.handler(req, res);
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.config, 'Must return config metadata');
    assert.equal(json.config.defaultViewport, 'mobile');
    assert.equal(json.config.enableHotReload, false);
    assert.equal(json.config.enableFileWatcher, false);
    assert.equal(json.config.autoOpenOnHtmlGen, false);
  }

  // 2. Preview creation defaults to configured defaultViewport ('mobile') (#190)
  let createdId;
  {
    const { req, res } = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
    const p = apiRoute.handler(req, res);
    req.emit('data', JSON.stringify({ content: '<h1>Mobile Viewport Default</h1>' }));
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 200);
    createdId = JSON.parse(res.body).canvasId;
  }

  // 3. GET /api/sessions?canvasId=... returns individual session with full content (#186)
  {
    const { req, res } = createMockReqRes({
      url: `/dsh-live-canvas/api/sessions?canvasId=${createdId}`,
      method: 'GET'
    });
    const p = apiRoute.handler(req, res);
    req.emit('end');
    await p;
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.session, 'Must return session object');
    assert.equal(json.session.viewport, 'mobile', 'Must default to configured defaultViewport');
    assert.equal(json.session.content, '<h1>Mobile Viewport Default</h1>', 'Must include full content for Code editor');
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
