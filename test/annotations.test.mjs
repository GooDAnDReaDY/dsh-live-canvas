import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('PreviewStore records, lists, and clears visual annotations', () => {
  const store = new PreviewStore();

  const a1 = store.recordAnnotation({
    canvasId: 'canvas-1',
    comment: 'Button is too small',
    selector: 'button.btn-primary',
    tagName: 'button',
    box: { x: 100, y: 200, width: 80, height: 32 }
  });

  const a2 = store.recordAnnotation({
    canvasId: 'canvas-1',
    comment: 'Color should be blue',
    selector: 'div.header',
    tagName: 'div',
    box: { x: 0, y: 0, width: 400, height: 60 }
  });

  assert.equal(store.getAnnotations('canvas-1').length, 2);
  assert.equal(store.getAnnotations('canvas-1')[0].comment, 'Color should be blue'); // LIFO
  assert.equal(store.getLastAnnotation('canvas-1').comment, 'Color should be blue');

  store.clearAnnotations('canvas-1');
  assert.equal(store.getAnnotations('canvas-1').length, 0);
});

test('live_canvas_annotations tool queries and clears annotations', async () => {
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

  const annTool = registeredTools.get('live_canvas_annotations');
  assert.ok(annTool, 'live_canvas_annotations tool must be registered');

  // No annotations initially
  const res1 = await annTool.execute({ canvasId: 'canvas-x' });
  assert.equal(res1.success, true);
  assert.equal(res1.count, 0);

  // Record an annotation
  store.recordAnnotation({
    canvasId: 'canvas-x',
    comment: 'Fix margin alignment',
    selector: 'form > input',
    tagName: 'input',
    box: { x: 50, y: 150, width: 200, height: 40 }
  });

  const res2 = await annTool.execute({ canvasId: 'canvas-x' });
  assert.equal(res2.success, true);
  assert.equal(res2.count, 1);
  assert.ok(res2.summary.includes('Fix margin alignment'));

  const lastRes = await annTool.execute({ action: 'get_last', canvasId: 'canvas-x' });
  assert.equal(lastRes.success, true);
  assert.equal(lastRes.lastAnnotation.comment, 'Fix margin alignment');
});
