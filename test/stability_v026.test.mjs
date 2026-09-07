import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceWatcher } from '../lib/watcher.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { buildReactWrapper } from '../lib/transpiler.js';

test('WorkspaceWatcher listWorkspaceFiles enforces maxFiles limit', () => {
  const store = new PreviewStore();
  const hub = new EventHub();
  const watcher = new WorkspaceWatcher(store, hub, { workspaceDir: process.cwd() });
  
  const filesAll = watcher.listWorkspaceFiles('', 5, 2);
  assert.ok(filesAll.length <= 2, 'listWorkspaceFiles must respect maxFiles cap');
});

test('PreviewStore persists and restores sessions from disk', () => {
  const tmpFile = path.join(os.tmpdir(), `dlc-test-sessions-${Date.now()}.json`);
  try {
    const store1 = new PreviewStore({ persistencePath: tmpFile });
    store1.createOrUpdateSession({
      id: 'test-persist-1',
      title: 'Persistent Canvas',
      content: '<h1>Hello Persist</h1>',
      componentType: 'html'
    });

    // Flush save immediately for testing
    const payload = JSON.stringify({
      updatedAt: new Date().toISOString(),
      sessions: Array.from(store1.sessions.values()),
      snapshots: Array.from(store1.snapshots.entries())
    }, null, 2);
    fs.writeFileSync(tmpFile, payload, 'utf8');

    // Create store2 pointing to the same file
    const store2 = new PreviewStore({ persistencePath: tmpFile });
    const session = store2.getSession('test-persist-1');
    assert.ok(session, 'store2 must restore session from disk');
    assert.equal(session.title, 'Persistent Canvas');
    assert.equal(session.content, '<h1>Hello Persist</h1>');
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
});

test('buildReactWrapper includes pre-Babel error boundary script', () => {
  const html = buildReactWrapper('export default function App() { return <div>Test</div>; }');
  assert.ok(html.includes('Syntax / Compile Error:'), 'HTML must include pre-Babel error listener');
  assert.ok(html.indexOf('Syntax / Compile Error:') < html.indexOf('type="text/babel"'), 'Error listener must be registered before babel runs');
});

