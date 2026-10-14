import "./_setup.mjs";
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { PreviewStore } from '../lib/store.js';
import { apply } from '../lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libDir = path.resolve(__dirname, '../lib');

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.socket = options.socket || { remoteAddress: '127.0.0.1' };
  req.headers = options.headers || {};

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

test('PreviewStore listSessions sorts by updatedAt descending', () => {
  const store = new PreviewStore();
  const s1 = store.createOrUpdateSession({ id: 's1', title: 'First Session', content: '<div>1</div>' });
  s1.updatedAt = new Date(Date.now() - 5000).toISOString();

  const s2 = store.createOrUpdateSession({ id: 's2', title: 'Second Session', content: '<div>2</div>' });
  s2.updatedAt = new Date().toISOString();

  const list = store.listSessions();
  assert.equal(list.length, 2);
  assert.equal(list[0].id, 's2', 'Most recently updated session must be first');
  assert.equal(list[1].id, 's1');
});

test('Projects Hub renders recent sessions and workspace files in sandbox endpoint', async () => {
  const routes = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('settings')) {
        cb({
          settings: {
            register: () => ({ get: () => ({}), set: () => {} })
          }
        });
      }
      if (deps.includes('webServer')) {
        cb({
          webServer: {
            register: (route) => {
              routes.push(route);
              return () => {};
            }
          }
        });
      }
    },
    tools: { register: () => {} },
    effect: (fn) => fn()
  };

  apply(mockCtx, { workspaceRoots: [process.cwd()] });

  const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');
  assert.ok(sandboxRoute, 'Sandbox route must be registered');

  // 1. Request /dsh-live-canvas/sandbox/hub
  const { req: reqHub, res: resHub } = createMockReqRes({ url: '/dsh-live-canvas/sandbox/hub' });
  sandboxRoute.handler(reqHub, resHub);

  assert.equal(resHub.statusCode, 200);
  assert.match(resHub.body, /Interactive Canvas Hub/);
  assert.match(resHub.body, /Recent Projects & Workspace Files/);
  assert.match(resHub.body, /Quick Start with Demo Templates/);
  assert.match(resHub.body, /React Calculator/);
  assert.match(resHub.body, /SaaS Metrics Dashboard/);

  // 2. Request /dsh-live-canvas/sandbox/default
  const { req: reqDef, res: resDef } = createMockReqRes({ url: '/dsh-live-canvas/sandbox/default' });
  sandboxRoute.handler(reqDef, resDef);

  assert.equal(resDef.statusCode, 200);
  assert.match(resDef.body, /Interactive Canvas Hub/);
});

test('i18n dictionaries have 100% key parity for projects hub keys and zero Cyrillic', () => {
  const clientPath = path.join(libDir, 'client.js');
  const clientContent = fs.readFileSync(clientPath, 'utf8');

  const requiredKeys = [
    'projectsHub',
    'recentProjects',
    'noRecentProjects',
    'searchProjectsPlaceholder',
    'demoTemplatesHeader'
  ];

  for (const k of requiredKeys) {
    assert.ok(clientContent.includes(k + ':'), `client.js must declare key ${k}`);
  }

  // Zero Cyrillic audit in all lib/*.js
  const cyrillicRegex = /[\u0400-\u04ff]/;
  const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const text = fs.readFileSync(path.join(libDir, file), 'utf8');
    assert.ok(!cyrillicRegex.test(text), `File lib/${file} must have 0 Cyrillic characters`);
  }
});

test('Projects Hub safely escapes file paths with quotes and uses restricted targetOrigin for postMessage (#211)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-quotes-test-'));
  const quoteFile = 'component"with\'quotes.jsx';
  const tagFile = '<test>alert(1).tsx';
  fs.writeFileSync(path.join(tmpDir, quoteFile), 'export default function Quote() { return <div>quotes</div>; }', 'utf8');
  fs.writeFileSync(path.join(tmpDir, tagFile), 'export default function Tag() { return <div>tags</div>; }', 'utf8');

  try {
    const routes = [];
    const mockCtx = {
      inject: (deps, cb) => {
        if (deps.includes('settings')) {
          cb({ settings: { register: () => ({ get: () => ({}), set: () => {} }) } });
        }
        if (deps.includes('webServer')) {
          cb({ webServer: { register: (route) => { routes.push(route); return () => {}; } } });
        }
      },
      tools: { register: () => {} },
      effect: (fn) => fn()
    };

    apply(mockCtx, { workspaceRoots: [tmpDir] });
    const sandboxRoute = routes.find(r => r.path === '/dsh-live-canvas/sandbox');
    assert.ok(sandboxRoute, 'Sandbox route must be registered');

    const { req: reqHub, res: resHub } = createMockReqRes({ url: '/dsh-live-canvas/sandbox/hub' });
    sandboxRoute.handler(reqHub, resHub);

    assert.equal(resHub.statusCode, 200);
    const body = resHub.body;

    // 1. Verify quotes in data-file-path, data-title, data-path are strictly escaped and do not break attributes
    assert.ok(body.includes('data-file-path="component&quot;with&#39;quotes.jsx"'), 'data-file-path must escape quotes');
    assert.ok(body.includes('data-title="component&quot;with&#39;quotes.jsx"'), 'data-title must escape quotes');
    assert.ok(body.includes('data-path="component&quot;with&#39;quotes.jsx"'), 'data-path must escape quotes');

    // Verify tag file is safely escaped
    assert.ok(!body.includes('<test>alert(1).tsx'), 'Raw tags must not be present in body');
    assert.ok(body.includes('&lt;test&gt;alert(1).tsx'), 'Tags must be HTML-escaped');

    // 2. Verify postMessage targetOrigin
    assert.ok(body.includes('var targetOrigin = (window.location.origin && window.location.origin !== "null") ? window.location.origin : "*";'), 'Must define targetOrigin');
    assert.ok(body.includes('postMessage({ type: "dlc_open_session", canvasId: canvasId }, targetOrigin)'), 'openSession must use targetOrigin');
    assert.ok(body.includes('postMessage({ type: "dlc_open_file", filePath: filePath }, targetOrigin)'), 'openFile must use targetOrigin');
    assert.ok(body.includes('postMessage({ type: "dlc_session_created", canvasId: data.canvasId }, targetOrigin)'), 'loadDemo must use targetOrigin');
    assert.ok(!body.includes('postMessage({ type: "dlc_open_session", canvasId: canvasId }, "*")'), 'No wildcard in openSession');
    assert.ok(!body.includes('postMessage({ type: "dlc_open_file", filePath: filePath }, "*")'), 'No wildcard in openFile');
    assert.ok(!body.includes('postMessage({ type: "dlc_session_created", canvasId: data.canvasId }, "*")'), 'No wildcard in loadDemo');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
});

test('lib/logger.js console fallback behaves properly without Cordis context (#211)', async () => {
  const { logger } = await import('../lib/logger.js');
  let logged = [];
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;
  const origDebug = console.debug;

  try {
    console.info = (...args) => logged.push({ type: 'info', args });
    console.warn = (...args) => logged.push({ type: 'warn', args });
    console.error = (...args) => logged.push({ type: 'error', args });
    console.debug = (...args) => logged.push({ type: 'debug', args });

    logger.info('test info message');
    logger.warn('test warn message');
    logger.error('test error message');
    logger.debug('test debug message');

    assert.equal(logged.length, 4);
    assert.equal(logged[0].type, 'info');
    assert.equal(logged[0].args[0], 'test info message');
    assert.equal(logged[1].type, 'warn');
    assert.equal(logged[1].args[0], 'test warn message');
    assert.equal(logged[2].type, 'error');
    assert.equal(logged[2].args[0], 'test error message');
    assert.equal(logged[3].type, 'debug');
    assert.equal(logged[3].args[0], 'test debug message');
  } finally {
    console.info = origInfo;
    console.warn = origWarn;
    console.error = origError;
    console.debug = origDebug;
  }
});
