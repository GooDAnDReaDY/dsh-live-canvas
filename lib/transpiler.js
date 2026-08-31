// dsh-live-canvas: dynamic transpiler, HTML wrapper, and Component Gallery generator.
// Handles HTML, React JSX (Babel standalone with dynamic props controls), SVG, Mermaid, Markdown, and Component Galleries.

export function autoDetectType(content = '', filePath = '') {
  if (filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    if (['jsx', 'tsx'].includes(ext)) return 'react';
    if (['html', 'htm'].includes(ext)) return 'html';
    if (ext === 'svg') return 'svg';
    if (['mermaid', 'mmd'].includes(ext)) return 'mermaid';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
  }

  const trimmed = content.trim();
  if (/^<svg[\s>]/i.test(trimmed) || /<\/svg>$/i.test(trimmed)) return 'svg';
  if (/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|gitGraph)\b/m.test(trimmed)) {
    return 'mermaid';
  }
  if (/^---[\r\n]|^(#|\*|-|>|\d+\.)\s/m.test(trimmed) && !/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return 'markdown';
  }
  if (/\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|createContext)\b/.test(trimmed) ||
      /\bexport\s+default\s+function\b/.test(trimmed) ||
      /\bReactDOM\.render\b/.test(trimmed) ||
      /\bconst\s+[A-Z][a-zA-Z0-9]*\s*=\s*\([^)]*\)\s*=>/.test(trimmed)) {
    return 'react';
  }
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
    window.__DLC_PROPS__ = ${propsJson};
    let dlcRoot = null;

    function renderApp(props) {
      try {
        const componentCandidate = window.__DLC_MAIN_COMPONENT__ ||
          (typeof App !== 'undefined' ? App :
          (typeof Main !== 'undefined' ? Main :
          (typeof Component !== 'undefined' ? Component : null)));

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
    html.dark body { background-color: #09090b; color: #f4f4f5; }
    html:not(.dark) body { background-color: #ffffff; color: #18181b; }
    .mermaid {
      display: flex;
      justify-content: center;
      width: 100%;
      max-width: 100%;
    }
  </style>
</head>
<body>
  <div class="mermaid">
${escapeHtml(mermaidCode)}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: ${theme === 'dark' ? "'dark'" : "'default'"},
      securityLevel: 'loose'
    });
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