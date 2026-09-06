import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('client.js does not contain settings.section fallback (Issue #94)', () => {
  const clientPath = path.resolve('lib/client.js');
  const code = fs.readFileSync(clientPath, 'utf8');
  assert.ok(!code.includes("name: 'settings.section'"), 'settings.section fallback should not be registered');
  assert.ok(code.includes("name: 'settings.plugin.item'"), 'settings.plugin.item should be registered');
});

test('client.js getActiveLocale defaults to en (Issue #95)', () => {
  const clientPath = path.resolve('lib/client.js');
  const code = fs.readFileSync(clientPath, 'utf8');
  assert.ok(code.includes("return 'en';"), 'getActiveLocale should default to en for public plugin');
});

test('client.js PluginCard handles loading status and collects save errors (Issues #93, #96)', () => {
  const clientPath = path.resolve('lib/client.js');
  const code = fs.readFileSync(clientPath, 'utf8');
  assert.ok(code.includes("snapshot.status === 'loading'"), 'PluginCard must handle loading snapshot status');
  assert.ok(code.includes("snapshot.status !== 'ready'"), 'handleSave must guard against non-ready snapshots');
  assert.ok(code.includes("errors.push("), 'handleSave must collect all field errors');
});

