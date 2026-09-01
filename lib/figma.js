// dsh-live-canvas: Figma & Penpot Vector Bridge & Clipboard Sync Engine.

export function convertSvgToTailwind(svgText = '', options = {}) {
  const cleanSvg = String(svgText).trim();
  if (!cleanSvg.includes('<svg')) {
    throw new Error('Input is not valid SVG vector markup');
  }

  // Extract dimensions / viewBox
  const viewBoxMatch = cleanSvg.match(/viewBox=["']([^"']+)["']/i);
  const widthMatch = cleanSvg.match(/width=["']([^"']+)["']/i);
  const heightMatch = cleanSvg.match(/height=["']([^"']+)["']/i);

  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 100 100';
  const width = widthMatch ? widthMatch[1] : 'auto';
  const height = heightMatch ? heightMatch[1] : 'auto';

  const componentName = options.componentName || 'FigmaVectorComponent';

  const jsxSnippet = `import React from 'react';

export function ${componentName}(props) {
  return (
    <div className="inline-flex items-center justify-center p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md">
      ${cleanSvg.replace(/<svg([^>]*)>/i, '<svg$1 className="w-full h-full text-indigo-400">')}
    </div>
  );
}
`;

  return {
    success: true,
    componentName,
    viewBox,
    width,
    height,
    jsx: jsxSnippet,
    html: `<div class="inline-flex items-center justify-center p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-md">\n  ${cleanSvg}\n</div>`
  };
}

export function exportComponentToFigmaSvg(session = {}) {
  const content = session.content || '';
  const title = session.title || 'CanvasComponent';

  const figmaSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:#090a0f;color:#fff;font-family:sans-serif;">
      ${content}
    </div>
  </foreignObject>
</svg>`;

  return {
    success: true,
    title,
    figmaSvg,
    instructions: 'Copy this SVG code and paste directly into Figma canvas (Ctrl+V / Cmd+V).'
  };
}

