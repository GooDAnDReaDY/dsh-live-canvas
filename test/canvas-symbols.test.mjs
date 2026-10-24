import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8');
const legacy = JSON.parse(source.match(/const LEGACY_CALC_DEMO_CODE = (.*);/)[1]);
const original = { id: 'original-demo', title: 'React Calculator', componentType: 'react', content: legacy };
const customized = { ...original, id: 'customized', content: legacy + '\n// User customization' };
const file = { ...original, id: 'file', filePath: '/workspace/custom.jsx' };
const other = { ...original, id: 'other', title: 'User calculator' };
const sessions = new Map([original, customized, file, other].map(session => [session.id, session]));
const writes = [];
const context = { store: {
  listSessions: () => [...sessions.values()],
  getSession: id => sessions.get(id),
  createOrUpdateSession: data => { writes.push(data); Object.assign(sessions.get(data.id), data); }
} };
vm.createContext(context);
const start = source.indexOf('const LEGACY_CALC_DEMO_CODE =');
const end = source.indexOf('const DASH_DEMO_CODE =', start);
const code = source.slice(start, end);
vm.runInContext(code, context);
assert.equal(writes.length, 1);
assert.equal(writes[0].id, 'original-demo');
assert.ok(original.content.includes('>&times;</button>'));
assert.ok(original.content.includes('>&divide;</button>'));
assert.ok(original.content.includes('act("\\u00d7")'));
assert.ok(original.content.includes('op === "\\u00d7"'));
assert.ok(original.content.includes('act("\\u00f7")'));
assert.ok(original.content.includes('op === "\\u00f7"'));
assert.equal(customized.content, legacy + '\n// User customization');
assert.equal(file.content, legacy);
assert.equal(other.content, legacy);
vm.runInContext('{' + code + '}', context);
assert.equal(writes.length, 1);
console.log('PASS: calculator uses JSX entities and preserves JavaScript operator escapes; only unchanged built-in demos repaired; repair is idempotent.');
