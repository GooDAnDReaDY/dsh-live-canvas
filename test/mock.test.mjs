import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { injectSandboxRuntime } from '../lib/sandbox.js';

test('PreviewStore manages mock datasets', () => {
  const store = new PreviewStore();
  const session = store.createOrUpdateSession({
    id: 'canvas-mock-1',
    mockData: { '/api/users': [{ id: 1, name: 'Alice' }] }
  });

  assert.deepEqual(session.mockData, { '/api/users': [{ id: 1, name: 'Alice' }] });
  assert.deepEqual(store.getMockData('canvas-mock-1'), { '/api/users': [{ id: 1, name: 'Alice' }] });

  store.setMockData('canvas-mock-1', { '/api/products': [{ id: 101, title: 'Gadget' }] });
  assert.deepEqual(store.getMockData('canvas-mock-1'), { '/api/products': [{ id: 101, title: 'Gadget' }] });
});

test('injectSandboxRuntime injects fetch interceptor with mock data', () => {
  const html = '<html><body><h1>Dashboard</h1></body></html>';
  const out = injectSandboxRuntime(html, 'canvas-mock-2', {
    mockData: { '/api/stats': { count: 42 } }
  });

  assert.ok(out.includes('window.__DLC_MOCK_DATA__'));
  assert.ok(out.includes('/api/stats'));
  assert.ok(out.includes('origFetch'));
});

test('live_canvas_mock tool sets, gets, and clears simulated mock datasets', async () => {
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
  store.createOrUpdateSession({ id: 'canvas-mock-tool' });

  const mockTool = registeredTools.get('live_canvas_mock');
  assert.ok(mockTool, 'live_canvas_mock tool must be registered');

  // 1. set
  const setRes = await mockTool.execute({
    canvasId: 'canvas-mock-tool',
    action: 'set',
    mockData: {
      '/api/v1/profile': { name: 'Bob', role: 'admin' },
      '/api/v1/orders': [{ id: 1, amount: 99 }]
    }
  });
  assert.equal(setRes.success, true);
  assert.equal(setRes.endpointsCount, 2);

  // 2. get
  const getRes = await mockTool.execute({
    canvasId: 'canvas-mock-tool',
    action: 'get'
  });
  assert.equal(getRes.success, true);
  assert.equal(getRes.endpointsCount, 2);
  assert.equal(getRes.mockData['/api/v1/profile'].name, 'Bob');

  // 3. clear
  const clearRes = await mockTool.execute({
    canvasId: 'canvas-mock-tool',
    action: 'clear'
  });
  assert.equal(clearRes.success, true);
  assert.equal(clearRes.endpointsCount, 0);
});
