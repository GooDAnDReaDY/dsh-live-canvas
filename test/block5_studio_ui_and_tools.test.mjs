import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';

import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { listThemePresets, generateCssVariables } from '../lib/themes.js';
import { buildWireframeTemplate } from '../lib/wireframe.js';
import { buildPlanTemplate } from '../lib/plan.js';
import { buildDiagramTemplate } from '../lib/diagram.js';
import { buildPrototypeTemplate } from '../lib/prototype.js';
import { apply } from '../lib/index.js';

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = options.headers || {};
  req.socket = options.socket || { remoteAddress: '127.0.0.1' };

  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.body = '';
  res.writeHead = (status, headers = {}) => {
    res.statusCode = status;
    Object.assign(res.headers, headers);
  };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (chunk) => {
    if (chunk) res.body += chunk;
    res.emit('finish');
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

// --------------------------------------------------------------------------
// Issue #182: live_canvas_vision_import
// --------------------------------------------------------------------------
test('Issue #182: live_canvas_vision_import validates inputs and fails-closed on missing images', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();
  const registeredTools = new Map();
  const fakeCtx = {
    tools: {
      register: (tool) => registeredTools.set(tool.name, tool)
    }
  };

  registerLiveCanvasTools(fakeCtx, store, eventHub);
  const visionTool = registeredTools.get('live_canvas_vision_import');
  assert.ok(visionTool, 'live_canvas_vision_import must be registered');

  // 1. Missing all inputs -> fail closed
  const emptyRes = await visionTool.execute({});
  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.error.includes('Either imagePath, imageUrl, or generatedCode'));

  // 2. Missing image file -> fail closed
  const missingRes = await visionTool.execute({ imagePath: '/non/existent/mockup.png' });
  assert.equal(missingRes.success, false);
  assert.ok(missingRes.error.includes('Image file not found'));

  // 3. Invalid imageUrl scheme -> fail closed
  const invalidUrlRes = await visionTool.execute({ imageUrl: 'ftp://invalidscheme.com/img.png' });
  assert.equal(invalidUrlRes.success, false);
  assert.ok(invalidUrlRes.error.includes('Invalid imageUrl scheme'));

  // 4. Valid image file -> genuine reference import
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-vision-test-'));
  const testImg = path.join(tmpDir, 'test-ui.png');
  fs.writeFileSync(testImg, Buffer.from('FAKEPNGDATA1234567890'));

  const validImgRes = await visionTool.execute({
    imagePath: testImg,
    title: 'Login Page Screen'
  });
  assert.equal(validImgRes.success, true);
  assert.equal(validImgRes.mode, 'reference_import');
  assert.ok(validImgRes.canvasId);

  const session = store.getSession(validImgRes.canvasId);
  assert.ok(session);
  assert.ok(session.content.includes('VisualReferenceLayout'));
  assert.ok(session.content.includes('data:image/png;base64,'));
  assert.ok(session.content.includes('Login Page Screen'));

  // 5. Pre-generated code provided -> mode: code_reconstruction
  const codeRes = await visionTool.execute({
    generatedCode: 'export default function CustomUI() { return <h1>Generated</h1>; }',
    title: 'Custom Component'
  });
  assert.equal(codeRes.success, true);
  assert.equal(codeRes.mode, 'code_reconstruction');
  const codeSession = store.getSession(codeRes.canvasId);
  assert.equal(codeSession.content, 'export default function CustomUI() { return <h1>Generated</h1>; }');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --------------------------------------------------------------------------
// Issue #183: live_canvas_visual_audit
// --------------------------------------------------------------------------
test('Issue #183: live_canvas_visual_audit performs real DOM inspections and fails on missing sessions', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();
  const registeredTools = new Map();
  const fakeCtx = {
    tools: {
      register: (tool) => registeredTools.set(tool.name, tool)
    }
  };

  registerLiveCanvasTools(fakeCtx, store, eventHub);
  const auditTool = registeredTools.get('live_canvas_visual_audit');
  assert.ok(auditTool, 'live_canvas_visual_audit must be registered');

  // 1. Missing session ID or non-existent session -> fail
  const missingRes = await auditTool.execute({ canvasId: 'session-that-does-not-exist' });
  assert.equal(missingRes.success, false);
  assert.equal(missingRes.score, 0);
  assert.equal(missingRes.passesAudit, false);
  assert.ok(missingRes.error.includes('not found'));

  // 2. Empty session content -> fail
  store.createOrUpdateSession({ id: 'empty-session', title: 'Empty', content: '   ' });
  const emptyRes = await auditTool.execute({ canvasId: 'empty-session' });
  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.error.includes('empty'));

  // 3. Canvas with accessibility & responsiveness bugs
  const buggyContent = `
    <div class="bg-zinc-950 p-6">
      <div class="w-[600px] border">
        <img src="/avatar.png">
        <button class="p-2"></button>
        <input type="text">
      </div>
    </div>
  `;
  store.createOrUpdateSession({ id: 'buggy-canvas', title: 'Buggy UI', content: buggyContent });
  const buggyAudit = await auditTool.execute({ canvasId: 'buggy-canvas' });
  assert.equal(buggyAudit.success, true);
  assert.equal(buggyAudit.passesAudit, false);
  assert.ok(buggyAudit.score < 80);
  assert.ok(buggyAudit.issues.length >= 4);

  const imgIssue = buggyAudit.issues.find(i => i.selector === 'img');
  assert.ok(imgIssue, 'Must find image missing alt attribute');

  const btnIssue = buggyAudit.issues.find(i => i.selector === 'button');
  assert.ok(btnIssue, 'Must find button without accessible name');

  const inputIssue = buggyAudit.issues.find(i => i.selector === 'input');
  assert.ok(inputIssue, 'Must find input without accessible label');

  const widthIssue = buggyAudit.issues.find(i => i.selector === 'fixed-width');
  assert.ok(widthIssue, 'Must find fixed width exceeding mobile viewport');

  assert.ok(buggyAudit.checkedViewports.includes('mobile (375px)'));
  assert.ok(buggyAudit.unverifiedCriteria.length > 0);

  // 4. Clean canvas with semantic tags, alt, and responsive styles -> PASS
  const cleanContent = `
    <header class="p-4 bg-zinc-900 border-b">
      <nav aria-label="Main Navigation">
        <a href="/" class="text-sm font-bold">Home</a>
      </nav>
    </header>
    <main class="max-w-4xl mx-auto p-6 space-y-4">
      <h1 class="text-2xl font-bold">Accessible Dashboard</h1>
      <img src="/logo.png" alt="Company Logo" class="w-16 h-16">
      <button aria-label="Refresh Dashboard" class="px-4 py-2 bg-indigo-600 text-white rounded">Refresh</button>
      <form>
        <label for="search-input">Search Query</label>
        <input id="search-input" type="text" placeholder="Search..." aria-label="Search Query">
      </form>
    </main>
    <footer class="p-4 text-xs text-zinc-400">Footer content</footer>
  `;
  store.createOrUpdateSession({ id: 'clean-canvas', title: 'Clean UI', content: cleanContent });
  const cleanAudit = await auditTool.execute({ canvasId: 'clean-canvas' });
  assert.equal(cleanAudit.success, true);
  assert.equal(cleanAudit.passesAudit, true);
  assert.ok(cleanAudit.score >= 80);
});

// --------------------------------------------------------------------------
// Issue #189: Mock Data Integration & Sandbox Interceptor
// --------------------------------------------------------------------------
test('Issue #189: /api/mock endpoint sets mock data and sandbox interceptor handles requests', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block5-'));
  const { ctx, routes } = createTestCtx();
  apply(ctx, {
    workspaceRoots: [tmpDir],
    enableFileWatcher: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route prefix must be registered');

  // Set mock data via POST
  const { req: pReq, res: pRes } = createMockReqRes({
    url: '/dsh-live-canvas/api/mock',
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'sec-fetch-site': 'same-origin'
    }
  });
  const mockPayload = {
    canvasId: 'mock-session-test',
    mockData: {
      '/api/users': [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
    }
  };

  const postPromise = new Promise(resolve => pRes.on('finish', resolve));
  apiRoute.handler(pReq, pRes);
  pReq.emit('data', Buffer.from(JSON.stringify(mockPayload)));
  pReq.emit('end');
  await postPromise;

  assert.equal(pRes.statusCode, 200);
  const postResult = JSON.parse(pRes.body);
  assert.equal(postResult.success, true);
  assert.ok(postResult.mockData['/api/users']);

  // Get mock data via GET
  const { req: gReq, res: gRes } = createMockReqRes({
    url: '/dsh-live-canvas/api/mock?canvasId=mock-session-test',
    method: 'GET',
    headers: {
      'sec-fetch-site': 'same-origin'
    }
  });
  const getPromise = new Promise(resolve => gRes.on('finish', resolve));
  apiRoute.handler(gReq, gRes);
  await getPromise;

  assert.equal(gRes.statusCode, 200);
  const getResult = JSON.parse(gRes.body);
  assert.equal(getResult.canvasId, 'mock-session-test');
  assert.equal(getResult.mockData['/api/users'].length, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --------------------------------------------------------------------------
// Issue #192: Artifact Toolbar Generators Endpoint
// --------------------------------------------------------------------------
test('Issue #192: /api/artifact-template generates interactive domain models for all 4 types', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block5-'));
  const { ctx, routes } = createTestCtx();
  apply(ctx, {
    workspaceRoots: [tmpDir],
    enableFileWatcher: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route prefix must be registered');

  for (const type of ['wireframe', 'plan', 'diagram', 'prototype']) {
    const { req, res } = createMockReqRes({
      url: `/dsh-live-canvas/api/artifact-template?type=${type}`,
      method: 'GET',
      headers: { 'sec-fetch-site': 'same-origin' }
    });
    const promise = new Promise(resolve => res.on('finish', resolve));
    apiRoute.handler(req, res);
    await promise;

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.success, true);
    assert.equal(data.type, type);
    assert.ok(data.content.length > 200, `Artifact ${type} must be a rich interactive template`);
    assert.ok(!data.content.includes('Structural layout initialized.'), 'Must not use placeholder stubs');
  }

  // Unknown artifact type returns 400
  const { req: errReq, res: errRes } = createMockReqRes({
    url: '/dsh-live-canvas/api/artifact-template?type=invalid-type',
    method: 'GET',
    headers: { 'sec-fetch-site': 'same-origin' }
  });
  const errPromise = new Promise(resolve => errRes.on('finish', resolve));
  apiRoute.handler(errReq, errRes);
  await errPromise;
  assert.equal(errRes.statusCode, 400);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --------------------------------------------------------------------------
// Issue #193: Design System Themes Endpoint & CSS Variables
// --------------------------------------------------------------------------
test('Issue #193: /api/themes returns presets equipped with generated cssVariables', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-block5-'));
  const { ctx, routes } = createTestCtx();
  apply(ctx, {
    workspaceRoots: [tmpDir],
    enableFileWatcher: false
  });

  const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
  assert.ok(apiRoute, 'API route prefix must be registered');

  const { req, res } = createMockReqRes({
    url: '/dsh-live-canvas/api/themes',
    method: 'GET',
    headers: { 'sec-fetch-site': 'same-origin' }
  });
  const promise = new Promise(resolve => res.on('finish', resolve));
  apiRoute.handler(req, res);
  await promise;

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.themes));
  assert.ok(data.themes.length >= 5);

  const linear = data.themes.find(t => t.id === 'linear-dark');
  assert.ok(linear, 'linear-dark preset must exist');
  assert.ok(linear.cssVariables, 'Theme preset must include generated cssVariables');
  assert.ok(linear.cssVariables.includes('--dlc-bg: #090a0f'));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --------------------------------------------------------------------------
// Issue #196: i18n Dictionary Parity and Feedback Localization
// --------------------------------------------------------------------------
test('Issue #196: client.js EN/ZH dictionaries have 100% key parity and localize all feedback', () => {
  const clientPath = path.resolve('lib/client.js');
  const clientContent = fs.readFileSync(clientPath, 'utf8');

  // Verify Zero Cyrillic in lib/client.js
  const cyrillicMatch = clientContent.match(/[\u0400-\u04FF]/g);
  assert.equal(cyrillicMatch, null, 'lib/client.js must contain zero Cyrillic characters');

  // Extract keys using canonical boundary parser
  const enStart = clientContent.indexOf('      en: {');
  const zhStart = clientContent.indexOf('      zh: {', enStart);
  const zhEnd = clientContent.indexOf('    };', zhStart);

  assert.ok(enStart !== -1 && zhStart !== -1 && zhEnd !== -1, 'i18n dictionary bounds found in client.js');

  const enChunk = clientContent.substring(enStart, zhStart);
  const zhChunk = clientContent.substring(zhStart, zhEnd);

  const getKeys = (chunk) => {
    const keys = [];
    chunk.split('\n').forEach(line => {
      const m = line.match(/^\s*([a-zA-Z0-9_-]+):/);
      if (m && !['en', 'zh'].includes(m[1])) {
        keys.push(m[1]);
      }
    });
    return keys;
  };

  const enKeys = getKeys(enChunk);
  const zhKeys = getKeys(zhChunk);

  assert.ok(enKeys.length >= 100, `en dictionary should have at least 100 keys, found ${enKeys.length}`);
  assert.equal(enKeys.length, zhKeys.length, 'EN and ZH dictionaries must have identical key count');

  for (const k of enKeys) {
    assert.ok(zhKeys.includes(k), `ZH dictionary missing key: ${k}`);
  }

  // Verify specific new feedback keys from Issue #196
  const requiredFeedbackKeys = [
    'soundFxEnabled',
    'soundFxMuted',
    'textSavedToast',
    'textSaveErrorToast',
    'watcherWarningToast',
    'fileSystemError',
    'errorToast',
    'openedToast',
    'openFailedToast',
    'mockFailedToast',
    'themeSelectTitle',
    'storybookToast',
    'stateToast',
    'artifactCreatedToast'
  ];

  for (const k of requiredFeedbackKeys) {
    assert.ok(enKeys.includes(k), `Must contain feedback key ${k}`);
  }
});
