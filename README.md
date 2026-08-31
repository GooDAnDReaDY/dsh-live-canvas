# @goodandready/dsh-live-canvas

Interactive in-browser canvas for real-time preview of HTML, React components, SVGs, Mermaid diagrams, and Markdown documents with SSE hot-reload and DOM click inspector for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Features

- **Multi-Format Live Preview**:
  - HTML documents & snippets with responsive CSS reset.
  - React 18 JSX/TSX components with in-browser Babel transpile and error boundaries.
  - SVG vector illustrations with dark/light contrast checkerboard.
  - Mermaid diagrams with client-side graph rendering.
  - Markdown documentation with GitHub-style styling and tables.
- **Server-Sent Events (SSE) Hot-Reload**:
  - Automatic zero-refresh or soft reload when the agent updates files or executes tools.
- **Interactive DOM Click Inspector**:
  - Live element highlighting and bounding box measurement.
  - Generates unique CSS selector path, tag, attributes, and text on click.
  - Feeds inspection data directly back to agent tools via `/dsh-live-canvas/api/inspect`.
- **Responsive Viewport Controls**:
  - Switch between Responsive (100%), Mobile (375px), Tablet (768px), and Desktop (1280px).
- **Strict Sandbox Security**:
  - Strict Content-Security-Policy (CSP) headers.
  - Sandboxed iframe with `allow-scripts allow-forms allow-same-origin allow-modals`.
  - Path traversal and null-byte injection prevention.

## Agent Tools

### `live_canvas_preview`
Render or update an interactive live canvas preview for HTML, React JSX, SVG, Mermaid diagram, or Markdown content.
- `content`: Code, markup, or markdown string.
- `filePath`: Optional relative path to a workspace file.
- `title`: Human-readable title for the preview session.
- `componentType`: `html` | `react` | `svg` | `mermaid` | `markdown` | `auto` (default).
- `viewport`: `responsive` | `mobile` | `tablet` | `desktop`.
- `canvasId`: Optional ID to update an existing session.

### `live_canvas_inspect`
Retrieve user click inspection data, DOM selectors, attributes, and text from the live canvas preview.
- `action`: `get_last` (default) | `list` | `clear`.
- `canvasId`: Optional canvas ID filter.

### `live_canvas_reload`
Broadcast a hot-reload or refresh signal to active preview canvases.
- `canvasId`: Optional specific canvas session ID.
- `reason`: Optional explanation of the reload trigger.

## Settings

Registered as a standard card under **Settings -> Plugins -> Plugin Settings**:
- `defaultViewport`: Default preview viewport (responsive / mobile / tablet / desktop) (default: `responsive`).
- `autoOpenOnHtmlGen`: Auto-open canvas when agent creates HTML or React components (default: `true`).
- `enableHotReload`: Enable SSE-based real-time hot-reload on changes (default: `true`).
- `maxSessionCache`: Maximum number of active preview sessions stored in memory (default: `50`).

## Testing

Run unit and integration tests without network or external harness dependencies:
```bash
npm test
```