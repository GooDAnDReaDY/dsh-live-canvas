import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('package.json dsh.client.inject does not contain obsolete @deepseek-ai/dsh-client-runtime', () => {
  const clientInject = pkg.dsh?.client?.inject || [];
  assert.ok(Array.isArray(clientInject), 'client inject must be an array');
  assert.equal(
    clientInject.includes('@deepseek-ai/dsh-client-runtime'),
    false,
    '@deepseek-ai/dsh-client-runtime must not be present in client inject list'
  );
  assert.ok(clientInject.includes('@deepseek-ai/dsh-client-locale'), 'must include dsh-client-locale');
  assert.ok(clientInject.includes('@deepseek-ai/dsh-client-ui-slots'), 'must include dsh-client-ui-slots');
  assert.ok(clientInject.includes('@deepseek-ai/dsh-client-ui-settings'), 'must include dsh-client-ui-settings');
});

test('client entry can be initialized with alpha2 context dependencies without runtime module', async () => {
  let loadedExport = null;
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
        loadedExport = factory(require);
      }
    }
  };

  await import('../lib/client.js?alpha2=' + Date.now());

  // Mock alpha2 context
  const registeredSlots = [];
  const registeredLocales = [];
  let betterSidebarCallCount = 0;
  let tabDisposed = false;
  let viewerDisposed = false;

  const mockCtx = {
    locale: {
      register: (ns, dict) => registeredLocales.push({ ns, dict }),
      getSnapshot: () => ({ active: 'en' })
    },
    slots: {
      inject: (slotName, cb) => cb(),
      register: (desc, comp) => {
        registeredSlots.push({ desc, comp });
        return () => {};
      }
    },
    inject: (deps, cb) => {
      if (deps.includes('betterSidebar')) {
        betterSidebarCallCount++;
        return cb({
          betterSidebar: {
            registerTab: () => () => { tabDisposed = true; },
            registerFileViewer: () => () => { viewerDisposed = true; }
          },
          locale: { getSnapshot: () => ({ active: 'en' }) }
        });
      }
    }
  };

  assert.ok(loadedExport, 'Client module factory must have loaded');
  assert.equal(typeof loadedExport.apply, 'function');
  loadedExport.apply(mockCtx);
  assert.ok(registeredSlots.length > 0, 'Settings slot must be registered');
  assert.ok(registeredLocales.length > 0, 'Locale dictionary must be registered');
  assert.equal(betterSidebarCallCount, 1, 'betterSidebar should be injected exactly once via ctx.inject');
});

test('registerBetterSidebar is declaration-safe and returns cleanup disposers', async () => {
  let loadedExport = null;
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
        loadedExport = factory(require);
      }
    }
  };

  await import('../lib/client.js?alpha2_disposer=' + Date.now());

  let registeredTabs = [];
  let registeredViewers = [];
  let unregTabCalled = false;
  let unregViewerCalled = false;

  const mockCtx = {
    betterSidebar: {
      registerTab: (desc) => {
        registeredTabs.push(desc);
        return () => { unregTabCalled = true; };
      },
      registerFileViewer: (desc) => {
        registeredViewers.push(desc);
        return () => { unregViewerCalled = true; };
      }
    },
    locale: { getSnapshot: () => ({ active: 'en' }) }
  };

  assert.ok(loadedExport, 'Client export must be loaded');
  const disposer = loadedExport.registerBetterSidebar(mockCtx);
  assert.equal(registeredTabs.length, 1);
  assert.equal(registeredViewers.length, 1);
  assert.equal(typeof disposer, 'function', 'registerBetterSidebar must return a disposer function');

  disposer();
  assert.equal(unregTabCalled, true, 'Tab registration disposer must be called on cleanup');
  assert.equal(unregViewerCalled, true, 'File viewer registration disposer must be called on cleanup');
});
