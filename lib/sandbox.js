// dsh-live-canvas: sandbox security headers, path sanitization, runtime client injection, and telemetry interceptor.
import path from 'node:path';

export function getSandboxHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'self' 'unsafe-inline' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: https:; font-src 'self' data: https:; frame-ancestors 'self' http: https:;",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
}

export function sanitizePath(baseDir, relativePath) {
  if (!baseDir || !relativePath) return null;
  if (relativePath.includes('\0')) {
    throw new Error('Null bytes in path are forbidden');
  }
  const safeBase = path.resolve(baseDir);
  const resolved = path.resolve(safeBase, relativePath);
  if (!resolved.startsWith(safeBase + path.sep) && resolved !== safeBase) {
    throw new Error('Access outside base directory is forbidden: ' + relativePath);
  }
  return resolved;
}

export function buildInjectedScripts(canvasId, options = {}) {
  const eventsUrl = options.eventsUrl || '/dsh-live-canvas/events';
  const inspectApiUrl = options.inspectApiUrl || '/dsh-live-canvas/api/inspect';
  const logsApiUrl = options.logsApiUrl || '/dsh-live-canvas/api/logs';

  return `
<script id="dlc-sandbox-runtime">
(function() {
  var CANVAS_ID = ${JSON.stringify(canvasId)};
  var EVENTS_URL = ${JSON.stringify(eventsUrl)};
  var INSPECT_API_URL = ${JSON.stringify(inspectApiUrl)};
  var LOGS_API_URL = ${JSON.stringify(logsApiUrl)};
  var inspectorEnabled = false;
  var highlightBox = null;
  var tooltipBox = null;

  // 1. SSE Live Reload Listener
  try {
    var evtSource = new EventSource(EVENTS_URL);
    evtSource.addEventListener('update', function(e) {
      try {
        var data = JSON.parse(e.data || '{}');
        if (!data.canvasId || data.canvasId === CANVAS_ID) {
          window.__dlc_reload_badge = true;
          window.location.reload();
        }
      } catch (err) {}
    });
    evtSource.addEventListener('reload', function(e) {
      window.__dlc_reload_badge = true;
      window.location.reload();
    });
  } catch (err) {
    console.warn('[LiveCanvas] SSE connection failed:', err);
  }

  // 2. Telemetry & Console Error Interceptor
  function sendTelemetryLog(level, message, stack) {
    var payload = {
      canvasId: CANVAS_ID,
      level: level,
      message: String(message),
      stack: stack || null,
      timestamp: new Date().toISOString()
    };
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_telemetry_log',
        ...payload
      }, '*');
    }
    try {
      fetch(LOGS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch (e) {}
  }

  window.addEventListener('error', function(e) {
    sendTelemetryLog('error', e.message || 'Script error', e.error ? (e.error.stack || e.error.message) : null);
  });

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    var msg = reason ? (reason.message || String(reason)) : 'Unhandled Promise Rejection';
    var stack = reason && reason.stack ? reason.stack : null;
    sendTelemetryLog('error', msg, stack);
  });

  var origErr = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    sendTelemetryLog('error', args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
    if (origErr) origErr.apply(console, arguments);
  };

  var origWarn = console.warn;
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    sendTelemetryLog('warn', args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
    if (origWarn) origWarn.apply(console, arguments);
  };

  // 3. DOM Click Inspector & Theme Listener
  function getCssSelector(el) {
    if (!(el instanceof Element)) return '';
    var path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      var selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        var sib = el, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += ':nth-of-type(' + nth + ')';
      }
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  function createBoxes() {
    if (!highlightBox) {
      highlightBox = document.createElement('div');
      highlightBox.id = '__dlc_inspect_badge_highlight';
      highlightBox.style.position = 'fixed';
      highlightBox.style.pointerEvents = 'none';
      highlightBox.style.border = '2px solid #2563eb';
      highlightBox.style.backgroundColor = 'rgba(37, 99, 235, 0.15)';
      highlightBox.style.zIndex = '999999';
      highlightBox.style.display = 'none';
      highlightBox.style.transition = 'all 0.05s ease-out';
      document.body.appendChild(highlightBox);
    }
    if (!tooltipBox) {
      tooltipBox = document.createElement('div');
      tooltipBox.id = '__dlc_inspect_badge';
      tooltipBox.style.position = 'fixed';
      tooltipBox.style.pointerEvents = 'none';
      tooltipBox.style.background = '#18181b';
      tooltipBox.style.color = '#ffffff';
      tooltipBox.style.padding = '3px 8px';
      tooltipBox.style.borderRadius = '4px';
      tooltipBox.style.fontSize = '11px';
      tooltipBox.style.fontFamily = 'monospace';
      tooltipBox.style.zIndex = '1000000';
      tooltipBox.style.display = 'none';
      tooltipBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      document.body.appendChild(tooltipBox);
    }
  }

  function removeHighlight() {
    if (highlightBox) highlightBox.style.display = 'none';
    if (tooltipBox) tooltipBox.style.display = 'none';
  }

  document.addEventListener('mousemove', function(e) {
    if (!inspectorEnabled) return;
    var target = e.target;
    if (!target || target === document.body || target === document.documentElement || target === highlightBox || target === tooltipBox) {
      removeHighlight();
      return;
    }
    createBoxes();
    var rect = target.getBoundingClientRect();
    highlightBox.style.display = 'block';
    highlightBox.style.top = rect.top + 'px';
    highlightBox.style.left = rect.left + 'px';
    highlightBox.style.width = rect.width + 'px';
    highlightBox.style.height = rect.height + 'px';

    tooltipBox.style.display = 'block';
    tooltipBox.style.top = Math.max(0, rect.top - 24) + 'px';
    tooltipBox.style.left = rect.left + 'px';
    var tag = target.tagName.toLowerCase();
    var idStr = target.id ? '#' + target.id : '';
    var clsStr = target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').filter(Boolean).join('.') : '';
    tooltipBox.textContent = tag + idStr + (clsStr.length > 20 ? clsStr.slice(0, 20) + '...' : clsStr) + ' (' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ')';
  }, true);

  document.addEventListener('click', function(e) {
    if (!inspectorEnabled) return;
    e.preventDefault();
    e.stopPropagation();

    var target = e.target;
    if (!target || target === highlightBox || target === tooltipBox) return;

    var selector = getCssSelector(target);
    var rect = target.getBoundingClientRect();
    var payload = {
      canvasId: CANVAS_ID,
      selector: selector,
      tagName: target.tagName ? target.tagName.toLowerCase() : '',
      idAttr: target.id || '',
      className: typeof target.className === 'string' ? target.className : '',
      innerText: (target.innerText || '').slice(0, 300),
      outerHtml: (target.outerHTML || '').slice(0, 800),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };

    // Send to Parent Window
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_element_inspected',
        ...payload
      }, '*');
    }

    // Send to Plugin Server REST API
    try {
      fetch(INSPECT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch (err) {}
  }, true);

  // Listen for parent messages (Inspector toggle & Theme toggle)
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'dlc_set_inspector') {
      inspectorEnabled = !!e.data.enabled;
      if (!inspectorEnabled) {
        removeHighlight();
      }
    }
    if (e.data.type === 'dlc_set_theme') {
      var nextTheme = e.data.theme;
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (nextTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.toggle('dark');
      }
    }
  });
})();
</script>
`;
}

export function injectSandboxRuntime(html, canvasId, options = {}) {
  const runtimeScript = buildInjectedScripts(canvasId, options);
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, runtimeScript + '\n</body>');
  }
  return html + runtimeScript;
}