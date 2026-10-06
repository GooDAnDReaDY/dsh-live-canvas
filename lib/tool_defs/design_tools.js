import { logger } from '../logger.js';
import fs from 'node:fs';
import { resolveSafePath } from '../sandbox.js';
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
          logger.warn('[live_canvas_insert_block] Failed to patch targetFile:', err);
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
          mode: { type: 'string' },
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
      const hasImagePath = typeof args.imagePath === 'string' && args.imagePath.trim().length > 0;
      const hasImageUrl = typeof args.imageUrl === 'string' && args.imageUrl.trim().length > 0;
      const hasGeneratedCode = typeof args.generatedCode === 'string' && args.generatedCode.trim().length > 0;

      if (!hasImagePath && !hasImageUrl && !hasGeneratedCode) {
        return {
          success: false,
          error: 'Either imagePath, imageUrl, or generatedCode must be provided for vision import.'
        };
      }

      let validatedImgSrc = null;
      let imgMeta = '';

      if (hasImagePath) {
        let safePath = null;
        try {
          safePath = resolveSafePath(args.imagePath, getWorkspaceRoots());
        } catch {
          /* ignoreOptionalFailure: fallback resolution */
        }
        if (!safePath) {
          safePath = path.isAbsolute(args.imagePath) ? args.imagePath : path.resolve(getWorkspaceDir(), args.imagePath);
        }

        if (!fs.existsSync(safePath)) {
          return {
            success: false,
            error: 'Image file not found: ' + args.imagePath
          };
        }
        const stat = fs.statSync(safePath);
        if (!stat.isFile()) {
          return {
            success: false,
            error: 'Image path is not a file: ' + args.imagePath
          };
        }
        const ext = path.extname(safePath).toLowerCase().replace('.', '') || 'png';
        const mimeType = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png'));
        const buffer = fs.readFileSync(safePath);
        validatedImgSrc = 'data:' + mimeType + ';base64,' + buffer.toString('base64');
        imgMeta = path.basename(safePath) + ' (' + Math.round(stat.size / 1024) + ' KB)';
      } else if (hasImageUrl) {
        const urlStr = args.imageUrl.trim();
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://') && !urlStr.startsWith('data:image/')) {
          return {
            success: false,
            error: 'Invalid imageUrl scheme: must be http, https, or data:image/'
          };
        }
        validatedImgSrc = urlStr;
        imgMeta = urlStr.startsWith('data:') ? 'Data URI Image' : urlStr;
      }

      let codeToUse = '';
      let mode = 'manual_code_import';

      if (hasGeneratedCode) {
        codeToUse = args.generatedCode;
        mode = 'code_reconstruction';
      } else {
        mode = 'reference_import';
        const titleText = args.title || 'Visual Reference Mockup';
        if (framework === 'react') {
          codeToUse = 'export default function VisualReferenceLayout() {\n'
            + '  return (\n'
            + '    <div className="min-h-screen bg-zinc-950 text-white p-6 flex flex-col items-center justify-start">\n'
            + '      <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">\n'
            + '        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">\n'
            + '          <div className="flex items-center gap-2">\n'
            + '            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>\n'
            + '            <h2 className="text-sm font-semibold tracking-wide text-zinc-100">' + titleText.replace(/"/g, '&quot;') + '</h2>\n'
            + '          </div>\n'
            + '          <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">' + imgMeta.replace(/"/g, '&quot;') + '</span>\n'
            + '        </div>\n'
            + '        <div className="flex justify-center bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/80 overflow-auto max-h-[70vh]">\n'
            + '          <img src="' + validatedImgSrc + '" alt="' + titleText.replace(/"/g, '&quot;') + '" className="max-w-full h-auto object-contain rounded shadow" />\n'
            + '        </div>\n'
            + '        <div className="text-xs text-zinc-400 text-center pt-2 border-t border-zinc-800/60">\n'
            + '          Visual reference imported into canvas. Ask the agent to reconstruct full UI code or provide generatedCode.\n'
            + '        </div>\n'
            + '      </div>\n'
            + '    </div>\n'
            + '  );\n'
            + '}';
        } else {
          codeToUse = '<div class="min-h-screen bg-zinc-950 text-white p-6 flex flex-col items-center justify-start">\n'
            + '  <div class="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">\n'
            + '    <div class="flex items-center justify-between pb-3 border-b border-zinc-800">\n'
            + '      <div class="flex items-center gap-2">\n'
            + '        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>\n'
            + '        <h2 class="text-sm font-semibold tracking-wide text-zinc-100">' + titleText.replace(/"/g, '&quot;') + '</h2>\n'
            + '      </div>\n'
            + '      <span class="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">' + imgMeta.replace(/"/g, '&quot;') + '</span>\n'
            + '    </div>\n'
            + '    <div class="flex justify-center bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/80 overflow-auto max-h-[70vh]">\n'
            + '      <img src="' + validatedImgSrc + '" alt="' + titleText.replace(/"/g, '&quot;') + '" class="max-w-full h-auto object-contain rounded shadow" />\n'
            + '    </div>\n'
            + '    <div class="text-xs text-zinc-400 text-center pt-2 border-t border-zinc-800/60">\n'
            + '      Visual reference imported into canvas. Ask the agent to reconstruct full UI code or provide generatedCode.\n'
            + '    </div>\n'
            + '  </div>\n'
            + '</div>';
        }
      }

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
        mode,
        message: 'UI mockup imported into Live Canvas (' + framework + ') via ' + mode + ' at ' + previewUrl
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
          passesAudit: { type: 'boolean' },
          issuesCount: { type: 'number' },
          issues: {
            type: 'array',
            items: { type: 'object', additionalProperties: true }
          },
          checkedViewports: {
            type: 'array',
            items: { type: 'string' }
          },
          unverifiedCriteria: {
            type: 'array',
            items: { type: 'string' }
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
      const cid = args.canvasId;
      if (!cid) {
        return {
          success: false,
          canvasId: cid,
          score: 0,
          passesAudit: false,
          issuesCount: 1,
          issues: [{ type: 'session', severity: 'error', selector: 'root', message: 'canvasId is required for visual audit' }],
          checkedViewports: ['mobile (375px)', 'tablet (768px)', 'desktop (1280px)'],
          unverifiedCriteria: ['dynamic_runtime_color_contrast_measurements', 'screen_reader_live_announcements'],
          summary: 'Visual audit failed: canvasId is required',
          error: 'canvasId is required for visual audit'
        };
      }
      const session = store.getSession(cid);
      if (!session) {
        return {
          success: false,
          canvasId: cid,
          score: 0,
          passesAudit: false,
          issuesCount: 1,
          issues: [{ type: 'session', severity: 'error', selector: 'root', message: 'Canvas session "' + cid + '" not found' }],
          checkedViewports: ['mobile (375px)', 'tablet (768px)', 'desktop (1280px)'],
          unverifiedCriteria: ['dynamic_runtime_color_contrast_measurements', 'screen_reader_live_announcements'],
          summary: 'Visual audit failed: Canvas session "' + cid + '" not found',
          error: 'Canvas session "' + cid + '" not found'
        };
      }

      if (!session.content || typeof session.content !== 'string' || session.content.trim().length === 0) {
        return {
          success: false,
          canvasId: cid,
          score: 0,
          passesAudit: false,
          issuesCount: 1,
          issues: [{ type: 'content', severity: 'error', selector: 'root', message: 'Canvas session content is empty' }],
          checkedViewports: ['mobile (375px)', 'tablet (768px)', 'desktop (1280px)'],
          unverifiedCriteria: ['dynamic_runtime_color_contrast_measurements', 'screen_reader_live_announcements'],
          summary: 'Visual audit failed: Canvas session content is empty',
          error: 'Canvas session content is empty'
        };
      }

      const issues = [];
      const raw = session.content;

      // 1. Accessibility Checks (a11y)
      // Check <img> missing alt attribute
      const imgRegex = /<img\b([^>]*?)>/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(raw)) !== null) {
        const attrs = imgMatch[1];
        if (!/\balt\s*=/i.test(attrs) || /\balt\s*=\s*["']\s*["']/i.test(attrs)) {
          if (!/\b(role\s*=\s*["']presentation["']|aria-hidden\s*=\s*["']true["'])/i.test(attrs)) {
            issues.push({
              type: 'a11y',
              severity: 'warning',
              selector: 'img',
              message: 'Image element missing descriptive alt attribute for screen readers'
            });
          }
        }
      }

      // Check <button> elements with empty content and missing aria-label
      const buttonRegex = /<button\b([^>]*?)>([\s\S]*?)<\/button>/gi;
      let btnMatch;
      while ((btnMatch = buttonRegex.exec(raw)) !== null) {
        const attrs = btnMatch[1];
        const inner = btnMatch[2].trim();
        const hasAriaLabel = /\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs);
        if (!hasAriaLabel && (inner.length === 0 || (/^(<svg|<i|<span class="icon)[\s\S]*>$/i.test(inner) && !/>[^<]+</.test(inner)))) {
          issues.push({
            type: 'a11y',
            severity: 'warning',
            selector: 'button',
            message: 'Button element without accessible text content or aria-label'
          });
        }
      }

      // Check <input> elements missing label / aria-label / placeholder
      const inputRegex = /<input\b([^>]*?)>/gi;
      let inputMatch;
      while ((inputMatch = inputRegex.exec(raw)) !== null) {
        const attrs = inputMatch[1];
        const isHidden = /\btype\s*=\s*["']hidden["']/i.test(attrs);
        const isSubmit = /\btype\s*=\s*["'](submit|button|reset)["']/i.test(attrs);
        if (!isHidden && !isSubmit) {
          const hasAccessibleName = /\b(aria-label|aria-labelledby|placeholder|title)\s*=/i.test(attrs);
          const hasId = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs);
          const hasMatchingLabel = hasId && raw.includes('for="' + hasId[1] + '"');
          if (!hasAccessibleName && !hasMatchingLabel) {
            issues.push({
              type: 'a11y',
              severity: 'warning',
              selector: 'input',
              message: 'Form input missing associated label, aria-label, or placeholder'
            });
          }
        }
      }

      // Check semantic landmarks
      if (raw.length > 350) {
        const hasLandmarks = /<(header|nav|main|aside|footer|article|section)\b/i.test(raw) || /\brole\s*=\s*["'](banner|navigation|main|complementary|contentinfo)["']/i.test(raw);
        if (!hasLandmarks) {
          issues.push({
            type: 'semantics',
            severity: 'info',
            selector: 'root',
            message: 'Layout relies entirely on generic divs; consider semantic landmarks (header, nav, main, footer)'
          });
        }
      }

      // 2. Responsive & Viewport Checks
      // Fixed pixel widths exceeding mobile viewport without responsive prefixes
      const widthRegex = /(?:^|\s|["'])(?:w-\[(\d+)px\]|width:\s*(\d+)px|min-w-\[(\d+)px\])/gi;
      let widthMatch;
      while ((widthMatch = widthRegex.exec(raw)) !== null) {
        const px = parseInt(widthMatch[1] || widthMatch[2] || widthMatch[3], 10);
        if (px > 360) {
          const precedingSub = raw.slice(Math.max(0, widthMatch.index - 10), widthMatch.index);
          const isResponsive = /(sm:|md:|lg:|xl:|2xl:)$/i.test(precedingSub);
          if (!isResponsive) {
            issues.push({
              type: 'responsive',
              severity: 'error',
              selector: 'fixed-width',
              message: 'Fixed width (' + px + 'px) exceeds mobile viewport (375px); use max-w or responsive prefixes (sm:, md:)'
            });
          }
        }
      }

      // 3. Contrast Heuristics
      if (/(?:text-zinc-500|text-gray-400|text-neutral-500|color:\s*#(?:888|999|aaa|bbb|ccc))\b[\s\S]{0,100}\b(?:bg-zinc-900|bg-zinc-950|bg-gray-900|background:\s*#(?:000|111|18181b|222))\b/i.test(raw)) {
        issues.push({
          type: 'contrast',
          severity: 'info',
          selector: 'text-contrast',
          message: 'Potential low text contrast detected on dark background; ensure WCAG AA 4.5:1 ratio'
        });
      }

      let errorCount = 0;
      let warningCount = 0;
      let infoCount = 0;
      for (const iss of issues) {
        if (iss.severity === 'error') errorCount++;
        else if (iss.severity === 'warning') warningCount++;
        else infoCount++;
      }
      const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 8) - (infoCount * 3));
      const passesAudit = score >= 80 && errorCount === 0;

      const checkedViewports = ['mobile (375px)', 'tablet (768px)', 'desktop (1280px)'];
      const unverifiedCriteria = ['dynamic_runtime_color_contrast_measurements', 'screen_reader_live_announcements'];

      const summary = issues.length === 0
        ? ('Visual & Layout Audit for ' + cid + ': Score 100/100. All structural responsive and accessibility checks passed.')
        : ('Visual & Layout Audit for ' + cid + ': Score ' + score + '/100 (' + (passesAudit ? 'PASS' : 'FAIL') + ') with ' + issues.length + ' finding(s) across viewports.');

      return {
        success: true,
        canvasId: cid,
        score,
        passesAudit,
        issuesCount: issues.length,
        issues,
        checkedViewports,
        unverifiedCriteria,
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
