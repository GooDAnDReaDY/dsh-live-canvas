// dsh-live-canvas: dynamic transpiler and HTML sandbox wrappers.
// Compiles React (via in-browser Babel with automatic React hooks & Lucide icons scope), wraps HTML snippets with Tailwind CSS & Lucide icons, renders SVGs, Mermaid diagrams, Markdown, multi-device matrix, visual diff sliders, and multi-file ESM recursive bundler.

import fs from 'node:fs';
import path from 'node:path';

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

// ---------------------------------------------------------------- Multi-File ESM Recursive Bundler
export function bundleMultiFileReact(entryCode, options = {}) {
  const filePath = options.filePath || '';
  const workspaceDir = options.workspaceDir || process.cwd();
  if (!filePath) return { bundledCode: entryCode, accumulatedCss: '' };

  const absEntryPath = path.isAbsolute(filePath) ? filePath : path.resolve(workspaceDir, filePath);
  const entryDir = path.dirname(absEntryPath);

  const visited = new Set([absEntryPath]);
  const inlinedModules = [];
  let accumulatedCss = '';

  function tryResolveFile(baseDir, specifier) {
    const directPath = path.resolve(baseDir, specifier);
    const candidates = [
      directPath,
      directPath + '.jsx',
      directPath + '.tsx',
      directPath + '.js',
      directPath + '.ts',
      directPath + '.json',
      directPath + '.css',
      path.join(directPath, 'index.jsx'),
      path.join(directPath, 'index.tsx'),
      path.join(directPath, 'index.js'),
      path.join(directPath, 'index.ts')
    ];
    for (const c of candidates) {
      try {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) {
          return c;
        }
      } catch {}
    }
    return null;
  }

  function processCode(code, currentDir) {
    let processed = code;

    // 1. Process CSS imports: import './index.css';
    processed = processed.replace(/import\s+['"]([^'"]+\.css)['"];?/g, (_, cssSpec) => {
      if (cssSpec.startsWith('.')) {
        const resolvedCss = tryResolveFile(currentDir, cssSpec);
        if (resolvedCss && !visited.has(resolvedCss)) {
          visited.add(resolvedCss);
          try {
            accumulatedCss += '\n' + fs.readFileSync(resolvedCss, 'utf8');
          } catch {}
        }
      }
      return '';
    });

    // 2. Process lucide-react imports
    processed = processed.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"];?/g, (_, raw) => {
      const items = raw.split(',').map(s => s.trim()).filter(Boolean).join(', ');
      return `const { ${items} } = window.LucideIcons;`;
    });
    processed = processed.replace(/import\s+([A-Za-z0-9_]+)\s+from\s*['"]lucide-react['"];?/g, 'const $1 = window.LucideIcons;');

    // 3. Process relative imports
    const importRegex = /import\s+(?:([A-Za-z0-9_]+)|\{\s*([^}]+)\s*\}|([A-Za-z0-9_]+)\s*,\s*\{\s*([^}]+)\s*\})\s+from\s*['"](\.[^'"]+)['"];?/g;
    
    let match;
    const matches = [];
    while ((match = importRegex.exec(processed)) !== null) {
      matches.push({
        full: match[0],
        defaultName: match[1] || match[3] || null,
        namedImports: (match[2] || match[4] || '').split(',').map(s => s.trim()).filter(Boolean),
        specifier: match[5]
      });
    }

    for (const imp of matches) {
      const resolved = tryResolveFile(currentDir, imp.specifier);
      if (resolved && !visited.has(resolved)) {
        visited.add(resolved);
        try {
          const modContent = fs.readFileSync(resolved, 'utf8');
          const modDir = path.dirname(resolved);

          let childCode = processCode(modContent, modDir);

          // Strip React and external library imports
          childCode = childCode.replace(/import\s+React(?:\s*,\s*{[^}]+})?\s+from\s*['"]react['"];?/g, '');
          childCode = childCode.replace(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]react['"];?/g, '');
          childCode = childCode.replace(/import\s+.*?from\s+['"][^.][^'"]*['"];?/g, '');

          // Convert exports
          if (imp.defaultName) {
            if (/export\s+default\s+function\b/.test(childCode)) {
              childCode = childCode.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, `function $1`);
              if (!childCode.includes(`function ${imp.defaultName}`)) {
                childCode += `\nconst ${imp.defaultName} = $1;`;
              }
            } else if (/export\s+default\s+class\b/.test(childCode)) {
              childCode = childCode.replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, `class $1`);
            } else if (/export\s+default\s+/.test(childCode)) {
              childCode = childCode.replace(/export\s+default\s+([^;]+);?/g, `const ${imp.defaultName} = $1;`);
            }
          }

          // Convert named exports: export const DRINKS = ... -> const DRINKS = ...
          childCode = childCode.replace(/export\s+(const|let|var|function|class)\s+/g, '$1 ');
          childCode = childCode.replace(/export\s*\{[^}]+\};?/g, '');

          inlinedModules.push(`/* --- Inlined module: ${path.relative(workspaceDir, resolved)} --- */\n` + childCode);
        } catch (err) {
          console.warn('[MultiFileBundler] Failed to inline module:', resolved, err);
        }
      }
      processed = processed.replace(imp.full, '');
    }

    return processed;
  }

  const processedEntry = processCode(entryCode, entryDir);
  const bundledCode = inlinedModules.join('\n\n') + '\n\n' + processedEntry;

  return { bundledCode, accumulatedCss };
}

// ---------------------------------------------------------------- HTML Wrapper
export function buildHtmlWrapper(content, options = {}) {
  const title = options.title || 'Live Canvas Preview';
  let customCss = options.customCss || '';
  const customJs = options.customJs || '';
  const theme = options.theme || 'dark';
  const filePath = options.filePath || '';
  const workspaceDir = options.workspaceDir || process.cwd();

  // If HTML document contains <script type="module" src="..."> referencing React JSX
  const moduleMatch = content.match(/<script\s+type="module"\s+src="([^"]+)"><\/script>/i);
  if (moduleMatch && moduleMatch[1] && filePath) {
    const entrySrc = moduleMatch[1];
    const baseDir = path.dirname(path.resolve(workspaceDir, filePath));
    const directPath = path.resolve(baseDir, entrySrc.replace(/^\//, ''));
    if (fs.existsSync(directPath)) {
      try {
        const jsxCode = fs.readFileSync(directPath, 'utf8');
        return buildReactWrapper(jsxCode, {
          title,
          customCss,
          customJs,
          theme,
          filePath: directPath,
          workspaceDir
        });
      } catch {}
    }
  }

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

// ---------------------------------------------------------------- React Wrapper
export function buildReactWrapper(reactCode, options = {}) {
  const title = options.title || 'React Live Component';
  let customCss = options.customCss || '';
  const customJs = options.customJs || '';
  const theme = options.theme || 'dark';
  const propsJson = JSON.stringify(options.controlValues || {});

  // Apply Multi-File ESM Bundler if filePath is provided
  let rawCode = reactCode;
  if (options.filePath) {
    const bundleRes = bundleMultiFileReact(reactCode, options);
    rawCode = bundleRes.bundledCode;
    if (bundleRes.accumulatedCss) {
      customCss = customCss + '\n' + bundleRes.accumulatedCss;
    }
  }

  let sanitizedCode = rawCode;
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
<body>
  <div id="dlc-error-boundary"></div>
  <div id="root"></div>

  <script type="text/babel">
    window.__DLC_PROPS__ = ${propsJson};
    window.LucideIcons = new Proxy({}, {
      get: (target, prop) => {
        return function LucideIconWrapper(props) {
          const iconName = String(prop).replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
          const elRef = React.useRef(null);
          React.useEffect(() => {
            if (elRef.current && typeof lucide !== 'undefined' && lucide.createIcons) {
              lucide.createIcons({
                nameAttr: 'data-lucide',
                root: elRef.current.parentNode || document
              });
            }
          }, [iconName, props]);
          return (
            <i
              ref={elRef}
              data-lucide={iconName}
              className={props.className || ""}
              style={props.style || {}}
              width={props.size || 24}
              height={props.size || 24}
            />
          );
        };
      }
    });

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
      Children
    } = React;

    function renderApp(propsToPass) {
      try {
        const rootEl = document.getElementById('root');
        if (!rootEl) return;
        
        let Comp = window.__DLC_MAIN_COMPONENT__;
        if (!Comp && typeof App !== 'undefined') Comp = App;
        if (!Comp && typeof Main !== 'undefined') Comp = Main;
        if (!Comp && typeof Component !== 'undefined') Comp = Component;

        if (Comp) {
          if (!window.__DLC_REACT_ROOT__) {
            window.__DLC_REACT_ROOT__ = ReactDOM.createRoot(rootEl);
          }
          window.__DLC_REACT_ROOT__.render(
            React.createElement(Comp, propsToPass)
          );
        } else {
          rootEl.innerHTML = '<div style="padding:16px;color:#ef4444;font-family:sans-serif;"><b>Warning:</b> No export default or App component declared to render.</div>';
        }
      } catch (err) {
        const box = document.getElementById('dlc-error-boundary');
        if (box) {
          box.style.display = 'block';
          box.textContent = 'Render Error: ' + (err.stack || err.message);
        }
        console.error(err);
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
  const title = options.title || 'Mermaid Diagram';
  const theme = options.theme || 'dark';

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: ${theme === 'dark' ? '#09090b' : '#ffffff'};
      color: ${theme === 'dark' ? '#f4f4f5' : '#18181b'};
      font-family: sans-serif;
    }
    .mermaid {
      display: flex;
      justify-content: center;
      width: 100%;
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
      theme: '${theme === 'dark' ? 'dark' : 'default'}',
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
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      padding: 32px 16px;
      max-width: 800px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    html.dark body { background-color: #09090b; color: #f4f4f5; }
    html:not(.dark) body { background-color: #ffffff; color: #18181b; }
  </style>
</head>
<body>
  <div id="content" class="prose dark:prose-invert max-w-none"></div>
  <script>
    const raw = ${JSON.stringify(markdownText)};
    document.getElementById('content').innerHTML = marked.parse(raw);
  </script>
</body>
</html>`;
}

export function buildDiffWrapper(sessionA, sessionB) {
  const title = `Visual Diff: ${sessionA.title || sessionA.id} vs ${sessionB.title || sessionB.id}`;
  const htmlA = transpileAndWrap(sessionA);
  const htmlB = transpileAndWrap(sessionB);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; padding: 0; overflow: hidden; background: #09090b; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
    .diff-bar { height: 40px; background: #18181b; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; color: #fff; font-size: 13px; font-weight: 500; }
    .diff-container { position: relative; flex: 1; width: 100%; overflow: hidden; }
    .diff-frame { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
    .diff-frame-before { z-index: 1; }
    .diff-frame-after { z-index: 2; clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%); }
    .diff-slider { position: absolute; top: 0; left: 50%; width: 4px; height: 100%; background: #3b82f6; z-index: 10; cursor: ew-resize; transform: translateX(-50%); box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); }
    .diff-handle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; pointer-events: none; }
  </style>
</head>
<body>
  <div class="diff-bar">
    <span>👈 Исходный вариант</span>
    <span>↔ Перетащите ползунок для сравнения</span>
    <span>Новый вариант 👉</span>
  </div>
  <div class="diff-container" id="diffContainer">
    <iframe class="diff-frame diff-frame-before" srcdoc="${escapeHtml(htmlA)}" sandbox="allow-scripts allow-same-origin"></iframe>
    <iframe class="diff-frame diff-frame-after" id="afterFrame" srcdoc="${escapeHtml(htmlB)}" sandbox="allow-scripts allow-same-origin"></iframe>
    <div class="diff-slider" id="diffSlider">
      <div class="diff-handle">VS</div>
    </div>
  </div>

  <script>
    const container = document.getElementById('diffContainer');
    const slider = document.getElementById('diffSlider');
    const afterFrame = document.getElementById('afterFrame');
    let isDragging = false;

    function setPosition(x) {
      const rect = container.getBoundingClientRect();
      let percent = ((x - rect.left) / rect.width) * 100;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      slider.style.left = percent + '%';
      afterFrame.style.clipPath = \`polygon(\${percent}% 0, 100% 0, 100% 100%, \${percent}% 100%)\`;
    }

    slider.addEventListener('mousedown', () => { isDragging = true; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      setPosition(e.clientX);
    });
  </script>
</body>
</html>`;
}

export function buildMatrixWrapper(session) {
  const title = `Multi-Device Matrix: ${session.title || session.id}`;
  const singleHtml = transpileAndWrap(session);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #09090b;
      font-family: sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .matrix-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #f4f4f5;
      font-size: 14px;
      font-weight: 600;
      padding: 0 8px;
    }
    .matrix-grid {
      display: flex;
      gap: 24px;
      overflow-x: auto;
      padding-bottom: 24px;
      align-items: flex-start;
      justify-content: center;
    }
    .device-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .device-label {
      padding: 8px 14px;
      background: #27272a;
      font-size: 12px;
      font-weight: 600;
      color: #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .device-frame {
      border: 0;
      display: block;
      height: 640px;
    }
  </style>
</head>
<body>
  <div class="matrix-header">
    <span>📱 Синхронная мульти-девайс матрица</span>
    <span style="font-weight:400; font-size:12px; color:#a1a1aa;">Скролл автоматически синхронизируется между всеми экранами</span>
  </div>
  <div class="matrix-grid">
    <!-- Mobile (375px) -->
    <div class="device-card" style="width: 375px;">
      <div class="device-label"><span>📱 Mobile</span><span>375px</span></div>
      <iframe id="f_mobile" class="device-frame frame-mobile" style="width:375px;" srcdoc="${escapeHtml(singleHtml)}" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
    <!-- Tablet (768px) -->
    <div class="device-card" style="width: 768px;">
      <div class="device-label"><span>📟 Tablet</span><span>768px</span></div>
      <iframe id="f_tablet" class="device-frame frame-tablet" style="width:768px;" srcdoc="${escapeHtml(singleHtml)}" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
    <!-- Desktop (1024px) -->
    <div class="device-card" style="width: 1024px;">
      <div class="device-label"><span>💻 Desktop</span><span>1024px+</span></div>
      <iframe id="f_desktop" class="device-frame frame-desktop" style="width:1024px;" srcdoc="${escapeHtml(singleHtml)}" sandbox="allow-scripts allow-same-origin"></iframe>
    </div>
  </div>

  <script>
    const frames = [
      document.getElementById('f_mobile'),
      document.getElementById('f_tablet'),
      document.getElementById('f_desktop')
    ];

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'dlc_scroll_report') {
        const percentY = e.data.percentY;
        frames.forEach(f => {
          if (f && f.contentWindow && f.contentWindow !== e.source) {
            f.contentWindow.postMessage({ type: 'dlc_sync_scroll', percentY }, '*');
          }
        });
      }
    });
  </script>
</body>
</html>`;
}

export function buildGalleryWrapper(arg1, arg2 = {}) {
  let variants = [];
  let title = 'Multi-Variant Storybook Matrix';
  let theme = 'dark';
  let session = null;

  if (Array.isArray(arg1)) {
    variants = arg1;
    title = arg2.title || 'Multi-Variant Storybook Matrix';
    theme = arg2.theme || 'dark';
  } else if (arg1 && typeof arg1 === 'object') {
    session = arg1;
    variants = arg1.variants || [];
    title = arg1.title || 'Multi-Variant Storybook Matrix';
    theme = arg1.theme || 'dark';
  }

  return `<!DOCTYPE html>
<html lang="en" class="${theme === 'dark' ? 'dark' : ''}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      color: #f4f4f5;
    }
    .gallery-head {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 24px;
    }
    .story-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
    }
    .story-header {
      padding: 10px 16px;
      background: #27272a;
      font-size: 13px;
      font-weight: 600;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .story-frame {
      width: 100%;
      height: 320px;
      border: 0;
      background: #09090b;
    }
  </style>
</head>
<body>
  <div class="gallery-head">
    <div>
      <h2 style="margin:0; font-size:18px; font-weight:700;">🧩 ${escapeHtml(title)}</h2>
      <p style="margin:4px 0 0; font-size:12px; color:#a1a1aa;">Multi-Variant Storybook Matrix</p>
    </div>
    <span style="font-size:12px; color:#3b82f6; font-weight:600;">${variants.length} вариантов</span>
  </div>

  <div class="gallery-grid">
    ${variants.map((v, i) => {
      const singleSession = {
        title: v.name || title,
        content: v.content || '',
        componentType: 'html',
        variants: null,
        controlValues: v.props || {}
      };
      const singleHtml = transpileAndWrap(singleSession);
      return `
      <div class="story-card">
        <div class="story-header">
          <span>\</span>
          <span style="font-size:11px; color:#a1a1aa;">${escapeHtml(v.description || '')}</span>
        </div>
        <iframe class="story-frame" srcdoc="${escapeHtml(singleHtml)}" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
      `;
    }).join('\n')}
  </div>
</body>
</html>`;
}

export function transpileAndWrap(session) {
  if (!session) return '';

  const {
    content = '',
    componentType = 'html',
    title = 'Live Canvas Preview',
    theme = 'dark',
    customCss = '',
    customJs = '',
    controlValues = {},
    variants = null,
    filePath = '',
    workspaceDir = ''
  } = session;

  if (componentType === 'gallery' || (Array.isArray(variants) && variants.length > 0)) {
    return buildGalleryWrapper(session);
  }

  const effectiveType = componentType === 'gallery' ? 'react' : componentType;

  switch (effectiveType) {
    case 'react':
      return buildReactWrapper(content, { title, theme, customCss, customJs, controlValues, filePath, workspaceDir });
    case 'svg':
      return buildSvgWrapper(content, { title, theme });
    case 'mermaid':
      return buildMermaidWrapper(content, { title, theme });
    case 'markdown':
      return buildMarkdownWrapper(content, { title, theme });
    case 'html':
    default:
      return buildHtmlWrapper(content, { title, theme, customCss, customJs, filePath, workspaceDir });
  }
}

export function buildStandaloneHtml(session) {
  return transpileAndWrap(session);
}

