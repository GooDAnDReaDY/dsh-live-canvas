// dsh-live-canvas: sandbox security, runtime injection, telemetry interceptor, visual annotation layer, AI mock data interceptor, and synchronized scroll.
import path from 'node:path';

export function getSandboxHeaders() {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // CSP allowing CDNs, scripts, unpkg, babel, unsafe-eval for React development, and SSE connections
    'Content-Security-Policy': [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://images.unsplash.com",
      "connect-src 'self' ws: wss: http: https: data: blob:",
      "img-src * data: blob:",
      "font-src * data:",
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com",
      "frame-src 'self' data: blob:"
    ].join('; ')
  };
}

export function sanitizePath(baseDir, relativePath) {
  const resolved = path.resolve(baseDir, relativePath);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error(`Security Violation: Path traversal attempt outside workspace "${relativePath}"`);
  }
  return resolved;
}

export function injectSandboxRuntime(html, canvasId, options = {}) {
  const eventsUrl = options.eventsUrl || '/dsh-live-canvas/events';
  const inspectApiUrl = options.inspectApiUrl || '/dsh-live-canvas/api/inspect';
  const logsApiUrl = options.logsApiUrl || '/dsh-live-canvas/api/logs';
  const annotateApiUrl = options.annotateApiUrl || '/dsh-live-canvas/api/annotations';
  const mockData = options.mockData || {};

  const runtimeScript = `
<!-- dlc-sandbox-runtime: SSE auto-reload, DOM click inspector, error telemetry, visual annotations, AI mock data & sync scroll -->
<script id="dlc-sandbox-runtime">
(function() {
  const CANVAS_ID = ${JSON.stringify(canvasId)};
  const EVENTS_URL = ${JSON.stringify(eventsUrl)};
  const INSPECT_API = ${JSON.stringify(inspectApiUrl)};
  const LOGS_API = ${JSON.stringify(logsApiUrl)};
  const ANNOTATE_API = ${JSON.stringify(annotateApiUrl)};

  let isInspectorActive = false;
  let isAnnotationMode = false;
  let hoveredElement = null;
  let annotationStart = null;
  let annotationBoxElem = null;
  let isSyncingScroll = false;

  // --- AI Mock Data & Fake API Interceptor ---
  window.__DLC_MOCK_DATA__ = ${JSON.stringify(mockData)};
  const origFetch = window.fetch;
  window.fetch = async function(resource, init) {
    const url = typeof resource === 'string' ? resource : (resource?.url || '');
    const cleanUrl = url.split('?')[0];
    if (window.__DLC_MOCK_DATA__ && typeof window.__DLC_MOCK_DATA__ === 'object') {
      const match = window.__DLC_MOCK_DATA__[cleanUrl] || window.__DLC_MOCK_DATA__[url];
      if (match !== undefined) {
        await new Promise(r => setTimeout(r, 60));
        return new Response(JSON.stringify(match), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return origFetch.apply(this, arguments);
  };

  // --- Synchronized Scroll ---
  window.addEventListener('scroll', () => {
    if (isSyncingScroll) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const percentY = window.scrollY / maxScroll;
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'dlc_scroll_report',
        canvasId: CANVAS_ID,
        percentY: percentY
      }, '*');
    }
  }, { passive: true });

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'dlc_sync_scroll') {
      isSyncingScroll = true;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        window.scrollTo({ top: e.data.percentY * maxScroll, behavior: 'auto' });
      }
      setTimeout(() => { isSyncingScroll = false; }, 50);
    }
    if (e.data && e.data.type === 'dlc_set_mock_data') {
      window.__DLC_MOCK_DATA__ = { ...window.__DLC_MOCK_DATA__, ...(e.data.mockData || {}) };
    }
  });

  // --- Telemetry & Error Logging ---
  function sendTelemetry(level, message, stack) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'dlc_telemetry_log',
          canvasId: CANVAS_ID,
          level: level,
          message: String(message),
          stack: stack || null,
          timestamp: new Date().toISOString()
        }, '*');
      }

      fetch(LOGS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasId: CANVAS_ID, level, message, stack })
      }).catch(() => {});
    } catch {}
  }

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = function(...args) {
    origLog.apply(console, args);
    sendTelemetry('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  };
  console.warn = function(...args) {
    origWarn.apply(console, args);
    sendTelemetry('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  };
  console.error = function(...args) {
    origError.apply(console, args);
    sendTelemetry('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
  };

  window.addEventListener('error', function(event) {
    sendTelemetry('error', event.message || 'Uncaught exception', event.error?.stack);
  });

  window.addEventListener('unhandledrejection', function(event) {
    sendTelemetry('error', 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason), event.reason?.stack);
  });

  // --- Inspector & Annotation Overlay Styles ---
  const overlayStyle = document.createElement('style');
  overlayStyle.textContent = \`
    .dlc-inspect-highlight {
      outline: 2px dashed #3b82f6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
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
    }
    if (e.data && e.data.type === 'dlc_set_annotation_mode') {
      isAnnotationMode = !!e.data.enabled;
      updateAnnotationOverlay();
    }
  });

  // --- Inspector Logic ---
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
    if (!isInspectorActive || isAnnotationMode) return;
    if (e.target.id === 'dlc-sandbox-runtime') return;
    if (hoveredElement && hoveredElement !== e.target) {
      hoveredElement.classList.remove('dlc-inspect-highlight');
    }
    hoveredElement = e.target;
    hoveredElement.classList.add('dlc-inspect-highlight');
  });

  document.addEventListener('click', (e) => {
    if (!isInspectorActive || isAnnotationMode) return;
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

  // --- Visual Annotation Drawing ---
  let annotationCanvas = null;

  function updateAnnotationOverlay() {
    if (isAnnotationMode) {
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

