import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('PreviewStore records, filters, and clears telemetry logs', () => {
  const store = new PreviewStore();

  const e1 = store.recordLog({
    canvasId: 'canvas-1',
    level: 'error',
    message: 'TypeError: Cannot read property undefined',
    stack: 'TypeError at App.jsx:12'
  });

  const e2 = store.recordLog({
    canvasId: 'canvas-1',
    level: 'warn',
    message: 'Deprecated API used'
  });

  const e3 = store.recordLog({
    canvasId: 'canvas-2',
    level: 'info',
    message: 'Loaded successfully'
  });

  assert.equal(store.getLogs('canvas-1', 'all').length, 2);
  assert.equal(store.getLogs('canvas-1', 'error').length, 1);
  assert.equal(store.getLogs('canvas-1', 'error')[0].message, 'TypeError: Cannot read property undefined');
  assert.equal(store.getLogs('canvas-2', 'info').length, 1);
  assert.equal(store.getLogs(null, 'all').length, 3);

  store.clearLogs('canvas-1');
  assert.equal(store.getLogs('canvas-1', 'all').length, 0);
  assert.equal(store.getLogs('canvas-2', 'all').length, 1);
});

test('live_canvas_diagnose tool correctly returns error diagnostics', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();

  const registeredTools = new Map();
  const fakeCtx = {
    tools: {
      register: (tool) => {
        registeredTools.set(tool.name, tool);
      }
    }
  };

  registerLiveCanvasTools(fakeCtx, store, eventHub);

  const diagTool = registeredTools.get('live_canvas_diagnose');
  assert.ok(diagTool, 'live_canvas_diagnose tool must be registered');

  // No errors initially
  const res1 = await diagTool.execute({ canvasId: 'canvas-x' });
  assert.equal(res1.success, true);
  assert.equal(res1.hasErrors, false);
  assert.equal(res1.errorCount, 0);

  // Record an error
  store.recordLog({
    canvasId: 'canvas-x',
    level: 'error',
    message: 'React syntax error: unexpected token'
  });

  const res2 = await diagTool.execute({ canvasId: 'canvas-x' });
  assert.equal(res2.success, true);
  assert.equal(res2.hasErrors, true);
  assert.equal(res2.errorCount, 1);
  assert.ok(res2.summary.includes('React syntax error'));
});