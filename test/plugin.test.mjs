import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { name, inject, apply, Config } from '../lib/index.js';

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';

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

test('Plugin exports correct metadata and schema', () => {
  assert.equal(name, '@goodandready/dsh-live-canvas');
  assert.ok(inject.includes('tools'));
  assert.ok(inject.includes('settings'));
  assert.ok(inject.includes('webServer'));
  assert.ok(Config);
});

test('Plugin lifecycle applies routes and handles sandbox, API, and export endpoints', async () => {
  const routes = [];
  const tools = [];
  let registeredSettings = null;
  const effects = [];

  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('settings')) {
        cb({
          settings: {
            register: (ns, cfg, opts) => {
              registeredSettings = { ns, cfg, opts };
              return { get: () => opts.base, set: () => {} };
            }
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
    effect: (fn) => {
      const cleanup = fn();
      effects.push(cleanup);
      return cleanup;
    }
  };

  apply(mockCtx, {
    defaultViewport: 'responsive',
    autoOpenOnHtmlGen: true,
    enableHotReload: true,
    maxSessionCache: 50
  });

  assert.equal(registeredSettings.ns, '@goodandready/dsh-live-canvas');
  assert.equal(tools.length, 7); // preview, inspect, reload, diagnose, export, annotations, gallery
  assert.equal(routes.length, 3); // events, sandbox, api

  const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');
  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(sandboxRoute, 'Sandbox route should be registered');
  assert.ok(apiRoute, 'API route should be registered');

  // Test 1: POST /dsh-live-canvas/api/preview
  const postPrev = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
  const postPromise = apiRoute.handler(postPrev.req, postPrev.res);
  postPrev.req.emit('data', JSON.stringify({
    title: 'Test Component',
    content: '<div class="banner">Hello from Test</div>',
    componentType: 'html'
  }));
  postPrev.req.emit('end');
  await postPromise;

  assert.equal(postPrev.res.statusCode, 200);
  const prevData = JSON.parse(postPrev.res.body);
  assert.equal(prevData.success, true);
  assert.ok(prevData.canvasId);

  // Test 2: GET /dsh-live-canvas/sandbox/<id>
  const getSandbox = createMockReqRes({ url: `/dsh-live-canvas/sandbox/${prevData.canvasId}`, method: 'GET' });
  sandboxRoute.handler(getSandbox.req, getSandbox.res);

  assert.equal(getSandbox.res.statusCode, 200);
  assert.ok(getSandbox.res.body.includes('Hello from Test'));
  assert.ok(getSandbox.res.body.includes('dlc-sandbox-runtime'));
  assert.equal(getSandbox.res.headers['X-Content-Type-Options'], 'nosniff');

  // Test 3: GET /dsh-live-canvas/api/export/<id>
  const getExport = createMockReqRes({ url: `/dsh-live-canvas/api/export/${prevData.canvasId}`, method: 'GET' });
  await apiRoute.handler(getExport.req, getExport.res);
  assert.equal(getExport.res.statusCode, 200);
  assert.ok(getExport.res.body.includes('Exported via Live Canvas Preview'));

  // Test 4: POST /dsh-live-canvas/api/annotations & GET
  const postAnn = createMockReqRes({ url: '/dsh-live-canvas/api/annotations', method: 'POST' });
  const annPromise = apiRoute.handler(postAnn.req, postAnn.res);
  postAnn.req.emit('data', JSON.stringify({
    canvasId: prevData.canvasId,
    comment: 'Need larger paddings',
    selector: 'div.banner',
    tagName: 'div',
    box: { x: 10, y: 10, width: 100, height: 50 }
  }));
  postAnn.req.emit('end');
  await annPromise;
  assert.equal(postAnn.res.statusCode, 200);

  const getAnn = createMockReqRes({ url: `/dsh-live-canvas/api/annotations?canvasId=${prevData.canvasId}`, method: 'GET' });
  await apiRoute.handler(getAnn.req, getAnn.res);
  assert.equal(getAnn.res.statusCode, 200);
  const annData = JSON.parse(getAnn.res.body);
  assert.equal(annData.count, 1);
  assert.equal(annData.annotations[0].comment, 'Need larger paddings');

  for (const cleanup of effects) {
    if (typeof cleanup === 'function') cleanup();
  }
});
