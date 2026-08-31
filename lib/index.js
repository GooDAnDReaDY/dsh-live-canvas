// dsh-live-canvas: host half.
// Cordis plugin providing Live Preview Sandbox server, SSE hot-reload, DOM click inspector, telemetry logs, standalone export, visual annotations, component galleries, workspace file watcher, props controls, visual diffs, device matrix, AI mock data, 1-click Vite ZIP packager, and agent tools.

import { PreviewStore } from './store.js';
import { EventHub } from './events.js';
import { WorkspaceWatcher } from './watcher.js';
import { transpileAndWrap, buildStandaloneHtml, buildDiffWrapper, buildMatrixWrapper } from './transpiler.js';
import { buildProjectZip } from './packager.js';
import { getSandboxHeaders, injectSandboxRuntime } from './sandbox.js';
import { registerLiveCanvasTools } from './tools.js';

let Schema;
try {
  const mod = await import('@deepseek-ai/schemastery');
  Schema = mod.Schema || mod.default || mod;
} catch {
  Schema = {
    object: (shape) => ({ shape, description: () => Schema.object(shape), default: () => Schema.object(shape) }),
    string: () => ({ default: (v) => ({ defaultVal: v, description: () => ({}) }), description: () => ({}) }),
    boolean: () => ({ default: (v) => ({ defaultVal: v, description: () => ({}) }), description: () => ({}) }),
    number: () => ({ default: (v) => ({ defaultVal: v, description: () => ({}) }), description: () => ({}) })
  };
}

export const name = '@goodandready/dsh-live-canvas';
export const inject = ['tools', 'settings', 'webServer'];

export const Config = Schema.object({
  defaultViewport: Schema.string().default('responsive').description('Default preview viewport (responsive/mobile/tablet/desktop/matrix)'),
  autoOpenOnHtmlGen: Schema.boolean().default(true).description('Auto-open canvas when agent creates HTML or React components'),
  enableHotReload: Schema.boolean().default(true).description('Stream real-time updates via SSE when components are edited'),
  maxSessionCache: Schema.number().default(50).description('Maximum number of active preview sessions to keep in memory'),
  enableFileWatcher: Schema.boolean().default(true).description('Watch workspace files when filePath is provided and auto-reload on changes')
});

const NS = '@goodandready/dsh-live-canvas';

export function apply(ctx, config = {}) {
  let getConfig = () => config;

  ctx.inject(['settings'], (sctx) => {
    if (sctx.settings && typeof sctx.settings.register === 'function') {
      const scope = sctx.settings.register(NS, Config, { base: config });
      getConfig = () => scope?.get?.() ?? config;
    }
  });

  const cfg = getConfig();
  const store = new PreviewStore({ maxSessions: cfg.maxSessionCache || 50 });
  const eventHub = new EventHub({ heartbeatIntervalMs: 15000 });
  const watcher = new WorkspaceWatcher(store, eventHub, {
    workspaceDir: process.cwd()
  });

  // Register Agent Tools
  if (ctx.tools) {
    registerLiveCanvasTools(ctx, store, eventHub, {
      workspaceDir: process.cwd(),
      watcher
    });
  }

  // Register Web Server Endpoints
  ctx.inject(['webServer'], (wctx) => {
    ctx.effect(() => {
      // 1. SSE Events Endpoint
      const unregEvents = wctx.webServer.register({
        kind: 'exact',
        path: '/dsh-live-canvas/events',
        handler: (req, res) => {
          eventHub.handleSseRequest(req, res);
        }
      });

      // 2. Sandbox Preview Endpoint
      const unregSandbox = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/sandbox',
        handler: (req, res) => {
          const urlPath = req.url.split('?')[0];
          const parts = urlPath.split('/').filter(Boolean);
          // Format: /dsh-live-canvas/sandbox/<canvasId>
          const canvasId = parts[2] || '';

          let session = canvasId && canvasId !== 'default' ? store.getSession(canvasId) : null;
          if (!session) {
            session = store.getLatestSession();
          }

          if (!session) {
            const welcomeHtml = `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Canvas — Ready</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' };</script>
  <style>
    body { background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-6 select-none bg-zinc-950">
  <div class="max-w-md w-full text-center space-y-6">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      Холст Live Canvas готов к работе
    </div>
    
    <div class="space-y-2">
      <h2 class="text-2xl font-bold tracking-tight text-white">Интерактивный холст</h2>
      <p class="text-sm text-zinc-400">
        Попросите агента в чате создать любой интерфейс (React, Tailwind, HTML, SVG, Mermaid), и он автоматически появится здесь в реальном времени.
      </p>
    </div>

    <div class="pt-4 border-t border-zinc-800/80 space-y-3">
      <div class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Быстрый старт с демо-шаблонами</div>
      <div class="grid grid-cols-1 gap-2 text-left">
        <button onclick="loadDemo('calc')" class="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-sm font-medium flex items-center gap-3 transition cursor-pointer">
          <span class="text-xl">🧮</span>
          <div>
            <div class="text-zinc-200">React Калькулятор</div>
            <div class="text-xs text-zinc-400">Интерактивный калькулятор с Tailwind</div>
          </div>
        </button>
        <button onclick="loadDemo('dash')" class="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-sm font-medium flex items-center gap-3 transition cursor-pointer">
          <span class="text-xl">📊</span>
          <div>
            <div class="text-zinc-200">SaaS Дашборд метрик</div>
            <div class="text-xs text-zinc-400">KPI карточки и аналитика</div>
          </div>
        </button>
      </div>
    </div>
  </div>

  <script>
    try {
      const sse = new EventSource('/dsh-live-canvas/events');
      sse.addEventListener('update', () => {
        window.location.reload();
      });
    } catch {}

    function loadDemo(type) {
      const payload = type === 'calc' ? {
        title: 'React Calculator',
        componentType: 'react',
        content: \`import React, { useState } from "react";
export default function Calculator() {
  const [val, setVal] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(false);

  const num = (n) => {
    if (val === "0" || fresh) { setVal(String(n)); setFresh(false); }
    else setVal(val + n);
  };
  const act = (o) => {
    setPrev(parseFloat(val));
    setOp(o);
    setFresh(true);
  };
  const eq = () => {
    if (prev === null || !op) return;
    const cur = parseFloat(val);
    let res = 0;
    if (op === "+") res = prev + cur;
    if (op === "-") res = prev - cur;
    if (op === "×") res = prev * cur;
    if (op === "÷") res = cur !== 0 ? prev / cur : "Error";
    setVal(String(res));
    setPrev(null);
    setOp(null);
    setFresh(true);
  };
  const clr = () => { setVal("0"); setPrev(null); setOp(null); };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-80 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="text-xs text-slate-400 font-mono text-right h-4">{prev ? \`\${prev} \${op}\` : ""}</div>
        <div className="text-4xl font-bold font-mono text-white text-right overflow-x-auto tracking-wider pb-2">{val}</div>
        <div className="grid grid-cols-4 gap-3">
          <button onClick={clr} className="col-span-2 p-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-2xl transition active:scale-95">AC</button>
          <button onClick={() => act("÷")} className="p-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl transition active:scale-95">÷</button>
          <button onClick={() => act("×")} className="p-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl transition active:scale-95">×</button>
          {[7, 8, 9].map(n => <button key={n} onClick={() => num(n)} className="p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95">{n}</button>)}
          <button onClick={() => act("-")} className="p-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl transition active:scale-95">-</button>
          {[4, 5, 6].map(n => <button key={n} onClick={() => num(n)} className="p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95">{n}</button>)}
          <button onClick={() => act("+")} className="p-3.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-2xl transition active:scale-95">+</button>
          {[1, 2, 3].map(n => <button key={n} onClick={() => num(n)} className="p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95">{n}</button>)}
          <button onClick={eq} className="row-span-2 p-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl flex items-center justify-center text-xl transition active:scale-95">=</button>
          <button onClick={() => num(0)} className="col-span-2 p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95">0</button>
          <button onClick={() => !val.includes(".") && setVal(val + ".")} className="p-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition active:scale-95">.</button>
        </div>
      </div>
    </div>
  );
}\`
      } : {
        title: 'SaaS Metric Dashboard',
        componentType: 'react',
        content: \`import React from "react";
export default function Dashboard() {
  const kpis = [
    { title: "Выручка (MRR)", value: "$48,250", change: "+14.2%", up: true },
    { title: "Активные пользователи", value: "3,842", change: "+8.1%", up: true },
    { title: "Конверсия", value: "4.65%", change: "-0.4%", up: false },
    { title: "Средний чек", value: "$124", change: "+5.3%", up: true }
  ];
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">SaaS Analytics Dashboard</h1>
          <p className="text-xs text-zinc-400">Обзор ключевых метрик за текущий месяц</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs rounded-lg">Экспорт PDF</button>
          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">+ Отчет</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="p-5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl space-y-2">
            <div className="text-xs font-medium text-zinc-400">{k.title}</div>
            <div className="text-2xl font-bold text-white">{k.value}</div>
            <div className={\`text-xs font-semibold \${k.up ? 'text-emerald-400' : 'text-rose-400'}\`}>
              {k.change} vs прошлый месяц
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}\`
      };

      fetch('/dsh-live-canvas/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(() => window.location.reload());
    }
  </script>
</body>
</html>`;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(welcomeHtml);
            return;
          }

          const rawHtml = transpileAndWrap(session);
          const finalHtml = injectSandboxRuntime(rawHtml, session.id, {
            eventsUrl: '/dsh-live-canvas/events',
            inspectApiUrl: '/dsh-live-canvas/api/inspect',
            logsApiUrl: '/dsh-live-canvas/api/logs',
            annotateApiUrl: '/dsh-live-canvas/api/annotations',
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
          const beforeHtml = previousSnap ? transpileAndWrap({ ...session, content: previousSnap.content, componentType: previousSnap.componentType }) : transpileAndWrap(session);
          const afterHtml = transpileAndWrap(session);

          const diffHtml = buildDiffWrapper(beforeHtml, afterHtml, {
            title: `Visual Diff: ${session.title || session.id}`,
            theme: session.theme || 'dark'
          });

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

          const matrixHtml = buildMatrixWrapper(session, {
            title: `Device Matrix: ${session.title || session.id}`,
            theme: session.theme || 'dark'
          });

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(matrixHtml);
        }
      });

      // 5. REST APIs for Canvas Operations, Inspections, Telemetry, and Snapshots
      const unregApi = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/api',
        handler: async (req, res) => {
          const urlPath = req.url.split('?')[0];
          const method = req.method.toUpperCase();

          function sendJson(status, data) {
            res.writeHead(status, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(JSON.stringify(data));
          }

          if (method === 'OPTIONS') {
            return sendJson(200, { ok: true });
          }

          const parseBody = () => new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                resolve(JSON.parse(body || '{}'));
              } catch {
                resolve({});
              }
            });
          });

          // GET /dsh-live-canvas/api/sessions
          if (urlPath === '/dsh-live-canvas/api/sessions' && method === 'GET') {
            return sendJson(200, { sessions: store.listSessions() });
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
              'Content-Disposition': `attachment; filename="${safeFilename}"`,
              'Access-Control-Allow-Origin': '*'
            });
            res.end(html);
            return;
          }

          // GET /dsh-live-canvas/api/pack/<id>
          if (urlPath.startsWith('/dsh-live-canvas/api/pack/') && method === 'GET') {
            const id = urlPath.replace('/dsh-live-canvas/api/pack/', '').trim();
            const session = store.getSession(id);
            if (!session) return sendJson(404, { error: 'Session not found' });
            const urlObj = new URL(req.url, 'http://localhost');
            const framework = urlObj.searchParams.get('framework') || 'vite-react';
            const zipBuf = buildProjectZip(session, { framework });
            const safeFilename = (session.title || id).replace(/[^a-zA-Z0-9_\-\.]/g, '_') + '.zip';
            res.writeHead(200, {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${safeFilename}"`,
              'Access-Control-Allow-Origin': '*'
            });
            res.end(zipBuf);
            return;
          }

          // GET /dsh-live-canvas/api/preview/<id>
          if (urlPath.startsWith('/dsh-live-canvas/api/preview/') && method === 'GET') {
            const id = urlPath.replace('/dsh-live-canvas/api/preview/', '').trim();
            const session = store.getSession(id);
            if (!session) return sendJson(404, { error: 'Session not found' });
            return sendJson(200, { session });
          }

          // POST /dsh-live-canvas/api/preview
          if (urlPath === '/dsh-live-canvas/api/preview' && method === 'POST') {
            const body = await parseBody();
            const session = store.createOrUpdateSession(body);
            eventHub.broadcast('update', { canvasId: session.id, updatedAt: session.updatedAt });

            // Auto-watch file if present and configured
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
            const canvasId = body.canvasId;
            if (!canvasId) return sendJson(400, { error: 'canvasId is required' });
            store.setMockData(canvasId, body.mockData || null);
            eventHub.broadcast('mock_update', { canvasId, mockData: body.mockData });
            return sendJson(200, { success: true, mockData: body.mockData });
          }

          // GET /dsh-live-canvas/api/mock
          if (urlPath === '/dsh-live-canvas/api/mock' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const mockData = store.getMockData(canvasId);
            return sendJson(200, { mockData: mockData || {} });
          }

          // POST /dsh-live-canvas/api/inspect
          if (urlPath === '/dsh-live-canvas/api/inspect' && method === 'POST') {
            const body = await parseBody();
            const record = store.recordInspection(body);
            return sendJson(200, { success: true, record });
          }

          // GET /dsh-live-canvas/api/inspect
          if (urlPath === '/dsh-live-canvas/api/inspect' && method === 'GET') {
            const last = store.getLastInspection();
            return sendJson(200, { inspected: last, history: store.listInspections(null, 10) });
          }

          // POST /dsh-live-canvas/api/logs
          if (urlPath === '/dsh-live-canvas/api/logs' && method === 'POST') {
            const body = await parseBody();
            const entry = store.recordLog(body);
            return sendJson(200, { success: true, entry });
          }

          // GET /dsh-live-canvas/api/logs
          if (urlPath === '/dsh-live-canvas/api/logs' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const level = urlObj.searchParams.get('level');
            const limit = parseInt(urlObj.searchParams.get('limit') || '50', 10);
            const logs = store.getLogs(canvasId, level, limit);
            return sendJson(200, { logs, count: logs.length });
          }

          // POST /dsh-live-canvas/api/annotations
          if (urlPath === '/dsh-live-canvas/api/annotations' && method === 'POST') {
            const body = await parseBody();
            const annotation = store.recordAnnotation(body);
            return sendJson(200, { success: true, annotation });
          }

          // GET /dsh-live-canvas/api/annotations
          if (urlPath === '/dsh-live-canvas/api/annotations' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const limit = parseInt(urlObj.searchParams.get('limit') || '20', 10);
            const annotations = store.getAnnotations(canvasId, limit);
            return sendJson(200, { annotations, count: annotations.length });
          }

          // POST /dsh-live-canvas/api/controls
          if (urlPath === '/dsh-live-canvas/api/controls' && method === 'POST') {
            const body = await parseBody();
            const canvasId = body.canvasId;
            if (!canvasId) return sendJson(400, { error: 'canvasId is required' });

            if (body.controls) {
              store.setControls(canvasId, body.controls, body.values || {});
            } else if (body.values) {
              store.updateControlValues(canvasId, body.values);
            }

            const session = store.getSession(canvasId);
            eventHub.broadcast('props_update', { canvasId, values: session?.controlValues });
            return sendJson(200, { success: true, controls: session?.controls, values: session?.controlValues });
          }

          // GET /dsh-live-canvas/api/controls
          if (urlPath === '/dsh-live-canvas/api/controls' && method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const canvasId = urlObj.searchParams.get('canvasId');
            const session = canvasId ? store.getSession(canvasId) : null;
            if (!session) return sendJson(404, { error: 'Session not found' });
            return sendJson(200, { controls: session.controls || {}, values: session.controlValues || {} });
          }

          // POST /dsh-live-canvas/api/reload
          if (urlPath === '/dsh-live-canvas/api/reload' && method === 'POST') {
            const body = await parseBody();
            eventHub.broadcast('reload', { canvasId: body.canvasId, timestamp: new Date().toISOString() });
            return sendJson(200, { success: true, reloaded: true });
          }

          return sendJson(404, { error: 'Unknown API route' });
        }
      });

      // Effect cleanup function
      return () => {
        if (typeof unregEvents === 'function') unregEvents();
        if (typeof unregSandbox === 'function') unregSandbox();
        if (typeof unregDiff === 'function') unregDiff();
        if (typeof unregMatrix === 'function') unregMatrix();
        if (typeof unregApi === 'function') unregApi();
        watcher.closeAll();
        eventHub.closeAll();
        store.clear();
      };
    }, 'dsh-live-canvas: web server and sandbox endpoints');
  });
}

