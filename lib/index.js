// dsh-live-canvas: host half.
// Cordis plugin providing Live Preview Sandbox server, multi-file ESM bundler, static asset server, SSE hot-reload, DOM click inspector, telemetry logs, standalone export, visual annotations, WYSIWYG text editor, floating Tailwind style tweaker, component galleries, workspace file watcher, props controls, visual diffs, device matrix, AI mock data, 1-click Vite ZIP packager, and agent tools.

import fs from 'node:fs';
import path from 'node:path';
import { PreviewStore } from './store.js';
import { EventHub } from './events.js';
import { WorkspaceWatcher } from './watcher.js';
import { transpileAndWrap, buildStandaloneHtml, buildDiffWrapper, buildMatrixWrapper } from './transpiler.js';
import { buildProjectFiles, buildProjectZip } from './packager.js';
import { getSandboxHeaders, injectSandboxRuntime, sanitizePath } from './sandbox.js';
import { listTemplates, getTemplateById } from './templates.js';
import { scanWorkspaceComponents, buildStorybookMatrixData } from './storybook.js';
import { listThemePresets, getThemeById, generateCssVariables } from './themes.js';
import { listMotionPresets, generateMotionCss } from './motion.js';
import { generateMockDataset } from './faker.js';
import { getShareDetails } from './share.js';
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
    .description('Custom workspace root directory to scan and preview')
}).description('dsh-live-canvas plugin configuration schema');

export const inject = ['webServer', 'tools', 'settings'];

export function apply(ctx, config) {
  const cfg = {
    defaultViewport: config?.defaultViewport ?? 'responsive',
    autoOpenOnHtmlGen: config?.autoOpenOnHtmlGen ?? true,
    enableHotReload: config?.enableHotReload ?? true,
    maxSessionCache: config?.maxSessionCache ?? 50,
    enableFileWatcher: config?.enableFileWatcher ?? true,
    workspaceDir: config?.workspaceDir || process.cwd()
  };

  const store = new PreviewStore({ maxSessions: cfg.maxSessionCache });
  const eventHub = new EventHub();
  const watcher = new WorkspaceWatcher(store, eventHub, {
    workspaceDir: cfg.workspaceDir,
    debounceMs: 150
  });

  // Register Web Server Endpoints
  if (ctx.inject && typeof ctx.inject === 'function') {
    ctx.inject(['settings'], (sctx) => {
      if (sctx && sctx.settings && typeof sctx.settings.register === 'function') {
        sctx.settings.register(name, Config, { base: cfg });
      }
    });
  }

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
        <div className="text-xs text-slate-400 font-mono text-right h-4">{prev ? \\\`\\\${prev} \\\${op}\\\` : ""}</div>
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
            <div className={\\\`text-xs font-semibold \\\${k.up ? 'text-emerald-400' : 'text-rose-400'}\\\`}>
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
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.canvasId) {
            try {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'dlc_session_created', canvasId: data.canvasId }, '*');
              }
            } catch {}
            window.location.href = '/dsh-live-canvas/sandbox/' + data.canvasId;
          }
        });
    }
  </script>
</body>
</html>`;
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
            console.error('[ASSET_ERR] Asset path required'); res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Asset path required' }));
            return;
          }

          try {
            const absPath = sanitizePath(watcher.workspaceDir, relPath);
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
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(JSON.stringify(data));
          }

          if (method === 'OPTIONS') {
            return sendJson(200, { ok: true });
          }

          const parseBody = (maxBytes = 25 * 1024 * 1024) => new Promise((resolve) => {
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
              resolve({});
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
              if (!settled) onError();
            });
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
              return sendJson(400, { error: err.message || String(err) });
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
                const abs = sanitizePath(watcher.workspaceDir, targetPath);
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
                }
              } catch (err) {
                return sendJson(400, { error: err.message || 'Failed to save file' });
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
                    const abs = sanitizePath(watcher.workspaceDir, session.filePath);
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
        if (typeof unregEvents === 'function') unregEvents();
        if (typeof unregSandbox === 'function') unregSandbox();
        if (typeof unregDiff === 'function') unregDiff();
        if (typeof unregMatrix === 'function') unregMatrix();
        if (typeof unregAssets === 'function') unregAssets();
        if (typeof unregApi === 'function') unregApi();
        watcher.closeAll();
        eventHub.closeAll();
        store.clear();
      };
    }, 'dsh-live-canvas: web server and sandbox endpoints');
  });

  // Register Agent Tools
  if (ctx.tools && typeof ctx.tools.register === 'function') {
    registerLiveCanvasTools(ctx, store, eventHub, { workspaceDir: cfg.workspaceDir });
  }
}

