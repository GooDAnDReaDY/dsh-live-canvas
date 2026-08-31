// dsh-live-canvas: client (browser) half.
// Provides settings card in "Settings -> Plugins -> Plugin Settings" and Live Canvas interactive preview container with telemetry console.

window.__ModuleLoader__.load({
  id: '@goodandready/dsh-live-canvas',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');

    const NS = '@goodandready/dsh-live-canvas';

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
.dlc-card { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); border-radius:12px; list-style:none; margin-bottom:12px; overflow:hidden; }
.dlc-head { appearance:none; width:100%; font:inherit; color:inherit; text-align:left; cursor:pointer; background:0 0; border:0; border-radius:12px; display:flex; align-items:center; gap:12px; padding:14px 16px; }
.dlc-title { color:var(--dsw-alias-label-primary); font-size:15px; font-weight:600; line-height:1.4; }
.dlc-sub { color:var(--dsw-alias-label-secondary); font-size:13px; }
.dlc-body { border-top:1px solid var(--dsw-alias-border-l2); margin:0 16px; padding-bottom:8px; }
.dlc-field { display:flex; flex-direction:column; gap:6px; padding:12px 0; }
.dlc-label { color:var(--dsw-alias-label-primary); font-size:13px; font-weight:500; }
.dlc-desc { color:var(--dsw-alias-label-secondary); font-size:12px; }
.dlc-input { height:34px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-input-major, var(--dsw-alias-bg-layer-3)); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 12px; font-size:13px; box-sizing:border-box; }
.dlc-select { height:34px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-input-major, var(--dsw-alias-bg-layer-3)); color:var(--dsw-alias-label-primary); border-radius:8px; padding:0 10px; font-size:13px; box-sizing:border-box; }
.dlc-checkbox-row { display:flex; align-items:center; gap:8px; }
.dlc-checkbox { width:16px; height:16px; cursor:pointer; }
.dlc-foot { border-top:1px solid var(--dsw-alias-border-l2); display:flex; justify-content:flex-end; align-items:center; gap:8px; padding:12px 0 8px; }
.dlc-save { appearance:none; font:inherit; cursor:pointer; border:1px solid transparent; border-radius:8px; padding:6px 16px; font-size:13px; font-weight:500; background:var(--dsw-alias-label-primary); color:var(--dsw-alias-bg-layer-3); transition:opacity .15s; }
.dlc-save:hover { opacity:0.9; }
.dlc-save:disabled { opacity:0.5; cursor:not-allowed; }
.dlc-status-msg { font-size:12px; margin-right:auto; }
.dlc-status-ok { color:var(--dsw-alias-state-success-primary, #10b981); }
.dlc-status-err { color:var(--dsw-alias-state-error-primary, #ef4444); }
.dlc-chev { margin-left:auto; flex:none; color:var(--dsw-alias-label-tertiary); transition:transform .16s; }
.dlc-chev-open { transform:rotate(180deg); }

/* Live Canvas Workspace Toolbar & Container */
.dlc-panel-container { display:flex; flex-direction:column; width:100%; height:100%; background:var(--dsw-alias-bg-layer-2, #18181b); border-radius:8px; overflow:hidden; }
.dlc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; background:var(--dsw-alias-bg-layer-3, #27272a); border-bottom:1px solid var(--dsw-alias-border-l2, #3f3f46); }
.dlc-toolbar-group { display:flex; align-items:center; gap:6px; }
.dlc-btn { appearance:none; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px; transition:background .15s; }
.dlc-btn:hover { background:var(--dsw-alias-bg-layer-4, #3f3f46); }
.dlc-btn-active { background:var(--dsw-alias-brand-primary, #2563eb) !important; color:#ffffff !important; border-color:transparent !important; }
.dlc-btn-err { border-color:#ef4444 !important; color:#ef4444 !important; }
.dlc-preview-viewport { flex:1; display:flex; align-items:center; justify-content:center; padding:16px; overflow:auto; background:var(--dsw-alias-bg-layer-1, #09090b); }
.dlc-frame-wrapper { transition:width .25s ease-in-out, height .25s ease-in-out; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.3); overflow:hidden; background:#ffffff; }
.dlc-frame { width:100%; height:100%; border:0; display:block; }
.dlc-inspector-bar { border-top:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); padding:8px 12px; font-size:12px; color:var(--dsw-alias-label-primary); display:flex; align-items:center; justify-content:space-between; font-family:monospace; }
.dlc-inspector-selector { font-weight:600; color:var(--dsw-alias-brand-primary, #3b82f6); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%; }
.dlc-console-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:#121214; max-height:140px; overflow-y:auto; padding:8px 12px; font-family:monospace; font-size:11px; }
.dlc-log-line { padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
.dlc-log-err { color:#f87171; }
.dlc-log-warn { color:#fbbf24; }
.dlc-log-info { color:#60a5fa; }
`;

    // ---------------------------------------------------------------- Inject Styles
    if (typeof document !== 'undefined' && !document.getElementById('dlc-plugin-styles')) {
      const tag = document.createElement('style');
      tag.id = 'dlc-plugin-styles';
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    // ---------------------------------------------------------------- Localization Strings
    const i18n = {
      en: {
        title: 'Live Canvas Preview',
        description: 'Interactive in-browser canvas for real-time preview of HTML (with Tailwind CSS & Lucide icons), React components, SVGs, and diagrams with SSE hot-reload & diagnostics.',
        defaultViewport: 'Default Viewport',
        defaultViewportDesc: 'Initial layout size for live preview frames',
        responsive: 'Responsive (100%)',
        mobile: 'Mobile (375px)',
        tablet: 'Tablet (768px)',
        desktop: 'Desktop (1280px)',
        autoOpen: 'Auto-open Canvas',
        autoOpenDesc: 'Automatically open preview canvas when agent creates HTML or React components',
        enableHotReload: 'Enable SSE Hot-Reload',
        enableHotReloadDesc: 'Real-time live reload on component updates',
        maxSessions: 'Max Cached Sessions',
        maxSessionsDesc: 'Number of active preview sessions to keep in memory',
        save: 'Save Changes',
        saved: 'Settings saved successfully',
        saveError: 'Failed to save settings',
        loading: 'Loading settings...',
        unavailable: 'Settings service is unavailable',
        inspectBtn: 'Inspect Element',
        refreshBtn: 'Refresh',
        openTabBtn: 'Open in Tab'
      },
      ru: {
        title: 'Live Canvas Preview',
        description: 'Интерактивный холст для предпросмотра HTML (с Tailwind CSS и Lucide иконками), React-компонентов, SVG и диаграмм в реальном времени с поддержкой SSE hot-reload и телеметрии.',
        defaultViewport: 'Разрешение по умолчанию',
        defaultViewportDesc: 'Исходный размер области предпросмотра',
        responsive: 'Адаптивный (100%)',
        mobile: 'Мобильный (375px)',
        tablet: 'Планшет (768px)',
        desktop: 'Десктоп (1280px)',
        autoOpen: 'Авто-открытие холста',
        autoOpenDesc: 'Автоматически открывать холст при генерации HTML или React компонентов',
        enableHotReload: 'Включить SSE Hot-Reload',
        enableHotReloadDesc: 'Мгновенное обновление предпросмотра при изменении файлов',
        maxSessions: 'Лимит сессий в памяти',
        maxSessionsDesc: 'Максимальное число активных сессий предпросмотра',
        save: 'Сохранить',
        saved: 'Настройки успешно сохранены',
        saveError: 'Ошибка при сохранении настроек',
        loading: 'Загрузка настроек...',
        unavailable: 'Сервис настроек недоступен',
        inspectBtn: 'Инспектор элементов',
        refreshBtn: 'Обновить',
        openTabBtn: 'В новой вкладке'
      }
    };

    function getDict(locale) {
      if (locale && (locale.startsWith('ru') || locale === 'ru')) return i18n.ru;
      return i18n.en;
    }

    // ---------------------------------------------------------------- Settings Card Component
    function PluginCard(props) {
      const ctx = props.ctx;
      const [expanded, setExpanded] = React.useState(false);
      const [statusMsg, setStatusMsg] = React.useState(null);
      const [isSaving, setIsSaving] = React.useState(false);

      const locale = (ctx && ctx.locale && ctx.locale.getSnapshot && ctx.locale.getSnapshot().active) || 'en';
      const t = (key) => {
        const dict = getDict(locale);
        return dict[key] || (i18n.en[key] || key);
      };

      // Settings binding
      const scope = React.useMemo(() => {
        if (ctx && ctx.settingsScope) {
          return ctx.settingsScope.bind({ namespace: NS });
        }
        return null;
      }, [ctx]);

      const snapshot = scope ? scope.getSnapshot() : { status: 'unavailable', value: {} };

      const [draft, setDraft] = React.useState({
        defaultViewport: 'responsive',
        autoOpenOnHtmlGen: true,
        enableHotReload: true,
        maxSessionCache: 50
      });

      React.useEffect(() => {
        if (snapshot.status === 'ready' && snapshot.value) {
          setDraft({
            defaultViewport: snapshot.value.defaultViewport ?? 'responsive',
            autoOpenOnHtmlGen: snapshot.value.autoOpenOnHtmlGen ?? true,
            enableHotReload: snapshot.value.enableHotReload ?? true,
            maxSessionCache: snapshot.value.maxSessionCache ?? 50
          });
        }
      }, [snapshot.status, snapshot.value]);

      const handleSave = async () => {
        if (!scope) return;
        setIsSaving(true);
        setStatusMsg(null);
        try {
          const keys = ['defaultViewport', 'autoOpenOnHtmlGen', 'enableHotReload', 'maxSessionCache'];
          for (const key of keys) {
            await scope.set(key, draft[key]);
          }
          setStatusMsg({ type: 'ok', text: t('saved') });
          setTimeout(() => setStatusMsg(null), 3000);
        } catch (err) {
          setStatusMsg({ type: 'err', text: t('saveError') + ': ' + (err.message || err) });
        } finally {
          setIsSaving(false);
        }
      };

      // Render placeholder if snapshot unavailable or loading
      if (snapshot.status === 'unavailable') {
        return React.createElement('li', { className: 'dlc-card' },
          React.createElement('div', { className: 'dlc-head' },
            React.createElement('div', null,
              React.createElement('div', { className: 'dlc-title' }, t('title')),
              React.createElement('div', { className: 'dlc-sub' }, t('unavailable'))
            )
          )
        );
      }

      return React.createElement('li', { className: 'dlc-card' },
        React.createElement('button', {
          className: 'dlc-head',
          'aria-expanded': expanded,
          onClick: () => setExpanded(!expanded)
        },
          React.createElement('div', null,
            React.createElement('div', { className: 'dlc-title' }, t('title')),
            React.createElement('div', { className: 'dlc-sub' }, t('description'))
          ),
          React.createElement(Chevron, { open: expanded })
        ),
        expanded && React.createElement('div', { className: 'dlc-body' },
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
              React.createElement('option', { value: 'desktop' }, t('desktop'))
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

    // ---------------------------------------------------------------- Live Canvas Workspace Component
    function LiveCanvasWorkspace(props) {
      const canvasId = props.canvasId || 'default';
      const [viewport, setViewport] = React.useState('responsive');
      const [theme, setTheme] = React.useState('dark');
      const [inspectorActive, setInspectorActive] = React.useState(false);
      const [inspectedElement, setInspectedElement] = React.useState(null);
      const [logs, setLogs] = React.useState([]);
      const [showConsole, setShowConsole] = React.useState(false);
      const frameRef = React.useRef(null);

      const srcUrl = `/dsh-live-canvas/sandbox/${canvasId}`;

      React.useEffect(() => {
        function handleWindowMessage(e) {
          if (e.data && e.data.type === 'dlc_element_inspected') {
            setInspectedElement(e.data);
          }
          if (e.data && e.data.type === 'dlc_telemetry_log') {
            setLogs((prev) => [e.data, ...prev].slice(0, 30));
          }
        }
        window.addEventListener('message', handleWindowMessage);
        return () => window.removeEventListener('message', handleWindowMessage);
      }, []);

      const toggleInspector = () => {
        const next = !inspectorActive;
        setInspectorActive(next);
        if (frameRef.current && frameRef.current.contentWindow) {
          frameRef.current.contentWindow.postMessage({
            type: 'dlc_set_inspector',
            enabled: next
          }, '*');
        }
      };

      const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        if (frameRef.current && frameRef.current.contentWindow) {
          frameRef.current.contentWindow.postMessage({
            type: 'dlc_set_theme',
            theme: next
          }, '*');
        }
      };

      const handleRefresh = () => {
        if (frameRef.current) {
          frameRef.current.src = srcUrl + '?t=' + Date.now();
        }
      };

      const handleOpenTab = () => {
        window.open(srcUrl, '_blank');
      };

      const errorCount = logs.filter(l => l.level === 'error').length;

      let frameWidth = '100%';
      let frameHeight = '100%';
      if (viewport === 'mobile') { frameWidth = '375px'; frameHeight = '667px'; }
      if (viewport === 'tablet') { frameWidth = '768px'; frameHeight = '1024px'; }
      if (viewport === 'desktop') { frameWidth = '1280px'; frameHeight = '800px'; }

      return React.createElement('div', { className: 'dlc-panel-container' },
        // Header Toolbar
        React.createElement('div', { className: 'dlc-toolbar' },
          React.createElement('div', { className: 'dlc-toolbar-group' },
            React.createElement('button', {
              className: 'dlc-btn' + (viewport === 'responsive' ? ' dlc-btn-active' : ''),
              onClick: () => setViewport('responsive')
            }, '↔ Responsive'),
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
            }, '💻 1280px')
          ),
          React.createElement('div', { className: 'dlc-toolbar-group' },
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: toggleTheme
            }, theme === 'dark' ? '☀️ Light' : '🌙 Dark'),
            React.createElement('button', {
              className: 'dlc-btn' + (errorCount > 0 ? ' dlc-btn-err' : ''),
              onClick: () => setShowConsole(!showConsole)
            }, errorCount > 0 ? `🔴 ${errorCount} err` : '🟢 0 err'),
            React.createElement('button', {
              className: 'dlc-btn' + (inspectorActive ? ' dlc-btn-active' : ''),
              onClick: toggleInspector
            }, inspectorActive ? '🔍 Inspecting...' : '🔍 Inspect'),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleRefresh
            }, '🔄 Refresh'),
            React.createElement('button', {
              className: 'dlc-btn',
              onClick: handleOpenTab
            }, '↗ Open')
          )
        ),
        // Iframe Sandbox Viewport
        React.createElement('div', { className: 'dlc-preview-viewport' },
          React.createElement('div', {
            className: 'dlc-frame-wrapper',
            style: { width: frameWidth, height: frameHeight }
          },
            React.createElement('iframe', {
              ref: frameRef,
              className: 'dlc-frame',
              src: srcUrl,
              sandbox: 'allow-scripts allow-forms allow-same-origin allow-modals'
            })
          )
        ),
        // Inspector details drawer
        inspectedElement && React.createElement('div', { className: 'dlc-inspector-bar' },
          React.createElement('span', { className: 'dlc-inspector-selector' },
            'Selected: ' + inspectedElement.selector
          ),
          React.createElement('span', null,
            (inspectedElement.rect ? inspectedElement.rect.width + 'x' + inspectedElement.rect.height + 'px' : '')
          )
        ),
        // Collapsible Diagnostic Console Drawer
        showConsole && React.createElement('div', { className: 'dlc-console-drawer' },
          logs.length === 0 ?
            React.createElement('div', { style: { color: '#71717a' } }, 'No telemetry logs recorded yet.') :
            logs.map((l, i) => React.createElement('div', {
              key: i,
              className: 'dlc-log-line ' + (l.level === 'error' ? 'dlc-log-err' : (l.level === 'warn' ? 'dlc-log-warn' : 'dlc-log-info'))
            }, `[${l.level.toUpperCase()}] ${l.message}`))
        )
      );
    }

    // ---------------------------------------------------------------- Apply / Plugin Registration
    module.exports.inject = ['slots', 'locale'];
    module.exports.apply = function apply(ctx) {
      if (ctx.locale) {
        try {
          ctx.locale.register(NS, i18n);
        } catch {}
      }

      if (ctx.slots && typeof ctx.slots.inject === 'function') {
        let registered = false;
        try {
          ctx.slots.inject('settings.plugin.item', () => {
            return ctx.slots.register({
              name: 'settings.plugin.item',
              key: NS,
              locale: NS,
              inject: () => ({ ctx })
            }, PluginCard);
          });
          registered = true;
        } catch {}

        if (!registered) {
          try {
            ctx.slots.inject('settings.section', () => {
              return ctx.slots.register({
                name: 'settings.section',
                id: NS,
                order: 30,
                locale: NS,
                label: () => (ctx.locale && ctx.locale.getSnapshot?.().active?.startsWith('ru') ? 'Live Canvas' : 'Live Canvas'),
                inject: () => ({ ctx })
              }, PluginCard);
            });
          } catch {}
        }
      }
    };

    module.exports.PluginCard = PluginCard;
    module.exports.LiveCanvasWorkspace = LiveCanvasWorkspace;

    return module.exports;
  }
});