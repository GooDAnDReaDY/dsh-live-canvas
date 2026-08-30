import { Schema } from '@deepseek-ai/schemastery';

export const name = '@goodandready-private/dsh-live-canvas';
export const inject = ['tools', 'settings', 'webServer'];

export const Config = Schema.object({
  defaultViewport: Schema.string().default("responsive").description("Default preview viewport (mobile/tablet/desktop/responsive)"),
  autoOpenOnHtmlGen: Schema.boolean().default(true).description("Auto-open canvas when agent creates HTML/React files"),
  enableHotReload: Schema.boolean().default(true).description("Enable SSE-based hot-reload on file edits")
});

const NS = '@goodandready-private/dsh-live-canvas';

export function apply(ctx, config) {
  let getConfig = () => config;

  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register(NS, Config, { base: config });
    getConfig = () => scope.get() ?? config;
  });

  if (ctx.tools) {
    ctx.tools.register({
      name: 'live_canvas_preview_url',
      description: 'Initial tool for dsh-live-canvas',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        return { success: true, plugin: 'dsh-live-canvas' };
      }
    });
  }
}
