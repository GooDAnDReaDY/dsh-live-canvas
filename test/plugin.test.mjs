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

test('Plugin lifecycle applies routes and handles sandbox, API, diff, and export endpoints', async () => {
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
    enableFileWatcher: true,
    maxSessionCache: 50
  });

  assert.equal(registeredSettings.ns, '@goodandready/dsh-live-canvas');
  assert.equal(tools.length, 10); // preview, inspect, reload, diagnose, export, annotations, gallery, watch, controls, diff
  assert.equal(routes.length, 4); // events, sandbox, diff, api

  const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');
  const diffRoute = routes.find(r => r.path === '/dsh-live-canvas/diff');
  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(sandboxRoute, 'Sandbox route should be registered');
  assert.ok(diffRoute, 'Diff route should be registered');
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

  // Update content to create a snapshot
  const postPrev2 = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
  const postPromise2 = apiRoute.handler(postPrev2.req, postPrev2.res);
  postPrev2.req.emit('data', JSON.stringify({
    canvasId: prevData.canvasId,
    title: 'Test Component V2',
    content: '<div class="banner">Hello from Test V2</div>',
    componentType: 'html'
  }));
  postPrev2.req.emit('end');
  await postPromise2;

  // Test 2: GET /dsh-live-canvas/diff/<id>
  const getDiff = createMockReqRes({ url: `/dsh-live-canvas/diff/${prevData.canvasId}`, method: 'GET' });
  diffRoute.handler(getDiff.req, getDiff.res);
  assert.equal(getDiff.res.statusCode, 200);
  assert.ok(getDiff.res.body.includes('diff-container'));

  for (const cleanup of effects) {
    if (typeof cleanup === 'function') cleanup();
  }
});
