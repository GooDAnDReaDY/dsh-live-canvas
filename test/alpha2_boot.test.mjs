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
        cb({
          betterSidebar: {
            registerTab: () => () => {},
            registerFileViewer: () => () => {}
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
});
