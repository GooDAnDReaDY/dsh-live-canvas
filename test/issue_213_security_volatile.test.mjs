import "./_setup.mjs";
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { apply, Config, markVolatile } from '../lib/index.js';
import { isTrustedStatusRequest, registerPluginUpdater } from '../lib/updater.js';
import Schemastery from '@deepseek-ai/schemastery';

test('Issue #213 Fix 3: Schema.prototype.volatile is not monkey-patched and markVolatile attaches volatile metadata safely', () => {
  // Ensure dsh-live-canvas did not mutate Schema.prototype
  assert.equal(
    typeof Schemastery.prototype.volatile,
    'undefined',
    'Schemastery.prototype.volatile must NOT be defined or monkey-patched'
  );

  // markVolatile helper attaches metadata
  const s = markVolatile(Schemastery.string().default('hello'));
  assert.equal(s.meta?.volatile, true, 'markVolatile must set meta.volatile to true');

  // Config object properties must all have volatile meta
  const configKeys = [
    'defaultViewport',
    'autoOpenOnHtmlGen',
    'enableHotReload',
    'maxSessionCache',
    'enableFileWatcher',
    'workspaceDir',
    'workspaceRoots'
  ];
  for (const k of configKeys) {
    const prop = Config.dict[k];
    assert.ok(prop, `Config must contain ${k}`);
    assert.equal(prop.meta?.volatile ?? prop.extra?.volatile, true, `${k} must have volatile meta`);
  }
});

test('Issue #213 Fix 1: All registered route families are gated with isTrustedRequest (403 on untrusted)', async () => {
  const routes = [];
  const mockCtx = {
    inject: (deps, fn) => {
      if (deps.includes('webServer')) {
        fn({
          webServer: {
            register: (route) => {
              routes.push(route);
              return () => {};
            }
          }
        });
      }
      if (deps.includes('tools')) {
        fn({ tools: { register: () => () => {} } });
      }
    },
    effect: (fn) => fn(),
    on: () => () => {},
    emit: () => {}
  };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-routes-test-'));
  const testFile = path.join(tmpDir, 'test.html');
  fs.writeFileSync(testFile, '<h1>Safe Content</h1>');

  try {
    apply(mockCtx, {
      workspaceRoots: [tmpDir],
      maxSessionCache: 50
    });

    const routePaths = [
      '/dsh-live-canvas/events',
      '/dsh-live-canvas/sandbox',
      '/dsh-live-canvas/diff',
      '/dsh-live-canvas/matrix',
      '/dsh-live-canvas/timetravel',
      '/dsh-live-canvas/assets'
    ];

    for (const rPath of routePaths) {
      const route = routes.find(r => r.path === rPath);
      assert.ok(route, `Route ${rPath} must be registered`);

      // 1. Untrusted remote address (e.g. WAN 203.0.113.195)
      let statusCodeUntrusted = 0;
      let bodyUntrusted = '';
      const untrustedReq = {
        url: rPath + (rPath === '/dsh-live-canvas/assets' ? '/test.html' : ''),
        method: 'GET',
        socket: { remoteAddress: '203.0.113.195' },
        headers: {}
      };
      const untrustedRes = {
        writeHead: (st, hdrs) => { statusCodeUntrusted = st; },
        end: (str) => { bodyUntrusted = str; }
      };

      route.handler(untrustedReq, untrustedRes);
      assert.equal(
        statusCodeUntrusted,
        403,
        `Route ${rPath} must return 403 on untrusted WAN remote address`
      );

      // 2. Cross-site request
      let statusCodeCross = 0;
      const crossReq = {
        url: rPath + (rPath === '/dsh-live-canvas/assets' ? '/test.html' : ''),
        method: 'GET',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          'sec-fetch-site': 'cross-site',
          origin: 'https://evil-attacker.example.com'
        }
      };
      const crossRes = {
        writeHead: (st) => { statusCodeCross = st; },
        end: () => {}
      };

      route.handler(crossReq, crossRes);
      assert.equal(
        statusCodeCross,
        403,
        `Route ${rPath} must return 403 on cross-site requests`
      );

      // 3. Trusted request (local loopback)
      let statusCodeTrusted = 0;
      const trustedReq = {
        url: rPath + (rPath === '/dsh-live-canvas/assets' ? '/test.html' : ''),
        method: 'GET',
        socket: { remoteAddress: '127.0.0.1' },
        headers: {
          host: 'localhost:3005'
        },
        on: () => {}
      };
      const trustedRes = {
        writeHead: (st) => { statusCodeTrusted = st; },
        write: () => {},
        end: () => {},
        pipe: (stream) => {},
        on: () => {}
      };

      route.handler(trustedReq, trustedRes);
      assert.notEqual(
        statusCodeTrusted,
        403,
        `Route ${rPath} must NOT return 403 on trusted local request`
      );
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Issue #213 Fix 4: Updater GET endpoint rejects untrusted requests with 403', async () => {
  // 1. isTrustedStatusRequest unit verification
  assert.equal(isTrustedStatusRequest({ socket: { remoteAddress: '127.0.0.1' }, headers: {} }), true);
  assert.equal(isTrustedStatusRequest({ socket: { remoteAddress: '192.168.1.100' }, headers: {} }), true);
  assert.equal(isTrustedStatusRequest({ socket: { remoteAddress: '203.0.113.1' }, headers: {} }), false);
  assert.equal(isTrustedStatusRequest({
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'sec-fetch-site': 'cross-site' }
  }), false);
  assert.equal(isTrustedStatusRequest({
    socket: { remoteAddress: '127.0.0.1' },
    headers: { origin: 'http://evil.com', host: 'localhost:3005' }
  }), false);
  assert.equal(isTrustedStatusRequest({
    socket: { remoteAddress: '127.0.0.1' },
    headers: { origin: 'http://localhost:3005', host: 'localhost:3005' }
  }), true);

  // 2. Updater route registration test
  let updaterRoute = null;
  const mockWebCtx = {
    webServer: {
      register: (route) => {
        updaterRoute = route;
        return () => {};
      }
    }
  };

  registerPluginUpdater(mockWebCtx, {
    endpoint: '/api/dsh-live-canvas/update',
    packageName: '@goodandready/dsh-live-canvas'
  });

  assert.ok(updaterRoute, 'Updater route must be registered');

  // Probe with untrusted WAN client
  let untrustedStatus = 0;
  let untrustedBody = '';
  await updaterRoute.handler({
    method: 'GET',
    socket: { remoteAddress: '203.0.113.50' },
    headers: {}
  }, {
    writeHead: (st) => { untrustedStatus = st; },
    end: (body) => { untrustedBody = body; }
  });

  assert.equal(untrustedStatus, 403, 'Updater GET endpoint must reject untrusted remote with 403');
  assert.match(untrustedBody, /Rejected non-local or cross-origin status request/);

  // Probe with cross-site fetch
  let crossStatus = 0;
  await updaterRoute.handler({
    method: 'GET',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'sec-fetch-site': 'cross-site' }
  }, {
    writeHead: (st) => { crossStatus = st; },
    end: () => {}
  });

  assert.equal(crossStatus, 403, 'Updater GET endpoint must reject cross-site request with 403');
});

test('Issue #213 Fix 2: Dynamic volatile configuration updates store, watcher, and routes without harness restart', async () => {
  const events = new EventEmitter();
  let registeredRoutes = [];

  const mockCtx = {
    inject: (deps, fn) => {
      if (deps.includes('webServer')) {
        fn({
          webServer: {
            register: (route) => {
              registeredRoutes.push(route);
              return () => {};
            }
          }
        });
      }
    },
    effect: (fn) => fn(),
    on: (ev, handler) => {
      events.on(ev, handler);
      return () => events.off(ev, handler);
    },
    config: {}
  };

  const initialDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-initial-'));
  const updatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-updated-'));

  try {
    apply(mockCtx, {
      defaultViewport: 'desktop',
      maxSessionCache: 25,
      enableFileWatcher: true,
      workspaceRoots: [initialDir]
    });

    const apiRoute = registeredRoutes.find(r => r.path === '/dsh-live-canvas/api');
    assert.ok(apiRoute, 'API route must be registered');

    // Check initial state via /api/state
    let stateJson = null;
    await apiRoute.handler({
      url: '/dsh-live-canvas/api/sessions',
      method: 'GET',
      socket: { remoteAddress: '127.0.0.1' },
      headers: {}
    }, {
      writeHead: () => {},
      end: (b) => { stateJson = JSON.parse(b); }
    });

    assert.equal(stateJson.config.defaultViewport, 'desktop');
    assert.equal(stateJson.config.enableFileWatcher, true);

    // Emit loader/volatile-update event with new configuration
    events.emit('loader/volatile-update', {
      defaultViewport: 'mobile',
      maxSessionCache: 5,
      enableFileWatcher: false,
      workspaceRoots: [updatedDir]
    });

    // Check updated state via /api/state
    await apiRoute.handler({
      url: '/dsh-live-canvas/api/sessions',
      method: 'GET',
      socket: { remoteAddress: '127.0.0.1' },
      headers: {}
    }, {
      writeHead: () => {},
      end: (b) => { stateJson = JSON.parse(b); }
    });

    assert.equal(stateJson.config.defaultViewport, 'mobile', 'defaultViewport must be dynamically updated');
    assert.equal(stateJson.config.enableFileWatcher, false, 'enableFileWatcher must be dynamically updated');

  } finally {
    fs.rmSync(initialDir, { recursive: true, force: true });
    fs.rmSync(updatedDir, { recursive: true, force: true });
  }
});
