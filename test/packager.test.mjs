import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { buildProjectFiles, buildProjectZip, createZipBuffer } from '../lib/packager.js';

test('createZipBuffer generates valid ZIP binary buffer with local and central headers', () => {
  const files = [
    { path: 'package.json', content: '{"name":"test"}' },
    { path: 'src/App.jsx', content: 'export default () => <h1>Hello</h1>;' }
  ];
  const zip = createZipBuffer(files);

  assert.ok(Buffer.isBuffer(zip));
  assert.ok(zip.length > 100);
  // Check ZIP signature PK (0x04034b50 -> 'PK')
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);
});

test('buildProjectFiles generates complete Vite+React and Vite+Vue templates', () => {
  const reactFiles = buildProjectFiles({ title: 'Hero Banner', content: '<button>Click</button>', componentType: 'react' }, { framework: 'vite-react' });
  assert.ok(reactFiles.some(f => f.path === 'package.json'));
  assert.ok(reactFiles.some(f => f.path === 'vite.config.js'));
  assert.ok(reactFiles.some(f => f.path === 'src/App.jsx'));
  assert.ok(reactFiles.some(f => f.path === 'tailwind.config.js'));

  const vueFiles = buildProjectFiles({ title: 'Vue Widget', content: '<span>Vue</span>', componentType: 'html' }, { framework: 'vite-vue' });
  assert.ok(vueFiles.some(f => f.path === 'src/App.vue'));
  assert.ok(vueFiles.some(f => f.path === 'src/main.js'));
});

test('live_canvas_pack tool packages project and returns downloadUrl', async () => {
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
  store.createOrUpdateSession({ id: 'canvas-pack-tool', title: 'Dashboard Widget' });

  const packTool = registeredTools.get('live_canvas_pack');
  assert.ok(packTool, 'live_canvas_pack tool must be registered');

  const res = await packTool.execute({
    canvasId: 'canvas-pack-tool',
    framework: 'vite-react'
  });

  assert.equal(res.success, true);
  assert.equal(res.canvasId, 'canvas-pack-tool');
  assert.equal(res.framework, 'vite-react');
  assert.equal(res.filesCount, 9);
  assert.equal(res.downloadUrl, '/dsh-live-canvas/api/pack/canvas-pack-tool?framework=vite-react');
});
