// dsh-live-canvas: dedicated unit tests for new features, standalone export, design tokens, snapshot tool, and zero-Cyrillic locale audit.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { buildStandaloneHtmlBundle } from '../lib/packager.js';
import { parseDesignTokens } from '../lib/figma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const libDir = path.resolve(__dirname, '../lib');

test('Locale Audit: lib/*.js contains exactly ZERO Cyrillic characters', () => {
  const files = fs.readdirSync(libDir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 20, 'Should check at least 20 modules in lib/');

  const cyrillicRegex = /[\u0400-\u04ff]/;
  const violations = [];

  for (const f of files) {
    const fullPath = path.join(libDir, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (cyrillicRegex.test(line)) {
        violations.push(`${f}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(violations, [], 'Found Cyrillic characters in product code: ' + violations.join('\n'));
});

test('Locale Parity: client.js en and zh dictionaries have 100% key parity', () => {
  const clientPath = path.join(libDir, 'client.js');
  const clientContent = fs.readFileSync(clientPath, 'utf8');

  const enStart = clientContent.indexOf('      en: {');
  const zhStart = clientContent.indexOf('      zh: {', enStart);
  const zhEnd = clientContent.indexOf('    };', zhStart);

  assert.ok(enStart !== -1 && zhStart !== -1 && zhEnd !== -1, 'i18n dictionary bounds found in client.js');

  const enChunk = clientContent.substring(enStart, zhStart);
  const zhChunk = clientContent.substring(zhStart, zhEnd);

  const getKeys = (chunk) => {
    const keys = [];
    chunk.split('\n').forEach(line => {
      const m = line.match(/^\s*([a-zA-Z0-9_-]+):/);
      if (m && !['en', 'zh'].includes(m[1])) {
        keys.push(m[1]);
      }
    });
    return keys;
  };

  const enKeys = getKeys(enChunk);
  const zhKeys = getKeys(zhChunk);

  assert.ok(enKeys.length >= 70, `en dictionary should have at least 70 keys, found ${enKeys.length}`);
  assert.ok(zhKeys.length >= 70, `zh dictionary should have at least 70 keys, found ${zhKeys.length}`);

  const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
  const missingInEn = zhKeys.filter(k => !enKeys.includes(k));

  assert.deepEqual(missingInZh, [], 'Keys missing in Chinese dictionary: ' + missingInZh.join(', '));
  assert.deepEqual(missingInEn, [], 'Keys missing in English dictionary: ' + missingInEn.join(', '));
});

test('Feature: live_canvas_capture_snapshot tool supports metadata, dom, and html formats', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();
  const tools = new Map();
  const mockCtx = {
    tools: {
      register: (t) => tools.set(t.name, t)
    }
  };

  registerLiveCanvasTools(mockCtx, store, eventHub, { workspaceDir: process.cwd() });

  const snapTool = tools.get('live_canvas_capture_snapshot');
  assert.ok(snapTool, 'live_canvas_capture_snapshot must be registered');

  // 1. Snapshot on non-existent session falls back gracefully
  const blankRes = await snapTool.execute({ canvasId: 'non-existent' });
  assert.equal(blankRes.success, true);
  assert.equal(blankRes.title, 'Empty Canvas');

  // 2. Create session and capture metadata
  store.createOrUpdateSession({
    id: 'snap-test',
    title: 'Snapshot Test Component',
    content: '<div class="card p-4 bg-zinc-900 text-white"><h1>Card Title</h1><p>Description</p></div>',
    componentType: 'html',
    theme: 'dark'
  });

  const metaRes = await snapTool.execute({ canvasId: 'snap-test', format: 'metadata' });
  assert.equal(metaRes.success, true);
  assert.equal(metaRes.format, 'metadata');
  assert.equal(metaRes.title, 'Snapshot Test Component');
  assert.ok(metaRes.metadata.contentLength > 0);

  // 3. Capture dom format
  const domRes = await snapTool.execute({ canvasId: 'snap-test', format: 'dom' });
  assert.equal(domRes.success, true);
  assert.equal(domRes.format, 'dom');
  assert.ok(domRes.snapshotLength >= 3, 'Should extract tag count');

  // 4. Capture html format
  const htmlRes = await snapTool.execute({ canvasId: 'snap-test', format: 'html' });
  assert.equal(htmlRes.success, true);
  assert.equal(htmlRes.format, 'html');
  assert.ok(htmlRes.snapshotLength > 100);
  assert.ok(htmlRes.snapshotSnippet.includes('<!DOCTYPE html>'));
});

test('Feature: buildStandaloneHtmlBundle generates valid single-file HTML', () => {
  const session = {
    title: 'Standalone Card Demo',
    content: '<div class="p-8 bg-zinc-950 text-emerald-400"><h1>Test Card</h1></div>',
    theme: 'dark'
  };

  const bundle = buildStandaloneHtmlBundle(session);
  assert.ok(bundle.includes('<!DOCTYPE html>'));
  assert.ok(bundle.includes('<title>Standalone Card Demo</title>'));
  assert.ok(bundle.includes('cdn.tailwindcss.com'));
  assert.ok(bundle.includes('Test Card'));
  assert.ok(bundle.includes('id="root"'));
});

test('Feature: parseDesignTokens converts W3C / Figma tokens JSON to CSS variables', () => {
  const tokens = {
    color: {
      primary: { value: '#3b82f6' },
      surface: { value: '#18181b' }
    },
    spacing: {
      sm: { value: '8px' },
      md: { value: '16px' }
    },
    radius: {
      card: { value: '12px' }
    }
  };

  const res = parseDesignTokens(tokens);
  assert.equal(res.success, true);
  assert.equal(res.variableCount, 5);
  assert.ok(res.cssRule.includes('--color-primary: #3b82f6;'));
  assert.ok(res.cssRule.includes('--spacing-md: 16px;'));
  assert.ok(res.cssRule.includes('--radius-card: 12px;'));

  // Test with JSON string
  const jsonStrRes = parseDesignTokens(JSON.stringify(tokens));
  assert.equal(jsonStrRes.variableCount, 5);
});
