import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { WorkspaceWatcher } from '../lib/watcher.js';
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

test('registerLiveCanvasTools registers all nine agent tools', async () => {
  const ctx = createMockCtx();
  const store = new PreviewStore();
  const eventHub = new EventHub({ heartbeatIntervalMs: 60000 });
  const watcher = new WorkspaceWatcher(store, eventHub);

  registerLiveCanvasTools(ctx, store, eventHub, { watcher });

  const previewTool = ctx._getTool('live_canvas_preview');
  const inspectTool = ctx._getTool('live_canvas_inspect');
  const reloadTool = ctx._getTool('live_canvas_reload');
  const diagnoseTool = ctx._getTool('live_canvas_diagnose');
  const exportTool = ctx._getTool('live_canvas_export');
  const annTool = ctx._getTool('live_canvas_annotations');
  const galleryTool = ctx._getTool('live_canvas_gallery');
  const watchTool = ctx._getTool('live_canvas_watch');
  const controlsTool = ctx._getTool('live_canvas_controls');

  assert.ok(previewTool, 'live_canvas_preview tool should be registered');
  assert.ok(inspectTool, 'live_canvas_inspect tool should be registered');
  assert.ok(reloadTool, 'live_canvas_reload tool should be registered');
  assert.ok(diagnoseTool, 'live_canvas_diagnose tool should be registered');
  assert.ok(exportTool, 'live_canvas_export tool should be registered');
  assert.ok(annTool, 'live_canvas_annotations tool should be registered');
  assert.ok(galleryTool, 'live_canvas_gallery tool should be registered');
  assert.ok(watchTool, 'live_canvas_watch tool should be registered');
  assert.ok(controlsTool, 'live_canvas_controls tool should be registered');

  eventHub.closeAll();
});
