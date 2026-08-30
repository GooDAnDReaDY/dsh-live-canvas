// dsh-live-canvas: component transpiler and template wrapper for HTML, React JSX, SVG, Mermaid, and Markdown.

export function autoDetectType(content = '', filePath = '') {
  const trimmed = content.trim();
  const lowerPath = filePath ? filePath.toLowerCase() : '';

  if (lowerPath.endsWith('.jsx') || lowerPath.endsWith('.tsx')) return 'react';
  if (lowerPath.endsWith('.svg')) return 'svg';
  if (lowerPath.endsWith('.mmd') || lowerPath.endsWith('.mermaid')) return 'mermaid';
  if (lowerPath.endsWith('.md') || lowerPath.endsWith('.markdown')) return 'markdown';

  if (trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))) {
    return 'svg';
  }

  if (
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline)\b/m.test(trimmed)
  ) {
    return 'mermaid';
  }

  if (
    trimmed.includes('import React') ||
    trimmed.includes('export default') ||
    trimmed.includes('useState(') ||
    trimmed.includes('useEffect(') ||
    /<[A-Z][A-Za-z0-9_]*(\s|>|\/)/.test(trimmed)
  ) {
    return 'react';
  }

  if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || /^(\*\*|[-*]\s+|\d+\.\s+)/m.test(trimmed)) {
    if (!trimmed.includes('<html') && !trimmed.includes('<!DOCTYPE') && !trimmed.includes('<div')) {
      return 'markdown';
    }
  }

  return 'html';
}

export function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildHtmlWrapper(content, options = {}) {
  const title = options.title || 'Live Preview';
  const customCss = options.customCss || '';
  const customJs = options.customJs || '';

  // If content already contains complete <html> structure, inject CSS/JS before </body> or </head>
  if (/<html[\s>]/i.test(content) && /<body[\s>]/i.test(content)) {
    let result = content;
    if (customCss) {
      const styleTag = `\n<style id="dlc-custom-css">\n${customCss}\n</style>\n`;
      if (/<\/head>/i.test(result)) {
        result = result.replace(/<\/head>/i, `${styleTag}</head>`);
      } else {
        result = styleTag + result;
      }
    }
    if (customJs) {
      const scriptTag = `\n<script id="dlc-custom-js">\n${customJs}\n</script>\n`;
      if (/<\/body>/i.test(result)) {
        result = result.replace(/<\/body>/i, `${scriptTag}</body>`);
      } else {
        result = result + scriptTag;
      }
    }
    return result;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background-color: #ffffff;
      line-height: 1.5;
    }
    @media (prefers-color-scheme: dark) {
      body {
        color: #e0e0e0;
        background-color: #121212;
      }
    }
    ${customCss}
  </style>
</head>
<body>
  ${content}
  ${customJs ? `<script>\n${customJs}\n</script>` : ''}
</body>
</html>`;
}

export function buildReactWrapper(code, options = {}) {
  const title = options.title || 'React Live Preview';
  const customCss = options.customCss || '';

  // Clean export default or module.exports
  let sanitizedCode = code;
  sanitizedCode = sanitizedCode.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1');
  sanitizedCode = sanitizedCode.replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, 'class $1');
  sanitizedCode = sanitizedCode.replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, 'window.__DLC_MAIN_COMPONENT__ = $1;');
  sanitizedCode = sanitizedCode.replace(/import\s+.*?from\s+['"].*?['"];?/g, '');
  sanitizedCode = sanitizedCode.replace(/export\s+{[^}]+};?/g, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background-color: #ffffff;
      line-height: 1.5;
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
    @media (prefers-color-scheme: dark) {
      body { color: #e0e0e0; background-color: #121212; }
      #dlc-error-boundary { background: #3e1b1b; color: #ff8a80; border-color: #b71c1c; }
    }
    ${customCss}
  </style>
</head>
<body>
  <div id="dlc-error-boundary"></div>
  <div id="root"></div>
  <script type="text/babel">
    window.addEventListener('error', (e) => {
      const box = document.getElementById('dlc-error-boundary');
      if (box) {
        box.style.display = 'block';
        box.textContent = 'Runtime Error: ' + (e.error ? (e.error.stack || e.error.message) : e.message);
      }
    });

    try {
      ${sanitizedCode}

      // Auto mount if not explicitly mounted in code
      if (!document.getElementById('root').hasChildNodes()) {
        const componentCandidate = window.__DLC_MAIN_COMPONENT__ ||
          (typeof App !== 'undefined' ? App :
          (typeof Main !== 'undefined' ? Main :
          (typeof Component !== 'undefined' ? Component : null)));

        if (componentCandidate) {
          const root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(componentCandidate));
        }
      }
    } catch (err) {
      const box = document.getElementById('dlc-error-boundary');
      if (box) {
        box.style.display = 'block';
        box.textContent = 'Render Error: ' + (err.stack || err.message);
      }
      console.error(err);
    }
  </script>
</body>
</html>`;
}

export function buildSvgWrapper(svgContent, options = {}) {
  const title = options.title || 'SVG Preview';
  return `<!DOCTYPE html>
<html lang="en">
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
      background: repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 20px 20px;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: repeating-conic-gradient(#1e1e1e 0% 25%, #141414 0% 50%) 50% / 20px 20px;
      }
    }
    .svg-container {
      max-width: 100%;
      max-height: 85vh;
      background: transparent;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
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
  return `<!DOCTYPE html>
<html lang="en">
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
      background-color: #ffffff;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #121212; color: #e0e0e0; }
    }
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
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    mermaid.initialize({
      startOnLoad: true,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose'
    });
  </script>
</body>
</html>`;
}

export function buildMarkdownWrapper(markdownText, options = {}) {
  const title = options.title || 'Markdown Preview';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 32px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #24292f;
      background-color: #ffffff;
      line-height: 1.6;
      max-width: 860px;
      margin: 0 auto;
    }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; font-size: 85%; }
    blockquote { border-left: 4px solid #d0d7de; margin: 0; padding-left: 16px; color: #57606a; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #d0d7de; padding: 6px 13px; }
    th { background: #f6f8fa; }
    @media (prefers-color-scheme: dark) {
      body { color: #c9d1d9; background-color: #0d1117; }
      pre { background: #161b22; }
      blockquote { border-left-color: #30363d; color: #8b949e; }
      th, td { border-color: #30363d; }
      th { background: #161b22; }
    }
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

export function transpileAndWrap(session, options = {}) {
  const content = session.content || '';
  const type = session.componentType || autoDetectType(content, session.filePath);

  const mergedOpts = {
    title: session.title,
    customCss: session.customCss,
    customJs: session.customJs,
    ...options
  };

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