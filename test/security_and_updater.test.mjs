import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  isLoopbackAddress,
  isTrustedRequest,
  resolveSafePath
} from '../lib/security.js';
import {
  isTrustedUpdateRequest,
  parseSemver,
  isNewerVersion
} from '../lib/updater.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { WorkspaceWatcher } from '../lib/watcher.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('isLoopbackAddress correctly classifies loopback vs remote IPs', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('127.0.0.99'), true);

  assert.equal(isLoopbackAddress('192.168.1.100'), false);
  assert.equal(isLoopbackAddress('10.0.0.1'), false);
  assert.equal(isLoopbackAddress('8.8.8.8'), false);
  assert.equal(isLoopbackAddress(''), false);
  assert.equal(isLoopbackAddress(null), false);
});

test('isTrustedRequest validates origin and sec-fetch-site headers', () => {
  const trustedLocal = {
    headers: { host: 'localhost:3080' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(trustedLocal), true);

  const crossSite = {
    headers: {
      host: 'localhost:3080',
      origin: 'http://evil.attacker.com',
      'sec-fetch-site': 'cross-site'
    },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(crossSite), false);

  const sameOrigin = {
    headers: {
      host: 'localhost:3080',
      origin: 'http://localhost:3080',
      'sec-fetch-site': 'same-origin'
    },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedRequest(sameOrigin), true);
});

test('resolveSafePath enforces workspace roots and traversal protection', () => {
  const tmpRoot1 = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-root1-'));
  const tmpRoot2 = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-root2-'));
  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-ext-'));

  try {
    const file1 = path.join(tmpRoot1, 'index.html');
    const file2 = path.join(tmpRoot2, 'sub', 'App.jsx');
    const extFile = path.join(externalDir, 'secret.env');

    fs.writeFileSync(file1, '<h1>Root 1</h1>');
    fs.mkdirSync(path.join(tmpRoot2, 'sub'), { recursive: true });
    fs.writeFileSync(file2, 'export default () => null;');
    fs.writeFileSync(extFile, 'SECRET=123');

    const allowedRoots = [tmpRoot1, tmpRoot2];

    const res1 = resolveSafePath(file1, allowedRoots);
    assert.equal(res1, fs.realpathSync(file1));

    const res2 = resolveSafePath(file2, allowedRoots);
    assert.equal(res2, fs.realpathSync(file2));

    const resRel = resolveSafePath('index.html', allowedRoots);
    assert.equal(resRel, fs.realpathSync(file1));

    assert.throws(() => {
      resolveSafePath(extFile, allowedRoots);
    }, (err) => {
      assert.equal(err.code, 'ERR_PATH_OUTSIDE_ROOTS');
      assert.ok(Array.isArray(err.allowedRoots));
      return true;
    });

    assert.throws(() => {
      resolveSafePath(path.join(tmpRoot1, '..', path.basename(externalDir), 'secret.env'), allowedRoots);
    }, (err) => {
      assert.equal(err.code, 'ERR_PATH_OUTSIDE_ROOTS');
      return true;
    });
  } finally {
    fs.rmSync(tmpRoot1, { recursive: true, force: true });
    fs.rmSync(tmpRoot2, { recursive: true, force: true });
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test('live_canvas_preview agent tool restricts access to workspace roots', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-tool-test-'));
  const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-tool-ext-'));

  try {
    const validFile = path.join(tmpRoot, 'component.html');
    const secretFile = path.join(externalDir, 'passwords.txt');
    fs.writeFileSync(validFile, '<div>Hello Tool</div>');
    fs.writeFileSync(secretFile, 'secret data');

    const registeredTools = {};
    const mockCtx = {
      tools: {
        register: (toolDef) => {
          registeredTools[toolDef.name] = toolDef;
        }
      }
    };
    const store = new PreviewStore();
    const eventHub = new EventHub({ heartbeatIntervalMs: 60000 });
    const watcher = new WorkspaceWatcher(store, eventHub, { workspaceRoots: [tmpRoot] });

    registerLiveCanvasTools(mockCtx, store, eventHub, {
      watcher: watcher,
      workspaceRoots: [tmpRoot]
    });

    const previewTool = registeredTools['live_canvas_preview'];
    assert.ok(previewTool, 'live_canvas_preview tool should be registered');

    const deniedResult = await previewTool.execute({ filePath: secretFile });
    assert.equal(deniedResult.success, false);
    assert.equal(deniedResult.code, 'ERR_PATH_OUTSIDE_ROOTS');
    assert.ok(deniedResult.error.includes('Security Violation'));

    const allowedResult = await previewTool.execute({ filePath: validFile });
    assert.equal(allowedResult.success, true);
    assert.ok(allowedResult.canvasId, 'Should have generated canvasId');
    assert.ok(allowedResult.previewUrl.includes(allowedResult.canvasId));

    watcher.closeAll();
    eventHub.closeAll();
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test('updater semver parser and version comparator handle releases and prereleases', () => {
  assert.deepEqual(parseSemver('1.2.3'), { core: [1, 2, 3], prerelease: [] });
  assert.deepEqual(parseSemver('0.2.12-alpha.1'), { core: [0, 2, 12], prerelease: ['alpha', '1'] });

  assert.equal(isNewerVersion('0.2.11', '0.2.12'), true);
  assert.equal(isNewerVersion('0.2.12', '0.2.11'), false);
  assert.equal(isNewerVersion('0.2.11', '0.2.11'), false);
  assert.equal(isNewerVersion('0.2.12-alpha.1', '0.2.12-alpha.2'), true);
  assert.equal(isNewerVersion('0.2.12-alpha.2', '0.2.12'), true);
});

test('isTrustedUpdateRequest enforces update header and trusted origin', () => {
  const reqValid = {
    headers: {
      'x-dsh-plugin-update': '1',
      host: 'localhost:3080',
      origin: 'http://localhost:3080',
      'sec-fetch-site': 'same-origin'
    },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedUpdateRequest(reqValid), true);

  const reqMissingHeader = {
    headers: {
      host: 'localhost:3080',
      origin: 'http://localhost:3080'
    },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedUpdateRequest(reqMissingHeader), false);

  const reqCrossSite = {
    headers: {
      'x-dsh-plugin-update': '1',
      host: 'localhost:3080',
      origin: 'http://evil.attacker.com',
      'sec-fetch-site': 'cross-site'
    },
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(isTrustedUpdateRequest(reqCrossSite), false);
});

test('WorkspaceWatcher enforces safe path policy and error handling', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-watch-test-'));
  try {
    const mockEventHub = {
      broadcast: (ev, data) => {}
    };
    const watcher = new WorkspaceWatcher({}, mockEventHub, { workspaceRoots: [tmpRoot] });

    assert.throws(() => {
      watcher.openWorkspaceFile('/etc/shadow');
    }, (err) => {
      assert.equal(err.code, 'ERR_PATH_OUTSIDE_ROOTS');
      return true;
    });

    watcher.closeAll();
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
