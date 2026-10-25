import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { injectSandboxRuntime } from '../lib/sandbox.js';

const client = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const server = fs.readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function workspaceHarness({ deferSessions = false, hotReload = true } = {}) {
  const states = [], refs = [], effects = [], requests = [], sources = [], pending = [];
  let stateIndex, refIndex, effectIndex, scheduled, tree;
  let props = { canvasId: 'canvas-a', visible: true, ctx: {} };
  let frames = [];
  const listeners = new Map();
  class EventSource {
    constructor(url) { this.url = url; this.listeners = new Map(); sources.push(this); }
    addEventListener(name, handler) { this.listeners.set(name, handler); }
    emit(name, payload = {}) { this.listeners.get(name)?.({ data: JSON.stringify(payload) }); }
    close() { this.closed = true; }
  }
  const context = {
    console, Date, URL, URLSearchParams, AbortController, setTimeout, clearTimeout, EventSource,
    localStorage: { getItem: () => null, removeItem() {} },
    getActiveLocale: () => 'en', getDict: () => ({}), i18n: { en: {} },
    window: {
      location: { origin: 'http://localhost:3080', href: 'http://localhost:3080/' },
      addEventListener(name, handler) { listeners.set(handler, name); },
      removeEventListener(_name, handler) { listeners.delete(handler); }
    },
    fetch(url, options = {}) {
      requests.push({ url, options });
      const response = { json: async () => ({
        config: { enableHotReload: hotReload }, files: [],
        sessions: [{ id: 'canvas-a', title: 'A' }, { id: 'canvas-b', title: 'B' }]
      }) };
      if (deferSessions && url === '/dsh-live-canvas/api/sessions') {
        // Deliberately ignore abort to reproduce a response already being decoded.
        return new Promise(resolve => pending.push(() => resolve(response)));
      }
      return Promise.resolve(response);
    },
    React: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      },
      useRef(initial) { return refs[refIndex++] ||= { current: initial }; },
      useEffect(callback, deps) {
        const index = effectIndex++;
        if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
          scheduled.push({ index, callback, deps });
        }
      },
      createElement(type, elementProps, ...children) { return { type, props: elementProps || {}, children: children.flat(Infinity) }; }
    }
  };
  vm.createContext(context);
  const start = client.indexOf('// ---------------------------------------------------------------- Live Canvas Workspace Component');
  const end = client.indexOf('// ---------------------------------------------------------------- Live Canvas File Viewer', start);
  vm.runInContext(client.slice(start, end), context);
  function nodes(node, predicate) {
    if (!node || typeof node !== 'object') return [];
    return [...(predicate(node) ? [node] : []), ...node.children.flatMap(child => nodes(child, predicate))];
  }
  function render(changes = {}) {
    props = { ...props, ...changes };
    stateIndex = refIndex = effectIndex = 0;
    scheduled = [];
    tree = context.LiveCanvasWorkspace(props);
    for (const frame of frames) {
      if (typeof frame.ref === 'function') frame.ref(null);
      else frame.ref.current = null;
    }
    frames = nodes(tree, node => node.type === 'iframe').map(node => {
      const frame = { src: node.props.src, contentWindow: { postMessage() {} }, ref: node.props.ref };
      if (typeof frame.ref === 'function') frame.ref(frame);
      else frame.ref.current = frame;
      return frame;
    });
    for (const effect of scheduled) {
      effects[effect.index]?.cleanup?.();
      effects[effect.index] = { deps: effect.deps, cleanup: effect.callback() };
    }
    return tree;
  }
  return {
    render, requests, sources, pending, listeners,
    frames: () => frames,
    button(key) { return nodes(tree, node => node.type === 'button' && node.children.some(child => typeof child === 'string' && child.includes(key)))[0]; },
    unmount() { for (const effect of effects) effect?.cleanup?.(); }
  };
}

test('only the active viewport mounts frames and hidden workspaces release their stream', async () => {
  const app = workspaceHarness();
  app.render();
  await flush();
  app.render();
  assert.equal(app.frames().length, 1);
  assert.match(app.frames()[0].src, /parentManaged=1/);
  assert.equal(app.sources.filter(source => !source.closed).length, 1);
  app.button('matrix').props.onClick();
  app.render();
  assert.equal(app.frames().length, 3);
  app.render({ visible: false });
  await flush();
  assert.equal(app.frames().length, 0);
  assert.equal(app.sources.filter(source => !source.closed).length, 0);
  const requestCount = app.requests.length;
  app.sources[0].emit('update', { canvasId: 'canvas-a' });
  assert.equal(app.requests.length, requestCount);
  app.render({ visible: true });
  await flush();
  app.render();
  assert.equal(app.frames().length, 3);
  assert.ok(app.frames().every(frame => frame.src.includes('/canvas-a?')));
  assert.equal(app.sources.filter(source => !source.closed).length, 1);
  app.unmount();
  assert.equal(app.sources.filter(source => !source.closed).length, 0);
});

test('a delayed configuration response cannot create a stream after cleanup', async () => {
  for (const unmount of [false, true]) {
    const app = workspaceHarness({ deferSessions: true });
    app.render();
    if (unmount) app.unmount();
    else app.render({ visible: false });
    for (const resolve of app.pending) resolve();
    await flush();
    assert.equal(app.sources.length, 0);
    assert.ok(app.requests.filter(request => request.url === '/dsh-live-canvas/api/sessions')
      .every(request => request.options.signal?.aborted));
    app.unmount();
  }
});

test('an initially hidden workspace does not fetch or subscribe until shown', async () => {
  const app = workspaceHarness();
  app.render({ visible: false });
  await flush();
  assert.equal(app.requests.length, 0);
  assert.equal(app.frames().length, 0);
  app.render({ visible: true });
  await flush();
  assert.equal(app.frames().length, 1);
  assert.equal(app.sources.length, 1);
  app.unmount();
});

test('Projects Hub refreshes its frame without selecting a newly updated canvas', async () => {
  const app = workspaceHarness();
  app.render({ canvasId: 'hub' });
  await flush();
  app.sources[0].emit('update', { canvasId: 'canvas-b' });
  assert.match(app.frames()[0].src, /\/sandbox\/hub\?parentManaged=1&t=/);
  app.render();
  assert.match(app.frames()[0].src, /\/sandbox\/hub\?parentManaged=1/);
  app.unmount();
});

test('parent updates refresh all active matrix frames without selecting another canvas', async () => {
  const app = workspaceHarness();
  app.render();
  await flush();
  app.button('matrix').props.onClick();
  app.render();
  const initial = app.frames().map(frame => frame.src);
  app.sources[0].emit('update', { canvasId: 'canvas-b' });
  assert.deepEqual(app.frames().map(frame => frame.src), initial);
  app.sources[0].emit('update', { canvasId: 'canvas-a' });
  assert.ok(app.frames().every(frame => /canvas-a\?parentManaged=1&t=/.test(frame.src)));
  app.sources[0].emit('reload');
  assert.ok(app.frames().every(frame => frame.src.includes('parentManaged=1')));
  app.unmount();
  const disabled = workspaceHarness({ hotReload: false });
  disabled.render();
  await flush();
  assert.equal(disabled.sources.length, 0);
  disabled.unmount();
});

function runtimeContext({ embedded, managed }) {
  const sources = [];
  const window = { location: { search: managed ? '?parentManaged=1' : '', reload() {} }, addEventListener() {} };
  window.parent = embedded ? {} : window;
  return {
    sources, window, URLSearchParams, console,
    document: { addEventListener() {} },
    CANVAS_ID: 'canvas-a', EVENTS_URL: '/dsh-live-canvas/events',
    EventSource: class {
      constructor() { sources.push(this); }
      addEventListener() {}
      close() {}
    }
  };
}

test('sandbox frames delegate updates only when explicitly managed by a parent', () => {
  const html = injectSandboxRuntime('<body></body>', 'canvas-a');
  const start = html.indexOf('// --- SSE Auto-Reload Connection ---');
  const end = html.indexOf('\n})();', start);
  for (const [embedded, managed, count] of [[true, true, 0], [true, false, 1], [false, true, 1], [false, false, 1]]) {
    const context = runtimeContext({ embedded, managed });
    vm.runInNewContext(html.slice(start, end), context);
    assert.equal(context.sources.length, count, JSON.stringify({ embedded, managed }));
  }
});

test('Projects Hub retains standalone updates but delegates managed iframe updates', () => {
  const start = server.indexOf('function buildProjectsHubHtml(');
  const end = server.indexOf('const unregSandbox =', start);
  const context = { CALC_DEMO_CODE: '', DASH_DEMO_CODE: '', logger: console };
  vm.createContext(context);
  vm.runInContext(server.slice(start, end), context);
  const html = context.buildProjectsHubHtml({ store: { listSessions: () => [] }, watcher: null });
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  for (const [embedded, managed, count] of [[true, true, 0], [true, false, 1], [false, true, 1]]) {
    const runtime = runtimeContext({ embedded, managed });
    vm.runInNewContext(script, runtime);
    assert.equal(runtime.sources.length, count, JSON.stringify({ embedded, managed }));
  }
});
