// dsh-live-canvas: client (browser) half.
// Provides settings card in "Settings -> Plugins -> Plugin Settings", Live Canvas interactive preview container with workspace file discovery, session switcher, file picker drawer, auto-initialization, reactive iframe key management, persistent DOM viewports, SSE hot-reload, telemetry console, annotations, props controls, visual diffs, device matrix, mock data, 1-click Vite packager, full Russian localization, inline WYSIWYG editor sync, floating Tailwind tweaker, in-place AI element prompt modal, and native dsh-better-sidebar integration.

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
.dlc-panel-container { display:flex; flex-direction:column; width:100%; height:100%; min-height:360px; background:var(--dsw-alias-bg-layer-2, #18181b); border-radius:8px; overflow:hidden; position:relative; }
.dlc-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; background:var(--dsw-alias-bg-layer-3, #27272a); border-bottom:1px solid var(--dsw-alias-border-l2, #3f3f46); }
.dlc-toolbar-group { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.dlc-session-dropdown { height:28px; border:1px solid var(--dsw-alias-border-l2, #3f3f46); background:var(--dsw-alias-bg-layer-4, #18181b); color:var(--dsw-alias-label-primary, #ffffff); border-radius:6px; padding:0 8px; font-size:12px; font-weight:600; max-width:280px; cursor:pointer; text-overflow:ellipsis; }
.dlc-btn { appearance:none; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); border-radius:6px; padding:4px 10px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:4px; transition:background .15s; }
.dlc-btn:hover { background:var(--dsw-alias-bg-layer-4, #3f3f46); }
.dlc-btn-active { background:var(--dsw-alias-brand-primary, #2563eb) !important; color:#ffffff !important; border-color:transparent !important; }
.dlc-btn-ai { background:linear-gradient(135deg, #8b5cf6, #3b82f6) !important; color:#fff !important; font-weight:600; border-color:transparent !important; }
.dlc-btn-err { border-color:#ef4444 !important; color:#ef4444 !important; }
.dlc-preview-viewport { flex:1; display:flex; align-items:center; justify-content:center; padding:16px; overflow:auto; background:var(--dsw-alias-bg-layer-1, #09090b); }
.dlc-matrix-viewport { flex:1; display:flex; gap:20px; padding:20px; overflow-x:auto; background:var(--dsw-alias-bg-layer-1, #09090b); align-items:flex-start; justify-content:center; }
.dlc-matrix-card { background:#18181b; border:1px solid #27272a; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.4); flex-shrink:0; display:flex; flex-direction:column; }
.dlc-matrix-card-head { padding:6px 12px; background:#27272a; font-size:11px; font-weight:600; color:#e4e4e7; display:flex; align-items:center; justify-content:space-between; }
.dlc-frame-wrapper { transition:width .25s ease-in-out, height .25s ease-in-out; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.3); overflow:hidden; background:#ffffff; }
.dlc-frame { width:100%; height:100%; border:0; display:block; }
.dlc-inspector-bar { border-top:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); padding:8px 12px; font-size:12px; color:var(--dsw-alias-label-primary); display:flex; align-items:center; justify-content:space-between; font-family:monospace; gap:10px; }
.dlc-inspector-selector { font-weight:600; color:var(--dsw-alias-brand-primary, #3b82f6); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50%; }
.dlc-console-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:#121214; max-height:140px; overflow-y:auto; padding:8px 12px; font-family:monospace; font-size:11px; }
.dlc-log-line { padding:2px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
.dlc-log-err { color:#f87171; }
.dlc-log-warn { color:#fbbf24; }
.dlc-log-info { color:#60a5fa; }
.dlc-controls-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:#18181b; padding:10px 14px; font-size:12px; color:#f4f4f5; max-height:160px; overflow-y:auto; }
.dlc-controls-grid { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
.dlc-ctrl-item { display:flex; align-items:center; gap:6px; }
.dlc-ctrl-input { height:28px; border:1px solid #3f3f46; background:#27272a; color:#fff; border-radius:6px; padding:0 8px; font-size:12px; }

/* File Picker Drawer */
.dlc-picker-drawer { border-top:1px solid var(--dsw-alias-border-l2); background:#18181b; padding:12px 16px; font-size:12px; color:#f4f4f5; max-height:220px; overflow-y:auto; }
.dlc-picker-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
.dlc-picker-search { flex:1; height:30px; border:1px solid #3f3f46; background:#27272a; color:#fff; border-radius:6px; padding:0 10px; font-size:12px; }
.dlc-picker-list { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:6px; max-height:140px; overflow-y:auto; }
.dlc-picker-item { padding:6px 10px; background:#27272a; border:1px solid #3f3f46; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; gap:6px; text-align:left; transition:background .15s; font-size:11px; overflow:hidden; }
.dlc-picker-item:hover { background:#3f3f46; border-color:#60a5fa; }
.dlc-picker-item-name { font-weight:600; color:#e4e4e7; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dlc-picker-item-path { font-size:10px; color:#a1a1aa; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* AI Prompt Modal */
.dlc-modal-overlay { position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:9999999; display:flex; align-items:center; justify-content:center; }
.dlc-modal-card { background:#18181b; border:1px solid #3f3f46; border-radius:14px; width:480px; max-width:90vw; padding:20px; box-shadow:0 20px 50px rgba(0,0,0,0.8); display:flex; flex-direction:column; gap:14px; color:#f4f4f5; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.dlc-modal-head { display:flex; align-items:center; justify-content:space-between; }
.dlc-modal-title { font-size:15px; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px; }
.dlc-modal-input { width:100%; min-height:80px; background:#27272a; border:1px solid #3f3f46; border-radius:8px; padding:10px; color:#fff; font-size:13px; resize:vertical; box-sizing:border-box; }
.dlc-preset-btn { background:#27272a; border:1px solid #3f3f46; border-radius:6px; padding:4px 8px; font-size:11px; color:#cbd5e1; cursor:pointer; text-align:left; transition:background .15s; }
.dlc-preset-btn:hover { background:#3f3f46; color:#fff; }
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
        presetMobile: '📱 Optimize responsive mobile layout'
      },
      ru: {
        title: 'Live Canvas Preview',
        description: 'Интерактивный холст для предпросмотра HTML (с Tailwind CSS и Lucide иконками), React-компонентов, SVG и диаграмм в реальном времени с поддержкой сканирования файлов рабочей области, переключателя сессий, выбора файлов, SSE hot-reload, контролов пропсов, визуального сравнения, мульти-девайс матрицы, моковых API, 1-клик упаковщика Vite проектов и нативной интеграции с Better Sidebar.',
        defaultViewport: 'Разрешение по умолчанию',
        defaultViewportDesc: 'Исходный размер области предпросмотра',
        responsive: 'Адаптивный',
        mobile: 'Мобильный',
        tablet: 'Планшет',
        desktop: 'Десктоп',
        matrix: 'Матрица',
        autoOpen: 'Авто-открытие холста',
        autoOpenDesc: 'Автоматически открывать холст при генерации HTML или React компонентов',
        enableHotReload: 'Включить SSE Hot-Reload',
        enableHotReloadDesc: 'Мгновенное обновление предпросмотра при изменении файлов',
        maxSessions: 'Лимит сессий в памяти',
        maxSessionsDesc: 'Максимальное число активных сессий предпросмотра',
        save: 'Сохранить',
        saved: 'Настройки успешно сохранены',
        saveError: 'Ошибка при сохранении настроек',
        loading: 'Загрузка...',
        unavailable: 'Сервис настроек недоступен',
        inspectBtn: 'Инспектор',
        inspectingBtn: 'Выбор...',
        refreshBtn: 'Обновить',
        openTabBtn: 'Вкладка',
        exportBtn: 'Экспорт',
        packBtn: 'В Vite',
        annotateBtn: 'Заметки',
        drawingBtn: 'Рисование...',
        notesCount: 'заметок',
        controlsBtn: 'Параметры',
        compareBtn: 'Сравнить',
        matrixBtn: 'Матрица',
        openFileBtn: 'Файлы',
        browseFilesBtn: 'Обзор',
        mockBadge: 'Мок API',
        themeLight: 'Светлая',
        themeDark: 'Тёмная',
        sessionsGroup: '⚡ Активные сессии',
        workspaceFilesGroup: '📂 Файлы рабочей области',
        searchPlaceholder: '🔍 Поиск файла в проекте (например: preview.html)...',
        customPathPlaceholder: 'Или введите путь к файлу...',
        openActionBtn: 'Открыть',
        choosePlaceholder: '⚡ Выберите файл или сессию...',
        noFilesFound: 'Файлы интерфейсов (.html, .jsx, .tsx, .svg, .md) не найдены.',
        noControls: 'Для этого компонента нет интерактивных параметров (props).',
        noLogs: 'Логи телеметрии пока не зафиксированы.',
        syncScroll: 'Синхр. скролл',
        selectedLabel: 'Выбрано',
        sidebarTab: 'Live Canvas',
        errCount: 'ош.',
        aiPromptBtn: '✨ AI Правка',
        aiPromptModalTitle: 'Точечная правка элемента через AI',
        aiPromptDesc: 'Опишите, что нужно изменить в выбранном элементе, или выберите пресет:',
        aiPromptPlaceholder: 'Например: Сделай карточку стеклянной (glassmorphism), добавь градиентную рамку и увеличь отступы...',
        aiSubmitBtn: 'Отправить агенту',
        aiSentSuccess: 'Задача отправлена агенту! Холст обновится автоматически.',
        presetGlass: '💎 Стеклянный фон (glassmorphism) и неоновое свечение',
        presetModern: '⚡ Минималистичная типографика и аккуратные отступы',
        presetBadge: '🔥 Добавить акционный бейдж и микро-анимацию',
        presetMobile: '📱 Адаптировать для мобильных устройств'
      }
    };

    function getActiveLocale(ctx) {
      try {
        if (ctx && ctx.locale && ctx.locale.getSnapshot) {
          const snap = ctx.locale.getSnapshot();
          if (snap && snap.active) return snap.active;
        }
      } catch {}
      if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) {
        return document.documentElement.lang;
      }
      if (typeof navigator !== 'undefined' && navigator.language) {
        return navigator.language;
      }
      return 'ru';
    }

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

      const locale = getActiveLocale(ctx);
      const t = (key) => {
        const dict = getDict(locale);
        return dict[key] || (i18n.en[key] || key);
      };

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
      const ctx = props.ctx;
      const locale = getActiveLocale(ctx);
      const t = (key) => {
        const dict = getDict(locale);
        return dict[key] || (i18n.en[key] || key);
      };

      const initialCanvasId = props.canvasId || 'default';
      const [canvasId, setCanvasId] = React.useState(initialCanvasId !== 'default' ? initialCanvasId : null);
      const canvasIdRef = React.useRef(canvasId);
      canvasIdRef.current = canvasId;

      const [sessions, setSessions] = React.useState([]);
      const [workspaceFiles, setWorkspaceFiles] = React.useState([]);
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
      const frameRef = React.useRef(null);
      const matrixFramesRef = React.useRef([]);

      const openFile = (filePath) => {
        if (!filePath) return;
        fetch('/dsh-live-canvas/api/open-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath })
        })
          .then(r => r.json())
          .then(data => {
            if (data.canvasId) {
              setCanvasId(data.canvasId);
              canvasIdRef.current = data.canvasId;
              setShowFilePicker(false);
              if (frameRef.current) {
                frameRef.current.src = `/dsh-live-canvas/sandbox/${data.canvasId}`;
              }
              matrixFramesRef.current.forEach(f => {
                if (f) f.src = `/dsh-live-canvas/sandbox/${data.canvasId}`;
              });
              fetch('/dsh-live-canvas/api/sessions')
                .then(r => r.json())
                .then(d => { if (d.sessions) setSessions(d.sessions); })
                .catch(() => {});
            }
          })
          .catch(err => {
            console.warn('[LiveCanvas] Error opening target file -', err);
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
        loadSessionsAndFiles();

        let sse = null;
        try {
          sse = new EventSource('/dsh-live-canvas/events');
          sse.addEventListener('update', (e) => {
            try {
              const p = JSON.parse(e.data || '{}');
              if (p.canvasId && p.canvasId === canvasIdRef.current) {
                // Current canvas hot-reloaded
                if (frameRef.current) {
                  frameRef.current.src = `/dsh-live-canvas/sandbox/${p.canvasId}?t=${Date.now()}`;
                }
              } else if (!canvasIdRef.current && p.canvasId) {
                setCanvasId(p.canvasId);
                canvasIdRef.current = p.canvasId;
              }
            } catch {}
            // Update session list without switching user's canvasId
            fetch('/dsh-live-canvas/api/sessions')
              .then(r => r.json())
              .then(d => { if (d.sessions) setSessions(d.sessions); })
              .catch(() => {});
          });
          sse.addEventListener('workspace_files_changed', () => {
            loadSessionsAndFiles();
          });
        } catch {}

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
        if (!val || val === 'default') return;
        if (val.startsWith('ws_path_')) {
          const filePath = val.replace('ws_path_', '');
          openFile(filePath);
        } else {
          setCanvasId(val);
          canvasIdRef.current = val;
          if (frameRef.current) {
            frameRef.current.src = `/dsh-live-canvas/sandbox/${val}`;
          }
          matrixFramesRef.current.forEach(f => {
            if (f) f.src = `/dsh-live-canvas/sandbox/${val}`;
          });
        }
      };

      const activeId = canvasId || (sessions[0] && sessions[0].id) || 'default';
      const activeSession = sessions.find(s => s.id === activeId);
      const selectedDropdownValue = (activeSession && activeSession.filePath) ? ('ws_path_' + activeSession.filePath) : activeId;
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
          if (e.data && e.data.type === 'dlc_session_created') {
            if (e.data.canvasId) {
              setCanvasId(e.data.canvasId);
              canvasIdRef.current = e.data.canvasId;
              loadSessionsAndFiles();
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
          if (e.data && e.data.type === 'dlc_save_text_edit') {
            setToastMsg('💾 Текст успешно сохранен в файл проекта!');
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

      const handleRefresh = () => {
        loadSessionsAndFiles();
        if (frameRef.current) {
          frameRef.current.src = srcUrl + '?t=' + Date.now();
        }
        matrixFramesRef.current.forEach(f => {
          if (f) f.src = srcUrl + '?t=' + Date.now();
        });
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
              value: selectedDropdownValue || 'default',
              title: t('title'),
              onChange: (e) => handleDropdownChange(e.target.value)
            },
              React.createElement('option', { value: 'default', disabled: true, hidden: true },
                t('choosePlaceholder')
              ),
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
              style: { borderColor: '#10b981', color: '#10b981', cursor: 'default' }
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
            background: '#10b981',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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
            React.createElement('div', { style: { color: '#71717a', padding: '12px 0' } }, t('noFilesFound')) :
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
                  React.createElement('span', { style: { fontSize: '10px', color: '#71717a' } }, `${Math.round(f.size / 1024)}kb`)
                );
              })
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
              React.createElement('span', { style: { color: '#a1a1aa' } }, t('syncScroll'))
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
              React.createElement('span', { style: { color: '#a1a1aa' } }, t('syncScroll'))
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
              React.createElement('span', { style: { color: '#a1a1aa' } }, t('syncScroll'))
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
            React.createElement('span', { style: { color: '#a1a1aa', fontSize: '11px' } },
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
                style: { background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '16px' },
                onClick: () => setShowAiModal(false)
              }, '✕')
            ),
            React.createElement('div', { style: { fontSize: '12px', color: '#94a3b8' } },
              React.createElement('span', { style: { color: '#38bdf8', fontWeight: 'bold' } }, inspectedElement ? inspectedElement.selector : 'Element'),
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
              React.createElement('button', { className: 'dlc-btn', onClick: () => setShowAiModal(false) }, 'Отмена'),
              React.createElement('button', { className: 'dlc-btn dlc-btn-ai', onClick: handleSendAiPrompt }, t('aiSubmitBtn'))
            )
          )
        ),
        // Interactive Props Controls Drawer
        showControls && React.createElement('div', { className: 'dlc-controls-drawer' },
          !controlsSchema || Object.keys(controlsSchema).length === 0 ?
            React.createElement('div', { style: { color: '#71717a' } }, t('noControls')) :
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
          logs.length === 0 ?
            React.createElement('div', { style: { color: '#71717a' } }, t('noLogs')) :
            logs.map((l, i) => React.createElement('div', {
              key: i,
              className: 'dlc-log-line ' + (l.level === 'error' ? 'dlc-log-err' : (l.level === 'warn' ? 'dlc-log-warn' : 'dlc-log-info'))
            }, `[${l.level.toUpperCase()}] ${l.message}`))
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
          style: { padding: '24px', textAlign: 'center', color: '#71717a', fontSize: '13px' }
        }, 'Loading Live Canvas preview...');
      }

      return React.createElement(LiveCanvasWorkspace, { canvasId });
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
          title: () => (ctx.locale && ctx.locale.getSnapshot?.().active?.startsWith('ru') ? 'Live Canvas' : 'Live Canvas'),
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
            title: () => (ctx.locale && ctx.locale.getSnapshot?.().active?.startsWith('ru') ? 'Live Canvas Предпросмотр' : 'Live Canvas Preview'),
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
        disposers.forEach(fn => { try { fn(); } catch {} });
      };
    }

    // ---------------------------------------------------------------- Apply / Plugin Registration
    module.exports.inject = ['slots', 'locale'];
    module.exports.apply = function apply(ctx) {
      if (ctx.locale) {
        try {
          ctx.locale.register(NS, i18n);
        } catch {}
      }

      // Settings Card Registration
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

      // Single, declaration-safe, idempotent Better Sidebar Registration via ctx.inject
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

    module.exports.PluginCard = PluginCard;
    module.exports.LiveCanvasWorkspace = LiveCanvasWorkspace;
    module.exports.LiveCanvasFileViewer = LiveCanvasFileViewer;
    module.exports.registerBetterSidebar = registerBetterSidebar;

    return module.exports;
  }
});

