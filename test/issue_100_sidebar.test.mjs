import assert from 'node:assert/strict';
import { test } from 'node:test';

// Mock window.__ModuleLoader__
let clientModule = null;
globalThis.window = {
  __ModuleLoader__: {
    load: ({ id, factory }) => {
      const mockRequire = (name) => {
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
      clientModule = factory(mockRequire);
    }
  },
  lucide: { createIcons: () => {} }
};

await import('../lib/client.js');

test('extractFilePathFromAddress correctly strips dsh-resource prefixes', () => {
  const { extractFilePathFromAddress } = clientModule;
  assert.equal(typeof extractFilePathFromAddress, 'function');

  assert.equal(
    extractFilePathFromAddress('dsh-resource://file/session/s1/src/components/App.tsx'),
    'src/components/App.tsx'
  );
  assert.equal(
    extractFilePathFromAddress('dsh-resource://file/absolute/%2Fhome%2Fuser%2Findex.html'),
    '/home/user/index.html'
  );
  assert.equal(
    extractFilePathFromAddress('dsh-resource://file/public/preview.html'),
    'public/preview.html'
  );
  assert.equal(
    extractFilePathFromAddress('plain/path/index.html'),
    'plain/path/index.html'
  );
  assert.equal(extractFilePathFromAddress(''), '');
});

test('Mode 1: Native DSH Sidebar only registers tab and slot without betterSidebar', () => {
  const { registerNativeSidebar, registerBetterSidebar } = clientModule;

  let registeredTab = null;
  let registeredSlot = null;
  const mockCtx = {
    sidebarRightTabs: {
      register: (def) => {
        registeredTab = def;
        return () => { registeredTab = null; };
      }
    },
    slots: {
      register: (slotDef, comp) => {
        registeredSlot = { slotDef, comp };
        return () => { registeredSlot = null; };
      }
    }
  };

  const cleanup = registerNativeSidebar(mockCtx);
  assert.ok(registeredTab, 'Native tab definition must be registered');
  assert.equal(registeredTab.id, '@goodandready/dsh-live-canvas');
  assert.equal(registeredTab.kind, 'live-canvas');
  assert.equal(registeredTab.priority, 'extension');
  assert.ok(registeredTab.canOpen('dsh-resource://file/session/s1/index.html'));
  assert.ok(!registeredTab.canOpen('dsh-resource://file/session/s1/binary.exe'));

  assert.ok(registeredSlot, 'Native tab slot must be registered');
  assert.equal(registeredSlot.slotDef.name, 'sidebar.right.pane.tab');
  assert.equal(registeredSlot.slotDef.key, '@goodandready/dsh-live-canvas');

  // Verify legacy betterSidebar does nothing
  const betterCleanup = registerBetterSidebar(mockCtx);
  assert.equal(typeof betterCleanup, 'function');

  // Verify cleanup
  cleanup();
  assert.equal(registeredTab, null);
  assert.equal(registeredSlot, null);
});

test('Mode 2: Legacy dsh-better-sidebar only registers without native sidebar', () => {
  const { registerNativeSidebar, registerBetterSidebar } = clientModule;

  let legacyTab = null;
  let legacyViewer = null;
  const mockCtx = {
    betterSidebar: {
      registerTab: (def) => {
        legacyTab = def;
        return () => { legacyTab = null; };
      },
      registerFileViewer: (def) => {
        legacyViewer = def;
        return () => { legacyViewer = null; };
      }
    }
  };

  const nativeCleanup = registerNativeSidebar(mockCtx);
  assert.equal(typeof nativeCleanup, 'function');

  const betterCleanup = registerBetterSidebar(mockCtx);
  assert.ok(legacyTab, 'Legacy tab must be registered');
  assert.equal(legacyTab.id, 'live-canvas');
  assert.ok(legacyViewer, 'Legacy file viewer must be registered');
  assert.equal(legacyViewer.id, 'live-canvas-viewer');

  betterCleanup();
  assert.equal(legacyTab, null);
  assert.equal(legacyViewer, null);
});

test('Mode 3: Both sidebars enabled coexist without conflict', () => {
  const { registerNativeSidebar, registerBetterSidebar } = clientModule;

  let nativeTab = null;
  let nativeSlot = null;
  let legacyTab = null;
  let legacyViewer = null;

  const mockCtx = {
    sidebarRightTabs: {
      register: (def) => {
        nativeTab = def;
        return () => { nativeTab = null; };
      }
    },
    slots: {
      register: (slotDef, comp) => {
        nativeSlot = { slotDef, comp };
        return () => { nativeSlot = null; };
      }
    },
    betterSidebar: {
      registerTab: (def) => {
        legacyTab = def;
        return () => { legacyTab = null; };
      },
      registerFileViewer: (def) => {
        legacyViewer = def;
        return () => { legacyViewer = null; };
      }
    }
  };

  const cleanNative = registerNativeSidebar(mockCtx);
  const cleanLegacy = registerBetterSidebar(mockCtx);

  assert.ok(nativeTab && nativeSlot && legacyTab && legacyViewer);
  assert.notEqual(nativeTab.id, legacyTab.id, 'IDs must be distinct to prevent collision');
  assert.equal(nativeTab.id, '@goodandready/dsh-live-canvas');
  assert.equal(legacyTab.id, 'live-canvas');

  cleanNative();
  cleanLegacy();
  assert.equal(nativeTab, null);
  assert.equal(legacyTab, null);
});

test('Mode 4: Neither sidebar available leaves plugin operational in standalone mode', () => {
  const { registerNativeSidebar, registerBetterSidebar, apply } = clientModule;

  const mockCtx = {
    locale: { register: () => {} },
    slots: {
      inject: (name, cb) => cb(),
      register: () => () => {}
    },
    inject: (deps, cb) => {
      // Simulate neither service being provided
      return;
    }
  };

  assert.doesNotThrow(() => {
    registerNativeSidebar({});
    registerBetterSidebar({});
    apply(mockCtx);
  }, 'Plugin must boot cleanly when neither sidebar is available');
});

