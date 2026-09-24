import test from 'node:test';
import assert from 'node:assert/strict';
import {
  transpileAndWrap,
  clearTranspileCache,
  getTranspileCacheSize
} from '../lib/transpiler.js';

test('transpileAndWrap caches result and respects LRU size limit', () => {
  clearTranspileCache();
  assert.equal(getTranspileCacheSize(), 0);

  const session1 = {
    id: 'test-canvas-1',
    content: '<div class="p-4">Hello World</div>',
    componentType: 'html',
    theme: 'dark'
  };

  const html1 = transpileAndWrap(session1);
  assert.ok(html1.includes('Hello World'));
  assert.equal(getTranspileCacheSize(), 1);

  // Second call with same session hits cache
  const html2 = transpileAndWrap(session1);
  assert.equal(html1, html2);
  assert.equal(getTranspileCacheSize(), 1);

  // Changing theme produces new cache entry
  const session1Light = { ...session1, theme: 'light' };
  const html1Light = transpileAndWrap(session1Light);
  assert.notEqual(html1, html1Light);
  assert.equal(getTranspileCacheSize(), 2);

  // Changing content produces new cache entry
  const session2 = { ...session1, id: 'test-canvas-2', content: '<div class="p-8">Updated Content</div>' };
  const html3 = transpileAndWrap(session2);
  assert.ok(html3.includes('Updated Content'));
  assert.equal(getTranspileCacheSize(), 3);

  // Test LRU limit of 50
  for (let i = 0; i < 60; i++) {
    transpileAndWrap({
      id: `bulk-${i}`,
      content: `<p>Item ${i}</p>`,
      componentType: 'html',
      theme: 'dark'
    });
  }
  assert.equal(getTranspileCacheSize(), 50);

  clearTranspileCache();
  assert.equal(getTranspileCacheSize(), 0);
});
