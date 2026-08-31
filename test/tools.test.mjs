import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

function createMockCtx() {
  const tools = new Map();
  return {
    tools: {
      register: (toolDef) => {
        tools.set(toolDef.name, toolDef);
      }
    },
    _getTool: (name) => tools.get(name)
  };
}

test('registerLiveCanvasTools registers all five agent tools', async () => {
  const ctx = createMockCtx();
  const store = new PreviewStore();
  const eventHub = new EventHub({ heartbeatIntervalMs: 60000 });

  registerLiveCanvasTools(ctx, store, eventHub);

  const previewTool = ctx._getTool('live_canvas_preview');
  const inspectTool = ctx._getTool('live_canvas_inspect');
  const reloadTool = ctx._getTool('live_canvas_reload');
  const diagnoseTool = ctx._getTool('live_canvas_diagnose');
  const exportTool = ctx._getTool('live_canvas_export');

  assert.ok(previewTool, 'live_canvas_preview tool should be registered');
  assert.ok(inspectTool, 'live_canvas_inspect tool should be registered');
  assert.ok(reloadTool, 'live_canvas_reload tool should be registered');
  assert.ok(diagnoseTool, 'live_canvas_diagnose tool should be registered');
  assert.ok(exportTool, 'live_canvas_export tool should be registered');

  // Test live_canvas_preview execution
  const prevRes = await previewTool.execute({
    title: 'Dashboard Widget',
    content: '<div class="card">Stats: 100%</div>',
    viewport: 'tablet',
    theme: 'dark'
  });

  assert.equal(prevRes.success, true);
  assert.ok(prevRes.canvasId.startsWith('canvas-'));

  // Test live_canvas_export execution
  const exportRes = await exportTool.execute({ canvasId: prevRes.canvasId });
  assert.equal(exportRes.success, true);
  assert.ok(exportRes.downloadUrl.includes('/dsh-live-canvas/api/export/'));
  assert.ok(exportRes.contentLength > 0);

  eventHub.closeAll();
});
