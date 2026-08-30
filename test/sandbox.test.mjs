import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getSandboxHeaders,
  buildInjectedScripts,
  injectSandboxRuntime,
  sanitizePath
} from '../lib/sandbox.js';

test('getSandboxHeaders returns strict CSP and security headers', () => {
  const headers = getSandboxHeaders();
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.ok(headers['Content-Security-Policy'].includes("default-src 'self'"));
  assert.ok(headers['Content-Security-Policy'].includes("frame-ancestors 'self'"));
  assert.equal(headers['Cache-Control'], 'no-cache, no-store, must-revalidate');
});

test('injectSandboxRuntime injects SSE and inspector scripts into HTML body', () => {
  const raw = '<html><head><title>Test</title></head><body><h1>Content</h1></body></html>';
  const out = injectSandboxRuntime(raw, 'canvas-test-1');
  assert.ok(out.includes('dlc-sandbox-runtime'));
  assert.ok(out.includes('canvas-test-1'));
  assert.ok(out.includes('__dlc_inspect_badge'));
  assert.ok(out.includes('__dlc_reload_badge'));
});

test('sanitizePath rejects traversal attempts outside base directory', () => {
  const base = '/var/workspace/project';

  assert.equal(sanitizePath(base, 'src/App.jsx'), '/var/workspace/project/src/App.jsx');
  assert.equal(sanitizePath(base, './index.html'), '/var/workspace/project/index.html');

  assert.throws(() => {
    sanitizePath(base, '../secret.key');
  }, /Access outside base directory is forbidden/);

  assert.throws(() => {
    sanitizePath(base, 'src/../../etc/passwd');
  }, /Access outside base directory is forbidden/);

  assert.throws(() => {
    sanitizePath(base, 'src/file\0.js');
  }, /Null bytes in path/);
});