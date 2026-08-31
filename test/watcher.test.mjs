import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceWatcher } from '../lib/watcher.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';

test('WorkspaceWatcher watches file changes and broadcasts update', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-watch-test-'));
  const testFile = path.join(tmpDir, 'test.html');
  fs.writeFileSync(testFile, '<h1>Initial</h1>', 'utf8');

  const store = new PreviewStore();
  const eventHub = new EventHub();
  const watcher = new WorkspaceWatcher(store, eventHub, {
    workspaceDir: tmpDir,
    debounceMs: 50
  });

  const ok = watcher.watchFile('canvas-watch-1', 'test.html');
  assert.equal(ok, true);

  const status = watcher.getWatchStatus('canvas-watch-1');
  assert.equal(status.active, true);
  assert.equal(status.filePath, 'test.html');

  // Trigger file update
  fs.writeFileSync(testFile, '<h1>Updated Content</h1>', 'utf8');

  // Wait for debounce
  await new Promise(r => setTimeout(r, 150));

  const session = store.getSession('canvas-watch-1');
  assert.ok(session);
  assert.equal(session.content, '<h1>Updated Content</h1>');

  watcher.unwatch('canvas-watch-1');
  assert.equal(watcher.getWatchStatus('canvas-watch-1').active, false);

  watcher.closeAll();
  eventHub.closeAll();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
