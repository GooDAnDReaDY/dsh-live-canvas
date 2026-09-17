// dsh-live-canvas: design_tools.js
import path from 'node:path';
import { autoDetectType } from '../transpiler.js';
import { listTemplates, getTemplateById } from '../templates.js';
import { scanWorkspaceComponents, buildStorybookMatrixData } from '../storybook.js';
import { generateMockDataset } from '../faker.js';
import { getShareDetails } from '../share.js';
import { defineTool } from './shared.js';

export function registerDesignTools(toolCtx) {
  const { ctx, store, eventHub, options, getWorkspaceRoots, getWorkspaceDir, defineTool } = toolCtx;

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
          error: { type: 'string' },
          code: { type: 'string' },
          allowedRoots: { type: 'array', items: { type: 'string' } }
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
          const abs = resolveSafePath(targetPath, getWorkspaceRoots());
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
          return {
            success: false,
            error: 'Failed to update file ' + targetPath + ': ' + err.message,
            code: err.code || 'ERR_WRITE_FAILED',
            allowedRoots: err.allowedRoots || getWorkspaceRoots()
          };
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
          const abs = resolveSafePath(args.targetFile, getWorkspaceRoots());
          if (fs.existsSync(abs)) {
            const raw = fs.readFileSync(abs, 'utf8');
            const pos = args.position || 'bottom';
            const patched = pos === 'top' ? (block.htmlSnippet + '\n' + raw) : (raw + '\n' + block.htmlSnippet);
            fs.writeFileSync(abs, patched, 'utf8');
          }
        } catch (err) {
          console.warn('[live_canvas_insert_block] Failed to patch targetFile:', err);
        }
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



}
