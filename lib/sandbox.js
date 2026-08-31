// dsh-live-canvas: sandbox security headers, path sanitization, runtime client injection, telemetry interceptor, and visual annotations.
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
  const annotateApiUrl = options.annotateApiUrl || '/dsh-live-canvas/api/annotations';

  return `
<script id="dlc-sandbox-runtime">
(function() {
  var CANVAS_ID = ${JSON.stringify(canvasId)};
  var EVENTS_URL = ${JSON.stringify(eventsUrl)};
  var INSPECT_API_URL = ${JSON.stringify(inspectApiUrl)};
  var LOGS_API_URL = ${JSON.stringify(logsApiUrl)};
  var ANNOTATE_API_URL = ${JSON.stringify(annotateApiUrl)};

  var inspectorEnabled = false;
  var annotateEnabled = false;
  var isDrawing = false;
  var startX = 0, startY = 0;
  var highlightBox = null;
  var tooltipBox = null;
  var drawBox = null;

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

  // 3. DOM Helper
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

  // 4. Click Inspector Boxes
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
    if (annotateEnabled && isDrawing && drawBox) {
      var currentX = e.clientX;
      var currentY = e.clientY;
      var left = Math.min(startX, currentX);
      var top = Math.min(startY, currentY);
      var width = Math.abs(currentX - startX);
      var height = Math.abs(currentY - startY);
      drawBox.style.left = left + 'px';
      drawBox.style.top = top + 'px';
      drawBox.style.width = width + 'px';
      drawBox.style.height = height + 'px';
      return;
    }

    if (!inspectorEnabled) return;
    var target = e.target;
    if (!target || target === document.body || target === document.documentElement || target === highlightBox || target === tooltipBox || target === drawBox) {
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
    if (!inspectorEnabled || annotateEnabled) return;
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

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_element_inspected',
        ...payload
      }, '*');
    }

    try {
      fetch(INSPECT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch (err) {}
  }, true);

  // 5. Visual Annotation Box Drawing
  function createDrawBox() {
    if (!drawBox) {
      drawBox = document.createElement('div');
      drawBox.style.position = 'fixed';
      drawBox.style.border = '2px dashed #ef4444';
      drawBox.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
      drawBox.style.zIndex = '9999999';
      drawBox.style.display = 'none';
      drawBox.style.pointerEvents = 'none';
      document.body.appendChild(drawBox);
    }
  }

  document.addEventListener('mousedown', function(e) {
    if (!annotateEnabled) return;
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    createDrawBox();
    drawBox.style.left = startX + 'px';
    drawBox.style.top = startY + 'px';
    drawBox.style.width = '0px';
    drawBox.style.height = '0px';
    drawBox.style.display = 'block';
    e.preventDefault();
  }, true);

  document.addEventListener('mouseup', function(e) {
    if (!annotateEnabled || !isDrawing) return;
    isDrawing = false;
    if (!drawBox) return;
    var rect = drawBox.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      drawBox.style.display = 'none';
      return;
    }

    var comment = window.prompt('Enter visual note for this area:') || 'Visual note';
    drawBox.style.display = 'none';

    var el = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    var selector = getCssSelector(el);

    var payload = {
      canvasId: CANVAS_ID,
      comment: comment,
      selector: selector,
      tagName: el ? el.tagName.toLowerCase() : '',
      box: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_annotation_created',
        ...payload
      }, '*');
    }

    try {
      fetch(ANNOTATE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function() {});
    } catch (err) {}
  }, true);

  // 6. Listen for parent messages
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'dlc_set_inspector') {
      inspectorEnabled = !!e.data.enabled;
      if (!inspectorEnabled) {
        removeHighlight();
      }
    }
    if (e.data.type === 'dlc_set_annotation_mode') {
      annotateEnabled = !!e.data.enabled;
      document.body.style.cursor = annotateEnabled ? 'crosshair' : 'default';
      if (annotateEnabled) {
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