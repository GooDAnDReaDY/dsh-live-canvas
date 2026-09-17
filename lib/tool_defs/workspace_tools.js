// dsh-live-canvas: workspace_tools.js
import fs from 'node:fs';
import path from 'node:path';
import { buildProjectFiles } from '../packager.js';
import { resolveSafePath } from '../sandbox.js';
import { defineTool } from './shared.js';

export function registerWorkspaceTools(toolCtx) {
  const { ctx, store, eventHub, options, getWorkspaceRoots, getWorkspaceDir, defineTool } = toolCtx;

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
          error: { type: 'string' },
          code: { type: 'string' },
          allowedRoots: { type: 'array', items: { type: 'string' } }
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
          const roots = getWorkspaceRoots();
          const targetRoot = resolveSafePath(args.destinationDir, roots);
          for (const f of files) {
            const fullPath = resolveSafePath(path.join(args.destinationDir, f.path), roots);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, f.content, 'utf8');
          }
          writtenDir = args.destinationDir;
        } catch (err) {
          return {
            success: false,
            error: `Failed to write project files to ${args.destinationDir}: ${err.message}`,
            code: err.code || 'ERR_WRITE_FAILED',
            allowedRoots: err.allowedRoots || getWorkspaceRoots()
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


}
