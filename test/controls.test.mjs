import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { buildReactWrapper, transpileAndWrap } from '../lib/transpiler.js';

test('PreviewStore manages props controls and default values', () => {
  const store = new PreviewStore();

  const session = store.createOrUpdateSession({
    id: 'canvas-ctrl-1',
    title: 'Counter Component',
    componentType: 'react',
    controls: {
      initialCount: { type: 'number', default: 5 },
      label: { type: 'string', default: 'Votes' }
    }
  });

  assert.equal(session.controlValues.initialCount, 5);
  assert.equal(session.controlValues.label, 'Votes');

  store.updateControlValues('canvas-ctrl-1', { initialCount: 10 });
  const updated = store.getSession('canvas-ctrl-1');
  assert.equal(updated.controlValues.initialCount, 10);
  assert.equal(updated.controlValues.label, 'Votes');
});

test('buildReactWrapper injects props controls and message listener', () => {
  const html = buildReactWrapper('export default function Button(props) { return <button>{props.label}</button>; }', {
    controlValues: { label: 'Submit' }
  });

  assert.ok(html.includes('window.__DLC_PROPS__ = {"label":"Submit"}'));
  assert.ok(html.includes('dlc_set_props'));
  assert.ok(html.includes('renderApp(window.__DLC_PROPS__)'));
});

test('live_canvas_controls tool sets schema and updates values', async () => {
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

  store.createOrUpdateSession({ id: 'canvas-test' });

  const ctrlTool = registeredTools.get('live_canvas_controls');
  assert.ok(ctrlTool, 'live_canvas_controls tool must be registered');

  // 1. set_schema
  const res1 = await ctrlTool.execute({
    action: 'set_schema',
    canvasId: 'canvas-test',
    controls: {
      theme: { type: 'select', options: ['dark', 'light'], default: 'dark' }
    },
    values: { theme: 'light' }
  });
  assert.equal(res1.success, true);
  assert.equal(res1.values.theme, 'light');

  // 2. set_values
  const res2 = await ctrlTool.execute({
    action: 'set_values',
    canvasId: 'canvas-test',
    values: { theme: 'dark' }
  });
  assert.equal(res2.success, true);
  assert.equal(res2.values.theme, 'dark');

  // 3. get
  const res3 = await ctrlTool.execute({
    action: 'get',
    canvasId: 'canvas-test'
  });
  assert.equal(res3.success, true);
  assert.equal(res3.values.theme, 'dark');
});
