// dsh-live-canvas: agent tools definitions and handlers.
import fs from 'node:fs';
import path from 'node:path';
import { autoDetectType, buildStandaloneHtml } from './transpiler.js';

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
        enum: ['responsive', 'mobile', 'tablet', 'desktop'],
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
}

