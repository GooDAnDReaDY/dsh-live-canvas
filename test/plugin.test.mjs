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

test('Plugin lifecycle applies routes and handles sandbox, API, diff, matrix, mock, and export endpoints', async () => {
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
  assert.equal(tools.length, 12); // preview, inspect, reload, diagnose, export, annotations, gallery, watch, controls, diff, matrix, mock
  assert.equal(routes.length, 5); // events, sandbox, diff, matrix, api

  const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');
  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(sandboxRoute, 'Sandbox route should be registered');
  assert.ok(apiRoute, 'API route should be registered');

  // Test 1: POST /dsh-live-canvas/api/preview
  const postPrev = createMockReqRes({ url: '/dsh-live-canvas/api/preview', method: 'POST' });
  const postPromise = apiRoute.handler(postPrev.req, postPrev.res);
  postPrev.req.emit('data', JSON.stringify({
    title: 'Mock Test',
    content: '<div class="banner">Hello Mock</div>',
    componentType: 'html',
    mockData: { '/api/hello': { message: 'world' } }
  }));
  postPrev.req.emit('end');
  await postPromise;

  assert.equal(postPrev.res.statusCode, 200);
  const prevData = JSON.parse(postPrev.res.body);
  assert.equal(prevData.success, true);
  assert.ok(prevData.canvasId);

  // Test 2: GET /dsh-live-canvas/api/mock?canvasId=...
  const getMock = createMockReqRes({ url: `/dsh-live-canvas/api/mock?canvasId=${prevData.canvasId}`, method: 'GET' });
  await apiRoute.handler(getMock.req, getMock.res);
  assert.equal(getMock.res.statusCode, 200);
  const mockResp = JSON.parse(getMock.res.body);
  assert.deepEqual(mockResp.mockData, { '/api/hello': { message: 'world' } });

  for (const cleanup of effects) {
    if (typeof cleanup === 'function') cleanup();
  }
});
