# dsh-live-canvas

DSH plugin for interactive real-time browser preview of artifacts and UI components for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Tools
- `live_canvas_preview_url`
- `live_canvas_emit_update`
- `live_canvas_inspect_element`

## Settings
Located in **Settings -> Plugins -> Live Canvas Preview**:
- `defaultViewport`: Default preview viewport (mobile/tablet/desktop/responsive) (default: `responsive`)
- `autoOpenOnHtmlGen`: Auto-open canvas when agent creates HTML/React files (default: `true`)
- `enableHotReload`: Enable SSE-based hot-reload on file edits (default: `true`)

## Verification
```bash
npm test
```
