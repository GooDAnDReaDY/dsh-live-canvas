import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { buildDiffWrapper } from '../lib/transpiler.js';

test('PreviewStore records version snapshots upon content edits', () => {
  const store = new PreviewStore();

  store.createOrUpdateSession({
    id: 'canvas-diff-1',
    title: 'Version 1',
    content: '<h1>Hello Version 1</h1>',
    componentType: 'html'
  });

  assert.equal(store.getSnapshots('canvas-diff-1').length, 0);

  // Edit content
  store.createOrUpdateSession({
    id: 'canvas-diff-1',
    title: 'Version 2',
    content: '<h1>Hello Version 2 with new colors</h1>',
    componentType: 'html'
  });

  const snaps = store.getSnapshots('canvas-diff-1');
  assert.equal(snaps.length, 1);
  assert.equal(snaps[0].content, '<h1>Hello Version 1</h1>');

  const latestPrev = store.getLatestPreviousSnapshot('canvas-diff-1');
  assert.ok(latestPrev);
  assert.equal(latestPrev.content, '<h1>Hello Version 1</h1>');
});

test('buildDiffWrapper generates dual-layer split slider HTML', () => {
  const diffHtml = buildDiffWrapper(
    { content: '<h1>After</h1>', componentType: 'html' },
    { content: '<h1>Before</h1>', componentType: 'html' },
    { title: 'Diff Test' }
  );

  assert.ok(diffHtml.includes('diff-container'));
  assert.ok(diffHtml.includes('diff-handle'));
  assert.ok(diffHtml.includes('Before'));
  assert.ok(diffHtml.includes('After'));
});

test('live_canvas_diff tool returns diffUrl and snapshot history', async () => {
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

  store.createOrUpdateSession({ id: 'canvas-test', content: 'V1' });
  store.createOrUpdateSession({ id: 'canvas-test', content: 'V2' });

  const diffTool = registeredTools.get('live_canvas_diff');
  assert.ok(diffTool, 'live_canvas_diff tool must be registered');

  const res = await diffTool.execute({ canvasId: 'canvas-test' });
  assert.equal(res.success, true);
  assert.equal(res.canvasId, 'canvas-test');
  assert.equal(res.diffUrl, '/dsh-live-canvas/diff/canvas-test');
  assert.equal(res.snapshotCount, 1);
});
