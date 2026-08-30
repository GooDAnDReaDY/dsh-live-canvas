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

test('registerLiveCanvasTools registers all three agent tools', async () => {
  const ctx = createMockCtx();
  const store = new PreviewStore();
  const eventHub = new EventHub({ heartbeatIntervalMs: 60000 });

  registerLiveCanvasTools(ctx, store, eventHub);

  const previewTool = ctx._getTool('live_canvas_preview');
  const inspectTool = ctx._getTool('live_canvas_inspect');
  const reloadTool = ctx._getTool('live_canvas_reload');

  assert.ok(previewTool, 'live_canvas_preview tool should be registered');
  assert.ok(inspectTool, 'live_canvas_inspect tool should be registered');
  assert.ok(reloadTool, 'live_canvas_reload tool should be registered');

  // Test live_canvas_preview execution
  const prevRes = await previewTool.execute({
    title: 'Dashboard Widget',
    content: '<div class="card">Stats: 100%</div>',
    viewport: 'tablet'
  });

  assert.equal(prevRes.success, true);
  assert.ok(prevRes.canvasId.startsWith('canvas-'));
  assert.equal(prevRes.title, 'Dashboard Widget');
  assert.equal(prevRes.viewport, 'tablet');
  assert.equal(prevRes.previewUrl, `/dsh-live-canvas/sandbox/${prevRes.canvasId}`);

  // Test live_canvas_inspect when empty
  const inspRes1 = await inspectTool.execute({ action: 'get_last' });
  assert.equal(inspRes1.success, true);
  assert.equal(inspRes1.inspected, null);

  // Record an inspection
  store.recordInspection({
    canvasId: prevRes.canvasId,
    selector: 'div.card',
    tagName: 'div',
    innerText: 'Stats: 100%'
  });

  const inspRes2 = await inspectTool.execute({ action: 'get_last', canvasId: prevRes.canvasId });
  assert.equal(inspRes2.success, true);
  assert.equal(inspRes2.inspected.selector, 'div.card');

  // Test live_canvas_reload
  const reloadRes = await reloadTool.execute({ canvasId: prevRes.canvasId, reason: 'Updated markup' });
  assert.equal(reloadRes.success, true);
  assert.equal(reloadRes.reloadedClients, 0); // No clients connected yet

  eventHub.closeAll();
});