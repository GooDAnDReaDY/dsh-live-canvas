# @goodandready/dsh-live-canvas

Interactive in-browser canvas for real-time preview of HTML (with Tailwind CSS & Lucide icons), React 18 components, SVGs, Mermaid diagrams, and Markdown documents with SSE hot-reload, DOM click inspector, error telemetry, visual annotations, Storybook gallery, file watcher, props controls, split visual diffs, multi-device matrix, AI mock data, and 1-click Vite ZIP project packager for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

---

## 🌟 Key Features

1. **Multi-Format Live Preview**:
   - **HTML + Tailwind CSS + Lucide Icons**: Instant rendering with live Tailwind CSS JIT and Lucide icon replacement.
   - **React 18 JSX/TSX**: In-browser Babel standalone transpile, error boundaries, and dynamic reactive re-rendering.
   - **SVG Illustrations**: Clean vector viewer with dark/light transparency grid.
   - **Mermaid Diagrams**: Sequence, flowchart, architecture, class, and state diagram rendering.
   - **Markdown Documents**: GitHub Flavored Markdown with tables, code fences, and alerts.
2. **Server-Sent Events (SSE) Hot-Reload**:
   - Zero-refresh live reload when project files or components change.
3. **Interactive DOM Click Inspector**:
   - Element hovering, bounding box measurement, and unique CSS selector path generation.
4. **Autonomous Error Diagnostics & Telemetry**:
   - Captures runtime errors, promise rejections, and console warnings to feed back to AI agents for self-healing.
5. **Standalone HTML Export**:
   - Generates and downloads zero-dependency self-contained HTML files or writes them to disk.
6. **Visual Annotations Layer**:
   - Draw bounding boxes directly over preview elements with comment callouts.
7. **Multi-Variant Storybook Gallery**:
   - Simultaneously renders multiple component states and variants in a responsive grid.
8. **Workspace File Watcher**:
   - Native debounced file system watcher that synchronizes project files to the live preview canvas.
9. **Interactive Props & State Controls Playground**:
   - Real-time sliders, checkboxes, selects, and text inputs that update component props without reloads.
10. **Visual Diff & Before/After Split Comparison**:
    - Interactive dual-layer split slider with revision history snapshots.
11. **Multi-Device Matrix View with Synchronized Scrolling**:
    - Simultaneously renders Mobile (375px), Tablet (768px), and Desktop (1024px+) viewports with bidirectional synchronized scroll relay.
12. **AI Mock Data & Fake API Fetch Interceptor**:
    - Intercepts `window.fetch` inside the sandbox to simulate realistic backend REST endpoints with network delay.
13. **1-Click Vite / React / Vue Project ZIP Packager**:
    - Bundles any preview component into a full, production-ready Vite project with Tailwind CSS, ready to `npm run dev` or download as a ZIP.

---

## 🛠️ Complete Agent Tools Suite (13 Tools)

| Tool Name | Description | Key Parameters |
|---|---|---|
| `live_canvas_preview` | Render/update preview with Tailwind, Lucide, React, SVG, Mermaid, Markdown | `content`, `filePath`, `componentType`, `viewport`, `theme`, `controls`, `mockData` |
| `live_canvas_inspect` | Retrieve user click inspection data, DOM selectors, and element attributes | `action` (`get_last` \| `list` \| `clear`), `canvasId` |
| `live_canvas_reload` | Broadcast live reload to connected canvas preview frames | `canvasId`, `reason` |
| `live_canvas_diagnose` | Query runtime errors, exceptions, and telemetry logs for autonomous healing | `canvasId`, `level`, `limit`, `clear` |
| `live_canvas_export` | Export preview as a standalone self-contained HTML file | `canvasId`, `destinationPath` |
| `live_canvas_annotations` | Retrieve user visual annotations, drawn boxes, and feedback comments | `action` (`list` \| `get_last` \| `clear`), `canvasId`, `limit` |
| `live_canvas_gallery` | Render Storybook-style multi-variant component matrix | `title`, `variants`, `theme`, `canvasId` |
| `live_canvas_watch` | Start/stop/check real-time workspace file watching for auto-sync | `action` (`start` \| `stop` \| `status`), `filePath`, `canvasId` |
| `live_canvas_controls` | Configure interactive props/state sliders, toggles, and inputs | `action` (`set_schema` \| `set_values` \| `get`), `canvasId`, `controls`, `values` |
| `live_canvas_diff` | Generate visual split-slider comparison between past versions and current code | `canvasId`, `snapshotId` |
| `live_canvas_matrix` | Multi-device viewport matrix (Mobile + Tablet + Desktop) with synchronized scrolling | `canvasId` |
| `live_canvas_mock` | Configure mock API responses and `window.fetch` interceptors | `action` (`set` \| `get` \| `clear`), `canvasId`, `mockData` |
| `live_canvas_pack` | Pack component into complete Vite + React/Vue ZIP project or write to workspace | `canvasId`, `framework` (`vite-react` \| `vite-vue`), `destinationDir` |

---

## ⚙️ Settings

Configurable under **Settings -> Plugins -> Plugin Settings**:
- `defaultViewport`: Default preview viewport layout (`responsive` / `mobile` / `tablet` / `desktop` / `matrix`).
- `autoOpenOnHtmlGen`: Automatically open preview canvas when agent creates HTML or React components.
- `enableHotReload`: Enable SSE-based real-time hot-reload on component changes.
- `enableFileWatcher`: Automatically watch workspace files on disk for live preview sync.
- `maxSessionCache`: Maximum number of active preview sessions stored in memory.

---

## 🧪 Testing

Run all 40 unit and integration tests without network or external harness dependencies:
```bash
npm test
```

---

## 📄 License

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)

