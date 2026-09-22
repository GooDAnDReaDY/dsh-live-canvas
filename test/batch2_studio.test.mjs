import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { listTemplates, getTemplateById } from '../lib/templates.js';
import { scanWorkspaceComponents, buildStorybookMatrixData } from '../lib/storybook.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('Curated Design Blocks library returns categories and blocks', () => {
  const all = listTemplates();
  assert.ok(all.length >= 5, 'Should provide at least 5 design blocks');

  const heroes = listTemplates('Hero');
  assert.ok(heroes.length >= 1, 'Should find Hero blocks');

  const block = getTemplateById('hero-mesh-glow');
  assert.ok(block, 'Should find hero-mesh-glow block');
  assert.ok(block.htmlSnippet.includes('bg-zinc-950'), 'Block should contain valid HTML snippet');
});

test('Storybook scanner identifies workspace components and creates storybook matrix', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-sb-test-'));
  const srcDir = path.join(tmpDir, 'src', 'components');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'Button.jsx'), 'export default function Button() { return <button>Click</button>; }');
  fs.writeFileSync(path.join(srcDir, 'Card.jsx'), 'export default function Card() { return <div>Card</div>; }');

  const components = scanWorkspaceComponents(tmpDir);
  assert.equal(components.length, 2, 'Should detect 2 components');
  assert.equal(components[0].name, 'Button');
  assert.equal(components[1].name, 'Card');

  const matrix = buildStorybookMatrixData(components);
  assert.equal(matrix.componentType, 'gallery');
  assert.equal(matrix.variants.length, 2);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Batch 2 Tools 15, 16, 17 execute correctly', async () => {
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

  // 1. Tool 15: live_canvas_storybook
  const sbTool = registeredTools.get('live_canvas_storybook');
  assert.ok(sbTool, 'live_canvas_storybook tool must be registered');
  const sbRes = await sbTool.execute({ scanWorkspace: false });
  assert.equal(sbRes.success, true);
  assert.ok(sbRes.galleryUrl.startsWith('/dsh-live-canvas/sandbox/'));

  // 2. Tool 16: live_canvas_insert_block
  const blockTool = registeredTools.get('live_canvas_insert_block');
  assert.ok(blockTool, 'live_canvas_insert_block tool must be registered');
  const insertRes = await blockTool.execute({ blockId: 'hero-mesh-glow' });
  assert.equal(insertRes.success, true);
  assert.equal(insertRes.blockId, 'hero-mesh-glow');

  // 3. Tool 17: live_canvas_vision_import
  const visionTool = registeredTools.get('live_canvas_vision_import');
  assert.ok(visionTool, 'live_canvas_vision_import tool must be registered');
  const visionRes = await visionTool.execute({
    title: 'Landing Page Mockup',
    framework: 'react',
    generatedCode: 'export default function Mockup() { return <div>Mockup</div>; }'
  });
  assert.equal(visionRes.success, true);
  assert.ok(visionRes.canvasId);
  assert.ok(visionRes.previewUrl.startsWith('/dsh-live-canvas/sandbox/'));

  // Total 17 tools
  assert.ok(registeredTools.size >= 17, 'All 17 agent tools should be registered');
});

