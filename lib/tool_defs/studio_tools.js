// dsh-live-canvas: studio_tools.js
import { autoDetectType, buildStandaloneHtml } from '../transpiler.js';
import { getThemeById } from '../themes.js';
import { buildTimeTravelViewer } from '../timetravel.js';
import { buildDeploymentBundle } from '../deploy.js';
import { convertSvgToTailwind, exportComponentToFigmaSvg } from '../figma.js';
import { SOUND_PRESETS } from '../sound.js';
import { defineTool } from './shared.js';

export function registerStudioTools(toolCtx) {
  const { ctx, store, eventHub, options, getWorkspaceRoots, getWorkspaceDir, defineTool } = toolCtx;

  // Tool 27: live_canvas_timetravel
  ctx.tools.register(defineTool({
    name: 'live_canvas_timetravel',
    description: 'Interactive time-travel debugger: view history snapshots, step back and forth across iterations, or restore a previous revision.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas session ID' },
      action: { type: 'string', enum: ['list', 'view', 'restore'], description: 'Time-travel action (default: view)' },
      snapshotIndex: { type: 'integer', description: 'Snapshot index to restore or inspect' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          action: { type: 'string' },
          timetravelUrl: { type: 'string' },
          snapshotsCount: { type: 'integer' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Time-travel executed' }];
      }
    },
    execute: async (args = {}) => {
      const session = store.getSession(args.canvasId) || store.getLatestSession();
      if (!session) return { success: false, error: 'No active canvas session found' };

      const snapshots = store.getSnapshots(session.id);
      const action = args.action || 'view';

      if (action === 'restore' && typeof args.snapshotIndex === 'number') {
        const targetSnap = snapshots[args.snapshotIndex];
        if (targetSnap) {
          store.createOrUpdateSession({ id: session.id, content: targetSnap.content });
          eventHub.broadcast('update', { canvasId: session.id });
          return {
            success: true,
            canvasId: session.id,
            action: 'restore',
            snapshotsCount: snapshots.length,
            message: 'Restored snapshot #' + (args.snapshotIndex + 1) + ' to canvas ' + session.id
          };
        }
      }

      const timetravelUrl = '/dsh-live-canvas/timetravel/' + session.id;
      return {
        success: true,
        canvasId: session.id,
        action,
        timetravelUrl,
        snapshotsCount: snapshots.length,
        message: 'Time-travel timeline available at ' + timetravelUrl + ' (' + snapshots.length + ' revisions)'
      };
    }
  }));


  // Tool 28: live_canvas_instant_deploy
  ctx.tools.register(defineTool({
    name: 'live_canvas_instant_deploy',
    description: 'Generates ready-to-deploy configuration and bundle for Vercel, Cloudflare Pages, Netlify, or GitHub Gist.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas session ID' },
      target: { type: 'string', enum: ['vercel', 'cloudflare', 'netlify', 'gist'], description: 'Deployment target (default: vercel)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          target: { type: 'string' },
          instructions: { type: 'string' },
          downloadUrl: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Deployment bundle generated' }];
      }
    },
    execute: async (args = {}) => {
      const session = store.getSession(args.canvasId) || store.getLatestSession();
      if (!session) return { success: false, error: 'No canvas session found to deploy' };

      const target = args.target || 'vercel';
      const bundle = buildDeploymentBundle({ session, target });
      const downloadUrl = '/dsh-live-canvas/api/deploy?canvasId=' + session.id + '&target=' + target;

      return {
        success: true,
        canvasId: session.id,
        target,
        instructions: bundle.instructions,
        downloadUrl,
        message: 'Instant ' + target.toUpperCase() + ' deployment bundle ready. ' + bundle.instructions
      };
    }
  }));


  // Tool 29: live_canvas_figma_bridge
  ctx.tools.register(defineTool({
    name: 'live_canvas_figma_bridge',
    description: 'Bi-directional vector bridge: convert Figma/Penpot SVG code into clean Tailwind components, or export canvas components to Figma-ready SVG.',
    parameters: {
      svg: { type: 'string', description: 'Raw SVG markup copied from Figma/Penpot' },
      action: { type: 'string', enum: ['import_svg', 'export_figma'], description: 'Bridge action (default: import_svg)' },
      canvasId: { type: 'string', description: 'Canvas session ID for export' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          action: { type: 'string' },
          canvasId: { type: 'string' },
          componentName: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Figma bridge executed' }];
      }
    },
    execute: async (args = {}) => {
      const action = args.action || 'import_svg';

      if (action === 'export_figma') {
        const session = store.getSession(args.canvasId) || store.getLatestSession();
        if (!session) return { success: false, error: 'No active session found to export' };
        const exported = exportComponentToFigmaSvg(session);
        return {
          success: true,
          action: 'export_figma',
          canvasId: session.id,
          message: 'Figma-ready SVG vector generated for canvas ' + session.id
        };
      }

      if (!args.svg) return { success: false, error: 'SVG markup is required for import_svg' };
      try {
        const converted = convertSvgToTailwind(args.svg);
        const session = store.createOrUpdateSession({
          id: args.canvasId,
          title: 'Figma Vector Import',
          content: converted.html,
          componentType: 'html'
        });
        eventHub.broadcast('update', { canvasId: session.id });
        return {
          success: true,
          action: 'import_svg',
          canvasId: session.id,
          componentName: converted.componentName,
          message: 'Figma SVG converted to responsive Tailwind component on canvas ' + session.id
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  }));


  // Tool 30: live_canvas_sound_fx
  ctx.tools.register(defineTool({
    name: 'live_canvas_sound_fx',
    description: 'Lists and plays synthesized Web Audio UI sound effects for tactical feedback (click, tap, success, error, modal, levelup).',
    parameters: {
      action: { type: 'string', enum: ['list_presets', 'preview_sound'], description: 'Sound action (default: list_presets)' },
      soundType: { type: 'string', enum: ['click', 'tap', 'success', 'error', 'modal', 'levelup'], description: 'Sound preset type' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          action: { type: 'string' },
          soundType: { type: 'string' },
          presetsCount: { type: 'integer' },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Sound FX action completed' }];
      }
    },
    execute: async (args = {}) => {
      const action = args.action || 'list_presets';
      const soundType = args.soundType || 'success';
      const keys = Object.keys(SOUND_PRESETS);

      return {
        success: true,
        action,
        soundType,
        presetsCount: keys.length,
        message: 'UI Sound engine loaded: ' + keys.join(', ') + '. Preset selected: ' + soundType
      };
    }
  }));


  // Tool: live_canvas_capture_snapshot

  ctx.tools.register(defineTool({
    name: 'live_canvas_capture_snapshot',
    description: 'Capture a rendered snapshot, DOM structure, and visual telemetry of a live canvas session for multimodal agent verification and iterative UI refinement.',
    parameters: {
      canvasId: { type: 'string', description: 'Canvas or session identifier (optional, defaults to active session)' },
      format: { type: 'string', enum: ['html', 'dom', 'metadata'], description: 'Snapshot format: html (complete standalone HTML document), dom (DOM hierarchy and tags), or metadata (session info and dimensions)' }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          success: { type: 'boolean' },
          canvasId: { type: 'string' },
          format: { type: 'string' },
          componentType: { type: 'string' },
          title: { type: 'string' },
          snapshotLength: { type: 'integer' },
          snapshotSnippet: { type: 'string' },
          metadata: { type: 'object', additionalProperties: true },
          message: { type: 'string' },
          error: { type: 'string' }
        }
      },
      render(_args, val) {
        return [{ type: 'text', text: val.message || val.error || 'Live Canvas snapshot captured.' }];
      }
    },
    execute: async (args = {}) => {
      const canvasId = args.canvasId || (store.getActiveSessionId ? store.getActiveSessionId() : 'default');
      const format = args.format || 'html';
      let session = store.getSession(canvasId);
      if (!session && store.getLatestSession) {
        session = store.getLatestSession();
      }
      if (!session) {
        return {
          success: true,
          canvasId,
          format,
          componentType: 'html',
          title: 'Empty Canvas',
          snapshotLength: 0,
          snapshotSnippet: '',
          metadata: { isEmpty: true, canvasId },
          message: `No active session found for "${canvasId}"; blank snapshot generated.`
        };
      }
      const content = session.content || session.code || '';
      const compType = session.componentType || session.type || 'html';

      if (format === 'metadata') {
        return {
          success: true,
          canvasId,
          format,
          componentType: compType,
          title: session.title || 'Untitled',
          metadata: {
            updatedAt: session.updatedAt || Date.now(),
            viewport: session.viewport || 'responsive',
            theme: session.theme || 'default',
            contentLength: content.length
          },
          message: `Metadata snapshot for "${canvasId}" retrieved (${content.length} chars).`
        };
      }

      if (format === 'dom') {
        const tagMatches = Array.from(content.matchAll(/<([a-zA-Z0-9_-]+)[^>]*>/g)).map(m => m[1]);
        return {
          success: true,
          canvasId,
          format,
          componentType: compType,
          title: session.title || 'Untitled',
          snapshotLength: tagMatches.length,
          snapshotSnippet: tagMatches.slice(0, 20).join(' > '),
          metadata: { totalTags: tagMatches.length, topLevelTags: tagMatches.slice(0, 10) },
          message: `DOM structure snapshot for "${canvasId}" captured (${tagMatches.length} tags).`
        };
      }

      // format === 'html'
      const standalone = buildStandaloneHtml(content, compType, session.theme);
      return {
        success: true,
        canvasId,
        format,
        componentType: compType,
        title: session.title || 'Untitled',
        snapshotLength: standalone.length,
        snapshotSnippet: standalone.slice(0, 1200),
        message: `HTML snapshot for "${canvasId}" captured successfully (${standalone.length} bytes).`
      };
    }
  }));

}
