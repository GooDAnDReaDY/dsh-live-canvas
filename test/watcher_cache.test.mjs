import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { WorkspaceWatcher } from '../lib/watcher.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';

test('WorkspaceWatcher caches listWorkspaceFiles results and invalidates cache', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-watcher-cache-test-'));
  const file1 = path.join(tmpDir, 'page1.html');
  fs.writeFileSync(file1, '<h1>Page 1</h1>', 'utf8');

  const store = new PreviewStore();
  const eventHub = new EventHub();
  const watcher = new WorkspaceWatcher(store, eventHub, {
    workspaceDir: tmpDir,
    workspaceRoots: [tmpDir],
    filesCacheTtlMs: 2000
  });

  try {
    // 1. First listing reads from disk
    const list1 = watcher.listWorkspaceFiles();
    assert.equal(list1.length, 1);
    assert.equal(list1[0].name, 'page1.html');

    // 2. Add second file to disk without notifying watcher
    const file2 = path.join(tmpDir, 'page2.html');
    fs.writeFileSync(file2, '<h1>Page 2</h1>', 'utf8');

    // Cached listing within TTL should still return 1 item
    const listCached = watcher.listWorkspaceFiles();
    assert.equal(listCached.length, 1);

    // 3. Invalidate cache manually
    watcher.invalidateFilesCache();

    // Now it should re-read disk and see 2 items
    const listUpdated = watcher.listWorkspaceFiles();
    assert.equal(listUpdated.length, 2);

    // Cleanup
    watcher.closeAll();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
