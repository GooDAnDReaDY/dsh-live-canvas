// dsh-live-canvas: sandbox HTML injector (SSE hot-reload & DOM inspector) and security headers.
import path from 'node:path';

export function getSandboxHeaders(options = {}) {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https:; font-src 'self' data: https:; frame-ancestors 'self' http: https:;",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
}

export function buildInjectedScripts(canvasId, options = {}) {
  const eventsUrl = options.eventsUrl || '/dsh-live-canvas/events';
  const inspectApiUrl = options.inspectApiUrl || '/dsh-live-canvas/api/inspect';

  return `
<!-- dsh-live-canvas runtime inject: hot reload and click inspector -->
<style id="dlc-sandbox-styles">
  .__dlc_inspect_highlight {
    outline: 2px solid #2563eb !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
  }
  #__dlc_inspect_badge {
    position: fixed;
    z-index: 999999;
    pointer-events: none;
    background: rgba(15, 23, 42, 0.9);
    color: #f8fafc;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    padding: 3px 6px;
    border-radius: 4px;
    border: 1px solid #3b82f6;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  #__dlc_reload_badge {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 999999;
    background: #2563eb;
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(37,99,235,0.4);
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
    pointer-events: none;
  }
</style>
<div id="__dlc_inspect_badge"></div>
<div id="__dlc_reload_badge">⚡ Hot Reloading...</div>
<script id="dlc-sandbox-runtime">
(function() {
  const CANVAS_ID = ${JSON.stringify(canvasId)};
  const EVENTS_URL = ${JSON.stringify(eventsUrl)};
  const INSPECT_API_URL = ${JSON.stringify(inspectApiUrl)};

  // 1. SSE Hot-Reload
  let sse = null;
  function connectSSE() {
    if (sse) sse.close();
    try {
      sse = new EventSource(EVENTS_URL);
      sse.addEventListener('update', (e) => {
        try {
          const payload = JSON.parse(e.data || '{}');
          if (!payload.canvasId || payload.canvasId === CANVAS_ID || payload.type === 'global_reload') {
            showReloadBadge();
            setTimeout(() => {
              window.location.reload();
            }, 120);
          }
        } catch (err) {
          console.error('[DLC] SSE update parse error', err);
        }
      });
      sse.addEventListener('reload', () => {
        showReloadBadge();
        setTimeout(() => window.location.reload(), 120);
      });
      sse.onerror = () => {
        // Auto-reconnect managed by EventSource
      };
    } catch (err) {
      console.warn('[DLC] EventSource not available or blocked', err);
    }
  }

  function showReloadBadge() {
    const b = document.getElementById('__dlc_reload_badge');
    if (b) {
      b.style.opacity = '1';
    }
  }

  connectSSE();

  // 2. Click & Hover Inspector
  let isInspectorActive = false;
  let hoveredEl = null;
  const badge = document.getElementById('__dlc_inspect_badge');

  function getUniqueSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '#' + el.id;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body && el !== document.documentElement) {
      let selector = el.tagName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(/\s+/).filter(c => c && !c.startsWith('__dlc_')).join('.');
        if (classes) selector += '.' + classes;
      }
      let sibling = el;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.tagName === el.tagName) nth++;
      }
      if (nth > 1) selector += ':nth-of-type(' + nth + ')';
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  function onMouseMove(e) {
    if (!isInspectorActive) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target.id === '__dlc_inspect_badge' || target.id === '__dlc_reload_badge') return;

    if (hoveredEl && hoveredEl !== target) {
      hoveredEl.classList.remove('__dlc_inspect_highlight');
    }
    hoveredEl = target;
    hoveredEl.classList.add('__dlc_inspect_highlight');

    if (badge) {
      const rect = target.getBoundingClientRect();
      badge.style.display = 'block';
      badge.textContent = target.tagName.toLowerCase() + (target.id ? '#' + target.id : '') + ' (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ')';
      const badgeTop = Math.max(4, rect.top - 24);
      const badgeLeft = Math.min(window.innerWidth - 180, Math.max(4, rect.left));
      badge.style.top = badgeTop + 'px';
      badge.style.left = badgeLeft + 'px';
    }
  }

  function onMouseClick(e) {
    if (!isInspectorActive) return;
    e.preventDefault();
    e.stopPropagation();

    const target = hoveredEl || e.target;
    if (!target) return;

    const selector = getUniqueSelector(target);
    const rect = target.getBoundingClientRect();
    const attributes = {};
    for (let i = 0; i < target.attributes.length; i++) {
      const attr = target.attributes[i];
      if (!attr.name.startsWith('__dlc_')) {
        attributes[attr.name] = attr.value;
      }
    }

    const payload = {
      canvasId: CANVAS_ID,
      selector: selector,
      tagName: target.tagName.toLowerCase(),
      idAttr: target.id || '',
      className: typeof target.className === 'string' ? target.className : '',
      innerText: (target.innerText || '').slice(0, 500),
      outerHtml: (target.outerHTML || '').slice(0, 2000),
      attributes: attributes,
      rect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };

    // Notify parent window (DSH UI)
    try {
      window.parent.postMessage({
        type: 'dlc_element_inspected',
        ...payload
      }, '*');
    } catch {}

    // Post to host API
    try {
      fetch(INSPECT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {}
  }

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'dlc_set_inspector') {
      isInspectorActive = !!event.data.enabled;
      if (!isInspectorActive) {
        if (hoveredEl) hoveredEl.classList.remove('__dlc_inspect_highlight');
        if (badge) badge.style.display = 'none';
        hoveredEl = null;
      }
    }
    if (event.data && event.data.type === 'dlc_trigger_reload') {
      window.location.reload();
    }
  });

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onMouseClick, true);
})();
</script>
`;
}

export function injectSandboxRuntime(rawHtml, canvasId, options = {}) {
  const scripts = buildInjectedScripts(canvasId, options);
  if (/<\/body>/i.test(rawHtml)) {
    return rawHtml.replace(/<\/body>/i, `${scripts}</body>`);
  }
  return rawHtml + scripts;
}

export function sanitizePath(baseDir, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Invalid path parameter');
  }
  // Prevent null-byte injections and traversal
  if (relativePath.includes('\0')) {
    throw new Error('Null bytes in path');
  }
  const resolved = path.resolve(baseDir, relativePath);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    throw new Error('Access outside base directory is forbidden');
  }
  return resolved;
}