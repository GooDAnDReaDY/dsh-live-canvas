// dsh-live-canvas: host half.
// Cordis plugin providing Live Preview Sandbox server, multi-file ESM bundler, static asset server, SSE hot-reload, DOM click inspector, telemetry logs, standalone export, visual annotations, WYSIWYG text editor, floating Tailwind style tweaker, component galleries, workspace file watcher, props controls, visual diffs, device matrix, AI mock data, 1-click Vite ZIP packager, and agent tools.

import fs from 'node:fs';
import path from 'node:path';
import { PreviewStore } from './store.js';
import { EventHub } from './events.js';
import { WorkspaceWatcher } from './watcher.js';
import { transpileAndWrap, buildStandaloneHtml, buildDiffWrapper, buildMatrixWrapper } from './transpiler.js';
import { buildProjectFiles, buildProjectZip, buildStandaloneHtmlBundle } from './packager.js';
import { getSandboxHeaders, injectSandboxRuntime, sanitizePath, resolveSafePath, isTrustedRequest } from './sandbox.js';
import { listTemplates, getTemplateById } from './templates.js';
import { scanWorkspaceComponents, buildStorybookMatrixData } from './storybook.js';
import { listThemePresets, getThemeById, generateCssVariables } from './themes.js';
import { listMotionPresets, generateMotionCss } from './motion.js';
import { generateMockDataset } from './faker.js';
import { getShareDetails } from './share.js';
import { registerLiveCanvasTools } from './tools.js';
import { registerPluginUpdater } from './updater.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

let Schema;
try {
  const cordis = require('@deepseek-ai/cordis');
  Schema = cordis.Schema || cordis.default?.Schema;
} catch (err) {
  /* ignoreOptionalFailure: cordis not present in isolate */
}
if (!Schema) {
  try {
    const mod = require('@deepseek-ai/schemastery');
    Schema = mod.Schema || mod.default || mod;
  } catch (err) {
    /* ignoreOptionalFailure: schemastery fallback */
  }
}
if (!Schema) {
  const makeNode = (extra = {}) => {
    const node = {
      defaultVal: undefined,
      default: (v) => { node.defaultVal = v; return node; },
      description: () => node,
      ...extra
    };
    return node;
  };
  Schema = {
    object: (shape) => ({ shape, description: () => Schema.object(shape), default: () => Schema.object(shape) }),
    string: () => makeNode(),
    boolean: () => makeNode(),
    number: () => makeNode(),
    array: () => makeNode(),
    union: () => makeNode()
  };
}

export const name = '@goodandready/dsh-live-canvas';

export const Config = Schema.object({
  defaultViewport: Schema.string()
    .default('responsive')
    .description('Default viewport size for Live Canvas preview frames'),
  autoOpenOnHtmlGen: Schema.boolean()
    .default(true)
    .description('Automatically open Live Canvas tab upon agent UI code generation'),
  enableHotReload: Schema.boolean()
    .default(true)
    .description('Enable SSE hot-reload on session code updates'),
  maxSessionCache: Schema.number()
    .default(50)
    .description('Maximum number of active preview sessions cached in memory'),
  enableFileWatcher: Schema.boolean()
    .default(true)
    .description('Enable workspace filesystem watcher for live code sync'),
  workspaceDir: Schema.string()
    .default('')
    .description('Custom workspace root directory to scan and preview'),
  workspaceRoots: Schema.array(Schema.string())
    .default([])
    .description('Allowed workspace root directories for file discovery and live preview')
}).description('dsh-live-canvas plugin configuration schema');

export const inject = ['webServer', 'tools', 'settings'];

export function apply(ctx, config) {
  const rawRoots = [];
  if (config?.workspaceDir) rawRoots.push(config.workspaceDir);
  if (Array.isArray(config?.workspaceRoots)) rawRoots.push(...config.workspaceRoots);
  if (rawRoots.length === 0) rawRoots.push(process.cwd());
  const workspaceRoots = [...new Set(rawRoots.map(r => path.resolve(r)))];
  const workspaceDir = workspaceRoots[0];

  const cfg = {
    defaultViewport: config?.defaultViewport ?? 'responsive',
    autoOpenOnHtmlGen: config?.autoOpenOnHtmlGen ?? true,
    enableHotReload: config?.enableHotReload ?? true,
    maxSessionCache: config?.maxSessionCache ?? 50,
    enableFileWatcher: config?.enableFileWatcher ?? true,
    workspaceDir,
    workspaceRoots
  };

  const persistenceDir = path.join(process.env.HOME || '/tmp', '.dsh', 'data', 'dsh-live-canvas');
  const store = new PreviewStore({
    maxSessions: cfg.maxSessionCache,
    persistencePath: path.join(persistenceDir, 'sessions.json')
  });
  const eventHub = new EventHub();
  const watcher = new WorkspaceWatcher(store, eventHub, {
    workspaceDir: cfg.workspaceDir,
    workspaceRoots: cfg.workspaceRoots,
    debounceMs: 150
  });

  // Register Web Server Endpoints
  // The settings service only accepts a lowercase hyphenated namespace.
  // The package name contains '@' and '/' and is rejected, which leaves the
  // Plugins page form permanently unavailable.
  const registerSettings = (settings) => {
    if (settings && typeof settings.register === 'function') {
      settings.register('dsh-live-canvas', Config, { base: cfg });
    }
  };
  if (ctx.settings && typeof ctx.settings.register === 'function') {
    registerSettings(ctx.settings);
  } else if (typeof ctx.inject === 'function') {
    ctx.inject(['settings'], (sctx) => registerSettings(sctx && sctx.settings));
  }

  ctx.inject(['webServer'], (wctx) => {
    ctx.effect(() => {
      // 0. Host-side One-Click Plugin Updater
      const unregUpdater = registerPluginUpdater(wctx, {
        endpoint: '/api/dsh-live-canvas/update',
        packageName: '@goodandready/dsh-live-canvas',
        manifestUrl: new URL('../package.json', import.meta.url)
      });

      // 1. SSE Events Endpoint
      const unregEvents = wctx.webServer.register({
        kind: 'exact',
        path: '/dsh-live-canvas/events',
        handler: (req, res) => {
          eventHub.handleSseRequest(req, res);
        }
      });

      // 2. Sandbox Preview Endpoint & Projects Hub
      const CALC_DEMO_CODE = "import React, { useState } from \"react\";\nexport default function Calculator() {\n  const [val, setVal] = useState(\"0\");\n  const [prev, setPrev] = useState(null);\n  const [op, setOp] = useState(null);\n  const [fresh, setFresh] = useState(false);\n\n  const num = (n) => {\n    if (val === \"0\" || fresh) { setVal(String(n)); setFresh(false); }\n    else setVal(val + n);\n  };\n  const act = (o) => {\n    setPrev(parseFloat(val));\n    setOp(o);\n    setFresh(true);\n  };\n  const eq = () => {\n    if (prev === null || !op) return;\n    const cur = parseFloat(val);\n    let res = 0;\n    if (op === \"+\") res = prev + cur;\n    if (op === \"-\") res = prev - cur;\n    if (op === \"\\u00d7\") res = prev * cur;\n    if (op === \"\\u00f7\") res = cur !== 0 ? prev / cur : \"Error\";\n    setVal(String(res));\n    setPrev(null);\n    setOp(null);\n    setFresh(true);\n  };\n  const clr = () => { setVal(\"0\"); setPrev(null); setOp(null); };\n\n  return (\n    <div className=\"min-h-screen bg-slate-950 flex items-center justify-center p-4\">\n      <div className=\"w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4\">\n        <div className=\"text-xs text-slate-400 font-mono text-right h-4\">{prev ? (prev + \" \" + op) : \"\"}</div>\n        <div className=\"text-4xl font-bold font-mono text-white text-right overflow-x-auto tracking-wider pb-2\">{val}</div>\n        <div className=\"grid grid-cols-4 gap-3\">\n          <button onClick={clr} className=\"col-span-2 p-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-2xl transition active:scale-95\">AC</button>\n          <button onClick={() => act(\"\\u00f7\")} className=\"p-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl transition active:scale-95\">\\u00f7</button>\n          <button onClick={() => act(\"\\u00d7\")} className=\"p-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl transition active:scale-95\">\\u00d7</button>\n          {[7, 8, 9].map(n => <button key={n} onClick={() => num(n)} className=\"p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95\">{n}</button>)}\n          {[4, 5, 6].map(n => <button key={n} onClick={() => num(n)} className=\"p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95\">{n}</button>)}\n          {[1, 2, 3].map(n => <button key={n} onClick={() => num(n)} className=\"p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95\">{n}</button>)}\n          <button onClick={() => num(0)} className=\"col-span-2 p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95\">0</button>\n          <button onClick={() => num(\".\")} className=\"p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95\">.</button>\n          <button onClick={eq} className=\"p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition active:scale-95\">=</button>\n        </div>\n      </div>\n    </div>\n  );\n}";
      const DASH_DEMO_CODE = "import React from \"react\";\nexport default function Dashboard() {\n  const stats = [\n    { label: \"Active Nodes\", val: \"1,248\", chg: \"+14%\", up: true },\n    { label: \"Throughput\", val: \"94.2 MB/s\", chg: \"+8.1%\", up: true },\n    { label: \"P99 Latency\", val: \"12.4 ms\", chg: \"-3.2%\", up: false },\n    { label: \"Error Budget\", val: \"99.98%\", chg: \"+0.02%\", up: true }\n  ];\n  return (\n    <div className=\"min-h-screen bg-zinc-950 text-zinc-100 p-8\">\n      <div className=\"max-w-4xl mx-auto space-y-6\">\n        <div className=\"flex items-center justify-between border-b border-zinc-800 pb-4\">\n          <div>\n            <h1 className=\"text-xl font-bold\">System Infrastructure</h1>\n            <p className=\"text-xs text-zinc-400\">Cluster node telemetry overview</p>\n          </div>\n          <span className=\"px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-full border border-emerald-500/20 font-mono\">Live \u00b7 US-East</span>\n        </div>\n        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">\n          {stats.map((s, i) => (\n            <div key={i} className=\"bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1\">\n              <div className=\"text-xs text-zinc-400\">{s.label}</div>\n              <div className=\"text-2xl font-bold font-mono\">{s.val}</div>\n              <div className={\"text-xs font-mono \" + (s.up ? \"text-emerald-400\" : \"text-amber-400\")}>{s.chg} vs last hr</div>\n            </div>\n          ))}\n        </div>\n      </div>\n    </div>\n  );\n}";

      function buildProjectsHubHtml({ store, watcher }) {
        const sessions = store ? store.listSessions() : [];
        let workspaceFiles = [];
        try {
          if (watcher && typeof watcher.listWorkspaceFiles === 'function') {
            workspaceFiles = watcher.listWorkspaceFiles('', 4, 30);
          }
        } catch (err) {
          console.warn('[LiveCanvas] Could not list workspace files for hub:', err);
        }

        const activePaths = new Set(sessions.map(s => s.filePath).filter(Boolean));
        const uniqueWorkspaceFiles = workspaceFiles.filter(f => !activePaths.has(f.path));

        function escapeHtml(str) {
          if (!str) return '';
          return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }

        function getComponentIcon(type) {
          switch ((type || '').toLowerCase()) {
            case 'react': return '⚛️';
            case 'html': return '🌐';
            case 'vue': return '💚';
            case 'svg': return '🎨';
            case 'mermaid': return '📐';
            default: return '📄';
          }
        }

        function formatDate(isoStr) {
          if (!isoStr) return '';
          try {
            const d = new Date(isoStr);
            if (isNaN(d.getTime())) return '';
            const pad = (n) => String(n).padStart(2, '0');
            return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
          } catch {
            return '';
          }
        }

        const sessionItemsHtml = sessions.map(s => {
          const icon = getComponentIcon(s.componentType);
          const title = escapeHtml(s.title || s.id);
          const sub = escapeHtml(s.filePath ? s.filePath : ('Session · ' + s.id));
          const timeStr = formatDate(s.updatedAt);
          const compType = escapeHtml((s.componentType || 'UI').toUpperCase());
          return '<div class="dlc-project-item p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer flex items-center justify-between gap-3 group text-left" data-title="' + title.toLowerCase() + '" data-path="' + sub.toLowerCase() + '" onclick="openSession(\'' + escapeHtml(s.id) + '\')">' +
            '<div class="flex items-center gap-3 min-w-0">' +
              '<span class="text-xl shrink-0">' + icon + '</span>' +
              '<div class="min-w-0">' +
                '<div class="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">' + title + '</div>' +
                '<div class="text-xs text-zinc-400 truncate flex items-center gap-2 mt-0.5">' +
                  '<span class="truncate">' + sub + '</span>' +
                  (timeStr ? '<span class="text-zinc-500 shrink-0">• ' + timeStr + '</span>' : '') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2 shrink-0">' +
              '<span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">' + compType + '</span>' +
              '<span class="text-xs text-zinc-500 group-hover:text-zinc-300">↗</span>' +
            '</div>' +
          '</div>';
        }).join('\n');

        const workspaceItemsHtml = uniqueWorkspaceFiles.map(f => {
          const icon = getComponentIcon(f.type || f.ext.replace('.', ''));
          const name = escapeHtml(f.name);
          const path = escapeHtml(f.path);
          const sizeStr = (f.size / 1024).toFixed(1) + ' KB';
          const timeStr = formatDate(f.mtime);
          const compType = escapeHtml((f.type || f.ext.replace('.', '')).toUpperCase());
          return '<div class="dlc-project-item p-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer flex items-center justify-between gap-3 group text-left" data-title="' + name.toLowerCase() + '" data-path="' + path.toLowerCase() + '" onclick="openFile(\'' + path + '\')">' +
            '<div class="flex items-center gap-3 min-w-0">' +
              '<span class="text-xl shrink-0">' + icon + '</span>' +
              '<div class="min-w-0">' +
                '<div class="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">' + name + '</div>' +
                '<div class="text-xs text-zinc-400 truncate flex items-center gap-2 mt-0.5">' +
                  '<span class="truncate">' + path + '</span>' +
                  '<span class="text-zinc-500 shrink-0">• ' + sizeStr + (timeStr ? ' · ' + timeStr : '') + '</span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center gap-2 shrink-0">' +
              '<span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">' + compType + '</span>' +
              '<span class="text-xs text-zinc-500 group-hover:text-zinc-300">↗</span>' +
            '</div>' +
          '</div>';
        }).join('\n');

        const totalItems = sessions.length + uniqueWorkspaceFiles.length;

        return '<!DOCTYPE html>\n<html lang="en" class="dark">\n<head>\n' +
          '<meta charset="utf-8">\n' +
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
          '<title>Live Canvas Studio</title>\n' +
          '<script src="https://cdn.tailwindcss.com"></script>\n' +
          '<script>tailwind.config = { darkMode: \'class\' };</script>\n' +
          '<style>\n' +
          'body { background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n' +
          '::-webkit-scrollbar { width: 6px; height: 6px; }\n' +
          '::-webkit-scrollbar-track { background: transparent; }\n' +
          '::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }\n' +
          '::-webkit-scrollbar-thumb:hover { background: #3f3f46; }\n' +
          '</style>\n' +
          '</head>\n' +
          '<body class="min-h-screen bg-zinc-950 p-6 md:p-10 flex flex-col items-center select-none text-zinc-100">\n' +
          '<div class="max-w-2xl w-full space-y-6">\n' +
          '  <div class="text-center space-y-3">\n' +
          '    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">\n' +
          '      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>\n' +
          '      Live Canvas Studio\n' +
          '    </div>\n' +
          '    <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-white">Interactive Canvas Hub</h1>\n' +
          '    <p class="text-sm text-zinc-400 max-w-lg mx-auto">\n' +
          '      Select a previously opened project, preview workspace components, or create UI with AI agents in real time.\n' +
          '    </p>\n' +
          '  </div>\n' +
          '  <div class="space-y-3 pt-2">\n' +
          '    <div class="flex items-center justify-between gap-2">\n' +
          '      <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">\n' +
          '        <span>Recent Projects & Workspace Files</span>\n' +
          '        <span class="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">' + totalItems + '</span>\n' +
          '      </div>\n' +
          '    </div>\n' +
          '    <div class="relative">\n' +
          '      <input id="dlc-search" type="text" placeholder="Search recent projects or files..." class="w-full bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none transition" oninput="filterProjects(this.value)">\n' +
          '    </div>\n' +
          '    <div id="dlc-project-list" class="space-y-2 max-h-[380px] overflow-y-auto pr-1">\n' +
          sessionItemsHtml + '\n' +
          workspaceItemsHtml + '\n' +
          (totalItems === 0 ? '      <div id="dlc-empty-state" class="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400 space-y-1"><div class="text-zinc-300 font-medium">No projects or files opened yet</div><div>Ask an agent in chat to create a UI component or place previewable files in your workspace.</div></div>\n' : '') +
          '      <div id="dlc-search-empty" class="p-6 text-center text-xs text-zinc-400 border border-zinc-800/60 rounded-xl" style="display:none;">No matching projects or files found.</div>\n' +
          '    </div>\n' +
          '  </div>\n' +
          '  <div class="pt-4 border-t border-zinc-800/80 space-y-3">\n' +
          '    <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Start with Demo Templates</div>\n' +
          '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">\n' +
          '      <button onclick="loadDemo(\'calc\')" class="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-sm font-medium flex items-center gap-3 transition cursor-pointer group">\n' +
          '        <span class="text-2xl shrink-0">🧮</span>\n' +
          '        <div class="min-w-0">\n' +
          '          <div class="text-zinc-200 group-hover:text-white font-semibold truncate">React Calculator</div>\n' +
          '          <div class="text-xs text-zinc-400 truncate">Interactive calculator with Tailwind</div>\n' +
          '        </div>\n' +
          '      </button>\n' +
          '      <button onclick="loadDemo(\'dash\')" class="p-3.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-sm font-medium flex items-center gap-3 transition cursor-pointer group">\n' +
          '        <span class="text-2xl shrink-0">📊</span>\n' +
          '        <div class="min-w-0">\n' +
          '          <div class="text-zinc-200 group-hover:text-white font-semibold truncate">SaaS Metrics Dashboard</div>\n' +
          '          <div class="text-xs text-zinc-400 truncate">KPI cards and analytics</div>\n' +
          '        </div>\n' +
          '      </button>\n' +
          '    </div>\n' +
          '  </div>\n' +
          '</div>\n' +
          '<script>\n' +
          '  try {\n' +
          '    const sse = new EventSource("/dsh-live-canvas/events");\n' +
          '    sse.addEventListener("update", () => { window.location.reload(); });\n' +
          '    sse.onerror = (err) => { console.warn("[LiveCanvas] Hub SSE disconnected:", err); };\n' +
          '  } catch (err) { console.warn("[LiveCanvas] Could not connect SSE:", err); }\n' +
          '  function openSession(canvasId) {\n' +
          '    if (!canvasId) return;\n' +
          '    try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: "dlc_open_session", canvasId: canvasId }, "*"); } } catch (e) { /* ignoreOptionalFailure */ } \n' +
          '    window.location.href = "/dsh-live-canvas/sandbox/" + canvasId;\n' +
          '  }\n' +
          '  function openFile(filePath) {\n' +
          '    if (!filePath) return;\n' +
          '    try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: "dlc_open_file", filePath: filePath }, "*"); } } catch (e) { /* ignoreOptionalFailure */ } \n' +
          '    fetch("/dsh-live-canvas/api/open-file", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filePath: filePath }) })\n' +
          '      .then(r => r.json())\n' +
          '      .then(data => { if (data && data.canvasId) window.location.href = "/dsh-live-canvas/sandbox/" + data.canvasId; })\n' +
          '      .catch(err => { console.warn("[LiveCanvas] Failed to open target path:", err); });\n' +
          '  }\n' +
          '  function filterProjects(val) {\n' +
          '    const q = (val || "").toLowerCase().trim();\n' +
          '    const items = document.querySelectorAll(".dlc-project-item");\n' +
          '    let visible = 0;\n' +
          '    items.forEach(el => {\n' +
          '      const title = el.getAttribute("data-title") || "";\n' +
          '      const path = el.getAttribute("data-path") || "";\n' +
          '      const match = !q || title.includes(q) || path.includes(q);\n' +
          '      el.style.display = match ? "flex" : "none";\n' +
          '      if (match) visible++;\n' +
          '    });\n' +
          '    const emptyEl = document.getElementById("dlc-search-empty");\n' +
          '    if (emptyEl) emptyEl.style.display = (visible === 0 && items.length > 0) ? "block" : "none";\n' +
          '  }\n' +
          '  function loadDemo(type) {\n' +
          '    const payload = type === "calc" ? {\n' +
          '      title: "React Calculator",\n' +
          '      componentType: "react",\n' +
          '      content: CALC_DEMO_CODE\n' +
          '    } : {\n' +
          '      title: "SaaS Metrics Dashboard",\n' +
          '      componentType: "react",\n' +
          '      content: DASH_DEMO_CODE\n' +
          '    };\n' +
          '    fetch("/dsh-live-canvas/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })\n' +
          '      .then(r => r.json())\n' +
          '      .then(data => {\n' +
          '        if (data && data.canvasId) {\n' +
          '          try { if (window.parent && window.parent !== window) { window.parent.postMessage({ type: "dlc_session_created", canvasId: data.canvasId }, "*"); } } catch (e) { /* ignoreOptionalFailure */ } \n' +
          '          window.location.href = "/dsh-live-canvas/sandbox/" + data.canvasId;\n' +
          '        }\n' +
          '      });\n' +
          '  }\n' +
          '</script>\n' +
          '</body>\n</html>';
      }

      const unregSandbox = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/sandbox',
        handler: (req, res) => {
          const urlPath = req.url.split('?')[0];
          const parts = urlPath.split('/').filter(Boolean);
          // Format: /dsh-live-canvas/sandbox/<canvasId>
          const canvasId = parts[2] || '';

          let session = canvasId && canvasId !== 'default' && canvasId !== 'hub' ? store.getSession(canvasId) : null;
          if (!session && canvasId !== 'hub' && canvasId !== 'default') {
            session = store.getLatestSession();
          }

          if (!session || canvasId === 'hub' || canvasId === 'default') {
            const welcomeHtml = buildProjectsHubHtml({ store, watcher });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(welcomeHtml);
            return;
          }

          const rawHtml = transpileAndWrap({
            ...session,
            workspaceDir: watcher.workspaceDir
          });
          const finalHtml = injectSandboxRuntime(rawHtml, session.id, {
            eventsUrl: '/dsh-live-canvas/events',
            inspectApiUrl: '/dsh-live-canvas/api/inspect',
            logsApiUrl: '/dsh-live-canvas/api/logs',
            annotateApiUrl: '/dsh-live-canvas/api/annotations',
            saveContentApiUrl: '/dsh-live-canvas/api/save-content',
            saveClassesApiUrl: '/dsh-live-canvas/api/save-classes',
            mockData: session.mockData || {}
          });

          res.writeHead(200, getSandboxHeaders());
          res.end(finalHtml);
        }
      });

      // 3. Visual Diff / Before-After Comparison Endpoint
      const unregDiff = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/diff',
        handler: (req, res) => {
          const urlPath = req.url.split('?')[0];
          const parts = urlPath.split('/').filter(Boolean);
          const canvasId = parts[2] || '';
          const session = canvasId ? store.getSession(canvasId) : null;
          if (!session) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h3>Session not found</h3>');
            return;
          }

          const previousSnap = store.getLatestPreviousSnapshot(session.id);
          const sessionA = previousSnap ? { ...session, content: previousSnap.content, componentType: previousSnap.componentType } : session;
          const sessionB = session;

          const diffHtml = buildDiffWrapper(sessionA, sessionB);

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(diffHtml);
        }
      });

      // 4. Multi-Device Matrix View Endpoint
      const unregMatrix = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/matrix',
        handler: (req, res) => {
          const urlPath = req.url.split('?')[0];
          const parts = urlPath.split('/').filter(Boolean);
          const canvasId = parts[2] || '';
          const session = canvasId ? store.getSession(canvasId) : null;
          if (!session) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h3>Session not found</h3>');
            return;
          }

          const matrixHtml = buildMatrixWrapper(session);

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(matrixHtml);
        }
      });

      // 5. Static Asset Server Endpoint
      const unregAssets = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/assets',
        handler: (req, res) => {
          const urlPath = req.url.split('?')[0];
          const relPath = urlPath.replace(/^\/dsh-live-canvas\/assets\/?/, '');
          if (!relPath) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Asset path required' }));
            return;
          }

          try {
            const absPath = resolveSafePath(relPath, watcher.workspaceRoots);
            if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Asset not found' }));
              return;
            }

            const ext = path.extname(absPath).toLowerCase();
            const mimeMap = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.webp': 'image/webp',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.css': 'text/css; charset=utf-8',
              '.js': 'application/javascript; charset=utf-8',
              '.mjs': 'application/javascript; charset=utf-8',
              '.woff2': 'font/woff2',
              '.woff': 'font/woff',
              '.ttf': 'font/ttf',
              '.json': 'application/json; charset=utf-8'
            };
            const contentType = mimeMap[ext] || 'application/octet-stream';

            const stream = fs.createReadStream(absPath);
            stream.on('error', () => {
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to read asset' }));
              }
            });
            res.writeHead(200, {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600'
            });
            stream.pipe(res);
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Invalid asset path' }));
          }
        }
      });

      // 6. REST APIs for Canvas Operations, Inspections, Telemetry, and Snapshots
      const unregApi = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/api',
        handler: async (req, res) => {
          const urlPath = req.url.split('?')[0];
          const method = req.method.toUpperCase();

          function sendJson(status, data) {
            res.writeHead(status, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store'
            });
            res.end(JSON.stringify(data));
          }

          if (method === 'OPTIONS') {
            if (!isTrustedRequest(req)) {
              return sendJson(403, { error: 'Forbidden: Untrusted origin' });
            }
            res.writeHead(200, {
              'Allow': 'GET, POST, OPTIONS',
              'Content-Type': 'application/json; charset=utf-8'
            });
            return res.end(JSON.stringify({ ok: true }));
          }

          // Protect mutating / write routes from CSRF and untrusted cross-origin access
          const isWriteRoute = method === 'POST';
          if (isWriteRoute && !isTrustedRequest(req)) {
            return sendJson(403, {
              success: false,
              error: 'Forbidden: Untrusted origin or cross-origin write request rejected'
            });
          }

          const parseBody = (maxBytes = 25 * 1024 * 1024) => new Promise((resolve) => {
            if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
              return resolve(req.body);
            }
            if (typeof req.body === 'string' && req.body.trim().length > 0) {
              try { return resolve(JSON.parse(req.body)); } catch (err) {
                return reject(new Error('Invalid JSON body: ' + err.message));
              }
            }
            let body = '';
            let settled = false;
            const onDone = () => {
              if (settled) return;
              settled = true;
              try {
                resolve(JSON.parse(body || '{}'));
              } catch {
                resolve({});
              }
            };
            const onError = () => {
              if (settled) return;
              settled = true;
              onDone();
            };
            req.on('data', chunk => {
              if (settled) return;
              body += chunk;
              if (body.length > maxBytes) {
                settled = true;
                resolve({ error: 'Payload too large' });
                req.destroy();
              }
            });
            req.on('end', onDone);
            req.on('error', onError);
            req.on('close', () => {
              if (!settled) onDone();
            });
            if (typeof req.resume === 'function') {
              req.resume();
            }
          });

          // GET /dsh-live-canvas/api/sessions
          if (urlPath === '/dsh-live-canvas/api/sessions' && method === 'GET') {
            return sendJson(200, { sessions: store.listSessions() });
          }

          // GET /dsh-live-canvas/api/workspace-files
          if (urlPath === '/dsh-live-canvas/api/workspace-files' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const subDir = urlObj.searchParams.get('subDir') || '';
            const files = watcher.listWorkspaceFiles(subDir);
            return sendJson(200, {
              workspaceDir: watcher.workspaceDir,
              workspaceRoots: watcher.workspaceRoots,
              count: files.length,
              files
            });
          }

          // POST /dsh-live-canvas/api/open-file
          if (urlPath === '/dsh-live-canvas/api/open-file' && method === 'POST') {
            const body = await parseBody();
            const filePath = body.filePath;
            if (!filePath) return sendJson(400, { error: 'filePath is required' });
            try {
              const session = watcher.openWorkspaceFile(filePath);
              eventHub.broadcast('update', { canvasId: session.id });
              return sendJson(200, {
                success: true,
                canvasId: session.id,
                title: session.title,
                filePath: session.filePath,
                previewUrl: `/dsh-live-canvas/sandbox/${session.id}`
              });
            } catch (err) {
              const status = err.code === 'ERR_PATH_OUTSIDE_ROOTS' || err.code === 'ERR_SYMLINK_ESCAPE' ? 403 : 400;
              return sendJson(status, {
                success: false,
                error: err.message || String(err),
                code: err.code || 'ERR_OPEN_FAILED',
                targetPath: filePath,
                allowedRoots: watcher.workspaceRoots
              });
            }
          }

          // POST /dsh-live-canvas/api/save-content (WYSIWYG Inline Editor Save)
          if (urlPath === '/dsh-live-canvas/api/save-content' && method === 'POST') {
            const body = await parseBody();
            const { canvasId, filePath, originalText, newText, fullContent } = body;

            let targetPath = filePath;
            let session = canvasId ? store.getSession(canvasId) : null;
            if (!targetPath && session && session.filePath) {
              targetPath = session.filePath;
            }

            if (targetPath) {
              try {
                const abs = resolveSafePath(targetPath, watcher.workspaceRoots);
                if (fs.existsSync(abs)) {
                  let content = fs.readFileSync(abs, 'utf8');
                  if (fullContent !== undefined) {
                    content = fullContent;
                  } else if (originalText && newText !== undefined) {
                    content = content.replace(originalText, newText);
                  }
                  fs.writeFileSync(abs, content, 'utf8');
                  if (session) {
                    store.createOrUpdateSession({ id: session.id, content, filePath: targetPath });
                  }
                  eventHub.broadcast('update', { canvasId: session?.id, filePath: targetPath, source: 'wysiwyg_save' });
                  return sendJson(200, { success: true, filePath: targetPath, replaced: true });
                } else {
                  return sendJson(404, { error: `File not found: ${targetPath}`, code: 'ENOENT', allowedRoots: watcher.workspaceRoots });
                }
              } catch (err) {
                const status = err.code === 'ERR_PATH_OUTSIDE_ROOTS' || err.code === 'ERR_SYMLINK_ESCAPE' ? 403 : 400;
                return sendJson(status, { error: err.message || 'Failed to save file', code: err.code, allowedRoots: watcher.workspaceRoots });
              }
            } else if (session) {
              let content = session.content || '';
              if (originalText && newText !== undefined) {
                content = content.replace(originalText, newText);
              }
              store.createOrUpdateSession({ id: session.id, content });
              eventHub.broadcast('update', { canvasId: session.id, source: 'wysiwyg_save' });
              return sendJson(200, { success: true, replaced: true });
            }
            return sendJson(400, { error: 'No filePath or session found' });
          }

          // POST /dsh-live-canvas/api/save-classes (Tailwind Style Tweaker)
          if (urlPath === '/dsh-live-canvas/api/save-classes' && method === 'POST') {
            const body = await parseBody();
            const { canvasId, selector, className } = body;
            eventHub.broadcast('classes_updated', { canvasId, selector, className });
            return sendJson(200, { success: true, canvasId, selector, className });
          }

          // POST /dsh-live-canvas/api/ai-prompt (In-Place AI Prompt on Element)
          if (urlPath === '/dsh-live-canvas/api/ai-prompt' && method === 'POST') {
            const body = await parseBody();
            const { canvasId, selector, instruction, outerHtml } = body;
            const session = canvasId ? store.getSession(canvasId) : null;
            eventHub.broadcast('ai_prompt_task', {
              canvasId,
              filePath: session?.filePath,
              selector,
              instruction,
              outerHtml,
              timestamp: new Date().toISOString()
            });
            return sendJson(200, {
              success: true,
              canvasId,
              selector,
              message: 'AI prompt task received'
            });
          }

          // GET /dsh-live-canvas/api/export/<id>
          if (urlPath.startsWith('/dsh-live-canvas/api/export/') && method === 'GET') {
            const id = urlPath.replace('/dsh-live-canvas/api/export/', '').trim();
            const session = store.getSession(id);
            if (!session) return sendJson(404, { error: 'Session not found' });
            const html = buildStandaloneHtml(session);
            const safeFilename = (session.title || id).replace(/[^a-zA-Z0-9_\-\.]/g, '_') + '.html';
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Disposition': `attachment; filename="${safeFilename}"`
            });
            res.end(html);
            return;
          }

          // GET /dsh-live-canvas/api/pack/<id>
          if (urlPath.startsWith('/dsh-live-canvas/api/pack/') && method === 'GET') {
            const parts = urlPath.replace('/dsh-live-canvas/api/pack/', '').split('?');
            const id = parts[0].trim();
            const urlObj = new URL(req.url, 'http://localhost');
            const framework = urlObj.searchParams.get('framework') || 'vite-react';
            const session = store.getSession(id);
            if (!session) return sendJson(404, { error: 'Session not found' });

            try {
              const zipBuffer = buildProjectZip(session, { framework });
              const safeFilename = (session.title || id).replace(/[^a-zA-Z0-9_\-\.]/g, '_') + `-${framework}.zip`;
              res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${safeFilename}"`,
                'Content-Length': zipBuffer.length
              });
              res.end(zipBuffer);
              return;
            } catch (err) {
              return sendJson(500, { error: 'Failed to build ZIP: ' + err.message });
            }
          }

          // GET /dsh-live-canvas/api/standalone
          if (urlPath === '/dsh-live-canvas/api/standalone' && method === 'GET') {
            const id = url.searchParams.get('canvasId') || (store.getActiveSessionId ? store.getActiveSessionId() : 'default');
            const session = store.getSession(id);
            if (!session) return sendJson(404, { error: 'Session not found' });

            try {
              const htmlBundle = buildStandaloneHtmlBundle(session);
              const safeFilename = (session.title || id).replace(/[^a-zA-Z0-9_\-\.]/g, '_') + '.html';
              res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="${safeFilename}"`,
                'Content-Length': Buffer.byteLength(htmlBundle)
              });
              res.end(htmlBundle);
              return;
            } catch (err) {
              return sendJson(500, { error: 'Failed to build standalone HTML: ' + err.message });
            }
          }

          // POST /dsh-live-canvas/api/preview
          if (urlPath === '/dsh-live-canvas/api/preview' && method === 'POST') {
            const body = await parseBody();
            const session = store.createOrUpdateSession(body);
            eventHub.broadcast('update', { canvasId: session.id, updatedAt: session.updatedAt });

            if (session.filePath && (cfg.enableFileWatcher ?? true)) {
              watcher.watchFile(session.id, session.filePath);
            }

            return sendJson(200, {
              success: true,
              canvasId: session.id,
              previewUrl: `/dsh-live-canvas/sandbox/${session.id}`
            });
          }

          // GET /dsh-live-canvas/api/snapshots
          if (urlPath === '/dsh-live-canvas/api/snapshots' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);
            const list = store.getSnapshots(canvasId, limit);
            return sendJson(200, { snapshots: list, count: list.length });
          }

          // POST /dsh-live-canvas/api/mock
          if (urlPath === '/dsh-live-canvas/api/mock' && method === 'POST') {
            const body = await parseBody();
            const { canvasId, mockData } = body;
            if (!canvasId) return sendJson(400, { error: 'canvasId is required' });
            store.setMockData(canvasId, mockData || {});
            eventHub.broadcast('update', { canvasId, mockUpdated: true });
            return sendJson(200, { success: true, canvasId, mockData: store.getMockData(canvasId) });
          }

          // GET /dsh-live-canvas/api/mock
          if (urlPath === '/dsh-live-canvas/api/mock' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            if (!canvasId) return sendJson(400, { error: 'canvasId is required' });
            return sendJson(200, { canvasId, mockData: store.getMockData(canvasId) });
          }

          // POST /dsh-live-canvas/api/inspect
          if (urlPath === '/dsh-live-canvas/api/inspect' && method === 'POST') {
            const body = await parseBody();
            if (body.canvasId) {
              store.addInspection(body.canvasId, body);
            }
            return sendJson(200, { success: true });
          }

          // GET /dsh-live-canvas/api/inspections
          if (urlPath === '/dsh-live-canvas/api/inspections' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const list = store.getInspections(canvasId);
            return sendJson(200, { inspections: list, count: list.length });
          }

          // POST /dsh-live-canvas/api/logs
          if (urlPath === '/dsh-live-canvas/api/logs' && method === 'POST') {
            const body = await parseBody();
            if (body.canvasId && body.message) {
              store.addLog(body.canvasId, body.level || 'info', body.message);
            }
            return sendJson(200, { success: true });
          }

          // GET /dsh-live-canvas/api/logs
          if (urlPath === '/dsh-live-canvas/api/logs' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const level = urlObj.searchParams.get('level');
            const list = store.getLogs(canvasId, level);
            return sendJson(200, { logs: list, count: list.length });
          }

          // POST /dsh-live-canvas/api/annotate
          if (urlPath === '/dsh-live-canvas/api/annotate' && method === 'POST') {
            const body = await parseBody();
            if (body.canvasId) {
              store.addAnnotation(body.canvasId, body);
            }
            return sendJson(200, { success: true });
          }

          // GET /dsh-live-canvas/api/annotations
          if (urlPath === '/dsh-live-canvas/api/annotations' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const list = store.getAnnotations(canvasId);
            return sendJson(200, { annotations: list, count: list.length });
          }

          // POST /dsh-live-canvas/api/controls
          if (urlPath === '/dsh-live-canvas/api/controls' && method === 'POST') {
            const body = await parseBody();
            const { canvasId, controls, values } = body;
            if (!canvasId) return sendJson(400, { error: 'canvasId is required' });
            if (controls) store.setControls(canvasId, controls);
            if (values) store.setControlValues(canvasId, values);
            return sendJson(200, {
              success: true,
              canvasId,
              controls: store.getControls(canvasId),
              values: store.getControlValues(canvasId)
            });
          }

          // GET /dsh-live-canvas/api/controls
          if (urlPath === '/dsh-live-canvas/api/controls' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            if (!canvasId) return sendJson(400, { error: 'canvasId is required' });
            return sendJson(200, {
              canvasId,
              controls: store.getControls(canvasId),
              values: store.getControlValues(canvasId)
            });
          }

          // GET /dsh-live-canvas/api/templates
          if (urlPath === '/dsh-live-canvas/api/templates' && method === 'GET') {
            const urlObj2 = new URL(req.url, 'http://localhost');
            const category = urlObj2.searchParams.get('category');
            const templates = listTemplates(category);
            return sendJson(200, { success: true, templates });
          }

          // POST /dsh-live-canvas/api/save-reorder
          if (urlPath === '/dsh-live-canvas/api/save-reorder' && method === 'POST') {
            try {
              const body = await readJsonBody();
              const { canvasId, reorderedHtml } = body;
              if (canvasId && reorderedHtml) {
                const session = store.getSession(canvasId);
                if (session) {
                  store.createOrUpdateSession({ id: canvasId, content: reorderedHtml });
                  if (session.filePath) {
                    const abs = resolveSafePath(session.filePath, watcher.workspaceRoots);
                    if (fs.existsSync(abs)) {
                      fs.writeFileSync(abs, reorderedHtml, 'utf8');
                    }
                  }
                  eventHub.broadcast('update', { canvasId });
                }
              }
              return sendJson(200, { success: true, message: 'Reordered layout applied' });
            } catch (err) {
              return sendJson(400, { error: err.message });
            }
          }

          
          // GET /dsh-live-canvas/api/themes
          if (urlPath === '/dsh-live-canvas/api/themes' && method === 'GET') {
            const themes = listThemePresets();
            return sendJson(200, { success: true, themes });
          }

          // GET /dsh-live-canvas/api/motion
          if (urlPath === '/dsh-live-canvas/api/motion' && method === 'GET') {
            const motion = listMotionPresets();
            return sendJson(200, { success: true, motion });
          }

          // GET /dsh-live-canvas/api/mocks
          if (urlPath === '/dsh-live-canvas/api/mocks' && method === 'GET') {
            const urlObjM = new URL(req.url, 'http://localhost');
            const type = urlObjM.searchParams.get('type') || 'users';
            const count = parseInt(urlObjM.searchParams.get('count') || '5', 10);
            const data = generateMockDataset(type, count);
            return sendJson(200, { success: true, data });
          }

          // GET /dsh-live-canvas/api/share-info
          if (urlPath === '/dsh-live-canvas/api/share-info' && method === 'GET') {
            const urlObjS = new URL(req.url, 'http://localhost');
            const cid = urlObjS.searchParams.get('canvasId') || 'default';
            const share = getShareDetails(cid);
            return sendJson(200, { success: true, share });
          }

          
          
          // GET /dsh-live-canvas/timetravel/:id
          if (urlPath.startsWith('/dsh-live-canvas/timetravel/') && method === 'GET') {
            const canvasId = urlPath.replace('/dsh-live-canvas/timetravel/', '').split('?')[0];
            const session = store.getSession(canvasId) || store.getLatestSession();
            const snapshots = store.getSnapshots(canvasId);
            const html = buildTimeTravelViewer({ session, snapshots });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(html);
          }

          // GET /dsh-live-canvas/api/deploy
          if (urlPath === '/dsh-live-canvas/api/deploy' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId') || 'default';
            const target = urlObj.searchParams.get('target') || 'vercel';
            const session = store.getSession(canvasId) || store.getLatestSession();
            if (!session) return sendJson(404, { error: 'Session not found' });
            const bundle = buildDeploymentBundle({ session, target });
            return sendJson(200, { success: true, canvasId, bundle });
          }

          // GET /dsh-live-canvas/api/sound-presets
          if (urlPath === '/dsh-live-canvas/api/sound-presets' && method === 'GET') {
            return sendJson(200, { success: true, presets: SOUND_PRESETS });
          }

          // POST /dsh-live-canvas/api/annotations/resolve
          if (urlPath === '/dsh-live-canvas/api/annotations/resolve' && method === 'POST') {
            try {
              const body = await readJsonBody();
              const { canvasId, annotationId, note } = body;
              if (!canvasId || !annotationId) return sendJson(400, { error: 'canvasId and annotationId are required' });
              const resolved = store.resolveAnnotation(canvasId, annotationId, note);
              if (!resolved) return sendJson(404, { error: 'Annotation not found' });
              eventHub.broadcast('update', { canvasId });
              return sendJson(200, { success: true, annotation: resolved });
            } catch (err) {
              return sendJson(400, { error: err.message });
            }
          }

          return sendJson(404, { error: 'Unknown API route' });
        }
      });

      // Effect cleanup function
      return () => {
        if (typeof unregUpdater === 'function') unregUpdater();
        if (typeof unregEvents === 'function') unregEvents();
        if (typeof unregSandbox === 'function') unregSandbox();
        if (typeof unregDiff === 'function') unregDiff();
        if (typeof unregMatrix === 'function') unregMatrix();
        if (typeof unregAssets === 'function') unregAssets();
        if (typeof unregApi === 'function') unregApi();
        watcher.closeAll();
        eventHub.closeAll();
        store.flush();
      };
    }, 'dsh-live-canvas: web server and sandbox endpoints');
  });

  // Register Agent Tools
  if (ctx.tools && typeof ctx.tools.register === 'function') {
    registerLiveCanvasTools(ctx, store, eventHub, {
      workspaceDir: cfg.workspaceDir,
      workspaceRoots: cfg.workspaceRoots
    });
  }
}

