import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { buildMatrixWrapper } from '../lib/transpiler.js';

test('buildMatrixWrapper renders 3 device frame cards with sync scroll script', () => {
  const matrixHtml = buildMatrixWrapper(
    { content: '<h1 class="text-xl md:text-3xl">Responsive Title</h1>', componentType: 'html', title: 'Header Component' }
  );

  assert.ok(matrixHtml.includes('frame-mobile'));
  assert.ok(matrixHtml.includes('frame-tablet'));
  assert.ok(matrixHtml.includes('frame-desktop'));
  assert.ok(matrixHtml.includes('dlc_sync_scroll'));
  assert.ok(matrixHtml.includes('dlc_scroll_report'));
});

test('live_canvas_matrix tool returns matrixUrl', async () => {
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

  store.createOrUpdateSession({ id: 'canvas-matrix-test', title: 'Navbar' });

  const matrixTool = registeredTools.get('live_canvas_matrix');
  assert.ok(matrixTool, 'live_canvas_matrix tool must be registered');

  const res = await matrixTool.execute({ canvasId: 'canvas-matrix-test' });
  assert.equal(res.success, true);
  assert.equal(res.canvasId, 'canvas-matrix-test');
  assert.equal(res.matrixUrl, '/dsh-live-canvas/matrix/canvas-matrix-test');
});
