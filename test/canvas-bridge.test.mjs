import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const start = source.indexOf('function handleWindowMessage(e) {');
const end = source.indexOf("window.addEventListener('message', handleWindowMessage)", start);
const calls = [];
const frame = { src: 'http://127.0.0.1:3080/dsh-live-canvas/sandbox/hub', contentWindow: {} };
const context = {
  URL, frameRef: { current: frame }, matrixFramesRef: { current: [] },
  canvasIdRef: { current: 'hub' }, window: { location: { href: 'http://127.0.0.1:3080/' } },
  fetch: (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return Promise.resolve({ ok: true, json: async () => ({ canvasId: 'test-demo' }) }); },
  setCurrentFilePath() {}, setCanvasId() {}, loadSessionsAndFiles() {}, showToast() {}
};
vm.createContext(context);
vm.runInContext(source.slice(start, end) + '\nthis.handle = handleWindowMessage;', context);
const send = (sourceWindow, demo) => context.handle({ source: sourceWindow, data: { type: 'dlc_load_demo', demo } });
send({}, 'calc');
send(context.window, 'calc');
send(frame.contentWindow, 'unknown');
context.canvasIdRef.current = 'untrusted-preview';
send(frame.contentWindow, 'calc');
context.canvasIdRef.current = 'hub';
frame.src = 'http://127.0.0.1:3080/dsh-live-canvas/sandbox/untrusted-preview';
send(frame.contentWindow, 'calc');
assert.equal(calls.length, 0);
frame.src = 'http://127.0.0.1:3080/dsh-live-canvas/sandbox/hub';
send(frame.contentWindow, 'calc');
assert.equal(calls.length, 1);
assert.deepEqual(calls[0], { url: '/dsh-live-canvas/api/preview', body: { demo: 'calc' } });
await new Promise(resolve => setImmediate(resolve));
assert.equal(context.canvasIdRef.current, 'test-demo');
console.log('PASS: five invalid bridge requests rejected; trusted Hub request accepted.');
