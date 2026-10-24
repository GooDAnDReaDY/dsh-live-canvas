import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Exercise the shipped adapter without requiring a running DSH host.
const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const context = {
  URL, AbortController, console,
  window: { location: { origin: 'http://localhost:3080' } },
  React: { createElement: (type, props) => ({ type, props }) },
  LiveCanvasWorkspace() {}, LiveCanvasFileViewer() {}, LiveCanvasIcon() {},
  getService: (ctx, name) => ctx?.[name], NS: 'test', rootSidebarRight: null
};
vm.createContext(context);
function evaluateBetween(start, end) {
  const begin = source.indexOf(start);
  const finish = source.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin, `Missing source boundary: ${start}`);
  vm.runInContext(source.slice(begin, finish), context);
}
evaluateBetween('function extractFilePathFromAddress(', 'function LiveCanvasIcon(');
evaluateBetween('function registerNativeSidebar(', '// ---------------------------------------------------------------- Better Sidebar Integration Helper');
evaluateBetween('function openLiveCanvasInSidebar(', 'function LiveCanvasChatCard(');
vm.runInContext('this.selectionCount = () => nativeCanvasSelections.size;', context);

let definition;
let disposed = false;
const cleanup = context.registerNativeSidebar({
  sidebarRightTabs: { register: def => { definition = def; return () => { disposed = true; }; } }
});
assert.equal(definition.keepMounted, true);
assert.ok(definition.patterns.includes('dsh-resource://file/**/dsh-live-canvas/sandbox/*'));
const valid = [
  '/dsh-live-canvas/sandbox/canvas-a',
  'http://localhost:3080/dsh-live-canvas/sandbox/canvas-a?t=123#preview',
  'dsh-resource://file/session/s1//dsh-live-canvas/sandbox/canvas-a',
  'dsh-resource://file/absolute/dsh-live-canvas/sandbox/canvas-a',
  'dsh-resource://file/session/s1/dsh-live-canvas/sandbox/canvas-a?x=1'
];
for (const address of valid) {
  assert.equal(context.parseCanvasAddress(address).canvasId, 'canvas-a', address);
  assert.equal(definition.canOpen(address), true, address);
  assert.equal(definition.title(address), 'canvas-a', address);
}
for (const address of [
  '/etc/passwd', '/project/dsh-live-canvas/sandbox/canvas-a',
  'https://example.invalid/dsh-live-canvas/sandbox/canvas-a'
]) {
  assert.equal(context.parseCanvasAddress(address), null, address);
  assert.equal(definition.canOpen(address), false, address);
}
for (const address of [
  '/dsh-live-canvas/sandbox/%ZZ', '/dsh-live-canvas/sandbox/%2fetc',
  '/dsh-live-canvas/sandbox/..',
  'dsh-resource://file/session/s1//dsh-live-canvas/sandbox/%ZZ'
]) {
  assert.equal(context.parseCanvasAddress(address).error, 'Invalid canvas address', address);
  assert.equal(context.NativeLiveCanvasTabBody({ address }).props.role, 'alert');
}
assert.equal(definition.canOpen('dsh-resource://file/session/s1/readme.txt'), false);
for (const ext of ['html', 'jsx', 'svg', 'md']) {
  const address = `dsh-resource://file/session/s1/example.${ext}`;
  assert.equal(definition.canOpen(address), true);
  assert.equal(context.NativeLiveCanvasTabBody({ address }).type, context.LiveCanvasFileViewer);
}

const lifetime = new AbortController();
const tab = { id: 'host-tab-id', contentId: valid[2], navigation: { address: valid[2], revision: 1 }, signal: lifetime.signal };
const render = sessionId => context.NativeLiveCanvasTabBody({ sessionId, tabInfo: { tab } });
assert.equal(render('session-a').props.canvasId, 'canvas-a');
render('session-a').props.onCanvasChange('canvas-b');
assert.equal(render('session-a').props.canvasId, 'canvas-b');
assert.equal(render('session-b').props.canvasId, 'canvas-a');
tab.navigation.revision++;
assert.equal(render('session-a').props.canvasId, 'canvas-a');
lifetime.abort();
assert.equal(context.selectionCount(), 0);

const opens = [];
const sidebar = {
  mounted: { getSnapshot: () => 'session-a' }, active: () => ({ kind: 'live-canvas' }),
  openResource: address => opens.push(address), isExpanded: () => true
};
context.openLiveCanvasInSidebar('canvas-b', null, { sidebarRight: sidebar }, true);
assert.equal(opens.length, 0);
context.openLiveCanvasInSidebar('canvas-b', null, { sidebarRight: sidebar });
assert.equal(context.parseCanvasAddress(opens[0]).canvasId, 'canvas-b');
sidebar.active = () => ({ kind: 'editor' });
const held = new AbortController();
context.nativeCanvasSelection('session-a', { id: 'kept-tab', signal: held.signal });
context.openLiveCanvasInSidebar('canvas-a', null, { sidebarRight: sidebar }, true);
assert.equal(opens.length, 1);
held.abort();
cleanup();
assert.equal(disposed, true);

// Native hosts must not get a duplicate legacy tab; older hosts retain it.
const legacyStart = source.indexOf('// Prefer native tabs; keep Better Sidebar for older hosts only.');
const legacyEnd = source.indexOf('\n    };', legacyStart);
assert.ok(legacyStart >= 0 && legacyEnd > legacyStart);
const registration = source.slice(legacyStart, legacyEnd);
let legacyCalls = 0;
context.registerBetterSidebar = () => { legacyCalls++; return () => {}; };
for (const native of [true, false]) {
  const ctx = native ? { sidebarRightTabs: { register() {} } } : {};
  ctx.inject = (_services, callback) => callback(ctx);
  context.ctx = ctx;
  vm.runInContext(registration, context);
}
assert.equal(legacyCalls, 1);
console.log('PASS: resource parsing, native tab selection, session isolation, cleanup, ordinary files, and legacy fallback.');
