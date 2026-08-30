// dsh-live-canvas: agent tools definitions and handlers.
import fs from 'node:fs';
import path from 'node:path';
import { autoDetectType } from './transpiler.js';

export function registerLiveCanvasTools(ctx, store, eventHub, options = {}) {
  const getWorkspaceDir = () => {
    return options.workspaceDir || process.cwd();
  };

  // Tool 1: live_canvas_preview
  ctx.tools.register({
    name: 'live_canvas_preview',
    description: 'Render or update an interactive live canvas preview for HTML, React JSX, SVG, Mermaid diagram, or Markdown content.',
    parameters: {
      type: 'object',
      properties: {
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
          enum: ['html', 'react', 'svg', 'mermaid', 'markdown', 'auto'],
          description: 'Type of component being previewed. Defaults to "auto" detection.'
        },
        viewport: {
          type: 'string',
          enum: ['responsive', 'mobile', 'tablet', 'desktop'],
          description: 'Target viewport layout for the preview.'
        },
        canvasId: {
          type: 'string',
          description: 'Optional canvas session ID to update an existing preview instead of creating a new one.'
        },
        customCss: {
          type: 'string',
          description: 'Optional extra CSS styles to inject into the canvas.'
        },
        customJs: {
          type: 'string',
          description: 'Optional extra JavaScript code to execute inside the canvas.'
        }
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
        filePath: filePath || null,
        customCss: args.customCss || '',
        customJs: args.customJs || ''
      });

      // Broadcast update to all connected SSE clients
      eventHub.broadcast('update', {
        canvasId: session.id,
        title: session.title,
        componentType: session.componentType,
        viewport: session.viewport,
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
        message: `Live preview ready at ${previewUrl}. SSE hot-reload is active.`
      };
    }
  });

  // Tool 2: live_canvas_inspect
  ctx.tools.register({
    name: 'live_canvas_inspect',
    description: 'Retrieve user click inspection data, DOM selectors, attributes, and text from the live canvas preview.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get_last', 'list', 'clear'],
          description: 'Action to perform: "get_last" (default), "list", or "clear".'
        },
        canvasId: {
          type: 'string',
          description: 'Optional canvas session ID to filter inspections.'
        }
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
  });

  // Tool 3: live_canvas_reload
  ctx.tools.register({
    name: 'live_canvas_reload',
    description: 'Broadcast a hot-reload or refresh signal to active preview canvases.',
    parameters: {
      type: 'object',
      properties: {
        canvasId: {
          type: 'string',
          description: 'Optional specific canvas ID to reload. If omitted, reloads all active canvases.'
        },
        reason: {
          type: 'string',
          description: 'Optional explanation of why the reload was triggered.'
        }
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
  });
}