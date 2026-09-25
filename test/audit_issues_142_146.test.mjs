import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { apply, getAllowedMethodsForApiPath } from '../lib/index.js';

test('#142: settings.configure policy hook registers and disposes cleanly', () => {
  let configureCalled = false;
  let configureOptions = null;
  let disposeCalled = false;

  const mockSettings = {
    configure: (opts) => {
      configureCalled = true;
      configureOptions = opts;
      return () => {
        disposeCalled = true;
      };
    }
  };

  const cleanups = [];
  const mockWebServer = { register: () => () => {} };
  const mockCtx = {
    settings: mockSettings,
    fiber: { id: 'fiber-1' },
    inject: (deps, fn) => {
      if (deps.includes('settings')) fn({ settings: mockSettings });
      if (deps.includes('webServer')) fn({ webServer: mockWebServer });
    },
    effect: (fn) => {
      const res = fn();
      if (typeof res === 'function') cleanups.push(res);
    }
  };

  apply(mockCtx, {});

  assert.equal(configureCalled, true, 'settings.configure must be called');
  assert.deepEqual(configureOptions, { auto: false }, 'settings.configure must suppress auto form');
  assert.ok(cleanups.length > 0, 'at least one cleanup function registered');
  cleanups.forEach(c => c());
  assert.equal(disposeCalled, true, 'disposer must be called on effect cleanup');
});

test('#144: updater routes both canonical and legacy alias are allowed and registered', () => {
  const allowed = getAllowedMethodsForApiPath('/dsh-live-canvas/api/update');
  assert.ok(Array.isArray(allowed), '/dsh-live-canvas/api/update must be recognized in API_ROUTE_METHODS');
  assert.ok(allowed.includes('GET'), 'must allow GET');
  assert.ok(allowed.includes('POST'), 'must allow POST');

  const registeredPaths = [];
  const mockWebServer = {
    register: (route) => {
      registeredPaths.push(route.path);
      return () => {};
    }
  };

  const mockCtx = {
    inject: (deps, fn) => {
      if (deps.includes('webServer')) {
        fn({ webServer: mockWebServer });
      }
    },
    effect: (fn) => fn()
  };

  apply(mockCtx, {});

  assert.ok(registeredPaths.includes('/api/dsh-live-canvas/update'), 'canonical /api/dsh-live-canvas/update must be registered');
  assert.ok(registeredPaths.includes('/dsh-live-canvas/api/update'), 'alias /dsh-live-canvas/api/update must be registered');
});

test('#143 & #144: client.js calls canonical updater route and does not use unregistered paths', () => {
  const clientContent = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
  assert.ok(
    clientContent.includes("fetch('/api/dsh-live-canvas/update?action=check')"),
    'client.js must call canonical updater GET route'
  );
  assert.ok(
    clientContent.includes("fetch('/api/dsh-live-canvas/update',"),
    'client.js must call canonical updater POST route'
  );
  assert.ok(
    !clientContent.includes("fetch('/dsh-live-canvas/api/update"),
    'client.js must not call old unregistered updater route'
  );
});

test('#145: client.js registers locale inside ctx.effect with disposal cleanup', () => {
  const clientContent = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
  assert.ok(
    clientContent.includes("ctx.effect(() => {"),
    'client.js must call ctx.effect for locale registration'
  );
  assert.ok(
    clientContent.includes("'dsh-live-canvas: locale'"),
    'locale effect must be named for debugging'
  );
  assert.ok(
    clientContent.includes("if (typeof dispose === 'function') dispose();"),
    'locale registration must have cleanup disposer'
  );
});

test('#146: client.js settings card subscribes to configForms scope updates', () => {
  const clientContent = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
  assert.ok(
    clientContent.includes("scope.subscribe(callback)"),
    'client.js settings form must subscribe to scope'
  );
  assert.ok(
    clientContent.includes("React.useSyncExternalStore"),
    'client.js must use useSyncExternalStore or equivalent subscription'
  );
});

test('#143: parseBody rejects malformed JSON cleanly and readJsonBody is defined', async () => {
  let apiHandler = null;
  const mockWebServer = {
    register: (route) => {
      if (route.path === '/dsh-live-canvas/api') {
        apiHandler = route.handler;
      }
      return () => {};
    }
  };

  const mockCtx = {
    inject: (deps, fn) => {
      if (deps.includes('webServer')) fn({ webServer: mockWebServer });
    },
    effect: (fn) => fn()
  };

  apply(mockCtx, {});
  assert.equal(typeof apiHandler, 'function', 'apiHandler must be registered');

  // Test POST with malformed JSON string body -> returns 400 Bad Request
  let writtenStatus = null;
  let writtenData = '';
  const mockRes = {
    writeHead: (status) => { writtenStatus = status; },
    end: (data) => { writtenData = data; }
  };
  const mockReq = {
    url: '/dsh-live-canvas/api/save-reorder',
    method: 'POST',
    headers: { 'sec-fetch-site': 'same-origin' },
    body: '{ malformed json: not valid }',
    on: () => {},
    resume: () => {}
  };

  await apiHandler(mockReq, mockRes);
  assert.equal(writtenStatus, 400, 'Malformed body must return HTTP 400');
  const parsed = JSON.parse(writtenData);
  assert.ok(parsed.error, 'Response must contain error description');
});
