import assert from 'node:assert/strict';
import { test } from 'node:test';

// Mock window.__ModuleLoader__
let clientExport = null;
globalThis.window = {
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      const require = (name) => {
        if (name === 'react') {
          return {
            createElement: (type, props, ...children) => ({ type, props, children }),
            useState: (init) => [init, () => {}],
            useEffect: () => {},
            useRef: () => ({ current: null }),
            useMemo: (fn) => fn()
          };
        }
        return {};
      };
      clientExport = factory(require);
    }
  }
};

await import('../lib/client.js');

test('client module exports registerBetterSidebar, LiveCanvasWorkspace, and LiveCanvasFileViewer', () => {
  assert.ok(clientExport);
  assert.equal(typeof clientExport.registerBetterSidebar, 'function');
  assert.ok(clientExport.LiveCanvasWorkspace);
  assert.ok(clientExport.LiveCanvasFileViewer);
});

test('registerBetterSidebar registers tab and file viewer with BetterSidebar service', () => {
  const registeredTabs = [];
  const registeredViewers = [];

  const mockBetterSidebar = {
    registerTab: (desc) => registeredTabs.push(desc),
    registerFileViewer: (desc) => registeredViewers.push(desc)
  };

  const mockCtx = {
    betterSidebar: mockBetterSidebar,
    locale: {
      getSnapshot: () => ({ active: 'en' })
    }
  };

  clientExport.registerBetterSidebar(mockCtx);

  assert.equal(registeredTabs.length, 1);
  const tab = registeredTabs[0];
  assert.equal(tab.id, 'live-canvas');
  assert.equal(tab.single, true);
  assert.equal(tab.order, 25);
  assert.equal(typeof tab.component, 'function');
  assert.equal(typeof tab.urlTarget, 'function');

  // Test urlTarget
  assert.equal(tab.urlTarget(new URL('http://localhost:3080/dsh-live-canvas/sandbox/c1')), true);
  assert.equal(tab.urlTarget(new URL('http://localhost:3080/other/page')), false);

  assert.equal(registeredViewers.length, 1);
  const viewer = registeredViewers[0];
  assert.equal(viewer.id, 'live-canvas-viewer');
  assert.ok(viewer.exts.includes('html'));
  assert.ok(viewer.exts.includes('jsx'));
  assert.ok(viewer.exts.includes('tsx'));
  assert.ok(viewer.exts.includes('svg'));
  assert.ok(viewer.exts.includes('mermaid'));
  assert.equal(typeof viewer.component, 'function');
});
