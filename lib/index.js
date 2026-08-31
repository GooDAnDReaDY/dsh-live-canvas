// dsh-live-canvas: host half.
// Cordis plugin providing Live Preview Sandbox server, SSE hot-reload, DOM click inspector, telemetry logs, standalone export, and agent tools.

import { PreviewStore } from './store.js';
import { EventHub } from './events.js';
import { transpileAndWrap, buildStandaloneHtml } from './transpiler.js';
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
  defaultViewport: Schema.string().default('responsive').description('Default preview viewport (responsive/mobile/tablet/desktop)'),
  autoOpenOnHtmlGen: Schema.boolean().default(true).description('Auto-open canvas when agent creates HTML or React components'),
  enableHotReload: Schema.boolean().default(true).description('Enable SSE-based real-time hot-reload on changes'),
  maxSessionCache: Schema.number().default(50).description('Maximum number of active preview sessions stored in memory')
});

const NS = '@goodandready/dsh-live-canvas';

export function apply(ctx, config = {}) {
  let getConfig = () => config;

  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NS, Config, { base: config });
    getConfig = () => scope.get() ?? config;
  });

  const cfg = getConfig();
  const store = new PreviewStore({ maxSessions: cfg.maxSessionCache || 50 });
  const eventHub = new EventHub({ heartbeatIntervalMs: 15000 });

  // Register Agent Tools
  if (ctx.tools) {
    registerLiveCanvasTools(ctx, store, eventHub, {
      workspaceDir: process.cwd()
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

          const session = canvasId ? store.getSession(canvasId) : null;

          if (!session) {
            const notFoundHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Live Canvas Not Found</title></head>
<body style="font-family:-apple-system,sans-serif;padding:32px;text-align:center;color:#666;">
  <h2>Canvas session not found</h2>
  <p>Session ID <code>${canvasId || 'empty'}</code> does not exist or has expired.</p>
</body></html>`;
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(notFoundHtml);
            return;
          }

          const rawHtml = transpileAndWrap(session);
          const finalHtml = injectSandboxRuntime(rawHtml, session.id, {
            eventsUrl: '/dsh-live-canvas/events',
            inspectApiUrl: '/dsh-live-canvas/api/inspect',
            logsApiUrl: '/dsh-live-canvas/api/logs'
          });

          res.writeHead(200, getSandboxHeaders());
          res.end(finalHtml);
        }
      });

      // 3. API Endpoints for REST queries
      const unregApi = wctx.webServer.register({
        kind: 'prefix',
        path: '/dsh-live-canvas/api',
        handler: async (req, res) => {
          const urlPath = req.url.split('?')[0];
          const method = req.method.toUpperCase();

          const sendJson = (statusCode, data) => {
            res.writeHead(statusCode, {
              'Content-Type': 'application/json; charset=utf-8',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(data));
          };

          const parseBody = () => new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
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
            return sendJson(200, {
              success: true,
              canvasId: session.id,
              previewUrl: `/dsh-live-canvas/sandbox/${session.id}`
            });
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
        if (typeof unregApi === 'function') unregApi();
        eventHub.closeAll();
        store.clear();
      };
    }, 'dsh-live-canvas: web server and sandbox endpoints');
  });
}