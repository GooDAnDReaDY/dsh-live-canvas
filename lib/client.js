// dsh-live-canvas: client (browser) half.
// Provides settings card in "Settings -> Plugins -> Plugin Settings", Live Canvas interactive preview container with workspace file discovery, session switcher, file picker drawer, auto-initialization, reactive iframe key management, persistent DOM viewports, SSE hot-reload, telemetry console, annotations, props controls, visual diffs, device matrix, mock data, 1-click Vite packager, full Russian localization, inline WYSIWYG editor sync, floating Tailwind tweaker, in-place AI element prompt modal, and native dsh-better-sidebar integration.

window.__ModuleLoader__.load({
  id: '@goodandready/dsh-live-canvas',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');

    const NS = 'dsh-live-canvas';
    // Plugins page row seat (DSH 0.1.6-alpha.2): key = '<package name>#<row id>'.
    const PKG = '@goodandready/dsh-live-canvas';
    const ROW_ID = 'dsh-live-canvas';
    const ROW_CONFIG_KEY = PKG + '#' + ROW_ID;
    let rootSidebarRight = null;


    // ---------------------------------------------------------------- Error Boundary
    function createErrorBoundary() {
      if (!React || typeof React.Component !== "function") {
        return function NoopBoundary(props) { return props?.children || null; };
      }
      return class ErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }
        static getDerivedStateFromError(error) {
          return { hasError: true, error };
        }
        componentDidCatch(error, errorInfo) {
          console.error("[dsh-live-canvas] React Render Error:", error, errorInfo);
        }
        render() {
          if (this.state.hasError) {
            return React.createElement(
              "div",
              {
                className: "dlc-banner-exhausted",
                style: { margin: "12px", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }
              },
              React.createElement("div", { style: { fontWeight: 600, fontSize: "14px" } }, "⚠️ Live Canvas Component Error"),
              React.createElement("div", { style: { fontSize: "12px", opacity: 0.9, fontFamily: "monospace" } },
                this.state.error?.message || String(this.state.error)
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "dlc-btn",
                  style: { alignSelf: "flex-start", marginTop: "6px" },
                  onClick: () => this.setState({ hasError: false, error: null })
                },
                "🔄 Retry"
              )
            );
          }
          return this.props?.children || null;
        }
      };
    }
    const ErrorBoundary = createErrorBoundary();

    // ---------------------------------------------------------------- Fallback Chevron Icon
    function FallbackChevron({ open }) {
      return React.createElement('svg', {
        className: 'dlc-chev' + (open ? ' dlc-chev-open' : ''),
        width: '14',
        height: '14',
        viewBox: '0 0 14 14',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      },
        React.createElement('path', { d: 'M3.5 5.25L7 8.75L10.5 5.25' })
      );
    }

    let ChevronIcon = null;
    try {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
      ChevronIcon = primitives && primitives.IconChevronDownOutline14;
    } catch {
      ChevronIcon = null;
    }
    const Chevron = ChevronIcon || FallbackChevron;

    // ---------------------------------------------------------------- CSS Styles
    const css = `
/* Card & Header Container (dsh-clinebot standard) */
.dlc-card { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); border-radius:12px; list-style:none; margin-bottom:12px; overflow:hidden; }
.dlc-section-card { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); border-radius:12px; padding:18px 20px; display:flex; flex-direction:column; gap:14px; margin-bottom:12px; }
.dlc-head { appearance:none; width:100%; font:inherit; color:inherit; text-align:left; cursor:pointer; background:0 0; border:0; border-radius:12px; display:flex; align-items:center; gap:12px; padding:14px 16px; }
.dlc-title { color:var(--dsw-alias-label-primary); font-size:15px; font-weight:600; line-height:1.4; }
.dlc-sub { color:var(--dsw-alias-label-secondary); font-size:13px; }
.dlc-body { border-top:1px solid var(--dsw-alias-border-l2); margin:0 16px; padding-bottom:8px; }
.dlc-field { display:flex; flex-direction:column; gap:6px; padding:12px 0; }
.dlc-label { color:var(--dsw-alias-label-primary); font-size:13px; font-weight:500; }
.dlc-desc { color:var(--dsw-alias-label-secondary); font-size:12px; }

/* Inputs and Selects */
.dlc-input { height:36px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 12px; font-size:13px; width:100%; box-sizing:border-box; }
.dlc-input:focus { outline:none; border-color:var(--dsw-alias-state-brand-primary); }
.dlc-select { height:36px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 10px; font-size:13px; width:100%; box-sizing:border-box; }
.dlc-select:focus { outline:none; border-color:var(--dsw-alias-state-brand-primary); }
.dlc-checkbox-row { display:flex; align-items:center; gap:8px; }
.dlc-checkbox { width:16px; height:16px; cursor:pointer; accent-color:var(--dsw-alias-state-brand-primary); }
.dlc-foot { border-top:1px solid var(--dsw-alias-border-l2); display:flex; justify-content:flex-end; align-items:center; gap:8px; padding:12px 0 8px; }
.dlc-save { appearance:none; font:inherit; cursor:pointer; border:1px solid transparent; border-radius:8px; padding:7px 16px; font-size:13px; font-weight:500; background:var(--dsw-alias-label-primary); color:var(--dsw-alias-bg-layer-3); transition:opacity .15s; }
.dlc-save:hover:not(:disabled) { opacity:0.88; }
.dlc-save:disabled { opacity:0.5; cursor:not-allowed; }
.dlc-status-msg { font-size:12px; margin-right:auto; }
.dlc-status-ok { color:var(--dsw-alias-state-success-primary); }
.dlc-status-err { color:var(--dsw-alias-state-error-primary); }
.dlc-chev { margin-left:auto; flex:none; color:var(--dsw-alias-label-secondary); transition:transform .16s; }
.dlc-chev-open { transform:rotate(180deg); }

/* Unified Buttons (matching .cb-btn) */
.dlc-btn { appearance:none; font:inherit; cursor:pointer; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; padding:7px 14px; font-size:13px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); font-weight:500; display:inline-flex; align-items:center; justify-content:center; gap:6px; transition:all .15s ease; }
.dlc-btn:hover:not(:disabled) { background:var(--dsw-alias-bg-layer-4, var(--dsw-alias-bg-layer-2)); border-color:var(--dsw-alias-label-dimmed, var(--dsw-alias-border-l2)); }
.dlc-btn-primary { background:var(--dsw-alias-label-primary); color:var(--dsw-alias-bg-layer-3); border-color:transparent; }
.dlc-btn-primary:hover:not(:disabled) { background:var(--dsw-alias-label-primary) !important; color:var(--dsw-alias-bg-layer-3) !important; opacity:0.88; }
.dlc-btn-danger { color:var(--dsw-alias-state-error-primary); border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent); }
.dlc-btn-active { background:var(--dsw-alias-state-brand-primary) !important; color:var(--dsw-alias-text-contrast) !important; border-color:transparent !important; }
.dlc-btn-ai { background:var(--dsw-alias-state-brand-primary) !important; color:var(--dsw-alias-text-contrast) !important; font-weight:600; border-color:transparent !important; }
.dlc-btn-err { border-color:var(--dsw-alias-state-error-primary) !important; color:var(--dsw-alias-state-error-primary) !important; }
.dlc-btn-reorder-active { background:color-mix(in srgb, var(--dsw-alias-state-warning-primary) 12%, transparent) !important; border-color:var(--dsw-alias-state-warning-primary) !important; color:var(--dsw-alias-state-warning-primary) !important; }
.dlc-btn-code-active { background:color-mix(in srgb, var(--dsw-alias-state-brand-primary) 15%, transparent) !important; border-color:var(--dsw-alias-state-brand-primary) !important; color:var(--dsw-alias-state-brand-primary) !important; }

/* Unified Badges (matching .cb-badge) */
.dlc-badge { font-size:12px; padding:3px 10px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); display:inline-flex; align-items:center; gap:5px; font-weight:500; }
.dlc-badge-ok { border-color:var(--dsw-alias-state-success-primary); color:var(--dsw-alias-state-success-primary); background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent); }
.dlc-badge-warn { border-color:var(--dsw-alias-state-warning-primary); color:var(--dsw-alias-state-warning-primary); background:color-mix(in srgb, var(--dsw-alias-state-warning-primary) 10%, transparent); }
.dlc-badge-bad { border-color:var(--dsw-alias-state-error-primary); color:var(--dsw-alias-state-error-primary); background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
.dlc-banner-warning { padding:12px 16px; border-radius:8px; background:color-mix(in srgb, var(--dsw-alias-state-warning-primary) 12%, transparent); border:1px solid var(--dsw-alias-state-warning-primary); color:var(--dsw-alias-state-warning-primary); font-size:13px; display:flex; align-items:center; gap:10px; font-weight:500; }
.dlc-banner-exhausted { padding:12px 16px; border-radius:8px; background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); border:1px solid var(--dsw-alias-state-error-primary); color:var(--dsw-alias-state-error-primary); font-size:13px; display:flex; align-items:center; gap:10px; font-weight:600; }

/* Live Canvas Workspace Toolbar & Container */
.dlc-panel-container { display:flex; flex-direction:column; width:100%; height:100%; min-height:360px; background:var(--dsw-alias-bg-layer-2); border-radius:8px; overflow:hidden; position:relative; }
.dlc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; background:var(--dsw-alias-bg-layer-3); border-bottom:1px solid var(--dsw-alias-border-l2); }
.dlc-toolbar-group { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.dlc-session-dropdown { height:32px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 10px; font-size:12px; font-weight:600; max-width:280px; cursor:pointer; text-overflow:ellipsis; }
.dlc-session-dropdown:focus { outline:none; border-color:var(--dsw-alias-state-brand-primary); }

/* Code Drawer */
.dlc-code-drawer { width:420px; background:var(--dsw-alias-bg-layer-3); border-left:1px solid var(--dsw-alias-border-l2); display:flex; flex-direction:column; z-index:20; box-shadow:var(--dsw-alias-shadow-l2); }
.dlc-code-drawer-head { padding:8px 12px; border-bottom:1px solid var(--dsw-alias-border-l2); display:flex; align-items:center; justify-content:space-between; }
.dlc-code-textarea { flex:1; padding:12px; background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); font-family:ui-monospace, "Cascadia Code", monospace; font-size:12px; line-height:1.6; resize:none; border:none; outline:none; }
.dlc-code-drawer-foot { padding:6px 12px; border-top:1px solid var(--dsw-alias-border-l2); display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--dsw-alias-label-secondary); }

/* Blocks Modal */
.dlc-blocks-overlay { position:fixed; inset:0; background:var(--dsw-alias-mask); backdrop-filter:blur(4px); z-index:50; display:flex; align-items:center; justify-content:center; padding:16px; }
.dlc-blocks-modal { background:var(--dsw-alias-bg-layer-3); border:1px solid var(--dsw-alias-border-l2); border-radius:14px; max-width:640px; width:100%; padding:20px; max-height:85vh; display:flex; flex-direction:column; box-shadow:var(--dsw-alias-shadow-l3); color:var(--dsw-alias-label-primary); }
.dlc-blocks-list { flex:1; overflow-y:auto; }
.dlc-block-card { padding:12px; border-radius:10px; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l2); margin-bottom:8px; display:flex; align-items:flex-start; justify-content:space-between; gap:12px; transition:border-color 0.15s; }
.dlc-block-card:hover { border-color:var(--dsw-alias-label-secondary); }
.dlc-block-badge { padding:2px 8px; border-radius:999px; font-size:11px; font-weight:500; background:color-mix(in srgb, var(--dsw-alias-state-brand-primary) 12%, transparent); color:var(--dsw-alias-state-brand-primary); border:1px solid color-mix(in srgb, var(--dsw-alias-state-brand-primary) 25%, transparent); }

/* Viewports & Frames */
.dlc-preview-viewport { flex:1; display:flex; align-items:center; justify-content:center; padding:16px; overflow:auto; background:var(--dsw-alias-bg-layer-1); }
.dlc-matrix-viewport { flex:1; display:flex; gap:20px; padding:20px; overflow-x:auto; background:var(--dsw-alias-bg-layer-1); align-items:flex-start; justify-content:center; }
.dlc-matrix-card { background:var(--dsw-alias-bg-layer-3); border:1px solid var(--dsw-alias-border-l2); border-radius:12px; overflow:hidden; box-shadow:var(--dsw-alias-shadow-l2); flex-shrink:0; display:flex; flex-direction:column; }
.dlc-matrix-card-head { padding:8px 12px; background:var(--dsw-alias-bg-layer-2); border-bottom:1px solid var(--dsw-alias-border-l2); font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary); display:flex; align-items:center; justify-content:space-between; }
.dlc-frame-wrapper { transition:width .25s ease-in-out, height .25s ease-in-out; border-radius:8px; box-shadow:var(--dsw-alias-shadow-l2); overflow:hidden; background:var(--dsw-alias-bg-layer-1); }
.dlc-frame { width:100%; height:100%; border:0; display:block; }

/* Inspector, Console, Controls */
.dlc-inspector-bar { border-top:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); padding:8px 12px; font-size:12px; color:var(--dsw-alias-label-primary); display:flex; align-items:center; justify-content:space-between; font-family:monospace; gap:10px; }
.dlc-inspector-selector { font-weight:600; color:var(--dsw-alias-state-brand-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50%; }
.dlc-console-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); max-height:140px; overflow-y:auto; padding:8px 12px; font-family:monospace; font-size:11px; }
.dlc-log-line { padding:3px 0; border-bottom:1px solid var(--dsw-alias-border-l2); }
.dlc-log-err { color:var(--dsw-alias-state-error-primary); }
.dlc-log-warn { color:var(--dsw-alias-state-warning-primary); }
.dlc-log-info { color:var(--dsw-alias-state-brand-primary); }
.dlc-controls-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); padding:10px 14px; font-size:12px; color:var(--dsw-alias-label-primary); max-height:160px; overflow-y:auto; }
.dlc-controls-grid { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
.dlc-ctrl-item { display:flex; align-items:center; gap:6px; }
.dlc-ctrl-input { height:28px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border-radius:6px; padding:0 8px; font-size:12px; }

/* File Picker Drawer */
.dlc-picker-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); padding:12px 16px; font-size:12px; color:var(--dsw-alias-label-primary); max-height:220px; overflow-y:auto; }
.dlc-picker-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
.dlc-picker-search { flex:1; height:32px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 10px; font-size:12px; }
.dlc-picker-list { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px; max-height:140px; overflow-y:auto; }
.dlc-picker-item { padding:6px 10px; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l2); border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:6px; text-align:left; transition:all .15s; font-size:11px; overflow:hidden; }
.dlc-picker-item:hover { background:var(--dsw-alias-bg-layer-4); border-color:var(--dsw-alias-state-brand-primary); }
.dlc-picker-item-name { font-weight:600; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dlc-picker-item-path { font-size:10px; color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Modals (AI Prompt, Share, Deploy, Artifacts) */
.dlc-modal-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:var(--dsw-alias-mask); backdrop-filter:blur(4px); z-index:9999999; display:flex; align-items:center; justify-content:center; }
.dlc-modal-card { background:var(--dsw-alias-bg-layer-3); border:1px solid var(--dsw-alias-border-l2); border-radius:14px; width:480px; max-width:90vw; padding:20px; box-shadow:var(--dsw-alias-shadow-l3); display:flex; flex-direction:column; gap:14px; color:var(--dsw-alias-label-primary); font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.dlc-modal-head { display:flex; align-items:center; justify-content:space-between; }
.dlc-modal-title { font-size:15px; font-weight:700; color:var(--dsw-alias-label-primary); display:flex; align-items:center; gap:8px; }
.dlc-modal-input { width:100%; min-height:80px; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l2); border-radius:8px; padding:10px; color:var(--dsw-alias-label-primary); font-size:13px; resize:vertical; box-sizing:border-box; }
.dlc-modal-input:focus { outline:none; border-color:var(--dsw-alias-state-brand-primary); }
.dlc-preset-btn { background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l2); border-radius:8px; padding:6px 10px; font-size:11px; color:var(--dsw-alias-label-secondary); cursor:pointer; text-align:left; transition:all .15s; }
.dlc-preset-btn:hover { background:var(--dsw-alias-bg-layer-4); color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-state-brand-primary); }
`;

    // ---------------------------------------------------------------- Inject Styles
    if (typeof document !== 'undefined' && !document.getElementById('dlc-plugin-styles')) {
      const tag = document.createElement('style');
      tag.id = 'dlc-plugin-styles';
      tag.dataset.dshPlugin = 'dsh-live-canvas';
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // ---------------------------------------------------------------- Localization Strings
    const i18n = {
      en: {
        title: 'Live Canvas Preview',
        description: 'Interactive in-browser canvas for real-time preview of HTML (with Tailwind CSS & Lucide icons), React components, SVGs, and diagrams with workspace file discovery, session switcher, props controls, visual diffs, device matrix, AI mock data, 1-click Vite project packager, and Better Sidebar integration.',
        defaultViewport: 'Default Viewport',
        defaultViewportDesc: 'Initial layout size for live preview frames',
        responsive: 'Responsive',
        mobile: 'Mobile 375px',
        tablet: 'Tablet 768px',
        desktop: 'Desktop 1280px',
        matrix: 'Matrix',
        autoOpen: 'Auto-open Canvas',
        autoOpenDesc: 'Automatically open preview canvas when agent creates HTML or React components',
        enableHotReload: 'Enable SSE Hot-Reload',
        enableHotReloadDesc: 'Real-time live reload on component updates',
        maxSessions: 'Max Cached Sessions',
        maxSessionsDesc: 'Number of active preview sessions to keep in memory',
        save: 'Save Changes',
        saved: 'Settings saved successfully',
        saveError: 'Failed to save settings',
        loading: 'Loading...',
        unavailable: 'Settings service is unavailable',
        inspectBtn: 'Inspect',
        inspectingBtn: 'Inspecting...',
        refreshBtn: 'Refresh',
        openTabBtn: 'Tab',
        exportBtn: 'Export',
        packBtn: 'Pack Vite',
        annotateBtn: 'Annotate',
        drawingBtn: 'Drawing...',
        notesCount: 'notes',
        controlsBtn: 'Controls',
        compareBtn: 'Compare',
        matrixBtn: 'Matrix',
        openFileBtn: 'Files',
        browseFilesBtn: 'Browse',
        mockBadge: 'Mock API',
        themeLight: 'Light',
        themeDark: 'Dark',
        sessionsGroup: '⚡ Active Sessions',
        workspaceFilesGroup: '📂 Workspace Files',
        searchPlaceholder: '🔍 Search project files (e.g. preview.html)...',
        customPathPlaceholder: 'Or enter path...',
        openActionBtn: 'Open',
        choosePlaceholder: '⚡ Select file or session...',
        noFilesFound: 'No frontend files (.html, .jsx, .tsx, .svg, .md) found.',
        noControls: 'No interactive props controls declared for this component.',
        noLogs: 'No telemetry logs recorded yet.',
        syncScroll: 'Sync Scroll',
        selectedLabel: 'Selected',
        sidebarTab: 'Live Canvas',
        errCount: 'err',
        aiPromptBtn: '✨ AI Refine',
        aiPromptModalTitle: 'Refine Element with AI',
        aiPromptDesc: 'Describe what to change in this component or choose a preset:',
        aiPromptPlaceholder: 'e.g. Make this card glassmorphic, add glowing border, and adjust mobile padding...',
        aiSubmitBtn: 'Send Task to Agent',
        aiSentSuccess: 'Task submitted! Canvas will hot-reload on completion.',
        presetGlass: '💎 Glassmorphism & subtle neon glow',
        presetModern: '⚡ Minimalist typography & cleaner spacing',
        presetBadge: '🔥 Add discount badge & animated button',
        presetMobile: '📱 Optimize responsive mobile layout',
        blocksBtn: '✨ Blocks',
        storybookBtn: '🧩 UI Kit',
        reorderBtn: '↕️ D&D',
        codeBtn: '💻 Code',
        codeDrawerTitle: 'Source Code',
        codeDrawerSync: 'Edits are synchronized in real time',
        codeDrawerLive: '● Live Sync',
        blocksModalTitle: '✨ Modern Design Blocks Catalog',
        insertBlockBtn: 'Insert Block',
        reorderOnToast: 'Drag & Drop mode enabled: reorder sections by dragging',
        reorderOffToast: 'Drag & Drop mode disabled',
        blockInsertedToast: 'Block inserted successfully',
        codeSyncedToast: 'Code synchronized',
        themesLabel: '🎨 Theme',
        mockBtn: '⚡ Mocks',
        shareBtn: '📱 QR Preview',
        shareModalTitle: '📱 Mobile Preview via QR Code',
        shareModalDesc: 'Scan with smartphone camera on local Wi-Fi network:',
        copyShareLink: 'Copy Link',
        mockPopulatedToast: 'Mock dataset populated in sandbox',
        themeAppliedToast: 'Design system theme applied',
        blueprintBtn: '📐 Wireframe',
        artifactsBtn: '📋 Artifacts',
        artifactsModalTitle: '📋 Interactive HTML Artifacts Generator',
        wireframeArtifact: '📐 Low-Fi Wireframe',
        planArtifact: '📋 Interactive Roadmap',
        diagramArtifact: '📊 Live Architecture Diagram',
        prototypeArtifact: '🧪 Multi-Step Prototype',
        crudArtifact: '🗄️ Retool CRUD Dashboard',
        resolveAnnotationBtn: '✓ Resolved',
        annotationResolvedToast: 'Annotation marked as resolved',
        deployBtn: '🌍 Deploy',
        timetravelBtn: '⏳ Timeline',
        soundBtn: '🔊 Sound',
        deployModalTitle: '🌍 Instant Web Deployment',
        cancelBtn: 'Cancel',
        consoleBtn: 'Console',
        consoleDrawerTitle: 'Mini-Console & Runtime Logs',
        consoleClearBtn: 'Clear',
        consoleFilterAll: 'All',
        consoleFilterErrors: 'Errors',
        consoleFilterWarnings: 'Warnings',
        consoleFilterLogs: 'Logs',
        noConsoleLogs: 'No console logs captured yet.',
        tweakerBarTitle: 'Style Tweaker',
        tweakText: 'Text',
        tweakPadding: 'Padding',
        tweakRadius: 'Radius',
        tweakEdit: 'Inline Edit',
        stateDefault: 'Default',
        stateLoading: 'Loading',
        stateEmpty: 'Empty',
        stateError: 'Error',
        stateOverflow: 'Overflow',
        snapshotBtn: 'Snapshot',
        snapshotCapturedToast: 'Vision snapshot captured and ready for analysis.',
        workspaceRoots: 'Workspace Roots',
        workspaceRootsDesc: 'Allowed root paths for file open and preview (one path per line or comma-separated)',
        fileOpenErrorTitle: 'File Access Restricted',
        fileOpenErrorFile: 'File',
        fileOpenErrorReason: 'Reason',
        fileOpenErrorGuidance: 'To preview files outside the default workspace, configure allowed paths in plugin settings "workspaceRoots" or deepseek-harness.config.json.',
        allowedRootsLabel: 'Allowed roots',
        checkUpdate: 'Check for updates',
        checkingUpdate: 'Checking for updates…',
        updateAvailable: 'Update available',
        upToDate: 'Up to date',
        updatePlugin: 'Update to',
        updating: 'Updating plugin…',
        updateSuccess: 'Updated successfully! Restart DSH to apply changes.',
        updateFailed: 'Update failed. See server logs.',
        standaloneExportBtn: 'Single HTML',
        pageRefreshedToast: 'Page reloaded',
        resizeSmall: 'Compact 220px',
        resizeMedium: 'Medium 360px',
        resizeLarge: 'Expanded 540px',
        resizeWide: 'Full Width',
        resizeNormal: 'Standard Width',
        openInLiveCanvas: 'Open in Live Canvas',
        openingLiveCanvas: 'Opening...',
        dragToResize: 'Drag to resize height',
        canvasOpenedToast: 'Canvas session opened',
        projectsHub: 'Projects Hub',
        recentProjects: 'Recent Projects',
        noRecentProjects: 'No recent projects found',
        searchProjectsPlaceholder: 'Search projects or files...',
        demoTemplatesHeader: 'Quick Start with Demo Templates'
      },
      zh: {
        title: '实时画布预览',
        description: '支持HTML（Tailwind CSS与Lucide图标）、React组件、SVG及架构图实时预览的浏览器交互式画布，集成工作区文件发现、会话切换、属性控制、视觉对比、多端矩阵、AI Mock数据、一键打包Vite项目以及Better Sidebar侧边栏联动。',
        defaultViewport: '默认视口',
        defaultViewportDesc: '实时预览窗口的初始尺寸',
        responsive: '自适应',
        mobile: '手机 375px',
        tablet: '平板 768px',
        desktop: '桌面 1280px',
        matrix: '矩阵',
        autoOpen: '自动打开画布',
        autoOpenDesc: '当智能体生成HTML或React组件时自动展开画布',
        enableHotReload: '启用SSE热重载',
        enableHotReloadDesc: '文件或组件发生变动时无感实时刷新',
        maxSessions: '内存中最大会话数',
        maxSessionsDesc: '在内存中保留的活跃预览会话上限',
        save: '保存设置',
        saved: '设置已成功保存',
        saveError: '保存设置失败',
        loading: '加载中...',
        unavailable: '设置服务不可用',
        inspectBtn: '元素检查',
        inspectingBtn: '检查中...',
        refreshBtn: '刷新',
        openTabBtn: '新标签页',
        exportBtn: '导出',
        packBtn: '打包Vite项目',
        annotateBtn: '批注标记',
        drawingBtn: '绘制中...',
        notesCount: '条批注',
        controlsBtn: '属性参数',
        compareBtn: '版本对比',
        matrixBtn: '设备矩阵',
        openFileBtn: '工作区文件',
        browseFilesBtn: '浏览',
        mockBadge: 'Mock接口',
        themeLight: '浅色',
        themeDark: '深色',
        sessionsGroup: '⚡ 活跃会话',
        workspaceFilesGroup: '📂 工作区文件',
        searchPlaceholder: '🔍 搜索项目文件 (例如 preview.html)...',
        customPathPlaceholder: '或输入文件相对路径...',
        openActionBtn: '打开',
        choosePlaceholder: '⚡ 选择文件或会话...',
        noFilesFound: '未找到前端文件 (.html, .jsx, .tsx, .svg, .md)。',
        noControls: '当前组件未声明交互式属性控件。',
        noLogs: '尚未记录遥测日志。',
        syncScroll: '同步滚动',
        selectedLabel: '已选中',
        sidebarTab: '实时画布',
        errCount: '项错误',
        aiPromptBtn: '✨ AI微调',
        aiPromptModalTitle: '通过AI定向微调元素',
        aiPromptDesc: '描述所选元素的修改要求，或选择预设指令：',
        aiPromptPlaceholder: '例如：增加玻璃拟态质感，添加微光边框并优化移动端边距...',
        aiSubmitBtn: '发送任务给智能体',
        aiSentSuccess: '任务已提交！完成后画布将自动热重载。',
        presetGlass: '💎 玻璃拟态与霓虹微光',
        presetModern: '⚡ 极简排版与考究留白',
        presetBadge: '🔥 添加特惠标签与微交互按钮',
        presetMobile: '📱 适配移动端触控与布局',
        blocksBtn: '✨ 预设区块',
        storybookBtn: '🧩 组件库',
        reorderBtn: '↕️ 拖拽排序',
        codeBtn: '💻 源码',
        codeDrawerTitle: '源码编辑器',
        codeDrawerSync: '修改实时双向同步',
        codeDrawerLive: '● 实时同步',
        blocksModalTitle: '✨ 设计区块精选库',
        insertBlockBtn: '插入区块',
        reorderOnToast: '拖拽排序已开启：拖动区块进行重排',
        reorderOffToast: '拖拽排序已关闭',
        blockInsertedToast: '区块已成功插入',
        codeSyncedToast: '代码已同步',
        themesLabel: '🎨 主题',
        mockBtn: '⚡ 模拟数据',
        shareBtn: '📱 二维码预览',
        shareModalTitle: '📱 手机扫码实时预览',
        shareModalDesc: '手机连接同一局域网Wi-Fi后使用相机扫码：',
        copyShareLink: '复制链接',
        mockPopulatedToast: 'Mock数据已注入沙箱',
        themeAppliedToast: '设计系统主题已应用',
        blueprintBtn: '📐 线框原型',
        artifactsBtn: '📋 交互构件',
        artifactsModalTitle: '📋 交互式HTML构件生成器',
        wireframeArtifact: '📐 低保真线框图',
        planArtifact: '📋 交互式路线图',
        diagramArtifact: '📊 动态架构拓扑图',
        prototypeArtifact: '🧪 多步骤高保真原型',
        crudArtifact: '🗄️ Retool风格CRUD面板',
        resolveAnnotationBtn: '✓ 已解决',
        annotationResolvedToast: '批注已标记为解决',
        deployBtn: '🌍 部署',
        timetravelBtn: '⏳ 时间线',
        soundBtn: '🔊 声音',
        deployModalTitle: '🌍 一键快速Web发布',
        cancelBtn: '取消',
        consoleBtn: '控制台',
        consoleDrawerTitle: '微型控制台与运行时日志',
        consoleClearBtn: '清空',
        consoleFilterAll: '全部',
        consoleFilterErrors: '错误',
        consoleFilterWarnings: '警告',
        consoleFilterLogs: '日志',
        noConsoleLogs: '尚未捕获到控制台输出。',
        tweakerBarTitle: '微调工具条',
        tweakText: '文字',
        tweakPadding: '内边距',
        tweakRadius: '圆角',
        tweakEdit: '即时文本编辑',
        stateDefault: '默认',
        stateLoading: '加载中',
        stateEmpty: '空数据',
        stateError: '错误',
        stateOverflow: '文本溢出',
        snapshotBtn: '截屏快照',
        snapshotCapturedToast: '视觉快照已生成，就绪供多模态模型分析。',
        workspaceRoots: '工作区根目录',
        workspaceRootsDesc: '允许打开和预览的文件根目录（每行一个路径或逗号分隔）',
        fileOpenErrorTitle: '文件访问受限',
        fileOpenErrorFile: '文件',
        fileOpenErrorReason: '原因',
        fileOpenErrorGuidance: '如需预览默认工作区之外的文件，请在插件设置中的“workspaceRoots”或 deepseek-harness.config.json 中配置允许的路径。',
        allowedRootsLabel: '允许的根目录',
        checkUpdate: '检查更新',
        checkingUpdate: '正在检查更新…',
        updateAvailable: '发现新版本',
        upToDate: '已是最新版本',
        updatePlugin: '更新至',
        updating: '正在更新插件…',
        updateSuccess: '更新成功！请重启 DSH 使更改生效。',
        updateFailed: '更新失败，请查看服务端日志。',
        standaloneExportBtn: '单文件HTML',
        pageRefreshedToast: '页面已重新加载',
        resizeSmall: '紧凑 220px',
        resizeMedium: '标准 360px',
        resizeLarge: '大尺寸 540px',
        resizeWide: '全宽模式',
        resizeNormal: '默认宽度',
        openInLiveCanvas: '在实时画布中打开',
        openingLiveCanvas: '正在打开...',
        dragToResize: '拖动调整高度',
        canvasOpenedToast: '画布会话已打开',
        projectsHub: '项目中心',
        recentProjects: '最近项目',
        noRecentProjects: '未找到最近项目',
        searchProjectsPlaceholder: '搜索项目或文件...',
        demoTemplatesHeader: '快速开始示例模板'
      }
    };

    function getDict(locale) {
      if (locale && (locale.startsWith('zh') || locale === 'zh')) return i18n.zh;
      return i18n.en;
    }

    function getActiveLocale(ctx) {
      try {
        if (ctx && ctx.locale && ctx.locale.getSnapshot) {
          const snap = ctx.locale.getSnapshot();
          if (snap && snap.active) return snap.active;
        }
      } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
      if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
      }
      return 'en';
    }


    // ---------------------------------------------------------------- Settings Card Component
    function readSettingsScope(ctx) {
      if (!ctx) return null;
      try {
        if (typeof ctx.get === "function") {
          const found = ctx.get("configForms");
          if (found) return found;
        }
      } catch (_err) { /* Cordis throws when the service is not injected */ }
      try {
        return ctx.configForms || null;
      } catch (_err) {
        return null;
      }
    }

    function PluginCard(props) {
      const ctx = props.ctx;
      const [expanded, setExpanded] = React.useState(false);
      const [statusMsg, setStatusMsg] = React.useState(null);
      const [isSaving, setIsSaving] = React.useState(false);

      const locale = getActiveLocale(ctx);
      const t = (key) => {
        const dict = getDict(locale);
        return dict[key] || (i18n.en[key] || key);
      };

      const scope = React.useMemo(() => {
        const configForms = readSettingsScope(ctx);
        if (!configForms || typeof configForms.get !== "function") return null;
        try {
          return configForms.get(NS);
        } catch (_err) {
          return null;
        }
      }, [ctx]);

      const snapshot = scope ? scope.getSnapshot() : { status: 'unavailable', value: {} };

      const [draft, setDraft] = React.useState({
        defaultViewport: 'responsive',
        autoOpenOnHtmlGen: true,
        enableHotReload: true,
        maxSessionCache: 50,
        workspaceRoots: ''
      });

      const [updater, setUpdater] = React.useState(null);
      const [checkingUpdate, setCheckingUpdate] = React.useState(false);
      const [updating, setUpdating] = React.useState(false);
      const [updateNotice, setUpdateNotice] = React.useState(null);

      const checkUpdate = React.useCallback(async () => {
        setCheckingUpdate(true);
        try {
          const res = await fetch('/dsh-live-canvas/api/update?action=check').then(r => r.json());
          setUpdater(res);
        } catch (err) {
          console.warn('[dsh-live-canvas] Update check failed:', err);
        } finally {
          setCheckingUpdate(false);
        }
      }, []);

      React.useEffect(() => {
        if (expanded && !updater && !checkingUpdate) {
          checkUpdate();
        }
      }, [expanded, updater, checkingUpdate, checkUpdate]);

      const triggerUpdate = async () => {
        if (updating || !updater?.updateAvailable) return;
        setUpdating(true);
        setUpdateNotice(null);
        try {
          const res = await fetch('/dsh-live-canvas/api/update', {
            method: 'POST',
            headers: { 'x-dsh-plugin-update': '1', 'content-type': 'application/json' },
            body: JSON.stringify({ targetVersion: updater.latestVersion })
          }).then(r => r.json());
          if (res?.restartRequired || res?.status === 'ok') {
            setUpdateNotice({ type: 'ok', text: t('updateSuccess') });
            setUpdater(prev => ({ ...prev, currentVersion: res.updatedVersion || prev.latestVersion, updateAvailable: false }));
          } else {
            setUpdateNotice({ type: 'err', text: res?.error || t('updateFailed') });
          }
        } catch (err) {
          setUpdateNotice({ type: 'err', text: err?.message || t('updateFailed') });
        } finally {
          setUpdating(false);
        }
      };

      React.useEffect(() => {
        if (snapshot.status === 'ready' && snapshot.value) {
          const rawRoots = snapshot.value.workspaceRoots;
          const formattedRoots = Array.isArray(rawRoots) ? rawRoots.join('\n') : (rawRoots || '');
          setDraft({
            defaultViewport: snapshot.value.defaultViewport ?? 'responsive',
            autoOpenOnHtmlGen: snapshot.value.autoOpenOnHtmlGen ?? true,
            enableHotReload: snapshot.value.enableHotReload ?? true,
            maxSessionCache: snapshot.value.maxSessionCache ?? 50,
            workspaceRoots: formattedRoots
          });
        }
      }, [snapshot.status, snapshot.value]);

      const handleSave = async () => {
        if (!scope || snapshot.status !== 'ready') return;
        setIsSaving(true);
        setStatusMsg(null);
        try {
          const keys = ['defaultViewport', 'autoOpenOnHtmlGen', 'enableHotReload', 'maxSessionCache'];
          const errors = [];
          for (const key of keys) {
            try {
              await scope.set(key, draft[key]);
            } catch (err) {
              errors.push(key + ': ' + (err.message || err));
            }
          }
          try {
            const parsedRoots = (draft.workspaceRoots || '')
              .split(/[\n,]/)
              .map(s => s.trim())
              .filter(Boolean);
            await scope.set('workspaceRoots', parsedRoots);
          } catch (err) {
            errors.push('workspaceRoots: ' + (err.message || err));
          }
          if (errors.length > 0) {
            setStatusMsg({ type: 'err', text: t('saveError') + ': ' + errors.join(', ') });
          } else {
            setStatusMsg({ type: 'ok', text: t('saved') });
            setTimeout(() => setStatusMsg(null), 3000);
          }
        } catch (err) {
          setStatusMsg({ type: 'err', text: t('saveError') + ': ' + (err.message || err) });
        } finally {
          setIsSaving(false);
        }
      };

      const page = !!(props && props.view === 'page');
      // The Plugins page renders this entry twice. Summary is the one-liner under
      // the title and must not wait on the settings snapshot.
      if (props && props.view === 'summary') {
        return React.createElement('span', { className: 'dlc-sub' }, t('description'));
      }

      if (snapshot.status === 'loading' || snapshot.status === 'unavailable') {
        const text = snapshot.status === 'loading' ? t('loading') : t('unavailable');
        if (page) return React.createElement('div', { className: 'dlc-sub' }, text);
        return React.createElement('li', { className: 'dlc-card' },
          React.createElement('div', { className: 'dlc-head' },
            React.createElement('div', null,
              React.createElement('div', { className: 'dlc-title' }, t('title')),
              React.createElement('div', { className: 'dlc-sub' }, text)
            )
          )
        );
      }
      return React.createElement(page ? 'div' : 'li', { className: page ? 'dlc-page' : 'dlc-card' },
        React.createElement('button', {
          className: 'dlc-head',
          style: page ? { display: 'none' } : undefined,
          'aria-expanded': page ? true : expanded,
          onClick: () => setExpanded(!expanded)
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'dlc-title' }, t('title')),
            React.createElement('div', { className: 'dlc-sub' }, t('description'))
          ),
          React.createElement(Chevron, { open: expanded })
        ),
        (page || expanded) && React.createElement('div', { className: 'dlc-body' },
          // Field 1: defaultViewport
          React.createElement('div', { className: 'dlc-field' },
            React.createElement('label', { className: 'dlc-label' }, t('defaultViewport')),
            React.createElement('div', { className: 'dlc-desc' }, t('defaultViewportDesc')),
            React.createElement('select', {
              className: 'dlc-select',
              value: draft.defaultViewport,
              onChange: (e) => setDraft({ ...draft, defaultViewport: e.target.value })
            },
              React.createElement('option', { value: 'responsive' }, t('responsive')),
              React.createElement('option', { value: 'mobile' }, t('mobile')),
              React.createElement('option', { value: 'tablet' }, t('tablet')),
              React.createElement('option', { value: 'desktop' }, t('desktop')),
              React.createElement('option', { value: 'matrix' }, t('matrix'))
            )
          ),
          // Field 2: autoOpenOnHtmlGen
          React.createElement('div', { className: 'dlc-field' },
            React.createElement('div', { className: 'dlc-checkbox-row' },
              React.createElement('input', {
                type: 'checkbox',
                id: 'dlc-autoopen',
                className: 'dlc-checkbox',
                checked: draft.autoOpenOnHtmlGen,
                onChange: (e) => setDraft({ ...draft, autoOpenOnHtmlGen: e.target.checked })
              }),
              React.createElement('label', { htmlFor: 'dlc-autoopen', className: 'dlc-label' }, t('autoOpen'))
            ),
            React.createElement('div', { className: 'dlc-desc' }, t('autoOpenDesc'))
          ),
          // Field 3: enableHotReload
          React.createElement('div', { className: 'dlc-field' },
            React.createElement('div', { className: 'dlc-checkbox-row' },
              React.createElement('input', {
                type: 'checkbox',
                id: 'dlc-hotreload',
                className: 'dlc-checkbox',
                checked: draft.enableHotReload,
                onChange: (e) => setDraft({ ...draft, enableHotReload: e.target.checked })
              }),
              React.createElement('label', { htmlFor: 'dlc-hotreload', className: 'dlc-label' }, t('enableHotReload'))
            ),
            React.createElement('div', { className: 'dlc-desc' }, t('enableHotReloadDesc'))
          ),
          // Field 4: maxSessionCache
          React.createElement('div', { className: 'dlc-field' },
            React.createElement('label', { className: 'dlc-label' }, t('maxSessions')),
            React.createElement('div', { className: 'dlc-desc' }, t('maxSessionsDesc')),
            React.createElement('input', {
              type: 'number',
              className: 'dlc-input',
              value: draft.maxSessionCache,
              min: 5,
              max: 200,
              onChange: (e) => setDraft({ ...draft, maxSessionCache: parseInt(e.target.value, 10) || 50 })
            })
          ),
          // Field 5: workspaceRoots
          React.createElement('div', { className: 'dlc-field' },
            React.createElement('label', { className: 'dlc-label' }, t('workspaceRoots')),
            React.createElement('div', { className: 'dlc-desc' }, t('workspaceRootsDesc')),
            React.createElement('textarea', {
              className: 'dlc-input',
              style: { minHeight: '60px', fontFamily: 'monospace', fontSize: '12px', resize: 'vertical' },
              value: draft.workspaceRoots,
              placeholder: '/path/to/project\nC:\\Projects',
              onChange: (e) => setDraft({ ...draft, workspaceRoots: e.target.value })
            })
          ),
          // Updater Section (#108)
          React.createElement('div', {
            style: {
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'color-mix(in srgb, var(--dsw-alias-state-brand-primary) 8%, var(--dsw-alias-bg-layer-2))',
              border: '1px solid var(--dsw-alias-border-l2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
              React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: 'var(--dsw-alias-label-primary)' } },
                '📦 Live Canvas ' + (updater?.currentVersion ? ('v' + updater.currentVersion) : '')
              ),
              React.createElement('button', {
                type: 'button',
                className: 'dlc-btn dlc-btn-sm',
                disabled: checkingUpdate || updating,
                onClick: checkUpdate,
                style: { fontSize: '11px', padding: '3px 8px' }
              }, checkingUpdate ? t('checkingUpdate') : t('checkUpdate'))
            ),
            updater?.updateAvailable && React.createElement('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'color-mix(in srgb, var(--dsw-alias-state-warning-primary) 12%, transparent)',
                border: '1px solid var(--dsw-alias-state-warning-primary)',
                fontSize: '12px'
              }
            },
              React.createElement('span', null, '🚀 ' + t('updateAvailable') + ': v' + updater.currentVersion + ' → v' + updater.latestVersion),
              React.createElement('button', {
                type: 'button',
                className: 'dlc-btn dlc-btn-sm',
                disabled: updating,
                onClick: triggerUpdate,
                style: {
                  background: 'var(--dsw-alias-state-brand-primary)',
                  color: 'var(--dsw-alias-text-contrast)',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600
                }
              }, updating ? t('updating') : (t('updatePlugin') + ' v' + updater.latestVersion))
            ),
            updater && !updater.updateAvailable && React.createElement('div', {
              style: { fontSize: '11px', color: 'var(--dsw-alias-state-success-primary)' }
            }, '✓ ' + t('upToDate')),
            updateNotice && React.createElement('div', {
              style: {
                fontSize: '12px',
                padding: '6px 10px',
                borderRadius: '6px',
                color: updateNotice.type === 'ok' ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-error-primary)',
                background: updateNotice.type === 'ok' ? 'color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent)' : 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)'
              }
            }, updateNotice.text)
          ),
          // Footer with Save Button
          React.createElement('div', { className: 'dlc-foot' },
            statusMsg && React.createElement('span', {
              className: 'dlc-status-msg ' + (statusMsg.type === 'ok' ? 'dlc-status-ok' : 'dlc-status-err')
            }, statusMsg.text),
            React.createElement('button', {
              className: 'dlc-save',
              disabled: isSaving,
              onClick: handleSave
            }, isSaving ? t('loading') : t('save'))
          )
        )
      );
    }

    
    const CHAT_CARD_CSS = `
      .dlc-chat-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 12px;
        background: var(--dsw-alias-bg-layer-3);
        max-width: 580px;
        width: 100%;
        box-shadow: var(--dsw-alias-shadow-l2);
        margin: 8px 0;
      }
      .dlc-chat-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .dlc-chat-card-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3px 10px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 12%, transparent);
        color: var(--dsw-alias-state-brand-primary);
        border: 1px solid color-mix(in srgb, var(--dsw-alias-state-brand-primary) 25%, transparent);
        font-size: 11px;
        font-weight: 600;
      }
      .dlc-chat-card-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--dsw-alias-label-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        text-align: right;
      }
      .dlc-chat-card-frame-box {
        position: relative;
        width: 100%;
        height: 280px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid var(--dsw-alias-border-l2);
        background: var(--dsw-alias-bg-layer-1);
      }
      .dlc-chat-card-iframe {
        width: 100%;
        height: 100%;
        border: none;
        pointer-events: auto;
      }
      .dlc-chat-card-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .dlc-chat-card-btn-primary {
        appearance: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 14px;
        border-radius: 8px;
        background: var(--dsw-alias-label-primary);
        color: var(--dsw-alias-bg-layer-3);
        font-size: 12px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .dlc-chat-card-btn-primary:hover {
        opacity: 0.88;
      }
      .dlc-chat-card-btn-secondary {
        appearance: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 7px 12px;
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid var(--dsw-alias-border-l2);
        text-decoration: none;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .dlc-chat-card-btn-secondary:hover {
        background: var(--dsw-alias-bg-layer-4);
        border-color: var(--dsw-alias-label-dimmed);
      }
      .dlc-chat-card-wide {
        max-width: 100% !important;
      }
      .dlc-chat-card-head-controls {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .dlc-chat-card-size-btn {
        appearance: none;
        background: var(--dsw-alias-bg-layer-2);
        border: 1px solid var(--dsw-alias-border-l2);
        color: var(--dsw-alias-label-secondary);
        border-radius: 6px;
        padding: 2px 7px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        line-height: 1.4;
      }
      .dlc-chat-card-size-btn:hover {
        background: var(--dsw-alias-bg-layer-4);
        color: var(--dsw-alias-label-primary);
        border-color: var(--dsw-alias-label-dimmed);
      }
      .dlc-chat-card-size-btn-active {
        background: color-mix(in srgb, var(--dsw-alias-state-brand-primary) 14%, transparent);
        color: var(--dsw-alias-state-brand-primary);
        border-color: var(--dsw-alias-state-brand-primary);
      }
      .dlc-chat-card-resize-bar {
        width: 100%;
        height: 10px;
        cursor: ns-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--dsw-alias-bg-layer-2);
        border-top: 1px solid var(--dsw-alias-border-l2);
        user-select: none;
        touch-action: none;
        transition: background 0.15s ease;
      }
      .dlc-chat-card-resize-bar:hover {
        background: var(--dsw-alias-bg-layer-4);
      }
      .dlc-chat-card-resize-handle {
        width: 36px;
        height: 3px;
        border-radius: 2px;
        background: var(--dsw-alias-border-l1);
      }
      .dlc-chat-card-dragging iframe {
        pointer-events: none !important;
      }
    `;

    const CHAT_CARD_CSS_ID = 'dsh-live-canvas/chat-card.module.css';
    if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css="' + CHAT_CARD_CSS_ID + '"]')) {
      const tag = document.createElement('style');
      tag.textContent = CHAT_CARD_CSS;
      tag.setAttribute('data-plugin', 'dsh-live-canvas');
      tag.dataset.dshPlugin = 'dsh-live-canvas';
      tag.dataset.pluginCss = CHAT_CARD_CSS_ID;
      document.head.appendChild(tag);
    }


    // ── Live Canvas Chat Result Card ────────────────────────────────
    function parseToolBlockData(block) {
      let canvasId = '';
      let previewUrl = '';
      let title = 'Live Canvas Artifact';
      let badgeText = '🌐 Live Canvas';
      
      try {
        if (block) {
          const content = Array.isArray(block.content) ? block.content : [];
          for (const item of content) {
            if (item && item.type === 'text' && typeof item.text === 'string') {
              const m = item.text.match(/\/dsh-live-canvas\/sandbox\/([a-zA-Z0-9_-]+)/);
              if (m) {
                canvasId = m[1];
                previewUrl = m[0];
              }
            }
          }

          const raw = (block.call && block.call.argsRaw) || block.argsRaw || '';
          if (raw) {
            const args = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (args.title) title = args.title;
            if (args.canvasId) canvasId = args.canvasId;
            if (args.layout) badgeText = '📐 Wireframe (' + args.layout + ')';
            else if (args.version) badgeText = '📋 Roadmap ' + args.version;
            else if (args.diagramType) badgeText = '📊 Diagram (' + args.diagramType + ')';
            else if (args.flowType) badgeText = '🧪 Prototype (' + args.flowType + ')';
            else if (args.filePath) badgeText = '📄 ' + args.filePath;
          }
        }
      } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      
      let filePath = null;
      try {
        if (block) {
          const raw = (block.call && block.call.argsRaw) || block.argsRaw || '';
          if (raw) {
            const args = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (args.filePath) filePath = args.filePath;
          }
        }
      } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }

      if (!canvasId) canvasId = 'default';
      if (!previewUrl) previewUrl = '/dsh-live-canvas/sandbox/' + canvasId;
      return { canvasId, previewUrl, title, badgeText, filePath };
    }

    function openLiveCanvasInSidebar(canvasId, filePath, ctx) {
      try {
        if (typeof window === 'undefined') return false;

        if (canvasId) {
          localStorage.setItem('dsh_live_canvas_active_target', canvasId);
        }
        if (filePath) {
          localStorage.setItem('dsh_live_canvas_active_file', filePath);
        }

        // 1. Native DSH Right Sidebar via Cordis service
        const sr = (ctx && (ctx.sidebarRight || (ctx.get && ctx.get('sidebarRight')))) ||
                   rootSidebarRight ||
                   window.__dshSidebarRight;

        if (sr && typeof sr.openTab === 'function') {
          try {
            if (typeof sr.isExpanded === 'function' && !sr.isExpanded()) {
              if (typeof sr.toggleExpanded === 'function') sr.toggleExpanded();
            }
            sr.openTab('live-canvas');
          } catch (e) {
            console.warn('[LiveCanvas] sr.openTab failed:', e);
          }
        }

        // 2. Legacy BetterSidebar fallback
        const bs = (ctx && (ctx.betterSidebar || (ctx.get && ctx.get('betterSidebar')))) ||
                   window.__dshBetterSidebar;
        if (bs && typeof bs.openTab === 'function') {
          try {
            bs.openTab({ type: 'live-canvas', title: 'Live Canvas' });
          } catch (e) {
            console.warn('[LiveCanvas] bs.openTab failed:', e);
          }
        }

        // 3. Fallback DOM trigger: expand button and guide entry click
        if (typeof document !== 'undefined') {
          const expandBtn = document.querySelector('[data-sidebar-right-expand]');
          const panel = document.querySelector('[data-sidebar-right-panel]');
          const isPanelOpen = panel && panel.hasAttribute('data-sidebar-right-open');
          if (expandBtn && !isPanelOpen) {
            expandBtn.click();
          }

          setTimeout(() => {
            const guideEntry = document.querySelector(
              '[data-sidebar-right-guide-entry="live-canvas"], [data-tab-kind="live-canvas"], button[title*="Live Canvas"], button[aria-label*="Live Canvas"]'
            );
            if (guideEntry) {
              guideEntry.click();
            }
          }, 60);
        }

        // 4. Dispatch custom event with both canvasId and filePath
        window.dispatchEvent(new CustomEvent('dsh:open-live-canvas', {
          detail: { canvasId, filePath }
        }));

        return true;
      } catch (err) {
        console.error('[LiveCanvas] Error in openLiveCanvasInSidebar:', err);
        return false;
      }
    }

    function LiveCanvasChatCard(props) {
      const block = props.block;
      const data = parseToolBlockData(block);
      const ctx = props.ctx;
      const locale = getActiveLocale(ctx);
      const t = (k) => (getDict(locale)[k] || (i18n.en && i18n.en[k]) || k);

      const [isOpenInTab, setIsOpenInTab] = React.useState(false);
      const [isWide, setIsWide] = React.useState(false);
      const [refreshKey, setRefreshKey] = React.useState(0);

      let initialHeight = 320;
      try {
        const saved = parseInt(localStorage.getItem('dsh_live_canvas_chat_height'), 10);
        if (!isNaN(saved) && saved >= 180 && saved <= 1200) initialHeight = saved;
      } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      const [cardHeight, setCardHeight] = React.useState(initialHeight);
      const [isDragging, setIsDragging] = React.useState(false);
      const cardHeightRef = React.useRef(cardHeight);
      cardHeightRef.current = cardHeight;

      const handleDragStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const startY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        const startH = cardHeightRef.current;

        const onMove = (moveEv) => {
          const curY = moveEv.clientY !== undefined ? moveEv.clientY : (moveEv.touches && moveEv.touches[0] ? moveEv.touches[0].clientY : 0);
          const delta = curY - startY;
          const nextH = Math.max(180, Math.min(1200, Math.round(startH + delta)));
          setCardHeight(nextH);
        };

        const onEnd = () => {
          setIsDragging(false);
          try {
            localStorage.setItem('dsh_live_canvas_chat_height', String(cardHeightRef.current));
          } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onEnd);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onEnd);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);
      };

      const handleOpenStudio = () => {
        setIsOpenInTab(true);
        openLiveCanvasInSidebar(data.canvasId, data.filePath, ctx);
        setTimeout(() => setIsOpenInTab(false), 2500);
      };

      const handleRefreshCard = () => {
        setRefreshKey(prev => prev + 1);
      };

      const setPresetHeight = (h) => {
        setCardHeight(h);
        try {
          localStorage.setItem('dsh_live_canvas_chat_height', String(h));
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const previewSrc = data.previewUrl + (data.previewUrl.includes('?') ? '&' : '?') + (refreshKey > 0 ? 't=' + refreshKey : '');

      return React.createElement('div', { className: 'dlc-chat-card' + (isWide ? ' dlc-chat-card-wide' : '') },
        React.createElement('div', { className: 'dlc-chat-card-head' },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 } },
            React.createElement('div', { className: 'dlc-chat-card-badge' }, data.badgeText),
            React.createElement('div', { className: 'dlc-chat-card-title', title: data.title }, data.title)
          ),
          React.createElement('div', { className: 'dlc-chat-card-head-controls' },
            React.createElement('button', {
              type: 'button',
              className: 'dlc-chat-card-size-btn' + (cardHeight === 220 ? ' dlc-chat-card-size-btn-active' : ''),
              title: t('resizeSmall'),
              onClick: () => setPresetHeight(220)
            }, 'S'),
            React.createElement('button', {
              type: 'button',
              className: 'dlc-chat-card-size-btn' + (cardHeight === 360 ? ' dlc-chat-card-size-btn-active' : ''),
              title: t('resizeMedium'),
              onClick: () => setPresetHeight(360)
            }, 'M'),
            React.createElement('button', {
              type: 'button',
              className: 'dlc-chat-card-size-btn' + (cardHeight === 540 ? ' dlc-chat-card-size-btn-active' : ''),
              title: t('resizeLarge'),
              onClick: () => setPresetHeight(540)
            }, 'L'),
            React.createElement('button', {
              type: 'button',
              className: 'dlc-chat-card-size-btn' + (isWide ? ' dlc-chat-card-size-btn-active' : ''),
              title: isWide ? t('resizeNormal') : t('resizeWide'),
              onClick: () => setIsWide(!isWide)
            }, isWide ? '⤡' : '⤢'),
            React.createElement('button', {
              type: 'button',
              className: 'dlc-chat-card-size-btn',
              title: t('refreshBtn'),
              onClick: handleRefreshCard
            }, '🔄')
          )
        ),
        React.createElement('div', {
          className: 'dlc-chat-card-frame-box' + (isDragging ? ' dlc-chat-card-dragging' : ''),
          style: { height: cardHeight + 'px' }
        },
          React.createElement('iframe', {
            className: 'dlc-chat-card-iframe',
            src: previewSrc,
            sandbox: 'allow-scripts allow-forms allow-same-origin allow-modals'
          }),
          React.createElement('div', {
            className: 'dlc-chat-card-resize-bar',
            title: t('dragToResize'),
            onMouseDown: handleDragStart,
            onTouchStart: handleDragStart
          },
            React.createElement('div', { className: 'dlc-chat-card-resize-handle' })
          )
        ),
        React.createElement('div', { className: 'dlc-chat-card-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'dlc-chat-card-btn-primary',
            onClick: handleOpenStudio
          }, isOpenInTab ? ('✓ ' + t('openingLiveCanvas')) : ('🚀 ' + t('openInLiveCanvas'))),
          React.createElement('a', {
            className: 'dlc-chat-card-btn-secondary',
            href: data.previewUrl,
            target: '_blank'
          }, '↗ ' + t('openTabBtn')),
          React.createElement('a', {
            className: 'dlc-chat-card-btn-secondary',
            href: '/dsh-live-canvas/api/export?canvasId=' + data.canvasId,
            download: 'live-canvas-export.html'
          }, '📥 ' + t('exportBtn'))
        )
      );
    }

    // ---------------------------------------------------------------- Live Canvas Workspace Component
    function LiveCanvasWorkspace(props) {
      const ctx = props.ctx;
      const locale = getActiveLocale(ctx);
      const t = (key) => {
        const dict = getDict(locale);
        return dict[key] || (i18n.en[key] || key);
      };

      let parkedId = null;
      try {
        parkedId = localStorage.getItem('dsh_live_canvas_active_target');
        if (parkedId) localStorage.removeItem('dsh_live_canvas_active_target');
      } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      const initialCanvasId = props.canvasId || parkedId || null;
      const [canvasId, setCanvasId] = React.useState(initialCanvasId);
      const canvasIdRef = React.useRef(canvasId);
      canvasIdRef.current = canvasId;

      const [sessions, setSessions] = React.useState([]);
      const [workspaceFiles, setWorkspaceFiles] = React.useState([]);
      const [currentFilePath, setCurrentFilePath] = React.useState(null);
      const [showFilePicker, setShowFilePicker] = React.useState(false);
      const [fileFilter, setFileFilter] = React.useState('');
      const [customPath, setCustomPath] = React.useState('');
      const [viewport, setViewport] = React.useState('responsive');
      const [theme, setTheme] = React.useState('dark');
      const [inspectorActive, setInspectorActive] = React.useState(false);
      const [annotateActive, setAnnotateActive] = React.useState(false);
      const [inspectedElement, setInspectedElement] = React.useState(null);
      const [annotations, setAnnotations] = React.useState([]);
      const [logs, setLogs] = React.useState([]);
      const [showConsole, setShowConsole] = React.useState(false);
      const [showControls, setShowControls] = React.useState(false);
      const [controlsSchema, setControlsSchema] = React.useState(null);
      const [controlValues, setControlValues] = React.useState({});
      const [hasMock, setHasMock] = React.useState(false);
      const [showAiModal, setShowAiModal] = React.useState(false);
      const [aiPromptText, setAiPromptText] = React.useState('');
      const [toastMsg, setToastMsg] = React.useState(null);
      const [reorderMode, setReorderMode] = React.useState(false);
      const [codeDrawerOpen, setCodeDrawerOpen] = React.useState(false);
      const [editorCode, setEditorCode] = React.useState('');
      const [showBlocksModal, setShowBlocksModal] = React.useState(false);
      const [designBlocks, setDesignBlocks] = React.useState([]);
      const [themesList, setThemesList] = React.useState([]);
      const [selectedTheme, setSelectedTheme] = React.useState('linear-dark');
      const [showShareModal, setShowShareModal] = React.useState(false);
      const [shareInfo, setShareInfo] = React.useState(null);
      const [blueprintMode, setBlueprintMode] = React.useState(false);
      const [showArtifactsModal, setShowArtifactsModal] = React.useState(false);
      const [showDeployModal, setShowDeployModal] = React.useState(false);
      const [deployTarget, setDeployTarget] = React.useState('vercel');
      const [deployBundle, setDeployBundle] = React.useState(null);
      const [soundEnabled, setSoundEnabled] = React.useState(false);
      const frameRef = React.useRef(null);
      const matrixFramesRef = React.useRef([]);

      
      
      const handleOpenDeploy = async () => {
        if (!canvasId) return;
        try {
          const res = await fetch('/dsh-live-canvas/api/deploy?canvasId=' + canvasId + '&target=' + deployTarget);
          const data = await res.json();
          if (data.success) {
            setDeployBundle(data.bundle);
            setShowDeployModal(true);
          }
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const handleOpenTimeTravel = () => {
        if (!canvasId) return;
        window.open('/dsh-live-canvas/timetravel/' + canvasId, '_blank');
      };

      const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        if (frameRef.current && frameRef.current.contentWindow && frameRef.current.contentWindow.__DLC_SOUND__) {
          frameRef.current.contentWindow.__DLC_SOUND__.play(next ? 'levelup' : 'tap');
        }
        showToast(next ? '🔊 Sound FX enabled' : '🔇 Sound FX muted');
      };

      const fetchDesignBlocks = async () => {
        try {
          const res = await fetch('/dsh-live-canvas/api/templates');
          const data = await res.json();
          if (data.success && data.templates) setDesignBlocks(data.templates);
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const fetchThemes = async () => {
        try {
          const res = await fetch('/dsh-live-canvas/api/themes');
          const data = await res.json();
          if (data.success && data.themes) setThemesList(data.themes);
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const handleInsertBlock = async (block) => {
        setShowBlocksModal(false);
        if (!canvasId) return;
        try {
          await fetch('/dsh-live-canvas/api/save-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvasId, content: block.htmlSnippet || block.content })
          });
          showToast(t('blockInsertedToast') || 'Block inserted');
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const handlePopulateMock = async (type = 'users') => {
        if (!canvasId) return;
        try {
          const res = await fetch('/dsh-live-canvas/api/mocks?type=' + type + '&count=6');
          const data = await res.json();
          if (data.success && data.data) {
            const endpoint = '/api/' + type;
            showToast((t('mockPopulatedToast') || 'Mock data applied') + ' (' + endpoint + ')');
          }
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const handleOpenShare = async () => {
        try {
          const res = await fetch('/dsh-live-canvas/api/share-info?canvasId=' + (canvasId || 'default'));
          const data = await res.json();
          if (data.success && data.share) {
            setShareInfo(data.share);
            setShowShareModal(true);
          }
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const handleCreateArtifact = async (type) => {
        setShowArtifactsModal(false);
        try {
          const newCid = type + '-artifact-' + Date.now().toString(36);
          let initialHtml = '';
          if (type === 'wireframe') {
            initialHtml = '<div class="p-8 font-mono text-zinc-300"><h1>[Low-Fi Wireframe]</h1><p>Structural layout initialized.</p></div>';
          } else if (type === 'plan') {
            initialHtml = '<div class="p-8 text-zinc-200"><h1>Release Readiness Roadmap</h1><p>Interactive plan initialized.</p></div>';
          } else if (type === 'diagram') {
            initialHtml = '<div class="p-8 text-zinc-200"><h1>System Architecture Diagram</h1><p>Node graph initialized.</p></div>';
          } else if (type === 'prototype') {
            initialHtml = '<div class="p-8 text-zinc-200"><h1>Interactive Prototype</h1><p>Multi-step wizard initialized.</p></div>';
          }
          const res = await fetch('/dsh-live-canvas/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              canvasId: newCid,
              title: type.toUpperCase() + ' Artifact',
              content: initialHtml,
              componentType: 'html'
            })
          });
          const data = await res.json();
          if (data.success && data.canvasId) {
            setCanvasId(data.canvasId);
            canvasIdRef.current = data.canvasId;
            if (frameRef.current) {
              frameRef.current.src = '/dsh-live-canvas/sandbox/' + data.canvasId;
            }
            loadSessionsAndFiles();
            fetchDesignBlocks();
            fetchThemes();
            showToast((t(type + 'Artifact') || type) + ' created');
          }
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const handleResolveAnnotation = async (annId) => {
        if (!canvasId) return;
        try {
          await fetch('/dsh-live-canvas/api/annotations/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ canvasId, annotationId: annId, note: 'Resolved via studio UI' })
          });
          fetch('/dsh-live-canvas/api/annotations?canvasId=' + canvasId)
            .then(r => r.json())
            .then(d => { if (d.annotations) setAnnotations(d.annotations); });
          showToast(t('annotationResolvedToast') || 'Annotation resolved');
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      const toggleBlueprintMode = () => {
        const next = !blueprintMode;
        setBlueprintMode(next);
        if (frameRef.current && frameRef.current.contentDocument) {
          const doc = frameRef.current.contentDocument;
          if (next) {
            doc.documentElement.classList.add('dlc-blueprint-mode');
            let styleEl = doc.getElementById('dlc-blueprint-css');
            if (!styleEl) {
              styleEl = doc.createElement('style');
              styleEl.id = 'dlc-blueprint-css';
              styleEl.textContent = 'html { filter: grayscale(100%) contrast(120%) !important; }';
              doc.head.appendChild(styleEl);
            }
          } else {
            doc.documentElement.classList.remove('dlc-blueprint-mode');
            const styleEl = doc.getElementById('dlc-blueprint-css');
            if (styleEl) styleEl.remove();
          }
        }
      };

      const [fileOpenError, setFileOpenError] = React.useState(null);

      const openFile = (filePath) => {
        if (!filePath) return;
        setCurrentFilePath(filePath);
        setFileOpenError(null);
        fetch('/dsh-live-canvas/api/open-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath })
        })
          .then(async (r) => {
            const data = await r.json().catch(() => ({}));
            if (!r.ok || data.error) {
              const errMsg = data.error || ('HTTP ' + r.status);
              setFileOpenError({
                path: filePath,
                error: errMsg,
                code: data.code,
                allowedRoots: data.allowedRoots || []
              });
              showToast('Error: ' + errMsg);
              return;
            }
            if (data.canvasId) {
              setFileOpenError(null);
              setCanvasId(data.canvasId);
              canvasIdRef.current = data.canvasId;
              setShowFilePicker(false);
              const targetUrl = `/dsh-live-canvas/sandbox/${data.canvasId}?t=${Date.now()}`;
              if (frameRef.current) {
                frameRef.current.src = targetUrl;
              }
              matrixFramesRef.current.forEach(f => {
                if (f) f.src = targetUrl;
              });
              showToast(`Opened: ${data.title || filePath}`);
              fetch('/dsh-live-canvas/api/sessions')
                .then(r => r.json())
                .then(d => { if (d.sessions) setSessions(d.sessions); })
                .catch(err => console.warn('[LiveCanvas] sessions fetch error:', err));
            }
          })
          .catch(err => {
            console.warn('[LiveCanvas] Error opening target file -', err);
            setFileOpenError({
              path: filePath,
              error: err.message || String(err),
              allowedRoots: []
            });
            showToast('Failed to open: ' + (err.message || err));
          });
      };

      const loadSessionsAndFiles = () => {
        fetch('/dsh-live-canvas/api/sessions')
          .then(r => r.json())
          .then(data => {
            if (data.sessions && Array.isArray(data.sessions)) {
              setSessions(data.sessions);
              if (!canvasIdRef.current && data.sessions.length > 0) {
                setCanvasId(data.sessions[0].id);
                canvasIdRef.current = data.sessions[0].id;
              }
            }
          })
          .catch(() => {});

        fetch('/dsh-live-canvas/api/workspace-files')
          .then(r => r.json())
          .then(data => {
            if (data.files && Array.isArray(data.files)) {
              setWorkspaceFiles(data.files);
              // Auto-open first workspace file if no canvas session is loaded yet!
              if (!canvasIdRef.current && data.files.length > 0) {
                openFile(data.files[0].path);
              }
            }
          })
          .catch(() => {});
      };

      React.useEffect(() => {
        const handleOpenEvent = (e) => {
          if (e && e.detail) {
            if (e.detail.canvasId) {
              setCanvasId(e.detail.canvasId);
              canvasIdRef.current = e.detail.canvasId;
              if (frameRef.current) {
                frameRef.current.src = '/dsh-live-canvas/sandbox/' + e.detail.canvasId + '?t=' + Date.now();
              }
              loadSessionsAndFiles();
              showToast(t('canvasOpenedToast'));
            } else if (e.detail.filePath) {
              openFile(e.detail.filePath);
            }
          }
        };
        window.addEventListener('dsh:open-live-canvas', handleOpenEvent);
        return () => window.removeEventListener('dsh:open-live-canvas', handleOpenEvent);
      }, []);

      React.useEffect(() => {
        const handleMsg = (ev) => {
          if (!ev.data) return;
          if (ev.data.type === 'DLC_CONSOLE_LOG') {
            setLogs(prev => [...prev.slice(-199), {
              id: Date.now() + Math.random(),
              level: ev.data.level || 'log',
              message: ev.data.message || '',
              timestamp: ev.data.timestamp || Date.now()
            }]);
          } else if (ev.data.type === 'DLC_SNAPSHOT_RESULT') {
            showToast(t('snapshotCapturedToast'));
          }
        };
        window.addEventListener('message', handleMsg);
        return () => window.removeEventListener('message', handleMsg);
      }, []);

      React.useEffect(() => {
        loadSessionsAndFiles();

        let sse = null;
        try {
          sse = new EventSource('/dsh-live-canvas/events');
          sse.addEventListener('update', (e) => {
            try {
              const p = JSON.parse(e.data || '{}');
              if (p.canvasId && p.canvasId === canvasIdRef.current) {
                if (frameRef.current) {
                  frameRef.current.src = `/dsh-live-canvas/sandbox/${p.canvasId}?t=${Date.now()}`;
                }
              } else if (!canvasIdRef.current && p.canvasId) {
                setCanvasId(p.canvasId);
                canvasIdRef.current = p.canvasId;
              }
            } catch (err) {
              console.warn('[dsh-live-canvas] Error parsing SSE update payload:', err);
            }
            fetch('/dsh-live-canvas/api/sessions')
              .then(r => r.json())
              .then(d => { if (d.sessions) setSessions(d.sessions); })
              .catch(err => console.warn('[dsh-live-canvas] Error refreshing sessions:', err));
          });
          sse.addEventListener('workspace_files_changed', () => {
            loadSessionsAndFiles();
          });
          sse.addEventListener('watcher_error', (e) => {
            try {
              const payload = JSON.parse(e.data || '{}');
              console.warn('[dsh-live-canvas] Workspace watcher error:', payload.message);
              showToast('Watcher warning: ' + (payload.message || 'filesystem error'));
            } catch (err) {
              console.warn('[dsh-live-canvas] Watcher error received');
            }
          });
          sse.onerror = (err) => {
            console.warn('[dsh-live-canvas] SSE connection interrupted:', err);
          };
        } catch (err) {
          console.warn('[dsh-live-canvas] Could not setup EventSource:', err);
        }

        return () => {
          if (sse) sse.close();
        };
      }, []);

      React.useEffect(() => {
        if (initialCanvasId && initialCanvasId !== 'default' && initialCanvasId !== canvasIdRef.current) {
          setCanvasId(initialCanvasId);
          canvasIdRef.current = initialCanvasId;
        }
      }, [initialCanvasId]);

      const handleDropdownChange = (val) => {
        if (!val) return;
        if (val === 'hub') {
          setCurrentFilePath(null);
          setCanvasId('hub');
          canvasIdRef.current = 'hub';
          const targetUrl = `/dsh-live-canvas/sandbox/hub?t=${Date.now()}`;
          if (frameRef.current) frameRef.current.src = targetUrl;
          matrixFramesRef.current.forEach(f => { if (f) f.src = targetUrl; });
          return;
        }
        if (val.startsWith('ws_path_')) {
          const filePath = val.replace('ws_path_', '');
          setCurrentFilePath(filePath);
          openFile(filePath);
        } else {
          setCurrentFilePath(null);
          setCanvasId(val);
          canvasIdRef.current = val;
          const targetUrl = `/dsh-live-canvas/sandbox/${val}?t=${Date.now()}`;
          if (frameRef.current) {
            frameRef.current.src = targetUrl;
          }
          matrixFramesRef.current.forEach(f => {
            if (f) f.src = targetUrl;
          });
        }
      };

      const activeId = currentFilePath ? ('file_' + currentFilePath) : (canvasId || (sessions[0] && sessions[0].id) || 'hub');
      const activeSession = sessions.find(s => s.id === activeId);
      const selectedDropdownValue = currentFilePath
        ? ('ws_path_' + currentFilePath)
        : ((activeSession && activeSession.filePath)
            ? ('ws_path_' + activeSession.filePath)
            : (canvasId === 'hub' ? 'hub' : (canvasId || (sessions[0] && sessions[0].id) ? activeId : 'hub')));
      const srcUrl = `/dsh-live-canvas/sandbox/${activeId}`;

      React.useEffect(() => {
        if (!activeId || activeId === 'default') return;

        fetch(`/dsh-live-canvas/api/controls?canvasId=${activeId}`)
          .then(r => r.json())
          .then(data => {
            if (data.controls && Object.keys(data.controls).length > 0) {
              setControlsSchema(data.controls);
              setControlValues(data.values || {});
            } else {
              setControlsSchema(null);
              setControlValues({});
            }
          })
          .catch(() => {});

        fetch(`/dsh-live-canvas/api/mock?canvasId=${activeId}`)
          .then(r => r.json())
          .then(data => {
            if (data.mockData && Object.keys(data.mockData).length > 0) {
              setHasMock(true);
            } else {
              setHasMock(false);
            }
          })
          .catch(() => {});
      }, [activeId]);

      React.useEffect(() => {
        function handleWindowMessage(e) {
          if (e.data && (e.data.type === 'dlc_session_created' || e.data.type === 'dlc_open_session')) {
            if (e.data.canvasId) {
              setCurrentFilePath(null);
              setCanvasId(e.data.canvasId);
              canvasIdRef.current = e.data.canvasId;
              loadSessionsAndFiles();
              showToast(t('canvasOpenedToast'));
            }
          }
          if (e.data && e.data.type === 'dlc_open_file') {
            if (e.data.filePath) {
              openFile(e.data.filePath);
            }
          }
          if (e.data && e.data.type === 'dlc_element_inspected') {
            setInspectedElement(e.data);
          }
          if (e.data && e.data.type === 'dlc_telemetry_log') {
            setLogs((prev) => [e.data, ...prev].slice(0, 30));
          }
          if (e.data && e.data.type === 'dlc_annotation_created') {
            setAnnotations((prev) => [e.data, ...prev].slice(0, 20));
          }
          if (e.data && e.data.type === 'dlc_reorder_applied') {
            showToast(t('reorderOffToast'));
          }
          if (e.data && e.data.type === 'dlc_save_text_edit') {
            setToastMsg('💾 Text successfully saved to workspace file!');
            setTimeout(() => setToastMsg(null), 3000);
          }
          if (e.data && e.data.type === 'dlc_scroll_report') {
            const percentY = e.data.percentY;
            matrixFramesRef.current.forEach(f => {
              if (f && f.contentWindow && f.contentWindow !== e.source) {
                f.contentWindow.postMessage({ type: 'dlc_sync_scroll', percentY }, '*');
              }
            });
          }
        }
        window.addEventListener('message', handleWindowMessage);
        return () => window.removeEventListener('message', handleWindowMessage);
      }, []);

      const handleControlChange = (key, value) => {
        const next = { ...controlValues, [key]: value };
        setControlValues(next);
        const broadcast = (win) => {
          if (win) win.postMessage({ type: 'dlc_set_props', props: next }, '*');
        };
        if (frameRef.current) broadcast(frameRef.current.contentWindow);
        matrixFramesRef.current.forEach(f => f && broadcast(f.contentWindow));

        fetch('/dsh-live-canvas/api/controls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canvasId: activeId, values: { [key]: value } })
        }).catch(() => {});
      };

      const toggleReorder = () => {
        const next = !reorderMode;
        setReorderMode(next);
        if (frameRef.current && frameRef.current.contentWindow) {
          frameRef.current.contentWindow.postMessage({ type: 'dlc_set_reorder_mode', enabled: next }, '*');
        }
        showToast(next ? t('reorderOnToast') : t('reorderOffToast'));
      };

      const handleCodeChange = (newCode) => {
        setEditorCode(newCode);
        if (window.__dlc_editor_timer) clearTimeout(window.__dlc_editor_timer);
        window.__dlc_editor_timer = setTimeout(async () => {
          if (!canvasId) return;
          try {
            const active = sessions.find(s => s.id === canvasId);
            await fetch('/dsh-live-canvas/api/preview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                canvasId,
                content: newCode,
                title: active ? active.title : 'Live Canvas',
                componentType: active ? active.componentType : 'auto',
                filePath: active ? active.filePath : ''
              })
            });
            showToast(t('codeSyncedToast'));
          } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
        }, 400);
      };

      const insertDesignBlock = async (block) => {
        setShowBlocksModal(false);
        const active = sessions.find(s => s.id === canvasId);
        const current = active ? (active.content || '') : '';
        const updated = current + '\n' + block.htmlSnippet;
        handleCodeChange(updated);
        showToast(t('blockInsertedToast') + ': ' + block.title);
      };

      const handleOpenStorybook = async () => {
        try {
          const res = await fetch('/dsh-live-canvas/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              canvasId: 'storybook-ui-kit',
              title: 'Storybook UI Kit Matrix',
              componentType: 'gallery',
              content: '<div class="p-8 text-center text-zinc-400">Storybook UI Kit</div>'
            })
          });
          const data = await res.json();
          if (data.success && data.canvasId) {
            setCanvasId(data.canvasId);
            fetchSessions();
            showToast('Storybook UI Kit');
          }
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      };

      // Sync editor code when session changes
      React.useEffect(() => {
        const active = sessions.find(s => s.id === canvasId);
        if (active && active.content) setEditorCode(active.content);
      }, [canvasId, sessions]);

      const toggleInspector = () => {
        const next = !inspectorActive;
        setInspectorActive(next);
        if (annotateActive) setAnnotateActive(false);
        if (frameRef.current && frameRef.current.contentWindow) {
          frameRef.current.contentWindow.postMessage({
            type: 'dlc_set_inspector',
            enabled: next
          }, '*');
        }
      };

      const toggleAnnotate = () => {
        const next = !annotateActive;
        setAnnotateActive(next);
        if (inspectorActive) setInspectorActive(false);
        if (frameRef.current && frameRef.current.contentWindow) {
          frameRef.current.contentWindow.postMessage({
            type: 'dlc_set_annotation_mode',
            enabled: next
          }, '*');
        }
      };

      const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        const broadcast = (win) => {
          if (win) win.postMessage({ type: 'dlc_set_theme', theme: next }, '*');
        };
        if (frameRef.current) broadcast(frameRef.current.contentWindow);
        matrixFramesRef.current.forEach(f => f && broadcast(f.contentWindow));
      };

      const [isRefreshing, setIsRefreshing] = React.useState(false);
      const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
          if (currentFilePath) {
            openFile(currentFilePath);
          } else if (canvasIdRef.current) {
            try {
              const res = await fetch('/dsh-live-canvas/api/sessions');
              const d = await res.json();
              if (d.sessions) setSessions(d.sessions);
            } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
            if (frameRef.current) {
              frameRef.current.src = '/dsh-live-canvas/sandbox/' + canvasIdRef.current + '?t=' + Date.now();
            }
          }
          matrixFramesRef.current.forEach(f => {
            if (f && srcUrl) f.src = srcUrl + '?t=' + Date.now();
          });
          loadSessionsAndFiles();
          showToast(t('pageRefreshedToast'));
        } catch (err) {
          console.warn('[LiveCanvas] Refresh failed:', err);
        } finally {
          setTimeout(() => setIsRefreshing(false), 400);
        }
      };

      const handleOpenTab = () => {
        window.open(srcUrl, '_blank');
      };

      const handleExport = () => {
        window.open(`/dsh-live-canvas/api/export/${activeId}`, '_blank');
      };

      const handlePack = () => {
        window.open(`/dsh-live-canvas/api/pack/${activeId}?framework=vite-react`, '_blank');
      };

      const handleCompare = () => {
        window.open(`/dsh-live-canvas/diff/${activeId}`, '_blank');
      };

      const handleSendAiPrompt = () => {
        if (!aiPromptText.trim()) return;
        fetch('/dsh-live-canvas/api/ai-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasId: activeId,
            selector: inspectedElement ? inspectedElement.selector : 'root',
            instruction: aiPromptText.trim(),
            outerHtml: inspectedElement ? inspectedElement.outerHtml : ''
          })
        })
          .then(r => r.json())
          .then(() => {
            setShowAiModal(false);
            setAiPromptText('');
            setToastMsg(t('aiSentSuccess'));
            setTimeout(() => setToastMsg(null), 4000);
          })
          .catch(() => {});
      };

      const errorCount = logs.filter(l => l.level === 'error').length;

      let frameWidth = '100%';
      let frameHeight = '100%';
      if (viewport === 'mobile') { frameWidth = '375px'; frameHeight = '667px'; }
      if (viewport === 'tablet') { frameWidth = '768px'; frameHeight = '1024px'; }
      if (viewport === 'desktop') { frameWidth = '1280px'; frameHeight = '800px'; }

      const filteredFiles = workspaceFiles.filter(f => {
        if (!fileFilter) return true;
        const q = fileFilter.toLowerCase();
        return f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
      });

      return React.createElement('div', { className: 'dlc-panel-container' },
        // Header Toolbar
        React.createElement('div', { className: 'dlc-toolbar' },
          React.createElement('div', { className: 'dlc-toolbar-group' },
            // Unified File & Session Selector Dropdown
            React.createElement('select', {
              className: 'dlc-session-dropdown',
              value: selectedDropdownValue || 'hub',
              title: t('title'),
              onChange: (e) => handleDropdownChange(e.target.value)
            },
              React.createElement('option', { value: 'hub' }, '🏠 ' + t('projectsHub')),
              sessions.length > 0 && React.createElement('optgroup', { label: t('sessionsGroup') },
                sessions.map(s => {
                  const icon = s.componentType === 'react' ? '🧮' : (s.componentType === 'html' ? '🌐' : (s.componentType === 'svg' ? '🎨' : (s.componentType === 'mermaid' ? '📐' : '📄')));
                  return React.createElement('option', { key: s.id, value: s.id },
                    `${icon} ${s.title || s.id}`
                  );
                })
              ),
              workspaceFiles.length > 0 && React.createElement('optgroup', { label: t('workspaceFilesGroup') },
                workspaceFiles.map(f => {
                  const icon = f.type === 'react' ? '🧮' : (f.type === 'html' ? '🌐' : (f.type === 'svg' ? '🎨' : (f.type === 'mermaid' ? '📐' : '📄')));
                  return React.createElement('option', { key: 'ws_path_' + f.path, value: 'ws_path_' + f.path },
                    `${icon} ${f.path}`
                  );
                })
              )
            ),
            React.createElement('button', {
              type: 'button',
              className: 'dlc-btn' + (isRefreshing ? ' dlc-btn-active' : ''),
              title: t('refreshBtn'),
              onClick: handleRefresh
            }, isRefreshing ? '⏳ ' + t('refreshBtn') : '🔄 ' + t('refreshBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (showFilePicker ? ' dlc-btn-active' : ''),
              title: t('browseFilesBtn'),
              onClick: () => setShowFilePicker(!showFilePicker)
            }, '📂 ' + (workspaceFiles.length > 0 ? `${t('openFileBtn')} (${workspaceFiles.length})` : t('browseFilesBtn'))),
            React.createElement('button', {
              className: 'dlc-btn' + (viewport === 'responsive' ? ' dlc-btn-active' : ''),
              onClick: () => setViewport('responsive')
            }, '↔ ' + t('responsive')),
            React.createElement('button', {
              className: 'dlc-btn' + (viewport === 'mobile' ? ' dlc-btn-active' : ''),
              onClick: () => setViewport('mobile')
            }, '📱 375px'),
            React.createElement('button', {
              className: 'dlc-btn' + (viewport === 'tablet' ? ' dlc-btn-active' : ''),
              onClick: () => setViewport('tablet')
            }, '📟 768px'),
            React.createElement('button', {
              className: 'dlc-btn' + (viewport === 'desktop' ? ' dlc-btn-active' : ''),
              onClick: () => setViewport('desktop')
            }, '💻 1280px'),
            React.createElement('button', {
              className: 'dlc-btn' + (viewport === 'matrix' ? ' dlc-btn-active' : ''),
              onClick: () => setViewport('matrix')
            }, '🖥️ ' + t('matrix'))
          ),
          React.createElement('div', { className: 'dlc-toolbar-group' },
            hasMock && React.createElement('span', {
              className: 'dlc-btn',
              style: { borderColor: 'var(--dsw-alias-state-success-primary)', color: 'var(--dsw-alias-state-success-primary)', cursor: 'default' }
            }, '🎲 ' + t('mockBadge')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: toggleTheme
            }, theme === 'dark' ? '☀️ ' + t('themeLight') : '🌙 ' + t('themeDark')),
            React.createElement('button', {
              className: 'dlc-btn' + (showControls ? ' dlc-btn-active' : ''),
              onClick: () => setShowControls(!showControls)
            }, '🎛️ ' + t('controlsBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleCompare
            }, '🪞 ' + t('compareBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (errorCount > 0 ? ' dlc-btn-err' : ''),
              onClick: () => setShowConsole(!showConsole)
            }, errorCount > 0 ? `🔴 ${errorCount} ${t('errCount')}` : `🟢 0 ${t('errCount')}`),
            React.createElement('button', {
              className: 'dlc-btn' + (inspectorActive ? ' dlc-btn-active' : ''),
              onClick: toggleInspector
            }, inspectorActive ? '🔍 ' + t('inspectingBtn') : '🔍 ' + t('inspectBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (reorderMode ? ' dlc-btn-reorder-active' : ''),
              onClick: toggleReorder
            }, t('reorderBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (codeDrawerOpen ? ' dlc-btn-code-active' : ''),
              onClick: () => setCodeDrawerOpen(!codeDrawerOpen)
            }, t('codeBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: () => setShowBlocksModal(true)
            }, t('blocksBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: () => handlePopulateMock('users')
            }, t('mockBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleOpenShare
            }, t('shareBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (blueprintMode ? ' dlc-btn-reorder-active' : ''),
              onClick: toggleBlueprintMode
            }, t('blueprintBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: () => setShowArtifactsModal(true)
            }, t('artifactsBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleOpenDeploy
            }, t('deployBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleOpenTimeTravel
            }, t('timetravelBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (soundEnabled ? ' dlc-btn-active' : ''),
              onClick: toggleSound
            }, t('soundBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleOpenStorybook
            }, t('storybookBtn')),
            React.createElement('button', {
              className: 'dlc-btn' + (annotateActive ? ' dlc-btn-active' : ''),
              onClick: toggleAnnotate
            }, annotateActive ? '🖍 ' + t('drawingBtn') : (annotations.length > 0 ? `🖍 ${annotations.length} ${t('notesCount')}` : '🖍 ' + t('annotateBtn'))),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleRefresh
            }, '🔄 ' + t('refreshBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleExport
            }, '📥 ' + t('exportBtn')),
            React.createElement('select', {
              className: 'dlc-select',
              style: { height: '30px', fontSize: '11px', padding: '0 6px' },
              title: 'State Preset',
              onChange: (e) => {
                const p = e.target.value;
                if (frameRef.current && frameRef.current.contentWindow) {
                  frameRef.current.contentWindow.postMessage({ type: 'DLC_SET_STATE_PRESET', preset: p }, '*');
                  showToast('State: ' + p);
                }
              }
            },
              React.createElement('option', { value: 'default' }, '● ' + t('stateDefault')),
              React.createElement('option', { value: 'loading' }, '⏳ ' + t('stateLoading')),
              React.createElement('option', { value: 'empty' }, '📭 ' + t('stateEmpty')),
              React.createElement('option', { value: 'error' }, '⚠️ ' + t('stateError')),
              React.createElement('option', { value: 'overflow' }, '📜 ' + t('stateOverflow'))
            ),
            React.createElement('button', {
              className: 'dlc-btn',
              title: t('snapshotBtn'),
              onClick: () => {
                if (frameRef.current && frameRef.current.contentWindow) {
                  frameRef.current.contentWindow.postMessage({ type: 'DLC_REQUEST_SNAPSHOT' }, '*');
                }
              }
            }, '📷 ' + t('snapshotBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              title: t('standaloneExportBtn'),
              onClick: () => {
                if (!canvasId) return;
                window.open('/dsh-live-canvas/api/standalone?canvasId=' + canvasId, '_blank');
              }
            }, '📄 ' + t('standaloneExportBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handlePack
            }, '📦 ' + t('packBtn')),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleOpenTab
            }, '↗ ' + t('openTabBtn'))
          )
        ),
        // Toast message
        toastMsg && React.createElement('div', {
          style: {
            position: 'absolute',
            top: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--dsw-alias-state-success-primary)',
            color: 'var(--dsw-alias-text-contrast)',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: 'var(--dsw-alias-shadow-l3)',
            zIndex: 99999
          }
        }, toastMsg),
        // Workspace File Picker Drawer
        showFilePicker && React.createElement('div', { className: 'dlc-picker-drawer' },
          React.createElement('div', { className: 'dlc-picker-head' },
            React.createElement('input', {
              type: 'text',
              className: 'dlc-picker-search',
              placeholder: t('searchPlaceholder'),
              value: fileFilter,
              onChange: (e) => setFileFilter(e.target.value)
            }),
            React.createElement('input', {
              type: 'text',
              className: 'dlc-ctrl-input',
              style: { width: '180px' },
              placeholder: t('customPathPlaceholder'),
              value: customPath,
              onChange: (e) => setCustomPath(e.target.value)
            }),
            React.createElement('button', {
              className: 'dlc-btn dlc-btn-active',
              onClick: () => { if (customPath) openFile(customPath); }
            }, t('openActionBtn'))
          ),
          filteredFiles.length === 0 ?
            React.createElement('div', { style: { color: 'var(--dsw-alias-label-secondary)', padding: '12px 0' } }, t('noFilesFound')) :
            React.createElement('div', { className: 'dlc-picker-list' },
              filteredFiles.map(f => {
                const icon = f.type === 'react' ? '🧮' : (f.type === 'html' ? '🌐' : (f.type === 'svg' ? '🎨' : (f.type === 'mermaid' ? '📐' : '📄')));
                return React.createElement('button', {
                  key: f.path,
                  className: 'dlc-picker-item',
                  onClick: () => openFile(f.path)
                },
                  React.createElement('div', { style: { overflow: 'hidden' } },
                    React.createElement('div', { className: 'dlc-picker-item-name' }, `${icon} ${f.name}`),
                    React.createElement('div', { className: 'dlc-picker-item-path' }, f.path)
                  ),
                  React.createElement('span', { style: { fontSize: '10px', color: 'var(--dsw-alias-label-secondary)' } }, `${Math.round(f.size / 1024)}kb`)
                );
              })
            )
        ),
        // File Open Error Banner (#116)
        fileOpenError && React.createElement('div', {
          className: 'dlc-error-banner',
          style: {
            margin: '12px 16px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--dsw-alias-state-error-primary)',
            background: 'color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, var(--dsw-alias-bg-layer-2))',
            color: 'var(--dsw-alias-label-primary)',
            fontSize: '13px',
            lineHeight: '1.5'
          }
        },
          React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }
          },
            React.createElement('span', {
              style: { fontWeight: 600, color: 'var(--dsw-alias-state-error-primary)' }
            }, '⚠️ ' + t('fileOpenErrorTitle')),
            React.createElement('button', {
              type: 'button',
              onClick: () => setFileOpenError(null),
              style: {
                background: 'transparent',
                border: 'none',
                color: 'var(--dsw-alias-label-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 6px'
              }
            }, '✕')
          ),
          React.createElement('div', null,
            React.createElement('strong', null, t('fileOpenErrorFile') + ': '),
            React.createElement('code', { style: { padding: '2px 4px', background: 'var(--dsw-alias-bg-layer-4)', borderRadius: '4px' } }, fileOpenError.path)
          ),
          React.createElement('div', { style: { marginTop: '4px' } },
            React.createElement('strong', null, t('fileOpenErrorReason') + ': '),
            fileOpenError.error
          ),
          React.createElement('div', {
            style: { marginTop: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' }
          }, t('fileOpenErrorGuidance')),
          fileOpenError.allowedRoots && fileOpenError.allowedRoots.length > 0 && React.createElement('div', {
            style: { marginTop: '6px', fontSize: '11px', color: 'var(--dsw-alias-label-dimmed)' }
          },
            t('allowedRootsLabel') + ': ' + fileOpenError.allowedRoots.join(', ')
          )
        ),
        // Persistent Standard Preview Viewport
        React.createElement('div', {
          className: 'dlc-preview-viewport',
          style: { display: viewport === 'matrix' ? 'none' : 'flex' }
        },
          React.createElement('div', {
            className: 'dlc-frame-wrapper',
            style: { width: frameWidth, height: frameHeight }
          },
            React.createElement('iframe', {
              key: activeId,
              ref: frameRef,
              className: 'dlc-frame',
              src: srcUrl,
              sandbox: 'allow-scripts allow-forms allow-same-origin allow-modals'
            })
          )
        ),
        // Persistent Multi-Device Matrix Viewport
        React.createElement('div', {
          className: 'dlc-matrix-viewport',
          style: { display: viewport === 'matrix' ? 'flex' : 'none' }
        },
          // Mobile (375px)
          React.createElement('div', { className: 'dlc-matrix-card', style: { width: '375px' } },
            React.createElement('div', { className: 'dlc-matrix-card-head' },
              React.createElement('span', null, '📱 ' + t('mobile') + ' (375px)'),
              React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('syncScroll'))
            ),
            React.createElement('iframe', {
              key: 'matrix-m-' + activeId,
              ref: (el) => { matrixFramesRef.current[0] = el; },
              className: 'dlc-frame',
              style: { height: '600px' },
              src: srcUrl,
              sandbox: 'allow-scripts allow-forms allow-same-origin allow-modals'
            })
          ),
          // Tablet (768px)
          React.createElement('div', { className: 'dlc-matrix-card', style: { width: '768px' } },
            React.createElement('div', { className: 'dlc-matrix-card-head' },
              React.createElement('span', null, '📟 ' + t('tablet') + ' (768px)'),
              React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('syncScroll'))
            ),
            React.createElement('iframe', {
              key: 'matrix-t-' + activeId,
              ref: (el) => { matrixFramesRef.current[1] = el; },
              className: 'dlc-frame',
              style: { height: '600px' },
              src: srcUrl,
              sandbox: 'allow-scripts allow-forms allow-same-origin allow-modals'
            })
          ),
          // Desktop (1024px)
          React.createElement('div', { className: 'dlc-matrix-card', style: { width: '1024px' } },
            React.createElement('div', { className: 'dlc-matrix-card-head' },
              React.createElement('span', null, '💻 ' + t('desktop') + ' (1024px+)'),
              React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('syncScroll'))
            ),
            React.createElement('iframe', {
              key: 'matrix-d-' + activeId,
              ref: (el) => { matrixFramesRef.current[2] = el; },
              className: 'dlc-frame',
              style: { height: '600px' },
              src: srcUrl,
              sandbox: 'allow-scripts allow-forms allow-same-origin allow-modals'
            })
          )
        ),
        // Inspector details drawer
        inspectedElement && React.createElement('div', { className: 'dlc-inspector-bar' },
          React.createElement('span', { className: 'dlc-inspector-selector' },
            t('selectedLabel') + ': ' + inspectedElement.selector
          ),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            React.createElement('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: '11px' } },
              (inspectedElement.rect ? inspectedElement.rect.width + 'x' + inspectedElement.rect.height + 'px' : '')
            ),
            React.createElement('button', {
              className: 'dlc-btn dlc-btn-ai',
              onClick: () => setShowAiModal(true)
            }, t('aiPromptBtn'))
          )
        ),
        // In-Place AI Prompt Modal
        showAiModal && React.createElement('div', { className: 'dlc-modal-overlay', onClick: () => setShowAiModal(false) },
          React.createElement('div', { className: 'dlc-modal-card', onClick: (e) => e.stopPropagation() },
            React.createElement('div', { className: 'dlc-modal-head' },
              React.createElement('div', { className: 'dlc-modal-title' },
                React.createElement('span', null, '✨'),
                t('aiPromptModalTitle')
              ),
              React.createElement('button', {
                style: { background: 'none', border: 'none', color: 'var(--dsw-alias-label-secondary)', cursor: 'pointer', fontSize: '16px' },
                onClick: () => setShowAiModal(false)
              }, '✕')
            ),
            React.createElement('div', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
              React.createElement('span', { style: { color: 'var(--dsw-alias-state-brand-primary)', fontWeight: 'bold' } }, inspectedElement ? inspectedElement.selector : 'Element'),
              ': ' + t('aiPromptDesc')
            ),
            React.createElement('textarea', {
              className: 'dlc-modal-input',
              placeholder: t('aiPromptPlaceholder'),
              value: aiPromptText,
              onChange: (e) => setAiPromptText(e.target.value)
            }),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
              React.createElement('button', { className: 'dlc-preset-btn', onClick: () => setAiPromptText(t('presetGlass')) }, t('presetGlass')),
              React.createElement('button', { className: 'dlc-preset-btn', onClick: () => setAiPromptText(t('presetModern')) }, t('presetModern')),
              React.createElement('button', { className: 'dlc-preset-btn', onClick: () => setAiPromptText(t('presetBadge')) }, t('presetBadge')),
              React.createElement('button', { className: 'dlc-preset-btn', onClick: () => setAiPromptText(t('presetMobile')) }, t('presetMobile'))
            ),
            React.createElement('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' } },
              React.createElement('button', { className: 'dlc-btn', onClick: () => setShowAiModal(false) }, t('cancelBtn')),
              React.createElement('button', { className: 'dlc-btn dlc-btn-ai', onClick: handleSendAiPrompt }, t('aiSubmitBtn'))
            )
          )
        ),
        // Interactive Props Controls Drawer
        showControls && React.createElement('div', { className: 'dlc-controls-drawer' },
          !controlsSchema || Object.keys(controlsSchema).length === 0 ?
            React.createElement('div', { style: { color: 'var(--dsw-alias-label-secondary)' } }, t('noControls')) :
            React.createElement('div', { className: 'dlc-controls-grid' },
              Object.entries(controlsSchema).map(([k, meta]) => {
                const type = meta.type || 'string';
                const label = meta.label || k;
                const val = controlValues[k] !== undefined ? controlValues[k] : (meta.default || '');
                if (type === 'boolean') {
                  return React.createElement('div', { key: k, className: 'dlc-ctrl-item' },
                    React.createElement('label', null,
                      React.createElement('input', {
                        type: 'checkbox',
                        checked: !!val,
                        onChange: (e) => handleControlChange(k, e.target.checked)
                      }),
                      ' ' + label
                    )
                  );
                }
                if (type === 'select' && Array.isArray(meta.options)) {
                  return React.createElement('div', { key: k, className: 'dlc-ctrl-item' },
                    React.createElement('label', null, label + ': '),
                    React.createElement('select', {
                      className: 'dlc-ctrl-input',
                      value: val,
                      onChange: (e) => handleControlChange(k, e.target.value)
                    }, meta.options.map(opt => React.createElement('option', { key: opt, value: opt }, opt)))
                  );
                }
                return React.createElement('div', { key: k, className: 'dlc-ctrl-item' },
                  React.createElement('label', null, label + ': '),
                  React.createElement('input', {
                    type: type === 'number' ? 'number' : 'text',
                    className: 'dlc-ctrl-input',
                    value: val,
                    onChange: (e) => handleControlChange(k, type === 'number' ? Number(e.target.value) : e.target.value)
                  })
                );
              })
            )
        ),
        // Collapsible Diagnostic Console Drawer
        showConsole && React.createElement('div', { className: 'dlc-console-drawer' },
          React.createElement('div', { className: 'dlc-console-header' },
            React.createElement('span', { className: 'dlc-console-title' }, '🖥️ ' + t('consoleDrawerTitle')),
            React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
              React.createElement('button', { className: 'dlc-btn dlc-btn-xs', onClick: () => setLogs([]) }, t('consoleClearBtn')),
              React.createElement('button', { className: 'dlc-btn dlc-btn-xs', onClick: () => setShowConsole(false) }, '✕')
            )
          ),
          React.createElement('div', { className: 'dlc-console-body' },
            logs.length === 0 ?
              React.createElement('div', { className: 'dlc-console-empty' }, t('noConsoleLogs')) :
              logs.map(log => React.createElement('div', {
                key: log.id || Math.random(),
                className: 'dlc-console-entry dlc-console-' + (log.level || 'info')
              },
                React.createElement('span', { className: 'dlc-console-time' }, new Date(log.timestamp || Date.now()).toLocaleTimeString()),
                React.createElement('span', { className: 'dlc-console-badge dlc-badge-' + (log.level || 'info') }, (log.level || 'info').toUpperCase()),
                React.createElement('span', { className: 'dlc-console-text' }, log.message)
              ))
          )
        )
      );
    }

    // ---------------------------------------------------------------- Live Canvas File Viewer (for Better Sidebar)
    function LiveCanvasFileViewer(props) {
      const filePath = props.path || '';
      const content = props.content || '';
      const [canvasId, setCanvasId] = React.useState(null);

      React.useEffect(() => {
        if (!content && !filePath) return;
        const ext = filePath.toLowerCase().split('.').pop();
        const isReact = ['jsx', 'tsx'].includes(ext);
        fetch('/dsh-live-canvas/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: filePath ? filePath.split('/').pop() : 'File Preview',
            content,
            filePath,
            componentType: isReact ? 'react' : undefined
          })
        })
          .then(r => r.json())
          .then(data => {
            if (data.canvasId) {
              setCanvasId(data.canvasId);
            }
          })
          .catch(() => {});
      }, [filePath, content]);

      if (!canvasId) {
        return React.createElement('div', {
          style: { padding: '24px', textAlign: 'center', color: 'var(--dsw-alias-label-secondary)', fontSize: '13px' }
        }, 'Loading Live Canvas preview...');
      }

      return React.createElement(LiveCanvasWorkspace, { canvasId });
    }


    // ---------------------------------------------------------------- Native DSH Sidebar Integration Helper
    function extractFilePathFromAddress(address) {
      if (!address || typeof address !== 'string') return '';
      if (address.startsWith('dsh-resource://file/session/')) {
        const withoutPrefix = address.slice('dsh-resource://file/session/'.length);
        const slashIdx = withoutPrefix.indexOf('/');
        return slashIdx >= 0 ? decodeURIComponent(withoutPrefix.slice(slashIdx + 1)) : decodeURIComponent(withoutPrefix);
      }
      if (address.startsWith('dsh-resource://file/absolute/')) {
        return decodeURIComponent(address.slice('dsh-resource://file/absolute/'.length));
      }
      if (address.startsWith('dsh-resource://file/')) {
        return decodeURIComponent(address.slice('dsh-resource://file/'.length));
      }
      return address;
    }

    function NativeLiveCanvasTab(props) {
      const ctx = props.ctx;
      let address = null;
      let tabInfo = null;
      try {
        if (props.hooks && typeof props.hooks.tabInfo === 'function') {
          tabInfo = props.hooks.tabInfo();
          address = tabInfo?.tab?.navigation?.address || tabInfo?.tab?.contentId;
        }
      } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }

      if (!address && props.address) address = props.address;
      if (!address && props.tab?.navigation?.address) address = props.tab.navigation.address;

      const filePath = address ? extractFilePathFromAddress(address) : null;
      const isFile = filePath && (
        filePath.endsWith('.html') || filePath.endsWith('.htm') ||
        filePath.endsWith('.jsx') || filePath.endsWith('.tsx') ||
        filePath.endsWith('.svg') || filePath.endsWith('.mermaid') ||
        filePath.endsWith('.mmd') || filePath.endsWith('.md')
      );

      if (isFile) {
        return React.createElement(LiveCanvasFileViewer, { path: filePath, content: props.content, ctx });
      }

      const activeCanvasId = (tabInfo?.tab?.id && tabInfo.tab.id !== 'live-canvas') ? tabInfo.tab.id : 'default';
      return React.createElement(LiveCanvasWorkspace, { canvasId: activeCanvasId, ctx });
    }

    function LiveCanvasIcon(props) {
      const s = typeof props === 'number' ? props : (props && props.size) || 16;
      const cls = (props && props.className) || '';
      return React.createElement('svg', {
        width: s,
        height: s,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: '2',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: cls,
        style: { width: s, height: s, display: 'inline-block', flex: 'none' }
      },
        React.createElement('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }),
        React.createElement('path', { d: 'M3 9h18' }),
        React.createElement('path', { d: 'M9 21V9' })
      );
    }

    function registerNativeSidebar(nctx, rootCtx) {
      const sctx = nctx || rootCtx;
      const ctx = rootCtx || nctx;
      if (sctx && sctx.sidebarRight) rootSidebarRight = sctx.sidebarRight;
      if (ctx && ctx.sidebarRight) rootSidebarRight = ctx.sidebarRight;
      const tabs = sctx && (sctx.sidebarRightTabs || (sctx.get && (() => { try { return sctx.get('sidebarRightTabs'); } catch { return null; } })()));
      if (!tabs || typeof tabs.register !== 'function') return () => {};

      const disposers = [];
      try {
        const def = {
          id: '@goodandready/dsh-live-canvas',
          kind: 'live-canvas',
          patterns: [
            'dsh-resource://file/**/*.html',
            'dsh-resource://file/**/*.htm',
            'dsh-resource://file/**/*.jsx',
            'dsh-resource://file/**/*.tsx',
            'dsh-resource://file/**/*.svg',
            'dsh-resource://file/**/*.mermaid',
            'dsh-resource://file/**/*.mmd',
            'dsh-resource://file/**/*.md',
            '*.html', '*.htm', '*.jsx', '*.tsx', '*.svg', '*.mermaid', '*.mmd', '*.md'
          ],
          priority: 'extension',
          canOpen: (addr) => {
            const p = extractFilePathFromAddress(addr).toLowerCase();
            return p.endsWith('.html') || p.endsWith('.htm') ||
                   p.endsWith('.jsx') || p.endsWith('.tsx') ||
                   p.endsWith('.svg') || p.endsWith('.mermaid') ||
                   p.endsWith('.mmd') || p.endsWith('.md');
          },
          title: (addr) => {
            if (addr) {
              const raw = extractFilePathFromAddress(addr);
              if (raw && raw.includes('/')) {
                return raw.split('/').pop() || 'Live Canvas';
              }
              if (raw) return raw;
            }
            return 'Live Canvas';
          },
          guide: [{
            order: 45,
            title: () => (ctx?.locale?.getSnapshot?.().active?.startsWith('zh') ? '实时画布' : 'Live Canvas'),
            description: () => (ctx?.locale?.getSnapshot?.().active?.startsWith('zh')
              ? '用于预览 HTML、React JSX、SVG 和图表的交互式实时画布'
              : 'Interactive live canvas for previewing HTML, React JSX, SVG, and diagrams'),
            icon: LiveCanvasIcon
          }]
        };

        let unregDef;
        if (typeof sctx.effect === 'function') {
          unregDef = sctx.effect(() => tabs.register(def));
        } else {
          unregDef = tabs.register(def);
        }
        if (typeof unregDef === 'function') disposers.push(unregDef);
      } catch (err) {
        console.warn('[dsh-live-canvas] Error registering native sidebar tab definition:', err);
      }

      const slots = (ctx && ctx.slots) || (sctx && sctx.slots);
      if (slots && typeof slots.register === 'function') {
        const registerPaneTab = () => {
          try {
            return slots.register({
              name: 'sidebar.right.pane.tab',
              key: '@goodandready/dsh-live-canvas',
              locale: NS,
              inject: () => ({ ctx })
            }, NativeLiveCanvasTab);
          } catch (e) {
            console.warn('[dsh-live-canvas] native sidebar pane tab register failed', e && e.message || e);
          }
        };

        if (typeof slots.inject === 'function') {
          try {
            const ok = slots.inject('sidebar.right.pane.tab', registerPaneTab);
            if (typeof ok === 'function') disposers.push(ok);
          } catch (e) {
            const unreg = registerPaneTab();
            if (typeof unreg === 'function') disposers.push(unreg);
          }
        } else {
          const unreg = registerPaneTab();
          if (typeof unreg === 'function') disposers.push(unreg);
        }
      }

      return () => {
        disposers.forEach(d => { try { d(); } catch (err) { /* ignoreOptionalFailure: bestEffort fallback */ } });
      };
    }
    // ---------------------------------------------------------------- Better Sidebar Integration Helper
    function registerBetterSidebar(ctx) {
      const service = ctx.betterSidebar;
      if (!service || typeof service.registerTab !== 'function') return () => {};

      const disposers = [];

      // 1. Register Tab
      try {
        const unregTab = service.registerTab({
          id: 'live-canvas',
          title: () => (ctx?.locale?.getSnapshot?.().active?.startsWith('zh') ? '实时画布' : 'Live Canvas'),
          order: 25,
          single: true,
          icon: (size) => React.createElement('svg', {
            width: size || 16,
            height: size || 16,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
            React.createElement('circle', { cx: '12', cy: '12', r: '10' }),
            React.createElement('polygon', { points: '10 8 16 12 10 16 10 8' })
          ),
          urlTarget: (url) => {
            try {
              return url && url.pathname && url.pathname.startsWith('/dsh-live-canvas/');
            } catch {
              return false;
            }
          },
          component: (props) => {
            const activeCanvasId = props.tab?.id && props.tab.id !== 'live-canvas' ? props.tab.id : 'default';
            return React.createElement(LiveCanvasWorkspace, { canvasId: activeCanvasId, ctx });
          }
        });
        if (typeof unregTab === 'function') disposers.push(unregTab);
      } catch (err) {
        console.warn('[dsh-live-canvas] Failed to register BetterSidebar tab:', err);
      }

      // 2. Register File Viewer for HTML, React JSX, SVG, Mermaid
      try {
        if (typeof service.registerFileViewer === 'function') {
          const unregViewer = service.registerFileViewer({
            id: 'live-canvas-viewer',
            title: () => (ctx.locale && ctx.locale.getSnapshot?.().active?.startsWith('zh') ? '实时画布预览' : 'Live Canvas Preview'),
            exts: ['html', 'htm', 'jsx', 'tsx', 'svg', 'mermaid', 'mmd'],
            priority: 15,
            fetchStrategy: 'fsRead',
            icon: (size) => React.createElement('span', { style: { fontSize: (size || 16) + 'px' } }, '🎨'),
            component: (props) => {
              return React.createElement(LiveCanvasFileViewer, { path: props.path, content: props.content, ctx });
            }
          });
          if (typeof unregViewer === 'function') disposers.push(unregViewer);
        }
      } catch (err) {
        console.warn('[dsh-live-canvas] Failed to register BetterSidebar file viewer:', err);
      }

      return () => {
        disposers.forEach(fn => { try { fn(); } catch (err) { /* ignoreOptionalFailure: bestEffort fallback */ } });
      };
    }

    // ---------------------------------------------------------------- Apply / Plugin Registration
    module.exports.inject = ['slots', 'locale', 'configForms'];
    module.exports.apply = function apply(ctx) {
      if (ctx.locale) {
        try {
          ctx.locale.register(NS, i18n);
        } catch { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      }

      
      // Chat Tool Cards Registration (tool.call.toolview)
      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        const toolKeys = [
          'live_canvas_preview',
          'live_canvas_create_wireframe',
          'live_canvas_create_plan',
          'live_canvas_create_diagram',
          'live_canvas_create_prototype',
          'live_canvas_create_crud',
          'live_canvas_figma_bridge',
          'live_canvas_insert_block',
          'live_canvas_vision_import',
          'live_canvas_gallery'
        ];

        ctx.slots.inject('tool.call.toolview', () => {
          for (const key of toolKeys) {
            ctx.slots.register({
              name: 'tool.call.toolview',
              key: key,
              locale: NS,
              inject: () => ({ ctx })
            }, (props) => React.createElement(ErrorBoundary, null, React.createElement(LiveCanvasChatCard, { ...props, ctx: (props && props.ctx) || ctx })));
          }
        });
      }

      // Settings Card Registration: the plugin-list seat first (the seat the current
      // core renders as the plugin's own page with its configuration), then the row
      // seat and the legacy settings.plugin.item card as fallbacks.
      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        try {
          // The label is a static string on purpose: it is resolved while the page
          // renders, and a locale lookup there would take the whole client batch down.
          ctx.slots.inject('plugins.item', () => {
            return ctx.slots.register({
              name: 'plugins.item',
              id: ROW_ID,
              order: 60,
              label: () => 'Live Canvas Preview',
              locale: NS,
              inject: () => ({ ctx })
            }, (props) => React.createElement(ErrorBoundary, null, React.createElement(PluginCard, { ...props, ctx: (props && props.ctx) || ctx })));
          });
          ctx.slots.inject('plugins.row.config', () => {
            return ctx.slots.register({
              name: 'plugins.row.config',
              key: ROW_CONFIG_KEY,
              locale: NS,
              inject: () => ({ ctx })
            }, (props) => React.createElement(ErrorBoundary, null, React.createElement(PluginCard, { ...props, ctx: (props && props.ctx) || ctx })));
          });
          ctx.slots.inject('settings.plugin.item', () => {
            return ctx.slots.register({
              name: 'settings.plugin.item',
              key: NS,
              locale: NS,
              inject: () => ({ ctx })
            }, (props) => React.createElement(ErrorBoundary, null, React.createElement(PluginCard, { ...props, ctx: (props && props.ctx) || ctx })));
          });
        } catch (err) {
          console.warn('[dsh-live-canvas] Failed to register settings seats:', err);
        }
      }

      // Native DSH Right Sidebar (#54, DSH 0.1.5-alpha.1+)
      if (typeof ctx.inject === "function") {
        try {
          ctx.inject(["sidebarRightTabs"], (sctx) => {
            return registerNativeSidebar(sctx, ctx);
          });
        } catch (e) {
          // host without sidebarRightTabs declared or inject failure
        }
        try {
          ctx.inject(["sidebarRight"], (sctx) => {
            rootSidebarRight = sctx.sidebarRight || (sctx.get && sctx.get('sidebarRight'));
          });
        } catch (e) { /* ignoreOptionalFailure: bestEffort UI fallback */ }
      }

      // Legacy dsh-better-sidebar Integration via ctx.inject
      if (typeof ctx.inject === 'function') {
        try {
          ctx.inject(['betterSidebar'], (sctx) => {
            return registerBetterSidebar(sctx);
          });
        } catch (err) {
          console.warn('[dsh-live-canvas] Error in betterSidebar injection:', err);
        }
      }
    };

    module.exports.ErrorBoundary = ErrorBoundary;
    module.exports.PluginCard = (props) => React.createElement(ErrorBoundary, null, React.createElement(PluginCard, props));
    module.exports.LiveCanvasWorkspace = LiveCanvasWorkspace;
    module.exports.LiveCanvasFileViewer = LiveCanvasFileViewer;
    module.exports.registerBetterSidebar = registerBetterSidebar;
        module.exports.registerNativeSidebar = registerNativeSidebar;
    module.exports.NativeLiveCanvasTab = NativeLiveCanvasTab;
    module.exports.extractFilePathFromAddress = extractFilePathFromAddress;

    return module.exports;
  }
});

