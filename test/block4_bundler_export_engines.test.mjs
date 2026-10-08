import "./_setup.mjs";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';

import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { bundleMultiFileReact, autoDetectType, transpileAndWrap, buildVueWrapper } from '../lib/transpiler.js';
import { buildStandaloneHtmlBundle } from '../lib/packager.js';
import { createQrMatrix, generateSimpleQrSvg, getShareDetails } from '../lib/share.js';
import { parseDesignTokens } from '../lib/figma.js';
import { registerLiveCanvasTools } from '../lib/tools.js';
import { apply } from '../lib/index.js';

function createMockReqRes(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = options.headers || {};
  req.socket = options.socket || { remoteAddress: '127.0.0.1' };

  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.body = '';
  res.writeHead = (status, headers = {}) => {
    res.statusCode = status;
    Object.assign(res.headers, headers);
  };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (chunk) => {
    if (chunk) res.body += chunk;
    res.emit('finish');
  };

  return { req, res };
}

function createTestCtx() {
  const routes = [];
  const tools = [];
  const mockCtx = {
    inject: (deps, cb) => {
      if (deps.includes('settings')) {
        cb({
          settings: {
            configure: () => () => {}
          }
        });
      }
      if (deps.includes('webServer')) {
        cb({
          webServer: {
            register: (route) => {
              routes.push(route);
              return () => {
                const idx = routes.indexOf(route);
                if (idx !== -1) routes.splice(idx, 1);
              };
            }
          }
        });
      }
    },
    tools: {
      register: (tool) => tools.push(tool)
    },
    effect: (fn) => fn()
  };
  return { ctx: mockCtx, routes, tools };
}

test('Issue #194: bundleMultiFileReact correctly aliases default imports without literal $1, and supports JSON and named aliases', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dlc-block4-bundler-'));
  try {
    // 1. Outside component with default function
    const outsideFile = path.join(tmpDir, 'Outside.jsx');
    fs.writeFileSync(outsideFile, 'export default function Outside() { return "IMPORT_OUTSIDE_CANARY"; }\n', 'utf8');

    // 2. JSON data file
    const dataFile = path.join(tmpDir, 'config.json');
    fs.writeFileSync(dataFile, '{"appName":"CanvasApp","version":42}\n', 'utf8');

    // 3. Named export with alias module
    const utilsFile = path.join(tmpDir, 'utils.js');
    fs.writeFileSync(utilsFile, 'export function calculateValue(x) { return x * 2; }\n', 'utf8');

    // 4. Entry file
    const entryFile = path.join(tmpDir, 'Entry.jsx');
    const entryCode = `
import MyComponent from './Outside';
import appConfig from './config.json';
import { calculateValue as myCalc } from './utils';

export default function Entry() {
  return <div>{MyComponent()} {appConfig.appName} {myCalc(5)}</div>;
}
    `.trim();
    fs.writeFileSync(entryFile, entryCode, 'utf8');

    const res = bundleMultiFileReact(entryCode, {
      filePath: entryFile,
      workspaceRoots: [tmpDir],
      workspaceDir: tmpDir
    });

    assert.ok(res, 'Bundle result must exist');
    assert.ok(!res.bundledCode.includes('$1'), 'Bundled code must NEVER contain unexpanded $1 literal');
    assert.ok(res.bundledCode.includes('const MyComponent ='), 'Default import must alias correctly');
    assert.ok(res.bundledCode.includes('CanvasApp'), 'JSON import must be inlined as JS constant');
    assert.ok(res.bundledCode.includes('myCalc ='), 'Named alias must be bound');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Issue #179: Standalone HTML bundle compiles React and mounts into DOM instead of raw JSX', () => {
  const session = {
    id: 'test-react-export',
    title: 'React Standalone Dashboard',
    componentType: 'react',
    content: `
      export default function Dashboard() {
        return <div className="p-4 bg-zinc-900 text-white"><h1>Active Dashboard</h1></div>;
      }
    `,
    theme: 'dark'
  };

  const html = buildStandaloneHtmlBundle(session);
  assert.ok(html.includes('<!DOCTYPE html>'), 'Must produce full HTML document');
  assert.ok(html.includes('id="root"'), 'Must have root mount point');
  assert.ok(html.includes('react.production.min.js') || html.includes('React'), 'Must include React runtime');
  assert.ok(html.includes('babel.min.js') || html.includes('type="text/babel"'), 'Must include Babel runtime for JSX execution');
  assert.ok(html.includes('ReactDOM.createRoot'), 'Must mount React component into #root');
  assert.ok(!html.includes('<div>\n    \n      export default function'), 'Must not dump uncompiled export default inside raw div');
});

test('Issue #178: Vue 3 SFC preview support detects .vue and mounts live component', () => {
  const vueContent = `
<template>
  <div class="p-6 bg-slate-900 text-emerald-400">
    <h1>{{ greeting }}</h1>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const greeting = ref('Hello from Vue 3 Live Canvas');
</script>

<style>
.p-6 { border: 1px solid #10b981; }
</style>
  `.trim();

  // 1. autoDetectType
  const detectedExt = autoDetectType(vueContent, 'src/components/MyCard.vue');
  assert.equal(detectedExt, 'vue', 'Should detect .vue file extension as vue');

  const detectedContent = autoDetectType(vueContent, '');
  assert.equal(detectedContent, 'vue', 'Should detect <template> and <script setup> as vue');

  // 2. buildVueWrapper
  const wrapper = buildVueWrapper(vueContent, { title: 'Vue Card Preview', theme: 'dark' });
  assert.ok(wrapper.includes('<!DOCTYPE html>'));
  assert.ok(wrapper.includes('vue.global.prod.js') || wrapper.includes('vue@3'));
  assert.ok(wrapper.includes('id="app"'));
  assert.ok(wrapper.includes('createApp(userComponent)'));
  assert.ok(wrapper.includes('.p-6 { border: 1px solid #10b981; }'));

  // 3. transpileAndWrap integration
  const sessionWrapper = transpileAndWrap({
    id: 'vue-sess',
    componentType: 'vue',
    content: vueContent,
    theme: 'dark'
  });
  assert.ok(sessionWrapper.includes('id="app"'));
  assert.ok(sessionWrapper.includes('Vue Runtime Error:'));
});

test('Issue #181: Mobile share QR SVG generates valid QR matrix encoding actual preview URL', () => {
  const testUrl = 'https://192.168.1.111:3080/dsh-live-canvas/sandbox/my-canvas';
  const matrix = createQrMatrix(testUrl);

  assert.ok(Array.isArray(matrix), 'Matrix must be an array');
  assert.ok(matrix.length >= 21, 'QR matrix dimension must be >= 21 for Version 1+');
  assert.equal(matrix.length, matrix[0].length, 'QR matrix must be square');

  // Check top-left finder pattern
  assert.equal(matrix[0][0], 1);
  assert.equal(matrix[0][6], 1);
  assert.equal(matrix[6][0], 1);
  assert.equal(matrix[6][6], 1);

  const svg = generateSimpleQrSvg(testUrl, 240);
  assert.ok(svg.includes('<svg'), 'Must return valid SVG');
  assert.ok(svg.includes('viewBox="0 0 240 240"'));
  assert.ok(svg.includes('role="img"'));
  assert.ok(svg.includes('<path d="M'), 'Must contain rendered QR modules path');
  assert.ok(svg.includes(testUrl), 'Must embed actual preview URL');

  const details = getShareDetails('my-canvas', { host: '192.168.1.111', port: 3080, protocol: 'https' });
  assert.equal(details.previewUrl, testUrl);
  assert.ok(details.qrSvg.includes(testUrl));
});

test('Issue #184 & #185: Figma export artifact returned, and Sound FX broadcasts playback event', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();

  const registeredTools = [];
  const mockCtx = {
    tools: {
      register: (tool) => {
        registeredTools.push(tool);
        return () => {};
      }
    }
  };

  registerLiveCanvasTools(mockCtx, store, eventHub, { workspaceRoots: [process.cwd()] });

  // 1. #184 Figma Export
  const figmaTool = registeredTools.find(t => t.name === 'live_canvas_figma_bridge');
  assert.ok(figmaTool, 'live_canvas_figma_bridge tool must be registered');

  store.createOrUpdateSession({
    id: 'figma-test',
    title: 'Figma Vector Session',
    content: '<div class="p-4 bg-blue-600">Figma Button</div>'
  });

  const exportRes = await figmaTool.execute({
    canvasId: 'figma-test',
    action: 'export_figma'
  });

  assert.equal(exportRes.success, true);
  assert.ok(exportRes.figmaSvg, 'Export result must contain figmaSvg artifact');
  assert.ok(exportRes.figmaSvg.includes('<svg'), 'figmaSvg must be valid SVG markup');
  assert.ok(exportRes.figmaSvg.includes('Figma Button'), 'figmaSvg must contain component content');
  assert.ok(exportRes.instructions, 'Export result must contain instructions');

  // 2. #185 Sound FX Broadcast
  const soundTool = registeredTools.find(t => t.name === 'live_canvas_sound_fx');
  assert.ok(soundTool, 'live_canvas_sound_fx tool must be registered');

  let broadcastReceived = null;
  const mockClient = {
    write: (msg) => {
      if (msg.includes('event: sound')) {
        const match = msg.match(/data: (.*)\n\n/);
        if (match) broadcastReceived = JSON.parse(match[1]);
      }
    }
  };
  eventHub.clients.add(mockClient);

  const soundRes = await soundTool.execute({
    action: 'preview_sound',
    soundType: 'levelup',
    canvasId: 'figma-test'
  });

  assert.equal(soundRes.success, true);
  assert.equal(soundRes.soundType, 'levelup');
  assert.ok(broadcastReceived, 'eventHub must receive sound broadcast');
  assert.equal(broadcastReceived.sound, 'levelup');
  assert.equal(broadcastReceived.canvasId, 'figma-test');
});

test('Issue #191: W3C Design Tokens DTCG format parsed correctly and integrated via tool and API', async () => {
  // 1. parseDesignTokens with W3C DTCG standard ($value, $type, $description)
  const dtcgTokens = {
    color: {
      brand: {
        $value: "#3b82f6",
        $type: "color",
        $description: "Primary Brand Color"
      },
      surface: {
        $value: "#18181b",
        $type: "color"
      }
    },
    spacing: {
      sm: {
        $value: "8px",
        $type: "dimension"
      }
    }
  };

  const parsed = parseDesignTokens(dtcgTokens);
  assert.equal(parsed.success, true);
  assert.equal(parsed.variableCount, 3);
  assert.ok(parsed.cssRule.includes('--color-brand: #3b82f6;'));
  assert.ok(parsed.cssRule.includes('--color-surface: #18181b;'));
  assert.ok(parsed.cssRule.includes('--spacing-sm: 8px;'));
  assert.ok(!parsed.cssRule.includes('$type'), '$type must not become CSS variable');
  assert.ok(!parsed.cssRule.includes('$description'), '$description must not become CSS variable');

  // 2. live_canvas_figma_bridge with action: 'apply_tokens'
  const store = new PreviewStore();
  const eventHub = new EventHub();
  const registeredTools = [];
  const mockCtx = {
    tools: {
      register: (tool) => {
        registeredTools.push(tool);
        return () => {};
      }
    }
  };

  registerLiveCanvasTools(mockCtx, store, eventHub, { workspaceRoots: [process.cwd()] });
  const figmaTool = registeredTools.find(t => t.name === 'live_canvas_figma_bridge');

  store.createOrUpdateSession({
    id: 'tokens-canvas',
    title: 'Tokens Canvas',
    content: '<div class="p-4">Themed</div>'
  });

  const toolTokenRes = await figmaTool.execute({
    canvasId: 'tokens-canvas',
    action: 'apply_tokens',
    tokens: JSON.stringify(dtcgTokens)
  });

  assert.equal(toolTokenRes.success, true);
  assert.equal(toolTokenRes.variableCount, 3);

  const updatedSession = store.getSession('tokens-canvas');
  assert.ok(updatedSession.customCss.includes('--color-brand: #3b82f6;'), 'Tokens CSS rule must be applied to session customCss');

  // 3. POST /dsh-live-canvas/api/tokens HTTP endpoint
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-test-tokens-'));
  try {
    const { ctx, routes } = createTestCtx();
    apply(ctx, {
      workspaceRoots: [tmpDir],
      enableFileWatcher: false
    });

    const apiRoute = routes.find(r => r.path === '/dsh-live-canvas/api');
    assert.ok(apiRoute, 'API route prefix should be registered');

    const { req, res } = createMockReqRes({
      url: '/dsh-live-canvas/api/tokens',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'sec-fetch-site': 'same-origin'
      }
    });

    const p = apiRoute.handler(req, res);
    req.emit('data', Buffer.from(JSON.stringify({
      canvasId: 'tokens-canvas',
      tokens: dtcgTokens
    })));
    req.emit('end');

    await p;

    assert.equal(res.statusCode, 200);
    const apiRes = JSON.parse(res.body);
    assert.equal(apiRes.success, true);
    assert.equal(apiRes.variableCount, 3);
    assert.ok(apiRes.cssRule.includes('--color-brand: #3b82f6;'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
