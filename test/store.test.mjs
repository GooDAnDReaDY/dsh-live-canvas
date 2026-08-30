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