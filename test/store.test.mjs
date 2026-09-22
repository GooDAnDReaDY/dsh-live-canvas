import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PreviewStore } from '../lib/store.js';

test('PreviewStore creates, retrieves, and updates sessions', () => {
  const store = new PreviewStore({ maxSessions: 3 });

  const s1 = store.createOrUpdateSession({
    title: 'Landing Page',
    content: '<h1>Hello World</h1>',
    componentType: 'html',
    viewport: 'desktop'
  });

  assert.ok(s1.id.startsWith('canvas-'));
  assert.equal(s1.title, 'Landing Page');
  assert.equal(s1.componentType, 'html');
  assert.equal(s1.viewport, 'desktop');

  const retrieved = store.getSession(s1.id);
  assert.deepEqual(retrieved.id, s1.id);

  // Update existing session
  const updated = store.createOrUpdateSession({
    id: s1.id,
    title: 'Updated Landing Page',
    content: '<h1>Updated Content</h1>'
  });

  assert.equal(updated.id, s1.id);
  assert.equal(updated.title, 'Updated Landing Page');
  assert.equal(updated.content, '<h1>Updated Content</h1>');
  assert.equal(updated.componentType, 'html'); // Preserved from previous
});

test('PreviewStore enforces LRU eviction when maxSessions is exceeded', () => {
  const store = new PreviewStore({ maxSessions: 2 });

  const s1 = store.createOrUpdateSession({ title: 'Session 1', content: '1' });
  const s2 = store.createOrUpdateSession({ title: 'Session 2', content: '2' });

  assert.equal(store.listSessions().length, 2);

  // Access s1 to make s2 the least recently used
  store.getSession(s1.id);

  // Add s3 - s2 should be evicted
  const s3 = store.createOrUpdateSession({ title: 'Session 3', content: '3' });

  assert.equal(store.listSessions().length, 2);
  assert.ok(store.getSession(s1.id) !== null);
  assert.ok(store.getSession(s3.id) !== null);
  assert.equal(store.getSession(s2.id), null);
});

test('PreviewStore records and retrieves element inspections', () => {
  const store = new PreviewStore();

  const rec1 = store.recordInspection({
    canvasId: 'canvas-1',
    selector: 'button.btn-primary',
    tagName: 'button',
    innerText: 'Submit',
    rect: { top: 10, left: 20, width: 100, height: 40 }
  });

  assert.ok(rec1.id.startsWith('insp-'));
  assert.equal(rec1.selector, 'button.btn-primary');
  assert.equal(rec1.tagName, 'button');

  const last1 = store.getLastInspection('canvas-1');
  assert.equal(last1.id, rec1.id);

  const list = store.listInspections('canvas-1');
  assert.equal(list.length, 1);

  store.clearInspections('canvas-1');
  assert.equal(store.getLastInspection('canvas-1'), null);
});

test('Issue #123: PreviewStore survives harness restart, filters deleted files, and preserves persistence on shutdown', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-store-test-'));
  const persistencePath = path.join(tmpDir, 'sessions.json');
  const validFile = path.join(tmpDir, 'app.html');
  const deletedFile = path.join(tmpDir, 'deleted.html');

  fs.writeFileSync(validFile, '<h1>Version 1</h1>', 'utf8');
  fs.writeFileSync(deletedFile, '<h1>Temporary</h1>', 'utf8');

  // Instance 1: active session lifecycle
  const store1 = new PreviewStore({ persistencePath, maxSessions: 10 });
  store1.createOrUpdateSession({
    id: 'canvas-valid',
    title: 'Valid App',
    filePath: validFile,
    content: '<h1>Version 1</h1>'
  });
  store1.createOrUpdateSession({
    id: 'canvas-virtual',
    title: 'Virtual Component',
    content: '<button>Click</button>'
  });
  store1.createOrUpdateSession({
    id: 'canvas-deleted',
    title: 'Deleted File',
    filePath: deletedFile,
    content: '<h1>Temporary</h1>'
  });

  // Flush to disk explicitly
  store1.flush();
  assert.ok(fs.existsSync(persistencePath), 'sessions.json must exist after flush');

  // Simulate harness shutdown: store.clear(false) does NOT wipe disk
  store1.clear(false);
  assert.equal(store1.sessions.size, 0);

  // File on disk must STILL exist and contain saved data
  const rawAfterClear = JSON.parse(fs.readFileSync(persistencePath, 'utf8'));
  assert.equal(rawAfterClear.sessions.length, 3, 'Disk payload must not be wiped by memory clearance');

  // Mutate valid file on disk and unlink deleted file
  fs.writeFileSync(validFile, '<h1>Version 2 (Mutated on disk)</h1>', 'utf8');
  fs.unlinkSync(deletedFile);

  // Instance 2: harness restart restores sessions
  const store2 = new PreviewStore({ persistencePath, maxSessions: 10 });

  // canvas-valid must be restored and live content reloaded from disk
  const restored1 = store2.getSession('canvas-valid');
  assert.ok(restored1, 'canvas-valid must be restored');
  assert.equal(restored1.content, '<h1>Version 2 (Mutated on disk)</h1>', 'Live content must be updated from existing file');

  // canvas-virtual must be restored
  const restored2 = store2.getSession('canvas-virtual');
  assert.ok(restored2, 'canvas-virtual must be restored');
  assert.equal(restored2.content, '<button>Click</button>');

  // canvas-deleted must be discarded gracefully
  const restored3 = store2.getSession('canvas-deleted');
  assert.equal(restored3, null, 'Session bound to deleted filePath must be filtered out');

  // Clean up test sandbox
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (err) { /* bestEffort */ }
});
