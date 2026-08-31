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

test('Plugin lifecycle applies routes and handles sandbox and API endpoints', async () => {
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
  assert.equal(tools.length, 3);
  assert.equal(routes.length, 3); // events, sandbox, api

  // Find routes
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

  // Test 3: GET 404 for unknown sandbox id
  const getUnknown = createMockReqRes({ url: '/dsh-live-canvas/sandbox/non-existent-id', method: 'GET' });
  sandboxRoute.handler(getUnknown.req, getUnknown.res);
  assert.equal(getUnknown.res.statusCode, 404);

  // Test 4: POST /dsh-live-canvas/api/inspect
  const postInsp = createMockReqRes({ url: '/dsh-live-canvas/api/inspect', method: 'POST' });
  const inspPromise = apiRoute.handler(postInsp.req, postInsp.res);
  postInsp.req.emit('data', JSON.stringify({
    canvasId: prevData.canvasId,
    selector: 'div.banner',
    tagName: 'div',
    innerText: 'Hello from Test'
  }));
  postInsp.req.emit('end');
  await inspPromise;

  assert.equal(postInsp.res.statusCode, 200);

  // Test 5: GET /dsh-live-canvas/api/inspect
  const getInsp = createMockReqRes({ url: '/dsh-live-canvas/api/inspect', method: 'GET' });
  await apiRoute.handler(getInsp.req, getInsp.res);
  assert.equal(getInsp.res.statusCode, 200);
  const inspData = JSON.parse(getInsp.res.body);
  assert.equal(inspData.inspected.selector, 'div.banner');

  // Cleanup effects
  for (const cleanup of effects) {
    if (typeof cleanup === 'function') cleanup();
  }
});