import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { bundleMultiFileReact, buildReactWrapper, buildHtmlWrapper } from '../lib/transpiler.js';

test('bundleMultiFileReact recursively inlines child modules and CSS', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-bundler-test-'));
  
  // 1. Create child data module
  fs.writeFileSync(path.join(tmpDir, 'data.js'), `
    export const MENU_ITEMS = [{ id: 1, name: 'Espresso' }];
    export function getPrice(id) { return 3.5; }
  `);

  // 2. Create child component
  fs.writeFileSync(path.join(tmpDir, 'Header.jsx'), `
    import React from 'react';
    import { MENU_ITEMS } from './data.js';
    export default function Header() {
      return <header className="p-4">Coffee {MENU_ITEMS[0].name}</header>;
    }
  `);

  // 3. Create CSS file
  fs.writeFileSync(path.join(tmpDir, 'theme.css'), `
    .custom-coffee-btn { background-color: #8b5a2b; }
  `);

  // 4. Create App.jsx
  const appCode = `
    import React from 'react';
    import Header from './Header.jsx';
    import './theme.css';

    export default function App() {
      return (
        <div>
          <Header />
          <button className="custom-coffee-btn">Order</button>
        </div>
      );
    }
  `;
  const appPath = path.join(tmpDir, 'App.jsx');
  fs.writeFileSync(appPath, appCode);

  const res = bundleMultiFileReact(appCode, {
    filePath: appPath,
    workspaceDir: tmpDir
  });

  assert.ok(res.bundledCode.includes('const MENU_ITEMS ='), 'Should inline MENU_ITEMS from data.js');
  assert.ok(res.bundledCode.includes('function Header()'), 'Should inline Header function');
  assert.ok(res.accumulatedCss.includes('.custom-coffee-btn'), 'Should accumulate CSS from theme.css');

  const wrapper = buildReactWrapper(appCode, {
    filePath: appPath,
    workspaceDir: tmpDir
  });

  assert.ok(wrapper.includes('custom-coffee-btn'), 'React HTML wrapper should include accumulated CSS');
  assert.ok(wrapper.includes('window.__DLC_MAIN_COMPONENT__'), 'Should define main component entry');

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

