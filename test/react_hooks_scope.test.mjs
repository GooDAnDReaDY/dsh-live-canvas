import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReactWrapper } from '../lib/transpiler.js';

test('buildReactWrapper injects React hooks destructuring and Lucide proxy into Babel script scope', () => {
  const code = `
import React, { useState, useEffect } from "react";
import { Plus, Trash } from "lucide-react";

export default function Calculator() {
  const [val, setVal] = useState("0");
  useEffect(() => {}, []);
  return <div>{val}</div>;
}
`;

  const html = buildReactWrapper(code, { title: 'Calc' });
  assert.ok(html.includes('useState'), 'Script should include useState');
  assert.ok(html.includes('useEffect'), 'Script should include useEffect');
  assert.ok(html.includes('LucideIcons'), 'Script should include LucideIcons proxy');
  assert.ok(html.includes('const { Plus, Trash } = window.LucideIcons;'), 'lucide-react imports should be transformed');
});

