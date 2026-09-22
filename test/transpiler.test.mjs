import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  autoDetectType,
  buildHtmlWrapper,
  buildReactWrapper,
  buildSvgWrapper,
  buildMermaidWrapper,
  buildMarkdownWrapper,
  transpileAndWrap
} from '../lib/transpiler.js';

test('autoDetectType accurately classifies markup and code types', () => {
  assert.equal(autoDetectType('<div class="hero"><h1>Hello</h1></div>'), 'html');
  assert.equal(autoDetectType('', 'src/Button.jsx'), 'react');
  assert.equal(autoDetectType('export default function App() { return <button>Click</button>; }'), 'react');
  assert.equal(autoDetectType('<svg width="100" height="100"><circle r="40"/></svg>'), 'svg');
  assert.equal(autoDetectType('graph TD\n  A[Start] --> B[End]'), 'mermaid');
  assert.equal(autoDetectType('# Project Title\n\nSome documentation text'), 'markdown');
});

test('buildHtmlWrapper preserves full html documents and wraps partial snippets with Tailwind and Lucide', () => {
  const partial = '<p class="text-blue-500">Simple paragraph</p>';
  const wrappedPartial = buildHtmlWrapper(partial, { title: 'Test Title', theme: 'dark' });
  assert.ok(wrappedPartial.includes('<!DOCTYPE html>'));
  assert.ok(wrappedPartial.includes('<title>Test Title</title>'));
  assert.ok(wrappedPartial.includes('cdn.tailwindcss.com'));
  assert.ok(wrappedPartial.includes('lucide@latest'));
  assert.ok(wrappedPartial.includes('class="dark"'));
  assert.ok(wrappedPartial.includes(partial));

  const fullDoc = '<!DOCTYPE html><html><head><title>Original</title></head><body><h1>Original</h1></body></html>';
  const wrappedFull = buildHtmlWrapper(fullDoc, { customCss: 'body { color: red; }' });
  assert.ok(wrappedFull.includes('cdn.tailwindcss.com'));
  assert.ok(wrappedFull.includes('body { color: red; }'));
});

test('buildReactWrapper creates React/Babel development template with Tailwind and Lucide', () => {
  const reactCode = 'function Counter() { const [c, setC] = React.useState(0); return <button onClick={() => setC(c+1)}>{c}</button>; }';
  const out = buildReactWrapper(reactCode, { title: 'Counter Preview', theme: 'dark' });
  assert.ok(out.includes('react.development.js'));
  assert.ok(out.includes('react-dom.development.js'));
  assert.ok(out.includes('@babel/standalone'));
  assert.ok(out.includes('cdn.tailwindcss.com'));
  assert.ok(out.includes('lucide@latest'));
  assert.ok(out.includes('type="text/babel"'));
  assert.ok(out.includes('Counter'));
});

test('buildSvgWrapper, buildMermaidWrapper, buildMarkdownWrapper wrap correctly', () => {
  const svg = '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="blue"/></svg>';
  const svgHtml = buildSvgWrapper(svg, { title: 'SVG Diagram', theme: 'dark' });
  assert.ok(svgHtml.includes('class="svg-container"'));
  assert.ok(svgHtml.includes(svg));

  const mmd = 'graph LR\nA-->B';
  const mmdHtml = buildMermaidWrapper(mmd, { title: 'Flowchart', theme: 'dark' });
  assert.ok(mmdHtml.includes('mermaid.min.js'));
  assert.ok(mmdHtml.includes('mermaid.initialize'));

  const md = '# Header 1\n\n- item 1\n- item 2';
  const mdHtml = buildMarkdownWrapper(md, { title: 'Markdown Doc', theme: 'dark' });
  assert.ok(mdHtml.includes('marked.min.js'));
});

test('transpileAndWrap delegates correctly based on session componentType and theme', () => {
  const session = {
    title: 'Mermaid Spec',
    content: 'sequenceDiagram\nAlice->>Bob: Hello',
    componentType: 'mermaid',
    theme: 'dark'
  };
  const html = transpileAndWrap(session);
  assert.ok(html.includes('mermaid.min.js'));
  assert.ok(html.includes('Alice-&gt;&gt;Bob'));
  assert.ok(html.includes('theme: \'dark\''));
});