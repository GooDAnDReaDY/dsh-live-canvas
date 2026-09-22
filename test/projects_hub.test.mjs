import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
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
