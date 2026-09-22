import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';

test('PreviewStore automatically detects componentType for JSX and TSX files', () => {
  const store = new PreviewStore();
  const jsxSession = store.createOrUpdateSession({
    title: 'Calculator.jsx',
    filePath: 'src/Calculator.jsx',
    content: 'import React from "react"; export default function Calculator() { return <div>123</div>; }'
  });

  assert.equal(jsxSession.componentType, 'react', 'JSX file should be auto-detected as react');

  const htmlSession = store.createOrUpdateSession({
    title: 'index.html',
    filePath: 'index.html',
    content: '<div class="banner">Hello World</div>'
  });

  assert.equal(htmlSession.componentType, 'html', 'HTML file should be auto-detected as html');
});

test('PreviewStore.getLatestSession returns the most recently active session', () => {
  const store = new PreviewStore();
  assert.equal(store.getLatestSession(), null);

  const s1 = store.createOrUpdateSession({ title: 'First', content: '<div>1</div>' });
  assert.equal(store.getLatestSession().id, s1.id);

  const s2 = store.createOrUpdateSession({ title: 'Second', content: '<div>2</div>' });
  assert.equal(store.getLatestSession().id, s2.id);

  // Accessing s1 refreshes its LRU order
  store.getSession(s1.id);
  assert.equal(store.getLatestSession().id, s1.id);
});

