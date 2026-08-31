// dsh-live-canvas: sandbox security, CSP headers, telemetry interception, DOM inspector, visual annotations, WYSIWYG text editor, and floating Tailwind style tweaker.

import path from 'node:path';

export function getSandboxHeaders(options = {}) {
  const allowOrigin = options.allowOrigin || '*';
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:;",
    'Referrer-Policy': 'no-referrer-when-downgrade'
  };
}

export function sanitizePath(baseDir, targetRelativePath) {
  if (!targetRelativePath) return baseDir;
  const resolved = path.resolve(baseDir, targetRelativePath);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error('Security Violation: Path traversal outside base directory');
  }
  return resolved;
}

export function injectSandboxRuntime(html, canvasId, options = {}) {
  const eventsUrl = options.eventsUrl || '/dsh-live-canvas/events';
  const inspectApiUrl = options.inspectApiUrl || '/dsh-live-canvas/api/inspect';
  const logsApiUrl = options.logsApiUrl || '/dsh-live-canvas/api/logs';
  const annotateApiUrl = options.annotateApiUrl || '/dsh-live-canvas/api/annotations';
  const saveContentApiUrl = options.saveContentApiUrl || '/dsh-live-canvas/api/save-content';
  const saveClassesApiUrl = options.saveClassesApiUrl || '/dsh-live-canvas/api/save-classes';
  const saveReorderApiUrl = options.saveReorderApiUrl || '/dsh-live-canvas/api/save-reorder';

  const runtimeScript = `
<script id="dlc-sandbox-runtime">
(function() {
  const CANVAS_ID = ${JSON.stringify(canvasId || 'default')};
  const EVENTS_URL = ${JSON.stringify(eventsUrl)};
  const INSPECT_API = ${JSON.stringify(inspectApiUrl)};
  const LOGS_API = ${JSON.stringify(logsApiUrl)};
  const ANNOTATE_API = ${JSON.stringify(annotateApiUrl)};
  const SAVE_CONTENT_API = ${JSON.stringify(saveContentApiUrl)};
  const SAVE_CLASSES_API = ${JSON.stringify(saveClassesApiUrl)};

  let isInspectorActive = false;
  let isAnnotationMode = false;
  let hoveredElement = null;
  let selectedElement = null;
  let annotationStart = null;
  let annotationBoxElem = null;
  let isReorderMode = false;
  let draggedElement = null;

  // --- Mock Data Fetch Interceptor ---
  window.__DLC_MOCK_DATA__ = ${JSON.stringify(options.mockData || {})};
  if (window.__DLC_MOCK_DATA__ && Object.keys(window.__DLC_MOCK_DATA__).length > 0) {
    const origFetch = window.fetch;
    window.fetch = async function(resource, init) {
      const urlStr = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
      for (const [mockPath, mockResponse] of Object.entries(window.__DLC_MOCK_DATA__)) {
        if (urlStr.includes(mockPath)) {
          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      return origFetch.apply(window, arguments);
    };
  }

  // --- Styles for Inspect, Annotate, WYSIWYG, and Style Tweaker ---
  const overlayStyle = document.createElement('style');
  overlayStyle.textContent = \`
    .dlc-inspect-highlight {
      outline: 2px dashed #3b82f6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
    }
    .dlc-editable-active {
      outline: 2px solid #10b981 !important;
      outline-offset: 2px !important;
      background: rgba(16, 185, 129, 0.08) !important;
      cursor: text !important;
    }
    .dlc-editable-badge {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #18181b;
      color: #10b981;
      border: 1px solid #10b981;
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 1000001;
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dlc-tweaker-bar {
      position: absolute;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      color: #f4f4f5;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 380px;
    }
    .dlc-tweaker-row {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .dlc-tweaker-label {
      color: #a1a1aa;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      min-width: 50px;
    }
    .dlc-tweaker-chip {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 4px;
      padding: 2px 6px;
      color: #e4e4e7;
      cursor: pointer;
      font-size: 10px;
      transition: background 0.15s, border-color 0.15s;
    }
    .dlc-tweaker-chip:hover {
      background: #3b82f6;
      color: #fff;
      border-color: #60a5fa;
    }
    .dlc-tweaker-color-btn {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.2);
      cursor: pointer;
      transition: transform 0.1s;
    }
    .dlc-tweaker-color-btn:hover {
      transform: scale(1.25);
    }
    .dlc-annotation-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      cursor: crosshair;
      pointer-events: auto;
      background: rgba(59, 130, 246, 0.03);
    }
    .dlc-annotation-box {
      position: absolute;
      border: 2px solid #ef4444;
      background: rgba(239, 68, 68, 0.15);
      border-radius: 4px;
      pointer-events: none;
      z-index: 1000000;
    }
    
    .dlc-reorder-active {
      outline: 2px dashed #f59e0b !important;
      outline-offset: -2px !important;
      cursor: grab !important;
      transition: opacity 0.2s, transform 0.2s;
    }
    .dlc-reorder-dragging {
      opacity: 0.4 !important;
      cursor: grabbing !important;
    }
    .dlc-drop-target-before {
      border-top: 4px solid #3b82f6 !important;
    }
    .dlc-drop-target-after {
      border-bottom: 4px solid #3b82f6 !important;
    }
    .dlc-annotation-tag {
      position: absolute;
      top: -24px;
      left: 0;
      background: #ef4444;
      color: #ffffff;
      font-size: 11px;
      font-family: sans-serif;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
  \`;
  document.head.appendChild(overlayStyle);

  // --- Telemetry Log Interception ---
  function sendLog(level, args) {
    const message = Array.from(args).map(a => {
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    }).join(' ');

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_telemetry_log',
        canvasId: CANVAS_ID,
        level,
        message,
        timestamp: new Date().toISOString()
      }, '*');
    }

    try {
      fetch(LOGS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasId: CANVAS_ID, level, message })
      }).catch(() => {});
    } catch {}
  }

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function() { sendLog('info', arguments); origLog.apply(console, arguments); };
  console.warn = function() { sendLog('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { sendLog('error', arguments); origError.apply(console, arguments); };

  window.addEventListener('error', (e) => {
    sendLog('error', [e.message + ' at ' + (e.filename || '') + ':' + (e.lineno || 0)]);
  });

  // --- Theme Toggle Listener ---
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'dlc_set_theme') {
      if (e.data.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    if (e.data && e.data.type === 'dlc_set_inspector') {
      isInspectorActive = !!e.data.enabled;
      if (!isInspectorActive && hoveredElement) {
        hoveredElement.classList.remove('dlc-inspect-highlight');
        hoveredElement = null;
      }
      if (!isInspectorActive) {
        removeTweakerBar();
      }
    }
    if (e.data && e.data.type === 'dlc_set_annotation_mode') {
      isAnnotationMode = !!e.data.enabled;
      updateAnnotationOverlay();
    }
    if (e.data && e.data.type === 'dlc_set_reorder_mode') {
      isReorderMode = !!e.data.enabled;
      toggleReorderMode(isReorderMode);
    }
    if (e.data && e.data.type === 'dlc_sync_scroll') {
      const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollMax > 0) {
        window.scrollTo(0, scrollMax * (e.data.percentY || 0));
      }
    }
  });

  // --- Synchronized Scroll Reporting ---
  let scrollReportTimer = null;
  window.addEventListener('scroll', () => {
    if (scrollReportTimer) return;
    scrollReportTimer = setTimeout(() => {
      scrollReportTimer = null;
      const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
      const percentY = scrollMax > 0 ? (window.scrollY / scrollMax) : 0;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'dlc_scroll_report', percentY }, '*');
      }
    }, 50);
  });

  // --- Inspector Logic & CSS Selector Generation ---
  function getCssSelector(el) {
    if (!(el instanceof Element)) return '';
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += ":nth-of-type("+nth+")";
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  document.addEventListener('mouseover', (e) => {
    if (!isInspectorActive || isAnnotationMode || isReorderMode) return;
    if (e.target.id === 'dlc-sandbox-runtime' || e.target.closest('#dlc-style-tweaker-bar')) return;
    if (hoveredElement && hoveredElement !== e.target) {
      hoveredElement.classList.remove('dlc-inspect-highlight');
    }
    hoveredElement = e.target;
    hoveredElement.classList.add('dlc-inspect-highlight');
  });

  // --- Floating Style Tweaker Bar ---
  let tweakerBarElem = null;

  function removeTweakerBar() {
    if (tweakerBarElem) {
      tweakerBarElem.remove();
      tweakerBarElem = null;
    }
  }

  function renderStyleTweaker(target) {
    removeTweakerBar();
    if (!target) return;

    selectedElement = target;
    const rect = target.getBoundingClientRect();

    tweakerBarElem = document.createElement('div');
    tweakerBarElem.id = 'dlc-style-tweaker-bar';
    tweakerBarElem.className = 'dlc-tweaker-bar';
    tweakerBarElem.style.left = Math.max(10, Math.min(window.innerWidth - 390, rect.left + window.scrollX)) + 'px';
    tweakerBarElem.style.top = Math.max(10, rect.top + window.scrollY - 130) + 'px';

    const selector = getCssSelector(target);

    const applyClass = (newCls, categoryRegex) => {
      let currentClasses = (target.className || '').split(/\\s+/).filter(Boolean);
      if (categoryRegex) {
        currentClasses = currentClasses.filter(c => !categoryRegex.test(c));
      }
      if (newCls) currentClasses.push(newCls);
      const finalClassStr = currentClasses.join(' ');
      target.className = finalClassStr;

      // Sync to server
      fetch(SAVE_CLASSES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId: CANVAS_ID,
          selector,
          className: finalClassStr
        })
      }).catch(() => {});
    };

    tweakerBarElem.innerHTML = \`
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #27272a; padding-bottom:4px;">
        <span style="font-weight:700; color:#38bdf8;">🎛️ \${target.tagName.toLowerCase()}</span>
        <span style="color:#71717a; font-size:10px; cursor:pointer;" onclick="this.closest('#dlc-style-tweaker-bar').remove()">✕</span>
      </div>
      <div class="dlc-tweaker-row">
        <span class="dlc-tweaker-label">Текст</span>
        <span class="dlc-tweaker-chip" data-cls="text-white" data-re="^text-(white|slate|amber|emerald|blue|rose|violet)">Белый</span>
        <span class="dlc-tweaker-chip" data-cls="text-amber-400" data-re="^text-(white|slate|amber|emerald|blue|rose|violet)">Янтарь</span>
        <span class="dlc-tweaker-chip" data-cls="text-emerald-400" data-re="^text-(white|slate|amber|emerald|blue|rose|violet)">Изумруд</span>
        <span class="dlc-tweaker-chip" data-cls="text-blue-400" data-re="^text-(white|slate|amber|emerald|blue|rose|violet)">Синий</span>
        <span class="dlc-tweaker-chip" data-cls="text-rose-400" data-re="^text-(white|slate|amber|emerald|blue|rose|violet)">Красный</span>
      </div>
      <div class="dlc-tweaker-row">
        <span class="dlc-tweaker-label">Отступы</span>
        <span class="dlc-tweaker-chip" data-cls="p-2" data-re="^p-\\d+">p-2</span>
        <span class="dlc-tweaker-chip" data-cls="p-4" data-re="^p-\\d+">p-4</span>
        <span class="dlc-tweaker-chip" data-cls="p-6" data-re="^p-\\d+">p-6</span>
        <span class="dlc-tweaker-chip" data-cls="m-2" data-re="^m-\\d+">m-2</span>
        <span class="dlc-tweaker-chip" data-cls="m-4" data-re="^m-\\d+">m-4</span>
      </div>
      <div class="dlc-tweaker-row">
        <span class="dlc-tweaker-label">Форма</span>
        <span class="dlc-tweaker-chip" data-cls="rounded-none" data-re="^rounded">Прямой</span>
        <span class="dlc-tweaker-chip" data-cls="rounded-md" data-re="^rounded">md</span>
        <span class="dlc-tweaker-chip" data-cls="rounded-xl" data-re="^rounded">xl</span>
        <span class="dlc-tweaker-chip" data-cls="rounded-full" data-re="^rounded">Круг</span>
        <span class="dlc-tweaker-chip" data-cls="shadow-lg" data-re="^shadow">Тень</span>
      </div>
    \`;

    tweakerBarElem.querySelectorAll('.dlc-tweaker-chip').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const cls = btn.getAttribute('data-cls');
        const reStr = btn.getAttribute('data-re');
        applyClass(cls, reStr ? new RegExp(reStr) : null);
      });
    });

    document.body.appendChild(tweakerBarElem);
  }

  // --- Click Inspector & Style Tweaker Trigger ---
  document.addEventListener('click', (e) => {
    if (!isInspectorActive || isAnnotationMode) return;
    if (e.target.closest('#dlc-style-tweaker-bar')) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const rect = target.getBoundingClientRect();
    const attrs = {};
    for (let attr of target.attributes) {
      attrs[attr.name] = attr.value;
    }

    const inspectionData = {
      canvasId: CANVAS_ID,
      selector: getCssSelector(target),
      tagName: target.tagName.toLowerCase(),
      idAttr: target.id || '',
      className: target.className || '',
      innerText: (target.innerText || '').slice(0, 300),
      outerHtml: (target.outerHTML || '').slice(0, 500),
      attributes: attrs,
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };

    renderStyleTweaker(target);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_element_inspected',
        ...inspectionData
      }, '*');
    }

    fetch(INSPECT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspectionData)
    }).catch(() => {});
  }, true);

  // --- Inline WYSIWYG Co-Editor (Double Click to Edit Text) ---
  let editingElement = null;
  let originalTextValue = '';
  let badgeElem = null;

  document.addEventListener('dblclick', (e) => {
    if (isAnnotationMode) return;
    const target = e.target;
    if (target.closest('#dlc-style-tweaker-bar') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    e.preventDefault();
    e.stopPropagation();

    removeTweakerBar();
    editingElement = target;
    originalTextValue = target.innerText.trim();

    target.contentEditable = 'true';
    target.classList.add('dlc-editable-active');
    target.focus();

    if (!badgeElem) {
      badgeElem = document.createElement('div');
      badgeElem.className = 'dlc-editable-badge';
      badgeElem.innerHTML = '<span>✏️</span> <span>Режим правки текста: <b>Enter</b> — сохранить, <b>Esc</b> — отмена</span>';
      document.body.appendChild(badgeElem);
    }
  });

  function finishEditing(save) {
    if (!editingElement) return;
    const el = editingElement;
    const newText = el.innerText.trim();
    el.contentEditable = 'false';
    el.classList.remove('dlc-editable-active');
    editingElement = null;

    if (badgeElem) {
      badgeElem.remove();
      badgeElem = null;
    }

    if (!save) {
      el.innerText = originalTextValue;
      return;
    }

    if (newText !== originalTextValue && originalTextValue.length > 0) {
      const selector = getCssSelector(el);
      const payload = {
        canvasId: CANVAS_ID,
        selector,
        originalText: originalTextValue,
        newText
      };

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'dlc_save_text_edit', ...payload }, '*');
      }

      fetch(SAVE_CONTENT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => {
        console.warn('[WYSIWYG] Failed to save text change:', err);
      });
    }
  }

  document.addEventListener('keydown', (e) => {
    if (editingElement) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishEditing(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishEditing(false);
      }
    }
  });

  document.addEventListener('blur', (e) => {
    if (editingElement && e.target === editingElement) {
      setTimeout(() => finishEditing(true), 150);
    }
  }, true);

  // --- Visual Annotation Drawing ---
  function updateAnnotationOverlay() {
    if (isAnnotationMode) {
      removeTweakerBar();
      if (!annotationCanvas) {
        annotationCanvas = document.createElement('div');
        annotationCanvas.className = 'dlc-annotation-canvas';
        document.body.appendChild(annotationCanvas);

        annotationCanvas.addEventListener('mousedown', (e) => {
          annotationStart = { x: e.clientX, y: e.clientY };
          annotationBoxElem = document.createElement('div');
          annotationBoxElem.className = 'dlc-annotation-box';
          annotationBoxElem.style.left = e.clientX + 'px';
          annotationBoxElem.style.top = e.clientY + 'px';
          annotationBoxElem.style.width = '0px';
          annotationBoxElem.style.height = '0px';
          document.body.appendChild(annotationBoxElem);
        });

        annotationCanvas.addEventListener('mousemove', (e) => {
          if (!annotationStart || !annotationBoxElem) return;
          const left = Math.min(e.clientX, annotationStart.x);
          const top = Math.min(e.clientY, annotationStart.y);
          const width = Math.abs(e.clientX - annotationStart.x);
          const height = Math.abs(e.clientY - annotationStart.y);
          annotationBoxElem.style.left = left + 'px';
          annotationBoxElem.style.top = top + 'px';
          annotationBoxElem.style.width = width + 'px';
          annotationBoxElem.style.height = height + 'px';
        });

        annotationCanvas.addEventListener('mouseup', (e) => {
          if (!annotationStart || !annotationBoxElem) return;
          const left = Math.min(e.clientX, annotationStart.x);
          const top = Math.min(e.clientY, annotationStart.y);
          const width = Math.abs(e.clientX - annotationStart.x);
          const height = Math.abs(e.clientY - annotationStart.y);

          annotationStart = null;

          if (width < 10 || height < 10) {
            annotationBoxElem.remove();
            annotationBoxElem = null;
            return;
          }

          const elemUnder = document.elementFromPoint(left + 5, top + 5);
          const selector = elemUnder ? getCssSelector(elemUnder) : '';

          const comment = window.prompt('Enter annotation comment for this area:');
          if (comment && comment.trim()) {
            const tag = document.createElement('div');
            tag.className = 'dlc-annotation-tag';
            tag.textContent = comment.trim();
            annotationBoxElem.appendChild(tag);

            const payload = {
              canvasId: CANVAS_ID,
              comment: comment.trim(),
              selector,
              tagName: elemUnder?.tagName?.toLowerCase() || '',
              box: { x: left, y: top, width, height }
            };

            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'dlc_annotation_created', ...payload }, '*');
            }

            fetch(ANNOTATE_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(() => {});
          } else {
            annotationBoxElem.remove();
          }
          annotationBoxElem = null;
        });
      }
    } else {
      if (annotationCanvas) {
        annotationCanvas.remove();
        annotationCanvas = null;
      }
    }
  }


  // --- Drag-and-Drop Visual Section Reordering ---
  function getReorderableElements() {
    const root = document.getElementById('root') || document.body;
    return Array.from(root.querySelectorAll('section, header, footer, nav, main > div, .card, [data-reorderable]'))
      .filter(el => el.id !== 'dlc-sandbox-runtime');
  }

  function toggleReorderMode(active) {
    removeTweakerBar();
    const elements = getReorderableElements();
    elements.forEach(el => {
      if (active) {
        el.setAttribute('draggable', 'true');
        el.classList.add('dlc-reorder-active');
        el.addEventListener('dragstart', onDragStart);
        el.addEventListener('dragover', onDragOver);
        el.addEventListener('dragleave', onDragLeave);
        el.addEventListener('drop', onDrop);
        el.addEventListener('dragend', onDragEnd);
      } else {
        el.removeAttribute('draggable');
        el.classList.remove('dlc-reorder-active', 'dlc-reorder-dragging', 'dlc-drop-target-before', 'dlc-drop-target-after');
        el.removeEventListener('dragstart', onDragStart);
        el.removeEventListener('dragover', onDragOver);
        el.removeEventListener('dragleave', onDragLeave);
        el.removeEventListener('drop', onDrop);
        el.removeEventListener('dragend', onDragEnd);
      }
    });
  }

  function onDragStart(e) {
    draggedElement = this;
    this.classList.add('dlc-reorder-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.tagName);
  }

  function onDragOver(e) {
    e.preventDefault();
    if (!draggedElement || draggedElement === this) return;
    const rect = this.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    this.classList.toggle('dlc-drop-target-after', next);
    this.classList.toggle('dlc-drop-target-before', !next);
  }

  function onDragLeave() {
    this.classList.remove('dlc-drop-target-before', 'dlc-drop-target-after');
  }

  function onDrop(e) {
    e.preventDefault();
    this.classList.remove('dlc-drop-target-before', 'dlc-drop-target-after');
    if (!draggedElement || draggedElement === this) return;
    const rect = this.getBoundingClientRect();
    const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
    this.parentNode.insertBefore(draggedElement, next ? this.nextSibling : this);
    const root = document.getElementById('root') || document.body;
    const payload = { canvasId: CANVAS_ID, reorderedHtml: root.innerHTML };
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'dlc_reorder_applied', ...payload }, '*');
    }
    fetch(saveReorderApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  function onDragEnd() {
    this.classList.remove('dlc-reorder-dragging');
    draggedElement = null;
    getReorderableElements().forEach(el => {
      el.classList.remove('dlc-drop-target-before', 'dlc-drop-target-after');
    });
  }

  // --- SSE Auto-Reload Connection ---
  try {
    const sse = new EventSource(EVENTS_URL);
    sse.addEventListener('update', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.canvasId || data.canvasId === CANVAS_ID) {
          window.location.reload();
        }
      } catch {}
    });
    sse.addEventListener('reload', () => {
      window.location.reload();
    });
  } catch (err) {
    console.warn('[LiveCanvas] SSE connection failed:', err);
  }
})();
</script>
`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${runtimeScript}\n</body>`);
  }
  return `${html}\n${runtimeScript}`;
}

