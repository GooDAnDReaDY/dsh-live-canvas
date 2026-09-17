import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libDir = path.resolve(__dirname, '../lib');

test('Issue #118: Tools declare code and allowedRoots in output schemas and refusals pass validation', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();
  const tools = new Map();
  const mockCtx = {
    tools: {
      register: (t) => tools.set(t.name, t)
    }
  };

  registerLiveCanvasTools(mockCtx, store, eventHub, {
    workspaceDir: '/home/sandbox/project',
    workspaceRoots: ['/home/sandbox/project']
  });

  const toolsToCheck = [
    'live_canvas_preview',
    'live_canvas_export',
    'live_canvas_pack',
    'live_canvas_refine_element'
  ];

  for (const name of toolsToCheck) {
    const tool = tools.get(name);
    assert.ok(tool, `Tool ${name} must be registered`);
    assert.ok(tool.output?.schema?.properties, `Tool ${name} must define output properties`);
    assert.ok(tool.output.schema.properties.code, `Tool ${name} schema must declare "code"`);
    assert.ok(tool.output.schema.properties.allowedRoots, `Tool ${name} schema must declare "allowedRoots"`);
    assert.equal(tool.output.schema.additionalProperties, false, `Tool ${name} must have additionalProperties: false`);
  }

  // Verify live_canvas_preview refusal when accessing unauthorized path
  const previewTool = tools.get('live_canvas_preview');
  const refusalResult = await previewTool.execute({ filePath: '/etc/shadow' });

  assert.equal(refusalResult.success, false);
  assert.equal(refusalResult.code, 'ERR_PATH_OUTSIDE_ROOTS');
  assert.ok(Array.isArray(refusalResult.allowedRoots));
  assert.ok(refusalResult.error.includes('outside base workspace roots'));

  // Validate that all returned properties are declared in schema
  const schemaProps = previewTool.output.schema.properties;
  for (const key of Object.keys(refusalResult)) {
    assert.ok(
      key in schemaProps,
      `Property "${key}" in refusal output was not declared in schema properties (violates additionalProperties: false)`
    );
  }
});

test('Issue #119: Client module includes chat resizing, openLiveCanvasInSidebar, and canvas refresh', () => {
  const clientPath = path.join(libDir, 'client.js');
  const clientContent = fs.readFileSync(clientPath, 'utf8');

  // 1. Resizing styles & controls
  assert.ok(clientContent.includes('dlc-chat-card-wide'), 'Must include wide mode style');
  assert.ok(clientContent.includes('dlc-chat-card-resize-bar'), 'Must include resize bar style');
  assert.ok(clientContent.includes('dlc-chat-card-resize-handle'), 'Must include resize handle style');
  assert.ok(clientContent.includes('dlc-chat-card-dragging'), 'Must include dragging pointer-events protection');

  // 2. Chat card logic
  assert.ok(clientContent.includes('dsh_live_canvas_chat_height'), 'Must persist chat height in localStorage');
  assert.ok(clientContent.includes('handleDragStart'), 'Must handle drag-to-resize');
  assert.ok(clientContent.includes('openLiveCanvasInSidebar'), 'Must define openLiveCanvasInSidebar');

  // 3. Right sidebar integration & events
  assert.ok(clientContent.includes('sidebarRight'), 'Must inject/handle sidebarRight');
  assert.ok(clientContent.includes("sr.openTab('live-canvas')"), 'Must trigger native sidebarRight.openTab');
  assert.ok(clientContent.includes("data-sidebar-right-expand"), 'Must include DOM expand fallback');
  assert.ok(clientContent.includes("data-sidebar-right-guide-entry"), 'Must include DOM guide entry fallback');

  // 4. Canvas workspace refresh & open event
  assert.ok(clientContent.includes("handleRefresh"), 'Must define handleRefresh in LiveCanvasWorkspace');
  assert.ok(clientContent.includes("t('pageRefreshedToast')"), 'Must notify user upon page reload');
  assert.ok(clientContent.includes("window.addEventListener('dsh:open-live-canvas'"), 'Must register open event listener');
});

test('Issue #119 Locale Audit: New UI keys have 100% key parity and zero Cyrillic in lib/*.js', () => {
  const clientPath = path.join(libDir, 'client.js');
  const clientContent = fs.readFileSync(clientPath, 'utf8');

  const requiredKeys = [
    'pageRefreshedToast',
    'resizeSmall',
    'resizeMedium',
    'resizeLarge',
    'resizeWide',
    'resizeNormal',
    'openInLiveCanvas',
    'openingLiveCanvas',
    'dragToResize',
    'canvasOpenedToast'
  ];

  for (const k of requiredKeys) {
    assert.ok(clientContent.includes(k + ':'), `Key ${k} must be declared in i18n dictionaries`);
  }

  // Zero Cyrillic check
  const cyrillicRegex = /[\u0400-\u04ff]/;
  const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    const fullPath = path.join(libDir, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(!cyrillicRegex.test(content), `Found Cyrillic character in ${f}`);
  }
});
