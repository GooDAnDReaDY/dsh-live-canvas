import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');
const states = [], refs = [], effects = [];
let stateIndex = 0, refIndex = 0, observer;
const context = {
  console, setTimeout, clearTimeout, Date,
  localStorage: { getItem: () => null, setItem() {} },
  getActiveLocale: () => 'en', getDict: () => ({ chatPreviewTitle: 'Live Canvas preview', chatPreviewLoading: 'Loading live preview…', chatPreviewError: 'Preview failed to load.' }), i18n: { en: {} },
  openLiveCanvasInSidebar: () => { throw new Error('Unexpected automatic navigation'); },
  IntersectionObserver: class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(element) { this.element = element; }
    disconnect() { this.disconnected = true; }
  },
  React: {
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
    useEffect(callback) { effects.push(callback); },
    createElement(type, props, ...children) { return { type, props: props || {}, children }; }
  }
};
vm.createContext(context);
const parserStart = source.indexOf('function parseToolBlockData(');
vm.runInContext(source.slice(parserStart, source.indexOf('function openLiveCanvasInSidebar(', parserStart)), context);
const cardStart = source.indexOf('function LiveCanvasChatCard(');
vm.runInContext(source.slice(cardStart, source.indexOf('// ---------------------------------------------------------------- Live Canvas Workspace Component', cardStart)), context);
const props = { block: { content: [{ type: 'text', text: 'Live preview ready at /dsh-live-canvas/sandbox/generated-id.' }], call: { argsRaw: '{"title":"Inline QA"}' } }, ctx: { settings: { get: () => ({ autoOpenOnHtmlGen: false }) } } };
function render() { stateIndex = 0; refIndex = 0; return context.LiveCanvasChatCard(props); }
function find(node, predicate) { if (!node || typeof node !== 'object') return null; if (predicate(node)) return node; return node.children?.map(child => find(child, predicate)).find(Boolean); }
let tree = render();
let iframe = find(tree, node => node.type === 'iframe');
assert.equal(iframe.props.src, undefined);
assert.equal(iframe.props.title, 'Live Canvas preview: Inline QA');
assert.equal(iframe.props.sandbox, 'allow-scripts allow-forms allow-modals');
const box = find(tree, node => node.props.className === 'dlc-chat-card-frame-box');
const element = { isConnected: false };
box.props.ref.current = element;
const frameElement = { isConnected: true, src: '' };
iframe.props.ref.current = frameElement;
const cleanups = effects.splice(0).map(effect => effect());
observer.callback([{ isIntersecting: true }]);
assert.equal(states[2], 0);
element.isConnected = true;
observer.callback([{ isIntersecting: false }]);
assert.equal(states[2], 0);
observer.callback([{ isIntersecting: true }]);
assert.ok(states[2] > 0);
assert.equal(observer.disconnected, true);
const revision = states[2];
observer.callback([{ isIntersecting: true }]);
assert.equal(states[2], revision);
tree = render();
iframe = find(tree, node => node.type === 'iframe');
assert.ok(iframe.props.src.startsWith('/dsh-live-canvas/sandbox/generated-id?t='));
effects.splice(0).forEach(effect => effect());
assert.equal(frameElement.src, iframe.props.src);
assert.ok(find(tree, node => node.props.role === 'status'));
iframe.props.onLoad();
tree = render();
assert.equal(find(tree, node => node.props.role === 'status'), undefined);
for (const cleanup of cleanups) if (cleanup) cleanup();
console.log('PASS: inline card waits for connected, visible DOM; generated ID is parsed; observer activates once; loading state clears; sandbox is preserved.');
