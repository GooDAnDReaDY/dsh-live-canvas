import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceWatcher } from '../lib/watcher.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';

test('WorkspaceWatcher listWorkspaceFiles scans and classifies files', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-watch-test-'));
  fs.writeFileSync(path.join(tmpDir, 'App.jsx'), 'export default function App() { return <h1>App</h1>; }');
  fs.mkdirSync(path.join(tmpDir, 'pages'));
  fs.writeFileSync(path.join(tmpDir, 'pages', 'Home.html'), '<!DOCTYPE html><html><body>Home</body></html>');
  fs.mkdirSync(path.join(tmpDir, 'node_modules'));
  fs.writeFileSync(path.join(tmpDir, 'node_modules', 'ignored.js'), '// ignored');

  const store = new PreviewStore();
  const eventHub = new EventHub();
  const watcher = new WorkspaceWatcher(store, eventHub, { workspaceDir: tmpDir });

  const files = watcher.listWorkspaceFiles();
  assert.ok(files.length >= 2, 'Should discover previewable files');
  assert.ok(files.some(f => f.name === 'App.jsx' && f.type === 'react'));
  assert.ok(files.some(f => f.name === 'Home.html' && f.type === 'html'));
  assert.ok(!files.some(f => f.name === 'ignored.js'), 'Should ignore node_modules');

  // Test openWorkspaceFile
  const session = watcher.openWorkspaceFile('pages/Home.html');
  assert.ok(session);
  assert.strictEqual(session.filePath, 'pages/Home.html');
  assert.strictEqual(session.title, 'Home.html');

  watcher.closeAll();
  eventHub.closeAll();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

