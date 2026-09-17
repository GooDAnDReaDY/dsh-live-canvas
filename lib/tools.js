// dsh-live-canvas: agent tools registration and domain orchestrator.
import path from 'node:path';
import { defineTool } from './tool_defs/shared.js';
import { registerPreviewTools } from './tool_defs/preview_tools.js';
import { registerWorkspaceTools } from './tool_defs/workspace_tools.js';
import { registerDesignTools } from './tool_defs/design_tools.js';
import { registerGeneratorTools } from './tool_defs/generator_tools.js';
import { registerStudioTools } from './tool_defs/studio_tools.js';

export { defineTool } from './tool_defs/shared.js';

/**
 * Registers all 31 agent tools conforming to the DSH Agent Tools specification.
 * Organized across modular domain namespaces under lib/tool_defs/.
 */
export function registerLiveCanvasTools(ctx, store, eventHub, options = {}) {
  const getWorkspaceRoots = () => {
    const raw = options.workspaceRoots || [options.workspaceDir || process.cwd()];
    const roots = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(r => path.resolve(r));
    return roots.length > 0 ? roots : [process.cwd()];
  };

  const getWorkspaceDir = () => {
    return getWorkspaceRoots()[0];
  };

  const toolCtx = {
    ctx,
    store,
    eventHub,
    options,
    getWorkspaceRoots,
    getWorkspaceDir,
    defineTool
  };

  registerPreviewTools(toolCtx);
  registerWorkspaceTools(toolCtx);
  registerDesignTools(toolCtx);
  registerGeneratorTools(toolCtx);
  registerStudioTools(toolCtx);
}
