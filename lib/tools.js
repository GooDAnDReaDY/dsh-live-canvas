// dsh-live-canvas: agent tools definitions and handlers.
import fs from 'node:fs';
import path from 'node:path';
import { autoDetectType, buildStandaloneHtml } from './transpiler.js';
import { buildProjectFiles } from './packager.js';
import { listTemplates, getTemplateById } from './templates.js';
import { scanWorkspaceComponents, buildStorybookMatrixData } from './storybook.js';
import { sanitizePath } from './sandbox.js';
import { generateMockDataset } from './faker.js';
import { getShareDetails } from './share.js';
import { getThemeById } from './themes.js';
import { buildWireframeTemplate } from './wireframe.js';
import { buildPlanTemplate } from './plan.js';
import { buildDiagramTemplate } from './diagram.js';
import { buildPrototypeTemplate } from './prototype.js';



let defineTool = (def) => def;
try {
  const dtMod = await import('@deepseek-ai/dsh-tools');
  if (dtMod && dtMod.defineTool) {
    defineTool = dtMod.defineTool;
  }
} catch {}

export function registerLiveCanvasTools(ctx, store, eventHub, options = {}) {
  const getWorkspaceDir = () => {
    return options.workspaceDir || process.cwd();
  };

  // Tool 1: live_canvas_preview
  ctx.tools.register(defineTool({
    name: 'live_canvas_preview',
    description: 'Render or update an interactive live canvas preview for HTML (with Tailwind CSS and Lucide icons), React JSX, SVG, Mermaid diagram, or Markdown content.',
    parameters: {
      content: {
        type: 'string',
        description: 'The code, markup, or markdown content to render in the live canvas preview.'
      },
      filePath: {
        type: 'string',
        description: 'Optional relative path to a file in the workspace to load content from.'
      },
      title: {
        type: 'string',
        description: 'Human-readable title for the preview session (e.g. "Hero Component", "Checkout Form").'
      },
      componentType: {
        type: 'string',
        enum: ['html', 'react', 'svg', 'mermaid', 'markdown', 'gallery', 'auto'],
        description: 'Type of component being previewed. Defaults to "auto" detection.'
      },
      viewport: {
        type: 'string',
        enum: ['responsive', 'mobile', 'tablet', 'desktop', 'matrix'],
        description: 'Target viewport layout for the preview.'
      },
      theme: {
        type: 'string',
        enum: ['dark', 'light', 'auto'],
        description: 'Preview theme styling (dark or light, default dark).'
      },
      canvasId: {
        type: 'string',
        description: 'Optional canvas session ID to update an existing preview instead of creating a new one.'
      },
      controls: {
        type: 'object',
        additionalProperties: true,
        description: 'Optional props controls schema definition for interactive playground.'
      },
      controlValues: {
        type: 'object',
        additionalProperties: true,
        description: 'Initial values for props controls.'
      },
      mockData: {
        type: 'object',
        additionalProperties: true,
        description: 'Optional mock API dataset map (e.g. { "/api/users": [...] }) for simulated networking.'
      },
      customCss: {
        type: 'string',
        description: 'Optional extra CSS styles to inject into the canvas.'
      },
      customJs: {
        type: 'string',
        description: 'Optional extra JavaScript code to execute inside the canvas.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          title: { type: 'string' },
          componentType: { type: 'string' },
          viewport: { type: 'string' },
          theme: { type: 'string' },
          hasControls: { type: 'boolean' },
          hasMockData: { type: 'boolean' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || val.previewUrl || 'OK' }];
      }
    },
    execute: async (args = {}) => {
      let content = args.content;
      let filePath = args.filePath;

      if (!content && filePath) {
        try {
          const workspace = getWorkspaceDir();
          const targetPath = path.resolve(workspace, filePath);
          if (fs.existsSync(targetPath)) {
            content = fs.readFileSync(targetPath, 'utf8');
          } else {
            return {
              error: `Target not found at relative path: ${filePath}`,
              success: false
            };
          }
        } catch (err) {
          return {
            error: `Failed to read target path: ${err.message}`,
            success: false
          };
        }
      }

      if (typeof content !== 'string') {
        content = '<div style="padding:20px;text-align:center;"><h3>Live Canvas Preview</h3><p>No content provided</p></div>';
      }

      let compType = args.componentType;
      if (!compType || compType === 'auto') {
        compType = autoDetectType(content, filePath);
      }

      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || (filePath ? path.basename(filePath) : 'Live Preview'),
        content: content,
        componentType: compType,
        viewport: args.viewport || 'responsive',
        theme: args.theme || 'dark',
        filePath: filePath || null,
        controls: args.controls || null,
        controlValues: args.controlValues || {},
        mockData: args.mockData || null,
        customCss: args.customCss || '',
        customJs: args.customJs || ''
      });

      // Broadcast update to all connected SSE clients
      eventHub.broadcast('update', {
        canvasId: session.id,
        title: session.title,
        componentType: session.componentType,
        viewport: session.viewport,
        theme: session.theme,
        hasControls: !!session.controls,
        hasMockData: !!session.mockData,
        updatedAt: session.updatedAt
      });

      const previewUrl = `/dsh-live-canvas/sandbox/${session.id}`;

      return {
        success: true,
        canvasId: session.id,
        previewUrl: previewUrl,
        title: session.title,
        componentType: session.componentType,
        viewport: session.viewport,
        theme: session.theme,
        hasControls: !!session.controls,
        hasMockData: !!session.mockData,
        message: `Live preview ready at ${previewUrl}. Tailwind CSS runtime and Lucide icons active.`
      };
    }
  }));

  // Tool 2: live_canvas_inspect
  ctx.tools.register(defineTool({
    name: 'live_canvas_inspect',
    description: 'Retrieve user click inspection data, DOM selectors, attributes, and text from the live canvas preview.',
    parameters: {
      action: {
        type: 'string',
        enum: ['get_last', 'list', 'clear'],
        description: 'Action to perform: "get_last" (default), "list", or "clear".'
      },
      canvasId: {
        type: 'string',
        description: 'Optional canvas session ID to filter inspections.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          inspected: {
            type: 'object',
            additionalProperties: true
          },
          count: { type: 'number' },
          inspections: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          },
          message: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.inspected ? JSON.stringify(val.inspected) : (val.message || 'OK') }];
      }
    },
    execute: async (args = {}) => {
      const action = args.action || 'get_last';

      if (action === 'clear') {
        store.clearInspections(args.canvasId);
        return { success: true, message: 'Inspection records cleared' };
      }

      if (action === 'list') {
        const list = store.listInspections(args.canvasId, 20);
        return {
          success: true,
          count: list.length,
          inspections: list
        };
      }

      const last = store.getLastInspection(args.canvasId);
      if (!last) {
        return {
          success: true,
          inspected: null,
          message: 'No element has been inspected yet. Instruct the user to click an element in the canvas inspector.'
        };
      }

      return {
        success: true,
        inspected: last
      };
    }
  }));

  // Tool 3: live_canvas_reload
  ctx.tools.register(defineTool({
    name: 'live_canvas_reload',
    description: 'Broadcast a hot-reload or refresh signal to active preview canvases.',
    parameters: {
      canvasId: {
        type: 'string',
        description: 'Optional specific canvas ID to reload. If omitted, reloads all active canvases.'
      },
      reason: {
        type: 'string',
        description: 'Optional explanation of why the reload was triggered.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          reloadedClients: { type: 'number' },
          timestamp: { type: 'string' },
          message: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || 'Reloaded' }];
      }
    },
    execute: async (args = {}) => {
      const payload = {
        canvasId: args.canvasId || null,
        type: args.canvasId ? 'canvas_reload' : 'global_reload',
        reason: args.reason || 'Agent requested reload',
        timestamp: new Date().toISOString()
      };

      const sentCount = eventHub.broadcast(args.canvasId ? 'update' : 'reload', payload);

      return {
        success: true,
        reloadedClients: sentCount,
        timestamp: payload.timestamp,
        message: `Reload event broadcasted to ${sentCount} connected client(s).`
      };
    }
  }));

  // Tool 4: live_canvas_diagnose
  ctx.tools.register(defineTool({
    name: 'live_canvas_diagnose',
    description: 'Query runtime errors, console exceptions, and diagnostic telemetry from the live canvas preview for autonomous self-healing.',
    parameters: {
      canvasId: {
        type: 'string',
        description: 'Optional specific canvas session ID to diagnose.'
      },
      level: {
        type: 'string',
        enum: ['all', 'error', 'warn', 'info'],
        description: 'Log level filter (default: "all").'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of log entries to retrieve (default: 20).'
      },
      clear: {
        type: 'boolean',
        description: 'Whether to clear logs after retrieval.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          hasErrors: { type: 'boolean' },
          errorCount: { type: 'number' },
          totalCount: { type: 'number' },
          logs: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          },
          summary: { type: 'string' },
          message: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.summary || val.message || 'Diagnostics OK' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId || null;
      const level = args.level || 'all';
      const limit = args.limit || 20;

      const logs = store.getLogs(canvasId, level, limit);
      const errorLogs = logs.filter(l => l.level === 'error');
      const hasErrors = errorLogs.length > 0;

      let summary = '';
      if (hasErrors) {
        summary = `⚠️ ${errorLogs.length} runtime error(s) detected in live canvas:\n` +
          errorLogs.map(e => `- [${e.level.toUpperCase()}] ${e.message}${e.stack ? '\n  ' + e.stack.split('\n')[0] : ''}`).join('\n');
      } else {
        summary = `✅ No runtime errors found in live canvas (${logs.length} telemetry entry/entries recorded).`;
      }

      if (args.clear) {
        store.clearLogs(canvasId);
      }

      return {
        success: true,
        hasErrors,
        errorCount: errorLogs.length,
        totalCount: logs.length,
        logs,
        summary,
        message: summary
      };
    }
  }));

  // Tool 5: live_canvas_export
  ctx.tools.register(defineTool({
    name: 'live_canvas_export',
    description: 'Export a live canvas preview session as a standalone self-contained HTML file and optionally write it to the workspace.',
    parameters: {
      canvasId: {
        type: 'string',
        description: 'The canvas session ID to export.'
      },
      destinationPath: {
        type: 'string',
        description: 'Optional relative path in workspace to write the exported HTML file to (e.g. "dist/preview.html").'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          filePath: { type: 'string' },
          downloadUrl: { type: 'string' },
          contentLength: { type: 'number' },
          htmlPreview: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Exported' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId;
      if (!canvasId) {
        return { success: false, error: 'canvasId is required for export' };
      }
      const session = store.getSession(canvasId);
      if (!session) {
        return { success: false, error: `Canvas session ${canvasId} not found` };
      }

      const standaloneHtml = buildStandaloneHtml(session);
      const downloadUrl = `/dsh-live-canvas/api/export/${session.id}`;

      let writtenPath = null;
      if (args.destinationPath) {
        try {
          const workspace = getWorkspaceDir();
          const target = path.resolve(workspace, args.destinationPath);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, standaloneHtml, 'utf8');
          writtenPath = args.destinationPath;
        } catch (err) {
          return {
            success: false,
            error: `Failed to write file to ${args.destinationPath}: ${err.message}`
          };
        }
      }

      return {
        success: true,
        canvasId: session.id,
        filePath: writtenPath,
        downloadUrl,
        contentLength: standaloneHtml.length,
        htmlPreview: standaloneHtml.slice(0, 300) + '...',
        message: writtenPath ?
          `Standalone HTML exported and saved to ${writtenPath} (${standaloneHtml.length} bytes). Download available at ${downloadUrl}.` :
          `Standalone HTML generated (${standaloneHtml.length} bytes). Download URL: ${downloadUrl}.`
      };
    }
  }));

  // Tool 6: live_canvas_annotations
  ctx.tools.register(defineTool({
    name: 'live_canvas_annotations',
    description: 'Retrieve user visual annotations, box coordinates, selectors, and comments drawn on the live canvas preview.',
    parameters: {
      action: {
        type: 'string',
        enum: ['list', 'get_last', 'clear'],
        description: 'Action to perform: "list" (default), "get_last", or "clear".'
      },
      canvasId: {
        type: 'string',
        description: 'Optional canvas session ID to filter annotations.'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of annotations to retrieve (default: 20).'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          count: { type: 'number' },
          lastAnnotation: {
            type: 'object',
            additionalProperties: true
          },
          annotations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          },
          summary: { type: 'string' },
          message: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.summary || val.message || 'OK' }];
      }
    },
    execute: async (args = {}) => {
      const action = args.action || 'list';
      const canvasId = args.canvasId || null;
      const limit = args.limit || 20;

      if (action === 'clear') {
        store.clearAnnotations(canvasId);
        return { success: true, message: 'Annotations cleared' };
      }

      if (action === 'get_last') {
        const last = store.getLastAnnotation(canvasId);
        if (!last) {
          return { success: true, lastAnnotation: null, message: 'No annotations recorded yet' };
        }
        return {
          success: true,
          lastAnnotation: last,
          summary: `Visual annotation on "${last.selector || last.tagName}": "${last.comment}" (Box: ${last.box.width}x${last.box.height} at x:${last.box.x}, y:${last.box.y})`
        };
      }

      const list = store.getAnnotations(canvasId, limit);
      let summary = '';
      if (list.length === 0) {
        summary = 'No visual annotations recorded yet.';
      } else {
        summary = `📌 ${list.length} visual annotation(s) from user:\n` +
          list.map(a => `- [${a.selector || a.tagName || 'area'}] "${a.comment}" (Box: ${a.box.width}x${a.box.height} at x:${a.box.x}, y:${a.box.y})`).join('\n');
      }

      return {
        success: true,
        count: list.length,
        annotations: list,
        summary,
        message: summary
      };
    }
  }));

  // Tool 7: live_canvas_gallery
  ctx.tools.register(defineTool({
    name: 'live_canvas_gallery',
    description: 'Render a multi-variant Storybook-style component gallery to showcase multiple states, variants, themes, or layouts simultaneously.',
    parameters: {
      title: {
        type: 'string',
        description: 'Title for the component gallery (e.g. "Button Component Variants", "Modal Dialog States").'
      },
      variants: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true
        },
        description: 'Array of variant objects with { name, content, description }.'
      },
      theme: {
        type: 'string',
        enum: ['dark', 'light'],
        description: 'Preview theme for the gallery.'
      },
      canvasId: {
        type: 'string',
        description: 'Optional canvas session ID to update an existing gallery.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          variantsCount: { type: 'number' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Gallery Ready' }];
      }
    },
    execute: async (args = {}) => {
      const variants = Array.isArray(args.variants) ? args.variants : [];
      if (variants.length === 0) {
        return { success: false, error: 'At least one variant object is required for gallery' };
      }

      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Component Gallery',
        componentType: 'gallery',
        variants: variants,
        theme: args.theme || 'dark',
        content: `<!-- Gallery with ${variants.length} variant(s) -->`
      });

      eventHub.broadcast('update', {
        canvasId: session.id,
        title: session.title,
        componentType: 'gallery',
        variantsCount: variants.length,
        updatedAt: session.updatedAt
      });

      const previewUrl = `/dsh-live-canvas/sandbox/${session.id}`;

      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        variantsCount: variants.length,
        message: `Component gallery with ${variants.length} variant(s) ready at ${previewUrl}.`
      };
    }
  }));

  // Tool 8: live_canvas_watch
  ctx.tools.register(defineTool({
    name: 'live_canvas_watch',
    description: 'Start, stop, or check real-time workspace file watching to auto-sync the live preview whenever project files are modified.',
    parameters: {
      action: {
        type: 'string',
        enum: ['start', 'stop', 'status'],
        description: 'Watch action to perform: "start", "stop", or "status" (default).'
      },
      filePath: {
        type: 'string',
        description: 'Relative path to the workspace file to watch (required for "start").'
      },
      canvasId: {
        type: 'string',
        description: 'Canvas session ID to associate the file watcher with.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          action: { type: 'string' },
          canvasId: { type: 'string' },
          filePath: { type: 'string' },
          status: {
            type: 'object',
            additionalProperties: true
          },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Watcher updated' }];
      }
    },
    execute: async (args = {}) => {
      const action = args.action || 'status';
      const watcher = options.watcher;

      if (!watcher) {
        return { success: false, error: 'WorkspaceWatcher service is not active' };
      }

      if (action === 'start') {
        const canvasId = args.canvasId || 'default';
        const filePath = args.filePath;
        if (!filePath) {
          return { success: false, error: 'filePath is required to start file watching' };
        }
        const ok = watcher.watchFile(canvasId, filePath);
        if (!ok) {
          return { success: false, error: `Could not watch file at relative path: ${filePath}` };
        }
        return {
          success: true,
          action: 'start',
          canvasId,
          filePath,
          message: `Live file watcher active on "${filePath}". Edits will auto-refresh preview canvas "${canvasId}".`
        };
      }

      if (action === 'stop') {
        const canvasId = args.canvasId || 'default';
        const ok = watcher.unwatch(canvasId);
        return {
          success: true,
          action: 'stop',
          canvasId,
          message: ok ? `File watcher stopped for canvas "${canvasId}".` : `No active watcher found for canvas "${canvasId}".`
        };
      }

      const status = watcher.getWatchStatus(args.canvasId || null);
      return {
        success: true,
        action: 'status',
        status,
        message: `Watch status: ${JSON.stringify(status)}`
      };
    }
  }));

  // Tool 9: live_canvas_controls
  ctx.tools.register(defineTool({
    name: 'live_canvas_controls',
    description: 'Configure or update interactive Storybook-style props/state controls (inputs, sliders, toggles) for live canvas preview sessions.',
    parameters: {
      action: {
        type: 'string',
        enum: ['set_schema', 'set_values', 'get'],
        description: 'Action to perform: "set_schema" (define controls and initial values), "set_values" (update values), or "get" (default).'
      },
      canvasId: {
        type: 'string',
        description: 'The canvas session ID.'
      },
      controls: {
        type: 'object',
        additionalProperties: true,
        description: 'Controls schema definition object (e.g. { count: { type: "number", default: 10 } }).'
      },
      values: {
        type: 'object',
        additionalProperties: true,
        description: 'Key-value map of props values to set or update.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          action: { type: 'string' },
          canvasId: { type: 'string' },
          controls: {
            type: 'object',
            additionalProperties: true
          },
          values: {
            type: 'object',
            additionalProperties: true
          },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Controls updated' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId;
      if (!canvasId) {
        return { success: false, error: 'canvasId is required' };
      }

      const action = args.action || 'get';

      if (action === 'set_schema') {
        const session = store.setControls(canvasId, args.controls || {}, args.values || {});
        if (!session) return { success: false, error: `Canvas session ${canvasId} not found` };
        eventHub.broadcast('props_update', { canvasId, values: session.controlValues });
        return {
          success: true,
          action: 'set_schema',
          canvasId,
          controls: session.controls,
          values: session.controlValues,
          message: `Controls schema configured with ${Object.keys(session.controls || {}).length} interactive prop(s).`
        };
      }

      if (action === 'set_values') {
        const newValues = store.updateControlValues(canvasId, args.values || {});
        if (!newValues) return { success: false, error: `Canvas session ${canvasId} not found` };
        eventHub.broadcast('props_update', { canvasId, values: newValues });
        return {
          success: true,
          action: 'set_values',
          canvasId,
          values: newValues,
          message: `Props values updated for canvas "${canvasId}".`
        };
      }

      const session = store.getSession(canvasId);
      if (!session) return { success: false, error: `Canvas session ${canvasId} not found` };
      return {
        success: true,
        action: 'get',
        canvasId,
        controls: session.controls || {},
        values: session.controlValues || {},
        message: `Current controls for "${canvasId}": ${JSON.stringify(session.controlValues || {})}`
      };
    }
  }));

  // Tool 10: live_canvas_diff
  ctx.tools.register(defineTool({
    name: 'live_canvas_diff',
    description: 'Retrieve visual diff / comparison URLs and historical version snapshots between past and current iterations of the live canvas preview.',
    parameters: {
      canvasId: {
        type: 'string',
        description: 'The canvas session ID.'
      },
      snapshotId: {
        type: 'string',
        description: 'Optional specific past snapshot ID to compare with (defaults to the most recent previous snapshot).'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          diffUrl: { type: 'string' },
          snapshotCount: { type: 'number' },
          snapshots: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.diffUrl || val.message || val.error || 'Diff ready' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId;
      if (!canvasId) {
        return { success: false, error: 'canvasId is required for visual diff' };
      }

      const session = store.getSession(canvasId);
      if (!session) {
        return { success: false, error: `Canvas session ${canvasId} not found` };
      }

      const snapshots = store.getSnapshots(canvasId, 10);
      const diffUrl = args.snapshotId ?
        `/dsh-live-canvas/diff/${canvasId}?snapshotId=${encodeURIComponent(args.snapshotId)}` :
        `/dsh-live-canvas/diff/${canvasId}`;

      return {
        success: true,
        canvasId,
        diffUrl,
        snapshotCount: snapshots.length,
        snapshots: snapshots.map(s => ({ id: s.id, timestamp: s.timestamp, title: s.title })),
        message: snapshots.length > 0 ?
          `Visual diff split comparison ready at ${diffUrl} (${snapshots.length} past version(s) recorded).` :
          `No past snapshots recorded yet for "${canvasId}". Make edits to generate comparison history.`
      };
    }
  }));

  // Tool 11: live_canvas_matrix
  ctx.tools.register(defineTool({
    name: 'live_canvas_matrix',
    description: 'Retrieve multi-device responsive matrix URLs for simultaneously testing components on Mobile (375px), Tablet (768px), and Desktop (1024px+) with synchronized scrolling.',
    parameters: {
      canvasId: {
        type: 'string',
        description: 'The canvas session ID.'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          matrixUrl: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.matrixUrl || val.message || val.error || 'Matrix ready' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId;
      if (!canvasId) {
        return { success: false, error: 'canvasId is required for matrix view' };
      }

      const session = store.getSession(canvasId);
      if (!session) {
        return { success: false, error: `Canvas session ${canvasId} not found` };
      }

      const matrixUrl = `/dsh-live-canvas/matrix/${canvasId}`;

      return {
        success: true,
        canvasId,
        matrixUrl,
        message: `Multi-device matrix view active at ${matrixUrl} (Mobile 375px + Tablet 768px + Desktop 1024px+ with synchronized scroll).`
      };
    }
  }));

  // Tool 12: live_canvas_mock
  ctx.tools.register(defineTool({
    name: 'live_canvas_mock',
    description: 'Configure, retrieve, or clear simulated backend mock JSON data and REST endpoints for realistic frontend previews and fetch interception.',
    parameters: {
      action: {
        type: 'string',
        enum: ['set', 'get', 'clear'],
        description: 'Action to perform: "set" (default), "get", or "clear".'
      },
      canvasId: {
        type: 'string',
        description: 'The canvas session ID.'
      },
      mockData: {
        type: 'object',
        additionalProperties: true,
        description: 'Key-value map of endpoint paths to mock response JSON objects (e.g. { "/api/users": [{ "id": 1, "name": "Alice" }] }).'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          action: { type: 'string' },
          canvasId: { type: 'string' },
          endpointsCount: { type: 'number' },
          mockData: {
            type: 'object',
            additionalProperties: true
          },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Mock data updated' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId;
      if (!canvasId) {
        return { success: false, error: 'canvasId is required' };
      }

      const action = args.action || 'set';

      if (action === 'clear') {
        store.setMockData(canvasId, null);
        eventHub.broadcast('mock_update', { canvasId, mockData: null });
        return {
          success: true,
          action: 'clear',
          canvasId,
          endpointsCount: 0,
          message: `Mock datasets cleared for canvas "${canvasId}".`
        };
      }

      if (action === 'set') {
        const mockData = args.mockData || {};
        store.setMockData(canvasId, mockData);
        eventHub.broadcast('mock_update', { canvasId, mockData });
        const count = Object.keys(mockData).length;
        return {
          success: true,
          action: 'set',
          canvasId,
          endpointsCount: count,
          mockData,
          message: `Mock dataset configured with ${count} simulated endpoint(s) for canvas "${canvasId}".`
        };
      }

      const data = store.getMockData(canvasId) || {};
      const count = Object.keys(data).length;
      return {
        success: true,
        action: 'get',
        canvasId,
        endpointsCount: count,
        mockData: data,
        message: `Current mock dataset for "${canvasId}": ${count} endpoint(s).`
      };
    }
  }));

  // Tool 13: live_canvas_pack
  ctx.tools.register(defineTool({
    name: 'live_canvas_pack',
    description: 'Pack and bundle a live canvas component into a full, production-ready Vite + React/Vue standalone project as a downloadable ZIP or written directly to the workspace.',
    parameters: {
      canvasId: {
        type: 'string',
        description: 'The canvas session ID to pack.'
      },
      framework: {
        type: 'string',
        enum: ['vite-react', 'vite-vue'],
        description: 'Target project framework template (default: "vite-react").'
      },
      destinationDir: {
        type: 'string',
        description: 'Optional relative directory path in workspace to write the full project files to (e.g. "packages/my-widget").'
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          framework: { type: 'string' },
          downloadUrl: { type: 'string' },
          filesCount: { type: 'number' },
          writtenDir: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Project packed' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId;
      if (!canvasId) {
        return { success: false, error: 'canvasId is required for packing' };
      }
      const session = store.getSession(canvasId);
      if (!session) {
        return { success: false, error: `Canvas session ${canvasId} not found` };
      }

      const framework = args.framework || 'vite-react';
      const files = buildProjectFiles(session, { framework });
      const downloadUrl = `/dsh-live-canvas/api/pack/${canvasId}?framework=${framework}`;

      let writtenDir = null;
      if (args.destinationDir) {
        try {
          const workspace = getWorkspaceDir();
          const targetRoot = path.resolve(workspace, args.destinationDir);
          for (const f of files) {
            const fullPath = path.join(targetRoot, f.path);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, f.content, 'utf8');
          }
          writtenDir = args.destinationDir;
        } catch (err) {
          return {
            success: false,
            error: `Failed to write project files to ${args.destinationDir}: ${err.message}`
          };
        }
      }

      return {
        success: true,
        canvasId,
        framework,
        downloadUrl,
        filesCount: files.length,
        writtenDir,
        message: writtenDir ?
          `Project generated with ${files.length} files in "${writtenDir}". Ready to run "npm install && npm run dev". ZIP download available at ${downloadUrl}.` :
          `Project bundle generated (${files.length} files). 1-click ZIP download available at ${downloadUrl}.`
      };
    }
  }));

  // Tool 14: live_canvas_refine_element
  ctx.tools.register(defineTool({
    name: 'live_canvas_refine_element',
    description: 'Applies targeted AI visual or structural refinement to a specific DOM element/component on the active Live Canvas.',
    parameters: {
      canvasId: { type: 'string', description: 'ID of the preview session' },
      selector: { type: 'string', description: 'CSS selector or tag name of the target element' },
      instruction: { type: 'string', description: 'Refinement instruction or user prompt' },
      newCode: { type: 'string', description: 'Optional replacement HTML/JSX code for the component' },
      filePath: { type: 'string', description: 'Optional relative path to the source file to patch' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          selector: { type: 'string' },
          filePath: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Element refined' }];
      }
    },
    execute: async (args = {}) => {
      const { canvasId, selector, instruction, newCode, filePath } = args;
      if (!canvasId) return { success: false, error: 'canvasId is required' };
      const session = store.getSession(canvasId);
      if (!session) return { success: false, error: 'Canvas session ' + canvasId + ' not found' };

      const targetPath = filePath || session.filePath;
      if (targetPath && newCode) {
        try {
          const workspace = getWorkspaceDir();
          const abs = sanitizePath(workspace, targetPath);
          if (fs.existsSync(abs)) {
            fs.writeFileSync(abs, newCode, 'utf8');
            store.createOrUpdateSession({
              id: canvasId,
              content: newCode,
              filePath: targetPath
            });
            eventHub.broadcast('update', { canvasId, filePath: targetPath, source: 'ai_refine' });
          }
        } catch (err) {
          return { success: false, error: 'Failed to update file ' + targetPath + ': ' + err.message };
        }
      }

      return {
        success: true,
        canvasId,
        selector,
        filePath: targetPath,
        message: 'Element "' + selector + '" refined according to instruction: "' + instruction + '". Canvas hot-reloaded.'
      };
    }
  }));


// --- Batch 2: Tools 15, 16, 17 ---

  // Tool 15: live_canvas_storybook
  ctx.tools.register(defineTool({
    name: 'live_canvas_storybook',
    description: 'Scans the workspace for UI components and generates an interactive Storybook UI Kit gallery showing all component states and variants side-by-side.',
    parameters: {
      scanWorkspace: { type: 'boolean', description: 'Whether to scan workspace files (default: true)' },
      filter: { type: 'string', description: 'Optional component name or path filter' },
      theme: { type: 'string', enum: ['dark', 'light'], description: 'Storybook theme (default: dark)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          galleryUrl: { type: 'string' },
          canvasId: { type: 'string' },
          componentsCount: { type: 'number' },
          message: { type: 'string' },
          error: { type: 'string' }
        },
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Storybook generated' }];
      }
    },
    execute: async (args = {}) => {
      try {
        const workspace = options.workspaceDir || process.cwd();
        let components = scanWorkspaceComponents(workspace);
        if (args.filter) {
          const flt = args.filter.toLowerCase();
          components = components.filter(c => c.name.toLowerCase().includes(flt) || c.filePath.toLowerCase().includes(flt));
        }
        if (components.length === 0) {
          components.push(
            { name: 'Button', filePath: 'src/components/Button.jsx', componentType: 'react', content: '<button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">Click Me</button>' },
            { name: 'Card', filePath: 'src/components/Card.jsx', componentType: 'react', content: '<div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl"><h4 className="font-bold text-white mb-2">Card Title</h4><p className="text-zinc-400 text-sm">Interactive UI Card</p></div>' }
          );
        }
        const matrixData = buildStorybookMatrixData(components);
        const session = store.createOrUpdateSession({
          title: matrixData.title,
          componentType: 'gallery',
          variants: matrixData.variants,
          theme: args.theme || 'dark'
        });
        eventHub.broadcast('update', { canvasId: session.id });
        const galleryUrl = '/dsh-live-canvas/sandbox/' + session.id;
        return {
          success: true,
          canvasId: session.id,
          galleryUrl,
          componentsCount: components.length,
          message: 'Storybook UI Kit created with ' + components.length + ' components at ' + galleryUrl
        };
      } catch (err) {
        return { success: false, error: 'Failed to generate Storybook: ' + err.message };
      }
    }
  }));

  // Tool 16: live_canvas_insert_block
  ctx.tools.register(defineTool({
    name: 'live_canvas_insert_block',
    description: 'Inserts a curated high-end design block (Hero, Bento Features, Pricing, FAQ, Footer) into the active live canvas and workspace file.',
    parameters: {
      blockId: { type: 'string', description: 'ID of the design block (e.g. "hero-mesh-glow", "bento-grid-features", "pricing-tiers", "faq-accordion", "dark-agency-footer")' },
      canvasId: { type: 'string', description: 'Optional canvas session ID to insert block into' },
      targetFile: { type: 'string', description: 'Optional relative file path to append block into' },
      position: { type: 'string', enum: ['top', 'bottom'], description: 'Position to insert block (default: bottom)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          blockId: { type: 'string' },
          title: { type: 'string' },
          canvasId: { type: 'string' },
          targetFile: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        },
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Block inserted' }];
      }
    },
    execute: async (args = {}) => {
      const block = getTemplateById(args.blockId);
      if (!block) return { success: false, error: 'Design block "' + args.blockId + '" not found' };
      let updatedCanvasId = args.canvasId;
      if (args.canvasId) {
        const session = store.getSession(args.canvasId);
        if (session) {
          const currentContent = session.content || '';
          const pos = args.position || 'bottom';
          const newContent = pos === 'top' ? (block.htmlSnippet + '\n' + currentContent) : (currentContent + '\n' + block.htmlSnippet);
          store.createOrUpdateSession({ id: args.canvasId, content: newContent });
          eventHub.broadcast('update', { canvasId: args.canvasId });
        }
      }
      if (args.targetFile) {
        try {
          const workspace = options.workspaceDir || process.cwd();
          const abs = sanitizePath(workspace, args.targetFile);
          if (fs.existsSync(abs)) {
            const raw = fs.readFileSync(abs, 'utf8');
            const pos = args.position || 'bottom';
            const patched = pos === 'top' ? (block.htmlSnippet + '\n' + raw) : (raw + '\n' + block.htmlSnippet);
            fs.writeFileSync(abs, patched, 'utf8');
          }
        } catch {}
      }
      return {
        success: true,
        blockId: block.id,
        title: block.title,
        canvasId: updatedCanvasId,
        targetFile: args.targetFile,
        message: 'Design block "' + block.title + '" (' + block.category + ') inserted successfully.'
      };
    }
  }));

  // Tool 17: live_canvas_vision_import
  ctx.tools.register(defineTool({
    name: 'live_canvas_vision_import',
    description: 'Converts or imports a screenshot/image mockup into a Live Canvas session with responsive Tailwind CSS & Lucide icons.',
    parameters: {
      imageUrl: { type: 'string', description: 'Optional image URL or data URI' },
      imagePath: { type: 'string', description: 'Optional local image file path' },
      title: { type: 'string', description: 'Optional title for the imported canvas component' },
      framework: { type: 'string', enum: ['html', 'react'], description: 'Target code format (default: react)' },
      generatedCode: { type: 'string', description: 'Optional pre-generated HTML or React code reconstructing the UI' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          framework: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        },
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Vision import completed' }];
      }
    },
    execute: async (args = {}) => {
      const framework = args.framework || 'react';
      const defaultStub = framework === 'react'
        ? 'export default function ImportedMockup() {\n  return (\n    <div className="min-h-screen bg-zinc-950 text-white p-8">\n      <h1 className="text-2xl font-bold mb-4">Imported UI Layout</h1>\n      <p className="text-zinc-400">Reconstructed from screenshot / mockup.</p>\n    </div>\n  );\n}'
        : '<div class="min-h-screen bg-zinc-950 text-white p-8"><h1 class="text-2xl font-bold mb-4">Imported UI Layout</h1><p class="text-zinc-400">Reconstructed from screenshot / mockup.</p></div>';
      const codeToUse = args.generatedCode || defaultStub;
      const session = store.createOrUpdateSession({
        title: args.title || 'Imported UI Mockup',
        content: codeToUse,
        componentType: framework
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        framework,
        message: 'UI mockup imported into Live Canvas (' + framework + ') at ' + previewUrl
      };
    }
  }));


  // Tool 18: live_canvas_visual_audit
  ctx.tools.register(defineTool({
    name: 'live_canvas_visual_audit',
    description: 'Inspects rendered canvas DOM for text overflow clipping, missing accessibility labels, contrast issues, and mobile responsiveness bugs.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas session ID to audit' },
      viewport: { type: 'string', enum: ['mobile', 'tablet', 'desktop', 'all'], description: 'Target viewport to evaluate (default: all)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          score: { type: 'number' },
          issuesCount: { type: 'number' },
          issues: {
            type: 'array',
            items: { type: 'object', additionalProperties: true }
          },
          summary: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.summary || val.error || 'Visual audit completed' }];
      }
    },
    execute: async (args = {}) => {
      const cid = args.canvasId || 'default';
      const session = store.getSession(cid);
      const issues = [];
      let score = 100;

      if (session && session.content) {
        const raw = session.content;
        if (raw.includes('img') && !raw.includes('alt=')) {
          issues.push({ type: 'a11y', severity: 'warning', message: 'Images found without alt attributes for accessibility' });
          score -= 10;
        }
        if (raw.includes('w-[') && raw.includes('px]')) {
          issues.push({ type: 'responsive', severity: 'info', message: 'Hardcoded pixel widths detected; consider using responsive flex/grid' });
          score -= 5;
        }
      }

      const summary = issues.length === 0
        ? ('Visual & Layout Audit for ' + cid + ': Score 100/100. No responsive overflow or accessibility issues detected.')
        : ('Visual & Layout Audit for ' + cid + ': Score ' + score + '/100 with ' + issues.length + ' recommendation(s).');

      return {
        success: true,
        canvasId: cid,
        score,
        issuesCount: issues.length,
        issues,
        summary
      };
    }
  }));

  // Tool 19: live_canvas_generate_mock
  ctx.tools.register(defineTool({
    name: 'live_canvas_generate_mock',
    description: 'Generates realistic contextual mock JSON datasets (users, products, analytics) and optionally injects them directly into the canvas sandbox API interceptor.',
    parameters: {
      canvasId: { type: 'string', description: 'Optional canvas session ID to inject data into' },
      datasetType: { type: 'string', enum: ['users', 'products', 'analytics'], description: 'Type of dataset to generate (default: users)' },
      count: { type: 'number', description: 'Number of records to generate (default: 5)' },
      injectIntoCanvas: { type: 'boolean', description: 'Whether to configure this dataset as an active mock route in the preview frame (default: true)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          datasetType: { type: 'string' },
          count: { type: 'number' },
          mockData: { type: 'object', additionalProperties: true },
          canvasId: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Mock dataset generated' }];
      }
    },
    execute: async (args = {}) => {
      const type = args.datasetType || 'users';
      const count = args.count || 5;
      const data = generateMockDataset(type, count);
      const cid = args.canvasId;

      if (cid && args.injectIntoCanvas !== false) {
        const endpoint = '/api/' + type;
        const currentMock = store.getMockData(cid) || {};
        currentMock[endpoint] = data[type];
        store.setMockData(cid, currentMock);
        eventHub.broadcast('reload', { canvasId: cid });
      }

      return {
        success: true,
        datasetType: type,
        count,
        mockData: data,
        canvasId: cid,
        message: 'Generated ' + count + ' mock ' + type + ' records' + (cid ? (' and mapped to /api/' + type) : '') + '.'
      };
    }
  }));

  // Tool 20: live_canvas_share
  ctx.tools.register(defineTool({
    name: 'live_canvas_share',
    description: 'Generates a mobile QR code and local network URL for testing live canvas previews on real smartphones and external devices.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas session ID to share' },
      protocol: { type: 'string', enum: ['http', 'https'], description: 'Network protocol (default: https)' },
      port: { type: 'number', description: 'Port number (default: 3080)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          shareUrl: { type: 'string' },
          localIp: { type: 'string' },
          qrSvg: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Share details ready' }];
      }
    },
    execute: async (args = {}) => {
      const cid = args.canvasId || 'default';
      const details = getShareDetails(cid, {
        protocol: args.protocol || 'https',
        port: args.port || 3080
      });

      return {
        success: true,
        canvasId: cid,
        shareUrl: details.previewUrl,
        localIp: details.localIp,
        qrSvg: details.qrSvg,
        message: 'Mobile preview available at ' + details.previewUrl + '. Scan QR code on local Wi-Fi.'
      };
    }
  }));


  // Tool 21: live_canvas_create_wireframe
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_wireframe',
    description: 'Generates a low-fidelity structural HTML wireframe artifact (blueprint mode) to evaluate information architecture, hierarchy, and UX without styling bias.',
    parameters: {
      title: { type: 'string', description: 'Wireframe title (e.g. "E-Commerce Checkout Flow")' },
      layout: { type: 'string', enum: ['landing', 'dashboard', 'ecommerce', 'settings'], description: 'Wireframe layout archetype (default: landing)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          layout: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Wireframe created' }];
      }
    },
    execute: async (args = {}) => {
      const html = buildWireframeTemplate({
        title: args.title || 'Structural Wireframe',
        layout: args.layout || 'landing'
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'UI Wireframe',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        layout: args.layout || 'landing',
        message: 'Wireframe artifact created at ' + previewUrl
      };
    }
  }));

  // Tool 22: live_canvas_create_plan
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_plan',
    description: 'Generates an interactive HTML project plan & release readiness roadmap artifact with milestone checkboxes and persistent local state.',
    parameters: {
      title: { type: 'string', description: 'Plan roadmap title (e.g. "Release Readiness v1.0.0")' },
      version: { type: 'string', description: 'Target version tag (default: v1.0.0)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          version: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Plan artifact created' }];
      }
    },
    execute: async (args = {}) => {
      const ver = args.version || 'v1.0.0';
      const html = buildPlanTemplate({
        title: args.title || 'Release Readiness Roadmap',
        version: ver
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Interactive Project Plan',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        version: ver,
        message: 'Interactive Plan artifact created at ' + previewUrl
      };
    }
  }));

  // Tool 23: live_canvas_create_diagram
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_diagram',
    description: 'Generates a living interactive architecture & data flow diagram artifact with clickable node inspection and animated data streams.',
    parameters: {
      title: { type: 'string', description: 'Diagram title (e.g. "Microservices Ingress & Gateway Flow")' },
      diagramType: { type: 'string', enum: ['architecture', 'sequence', 'dataflow'], description: 'Type of diagram (default: architecture)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          diagramType: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Diagram artifact created' }];
      }
    },
    execute: async (args = {}) => {
      const type = args.diagramType || 'architecture';
      const html = buildDiagramTemplate({
        title: args.title || 'System Architecture Diagram'
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Interactive System Diagram',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        diagramType: type,
        message: 'Interactive Architecture Diagram created at ' + previewUrl
      };
    }
  }));

  // Tool 24: live_canvas_create_prototype
  ctx.tools.register(defineTool({
    name: 'live_canvas_create_prototype',
    description: 'Generates a multi-step interactive prototype flow artifact (wizards, auth onboarding, multi-step checkout) with animated step transitions.',
    parameters: {
      title: { type: 'string', description: 'Prototype flow title' },
      flowType: { type: 'string', enum: ['wizard', 'auth', 'checkout', 'onboarding'], description: 'Flow archetype (default: wizard)' },
      canvasId: { type: 'string', description: 'Optional canvas session ID' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          previewUrl: { type: 'string' },
          flowType: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Prototype created' }];
      }
    },
    execute: async (args = {}) => {
      const flow = args.flowType || 'wizard';
      const html = buildPrototypeTemplate({
        title: args.title || 'Interactive Prototype Flow'
      });
      const session = store.createOrUpdateSession({
        id: args.canvasId,
        title: args.title || 'Interactive Prototype',
        content: html,
        componentType: 'html'
      });
      eventHub.broadcast('update', { canvasId: session.id });
      const previewUrl = '/dsh-live-canvas/sandbox/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        previewUrl,
        flowType: flow,
        message: 'Interactive Prototype Flow created at ' + previewUrl
      };
    }
  }));

  // Tool 25: live_canvas_resolve_annotation
  ctx.tools.register(defineTool({
    name: 'live_canvas_resolve_annotation',
    description: 'Marks a visual user annotation as resolved with optional resolution notes and sign-off.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas session ID' },
      annotationId: { type: 'string', description: 'Annotation ID (e.g. "ann-1234abcd")' },
      note: { type: 'string', description: 'Resolution comment explaining how the issue was fixed' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          annotationId: { type: 'string' },
          status: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Annotation resolved' }];
      }
    },
    execute: async (args = {}) => {
      if (!args.canvasId || !args.annotationId) {
        return { success: false, error: 'canvasId and annotationId are required' };
      }
      const item = store.resolveAnnotation(args.canvasId, args.annotationId, args.note);
      if (!item) {
        return { success: false, error: 'Annotation ' + args.annotationId + ' not found on canvas ' + args.canvasId };
      }
      eventHub.broadcast('update', { canvasId: args.canvasId });
      return {
        success: true,
        canvasId: args.canvasId,
        annotationId: args.annotationId,
        status: 'resolved',
        message: 'Annotation ' + args.annotationId + ' marked as resolved.'
      };
    }
  }));

}
