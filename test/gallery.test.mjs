import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGalleryWrapper, transpileAndWrap } from '../lib/transpiler.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('buildGalleryWrapper generates storybook grid cards for variants', () => {
  const variants = [
    { name: 'Primary', content: '<button class="bg-blue-600 text-white px-4 py-2 rounded">Click me</button>', description: 'Primary action' },
    { name: 'Secondary', content: '<button class="bg-zinc-200 text-zinc-800 px-4 py-2 rounded">Cancel</button>', description: 'Secondary action' }
  ];

  const html = buildGalleryWrapper(variants, { title: 'Button Variants', theme: 'dark' });
  assert.ok(html.includes('Button Variants'));
  assert.ok(html.includes('Primary'));
  assert.ok(html.includes('Secondary'));
  assert.ok(html.includes('Multi-Variant Storybook Matrix'));
  assert.ok(html.includes('cdn.tailwindcss.com'));
});

test('transpileAndWrap delegates to gallery when session componentType is gallery', () => {
  const session = {
    title: 'Input States',
    componentType: 'gallery',
    variants: [
      { name: 'Default', content: '<input class="border p-2" />' },
      { name: 'Error', content: '<input class="border border-red-500 p-2" />' }
    ]
  };

  const html = transpileAndWrap(session);
  assert.ok(html.includes('Input States'));
  assert.ok(html.includes('border-red-500'));
});

test('live_canvas_gallery tool registers and creates gallery preview', async () => {
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

  const galleryTool = registeredTools.get('live_canvas_gallery');
  assert.ok(galleryTool, 'live_canvas_gallery tool must be registered');

  const res = await galleryTool.execute({
    title: 'Card Variants',
    variants: [
      { name: 'Simple', content: '<div>Simple Card</div>' },
      { name: 'With Badge', content: '<div>Badge Card</div>' }
    ]
  });

  assert.equal(res.success, true);
  assert.equal(res.variantsCount, 2);
  assert.ok(res.previewUrl.startsWith('/dsh-live-canvas/sandbox/'));
});
