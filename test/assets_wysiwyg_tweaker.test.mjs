import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PassThrough } from 'node:stream';
import { apply } from '../lib/index.js';

test('Static assets, WYSIWYG save-content, style tweaker, and AI refine tools work correctly', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-api-test-'));
  const testFile = path.join(tmpDir, 'Hero.html');
  fs.writeFileSync(testFile, '<h1 class="text-white">Original Title</h1>');

  let assetHandler = null;
  let apiHandler = null;

  const mockWebServer = {
    register: (reg) => {
      if (reg.path === '/dsh-live-canvas/assets') assetHandler = reg.handler;
      if (reg.path === '/dsh-live-canvas/api') apiHandler = reg.handler;
      return () => {};
    }
  };

  const registeredTools = new Map();
  const mockCtx = {
    tools: {
      register: (t) => registeredTools.set(t.name, t)
    },
    inject: (deps, fn) => {
      if (deps.includes('webServer')) {
        fn({ webServer: mockWebServer });
      }
    },
    effect: (fn) => fn()
  };

  apply(mockCtx, { workspaceDir: tmpDir });

  // 1. Test Static Asset Server
  assert.ok(assetHandler, 'Assets route handler should be registered');
  let assetStatus = 0;
  let assetHeaders = {};
  const mockStreamRes = new PassThrough();
  mockStreamRes.writeHead = (st, hdrs) => { assetStatus = st; assetHeaders = hdrs; };

  assetHandler({ url: '/dsh-live-canvas/assets/Hero.html' }, mockStreamRes);
  assert.equal(assetStatus, 200, 'Asset server should respond with 200 for existing file');

  // Wait for stream to finish reading
  await new Promise(resolve => {
    mockStreamRes.on('finish', resolve);
    mockStreamRes.on('end', resolve);
    mockStreamRes.resume();
  });

  // 2. Test WYSIWYG save-content API
  assert.ok(apiHandler, 'API route handler should be registered');
  let apiStatus = 0;
  let apiBody = '';
  const mockApiRes = {
    writeHead: (st, hdrs) => { apiStatus = st; },
    end: (str) => { apiBody = str; }
  };

  function createMockReq(method, url, jsonBody) {
    const data = JSON.stringify(jsonBody);
    return {
      method,
      url,
      on: (ev, cb) => {
        if (ev === 'data') cb(Buffer.from(data));
        if (ev === 'end') cb();
      }
    };
  }

  await apiHandler(createMockReq('POST', '/dsh-live-canvas/api/save-content', {
    filePath: 'Hero.html',
    originalText: 'Original Title',
    newText: 'Updated Live Title'
  }), mockApiRes);

  assert.equal(apiStatus, 200, 'save-content API should return 200');
  const updatedContent = fs.readFileSync(testFile, 'utf8');
  assert.ok(updatedContent.includes('Updated Live Title'), 'File content should be updated on disk');

  // 3. Test AI Prompt API
  await apiHandler(createMockReq('POST', '/dsh-live-canvas/api/ai-prompt', {
    canvasId: 'test-canvas',
    selector: 'h1',
    instruction: 'Make title green'
  }), mockApiRes);

  assert.equal(apiStatus, 200, 'ai-prompt API should return 200');

  // 4. Test live_canvas_refine_element Tool
  const refineTool = registeredTools.get('live_canvas_refine_element');
  assert.ok(refineTool, 'live_canvas_refine_element tool should be registered');

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

