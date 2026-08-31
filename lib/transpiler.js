// dsh-live-canvas: dynamic transpiler and HTML sandbox wrappers.
// Compiles React (via in-browser Babel with automatic React hooks & Lucide icons scope), wraps HTML snippets with Tailwind CSS & Lucide icons, renders SVGs, Mermaid diagrams, Markdown, multi-device matrix, and visual diff sliders.

export function autoDetectType(content = '', filePath = '') {
  if (filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    if (['jsx', 'tsx'].includes(ext)) return 'react';
    if (['svg'].includes(ext)) return 'svg';
    if (['mermaid', 'mmd'].includes(ext)) return 'mermaid';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (['html', 'htm'].includes(ext)) return 'html';
  }

  const trimmed = String(content).trim();
  if (trimmed.startsWith('<svg') || trimmed.endsWith('</svg>')) return 'svg';
  if (/^(graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|flowchart|gitGraph)\b/m.test(trimmed)) return 'mermaid';
  if (/(?:import\s+React|export\s+default\s+function|export\s+default\s+class|<[A-Z][A-Za-z0-9_]*|\buseState\b|\buseEffect\b)/.test(trimmed)) return 'react';
  if (trimmed.startsWith('#') || trimmed.includes('```')) return 'markdown';

  return 'html';
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildHtmlWrapper(content, options = {}) {
  const title = options.title || 'Live Canvas Preview';
  const customCss = options.customCss || '';
  const customJs = options.customJs || '';
  const theme = options.theme || 'dark';

  const isFullDoc = /<!DOCTYPE\s+html/i.test(content) || /<html[\s>]/i.test(content);

  if (isFullDoc) {
    let enhanced = content;
    if (!enhanced.includes('cdn.tailwindcss.com')) {
      enhanced = enhanced.replace(/<head>/i, `<head>\n  <script src="https://cdn.tailwindcss.com"></script>\n  <script>tailwind.config = { darkMode: 'class' };</script>\n  <script src="https://unpkg.com/lucide@latest"></script>`);
    }
    if (customCss && !enhanced.includes(customCss)) {
      enhanced = enhanced.replace(/<\/head>/i, `<style>\n${customCss}\n</style>\n</head>`);
    }
    if (customJs && !enhanced.includes(customJs)) {
      enhanced = enhanced.replace(/<\/body>/i, `<script>\n${customJs}\n</script>\n</body>`);
    }
    return enhanced;
  }

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {}
      }
    };
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    html.dark body {
      background-color: #09090b;
      color: #f4f4f5;
    }
    html:not(.dark) body {
      background-color: #ffffff;
      color: #18181b;
    }
    ${customCss}
  </style>
</head>
<body class="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 min-h-screen">
  ${content}
  <script>
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
    ${customJs}
  </script>
</body>
</html>`;
}

export function buildReactWrapper(reactCode, options = {}) {
  const title = options.title || 'React Live Component';
  const customCss = options.customCss || '';
  const customJs = options.customJs || '';
  const theme = options.theme || 'dark';
  const propsJson = JSON.stringify(options.controlValues || {});

  let sanitizedCode = reactCode;
  sanitizedCode = sanitizedCode.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'window.__DLC_MAIN_COMPONENT__ = function $1');
  sanitizedCode = sanitizedCode.replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, 'class $1');
  sanitizedCode = sanitizedCode.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, 'window.__DLC_MAIN_COMPONENT__ = $1;');

  // Transform lucide-react imports to destructure from LucideIcons proxy cleanly
  sanitizedCode = sanitizedCode.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"];?/g, (_, raw) => {
    const items = raw.split(',').map(s => s.trim()).filter(Boolean).join(', ');
    return `const { ${items} } = window.LucideIcons;`;
  });
  sanitizedCode = sanitizedCode.replace(/import\s+([A-Za-z0-9_]+)\s+from\s*['"]lucide-react['"];?/g, 'const $1 = window.LucideIcons;');

  // Remove other ESM import/export statements safely
  sanitizedCode = sanitizedCode.replace(/import\s+React(?:\s*,\s*{[^}]+})?\s+from\s*['"]react['"];?/g, '');
  sanitizedCode = sanitizedCode.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]react['"];?/g, '');
  sanitizedCode = sanitizedCode.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
  sanitizedCode = sanitizedCode.replace(/export\s+{[^}]+};?/g, '');

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {}
      }
    };
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    html.dark body {
      background-color: #09090b;
      color: #f4f4f5;
    }
    html:not(.dark) body {
      background-color: #ffffff;
      color: #18181b;
    }
    #dlc-error-boundary {
      display: none;
      background: #ffebee;
      color: #c62828;
      border: 1px solid #ef9a9a;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
      font-family: monospace;
      white-space: pre-wrap;
      font-size: 13px;
    }
    html.dark #dlc-error-boundary {
      background: #3e1b1b;
      color: #ff8a80;
      border-color: #b71c1c;
    }
    ${customCss}
  </style>
</head>
<body class="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 min-h-screen">
  <div id="dlc-error-boundary"></div>
  <div id="root"></div>
  <script type="text/babel">
    // Expose standard React hooks and exports to Babel script scope
    const {
      useState,
      useEffect,
      useContext,
      useReducer,
      useCallback,
      useMemo,
      useRef,
      useImperativeHandle,
      useLayoutEffect,
      useDebugValue,
      useDeferredValue,
      useTransition,
      useId,
      createContext,
      forwardRef,
      memo,
      Fragment,
      createElement
    } = React;

    // Provide universal Lucide React icon proxy
    window.LucideIcons = new Proxy({}, {
      get: (target, prop) => {
        if (prop === '__esModule') return true;
        return function LucideIconComponent(props) {
          const p = props || {};
          const iconName = String(prop).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          const size = p.size || 20;
          const className = p.className || '';
          return React.createElement('i', {
            'data-lucide': iconName,
            className: className,
            style: { width: size + 'px', height: size + 'px', display: 'inline-block', ...p.style }
          });
        };
      }
    });

    window.__DLC_PROPS__ = ${propsJson};
    let dlcRoot = null;

    function renderApp(props) {
      try {
        const componentCandidate = window.__DLC_MAIN_COMPONENT__ ||
          (typeof App !== 'undefined' ? App :
          (typeof Main !== 'undefined' ? Main :
          (typeof Calculator !== 'undefined' ? Calculator :
          (typeof Component !== 'undefined' ? Component : null))));

        if (componentCandidate) {
          if (!dlcRoot) {
            dlcRoot = ReactDOM.createRoot(document.getElementById('root'));
          }
          dlcRoot.render(React.createElement(componentCandidate, props));
        }
      } catch (err) {
        const box = document.getElementById('dlc-error-boundary');
        if (box) {
          box.style.display = 'block';
          box.textContent = 'Render Error: ' + (err.stack || err.message);
        }
      }
    }

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'dlc_set_props') {
        window.__DLC_PROPS__ = { ...window.__DLC_PROPS__, ...e.data.props };
        renderApp(window.__DLC_PROPS__);
      }
    });

    window.addEventListener('error', (e) => {
      const box = document.getElementById('dlc-error-boundary');
      if (box) {
        box.style.display = 'block';
        box.textContent = 'Runtime Error: ' + (e.error ? (e.error.stack || e.error.message) : e.message);
      }
    });

    try {
      ${sanitizedCode}

      renderApp(window.__DLC_PROPS__);

      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        setTimeout(() => lucide.createIcons(), 50);
      }
    } catch (err) {
      const box = document.getElementById('dlc-error-boundary');
      if (box) {
        box.style.display = 'block';
        box.textContent = 'Init Error: ' + (err.stack || err.message);
      }
      console.error(err);
    }
    ${customJs}
  </script>
</body>
</html>`;
}

export function buildSvgWrapper(svgContent, options = {}) {
  const title = options.title || 'SVG Preview';
  const theme = options.theme || 'dark';

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    html:not(.dark) body {
      background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
    }
    html.dark body {
      background: repeating-conic-gradient(#1e1e1e 0% 25%, #141414 0% 50%) 50% / 20px 20px;
    }
    .svg-container {
      max-width: 100%;
      max-height: 85vh;
      background: transparent;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .svg-container svg {
      max-width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="svg-container">
    ${svgContent}
  </div>
</body>
</html>`;
}

export function buildMermaidWrapper(mermaidCode, options = {}) {
  const title = options.title || 'Mermaid Diagram Preview';
  const theme = options.theme || 'dark';

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    html:not(.dark) body { background: #ffffff; color: #18181b; }
    html.dark body { background: #09090b; color: #f4f4f5; }
    .mermaid-wrapper { max-width: 100%; overflow: auto; padding: 16px; }
  </style>
</head>
<body>
  <div class="mermaid-wrapper">
    <div class="mermaid">
${escapeHtml(mermaidCode)}
    </div>
  </div>
  <script>
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: true,
        theme: '${theme === 'dark' ? 'dark' : 'default'}',
        securityLevel: 'loose'
      });
    }
  </script>
</body>
</html>`;
}

export function buildMarkdownWrapper(markdownText, options = {}) {
  const title = options.title || 'Markdown Preview';
  const theme = options.theme || 'dark';

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0 auto;
      padding: 24px 32px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 860px;
    }
    pre { padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 85%; }
    blockquote { border-left: 4px solid; margin: 0; padding-left: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid; padding: 6px 13px; }
    html:not(.dark) body { color: #24292f; background-color: #ffffff; }
    html:not(.dark) pre { background: #f6f8fa; }
    html:not(.dark) blockquote { border-left-color: #d0d7de; color: #57606a; }
    html:not(.dark) th, html:not(.dark) td { border-color: #d0d7de; }
    html:not(.dark) th { background: #f6f8fa; }
    html.dark body { color: #c9d1d9; background-color: #0d1117; }
    html.dark pre { background: #161b22; }
    html.dark blockquote { border-left-color: #30363d; color: #8b949e; }
    html.dark th, html.dark td { border-color: #30363d; }
    html.dark th { background: #161b22; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    const rawMarkdown = ${JSON.stringify(markdownText)};
    if (typeof marked !== 'undefined') {
      document.getElementById('content').innerHTML = marked.parse(rawMarkdown);
    } else {
      document.getElementById('content').textContent = rawMarkdown;
    }
  </script>
</body>
</html>`;
}

export function buildGalleryWrapper(variants = [], options = {}) {
  const title = options.title || 'Component Gallery (Storybook Mode)';
  const theme = options.theme || 'dark';

  const cardsHtml = variants.map((v, i) => {
    const vName = v.name || `Variant ${i + 1}`;
    const vDesc = v.description || '';
    const vContent = v.content || '';

    return `
    <div class="gallery-card border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 transition-all hover:shadow-md">
      <div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">${escapeHtml(vName)}</h3>
          ${vDesc ? `<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">${escapeHtml(vDesc)}</p>` : ''}
        </div>
        <span class="text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">#${i + 1}</span>
      </div>
      <div class="p-6 flex items-center justify-center min-h-[140px] bg-zinc-100/50 dark:bg-zinc-950/50">
        ${vContent}
      </div>
    </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: {} }
    };
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
  </style>
</head>
<body class="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 min-h-screen">
  <div class="max-w-6xl mx-auto">
    <div class="mb-6 flex items-center justify-between border-b pb-4 border-zinc-200 dark:border-zinc-800">
      <div>
        <h1 class="text-xl font-bold tracking-tight">${escapeHtml(title)}</h1>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Multi-Variant Storybook Matrix (${variants.length} state(s))</p>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${cardsHtml}
    </div>
  </div>
  <script>
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  </script>
</body>
</html>`;
}

export function buildDiffWrapper(beforeHtml, afterHtml, options = {}) {
  const title = options.title || 'Visual Diff: Before vs After';
  const theme = options.theme || 'dark';

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { darkMode: 'class' };
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .diff-container { position: relative; width: 100vw; height: calc(100vh - 44px); overflow: hidden; background: #09090b; }
    .diff-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; }
    .diff-layer iframe { width: 100%; height: 100%; border: 0; }
    .diff-layer-before { width: 50%; border-right: 2px solid #ef4444; z-index: 10; background: #ffffff; }
    .diff-handle { position: absolute; top: 0; bottom: 0; width: 4px; background: #ef4444; cursor: ew-resize; z-index: 20; }
    .diff-handle::after { content: '⇄'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 28px; height: 28px; background: #ef4444; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .diff-header { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #18181b; border-bottom: 1px solid #27272a; color: #f4f4f5; font-size: 13px; font-weight: 500; }
    .diff-badge-before { color: #f87171; font-weight: 600; }
    .diff-badge-after { color: #34d399; font-weight: 600; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100">
  <div class="diff-header">
    <div class="flex items-center gap-3">
      <span class="diff-badge-before">🔴 Before</span>
      <span class="text-zinc-600">vs</span>
      <span class="diff-badge-after">🟢 After (Current)</span>
    </div>
    <div class="text-xs text-zinc-400">
      Drag slider to compare changes
    </div>
  </div>
  <div class="diff-container" id="container">
    <div class="diff-layer">
      <iframe srcdoc="${escapeHtml(afterHtml)}" sandbox="allow-scripts"></iframe>
    </div>
    <div class="diff-layer diff-layer-before" id="beforeLayer">
      <iframe style="width: 100vw; height: 100%; border: 0;" srcdoc="${escapeHtml(beforeHtml)}" sandbox="allow-scripts"></iframe>
    </div>
    <div class="diff-handle" id="handle" style="left: 50%;"></div>
  </div>
  <script>
    const container = document.getElementById('container');
    const beforeLayer = document.getElementById('beforeLayer');
    const handle = document.getElementById('handle');
    let isDragging = false;

    function setPosition(x) {
      const rect = container.getBoundingClientRect();
      let percent = ((x - rect.left) / rect.width) * 100;
      percent = Math.max(0, Math.min(100, percent));
      beforeLayer.style.width = percent + '%';
      handle.style.left = percent + '%';
    }

    handle.addEventListener('mousedown', () => { isDragging = true; });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      setPosition(e.clientX);
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
  </script>
</body>
</html>`;
}

export function buildMatrixWrapper(session, options = {}) {
  const title = options.title || 'Multi-Device Matrix View';
  const theme = options.theme || 'dark';
  const rawHtml = transpileAndWrap(session);

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' };</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; min-height: 100vh; }
    .matrix-header { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #18181b; border-bottom: 1px solid #27272a; }
    .matrix-container { display: flex; gap: 24px; padding: 24px; overflow-x: auto; min-height: calc(100vh - 48px); align-items: flex-start; justify-content: center; }
    .device-card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); flex-shrink: 0; display: flex; flex-direction: column; }
    .device-header { padding: 8px 14px; background: #27272a; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; }
    .device-frame { border: 0; width: 100%; background: #ffffff; }
  </style>
</head>
<body>
  <div class="matrix-header">
    <div class="font-bold text-sm">📱 Multi-Device Matrix: Mobile (375px) + Tablet (768px) + Desktop (1024px+)</div>
    <div class="text-xs text-emerald-400">● Synchronized Scroll Active</div>
  </div>
  <div class="matrix-container">
    <div class="device-card" style="width: 375px;">
      <div class="device-header">
        <span>📱 Mobile (375px)</span>
        <span class="text-xs font-normal text-zinc-400">iPhone SE / Mini</span>
      </div>
      <iframe id="frame-mobile" class="device-frame" style="height: 667px;" srcdoc="${escapeHtml(rawHtml)}" sandbox="allow-scripts"></iframe>
    </div>

    <div class="device-card" style="width: 768px;">
      <div class="device-header">
        <span>📟 Tablet (768px)</span>
        <span class="text-xs font-normal text-zinc-400">iPad / Tablet</span>
      </div>
      <iframe id="frame-tablet" class="device-frame" style="height: 800px;" srcdoc="${escapeHtml(rawHtml)}" sandbox="allow-scripts"></iframe>
    </div>

    <div class="device-card" style="width: 1024px;">
      <div class="device-header">
        <span>💻 Desktop (1024px+)</span>
        <span class="text-xs font-normal text-zinc-400">HD / Widescreen</span>
      </div>
      <iframe id="frame-desktop" class="device-frame" style="height: 800px;" srcdoc="${escapeHtml(rawHtml)}" sandbox="allow-scripts"></iframe>
    </div>
  </div>

  <script>
    const frames = [
      document.getElementById('frame-mobile'),
      document.getElementById('frame-tablet'),
      document.getElementById('frame-desktop')
    ];

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'dlc_scroll_report') {
        const percentY = e.data.percentY;
        frames.forEach(f => {
          if (f && f.contentWindow) {
            f.contentWindow.postMessage({ type: 'dlc_sync_scroll', percentY }, '*');
          }
        });
      }
    });
  </script>
</body>
</html>`;
}

export function transpileAndWrap(session, options = {}) {
  const content = session.content || '';
  const type = session.componentType || autoDetectType(content, session.filePath);

  const mergedOpts = {
    title: session.title,
    theme: session.theme || 'dark',
    controlValues: session.controlValues || {},
    customCss: session.customCss,
    customJs: session.customJs,
    ...options
  };

  if (type === 'gallery' || (Array.isArray(session.variants) && session.variants.length > 0)) {
    return buildGalleryWrapper(session.variants || [], mergedOpts);
  }

  switch (type) {
    case 'react':
      return buildReactWrapper(content, mergedOpts);
    case 'svg':
      return buildSvgWrapper(content, mergedOpts);
    case 'mermaid':
      return buildMermaidWrapper(content, mergedOpts);
    case 'markdown':
      return buildMarkdownWrapper(content, mergedOpts);
    case 'html':
    default:
      return buildHtmlWrapper(content, mergedOpts);
  }
}

export function buildStandaloneHtml(session, options = {}) {
  const html = transpileAndWrap(session, options);
  const comment = `<!-- Exported via Live Canvas Preview on ${new Date().toISOString()} -->\n`;
  return comment + html;
}

