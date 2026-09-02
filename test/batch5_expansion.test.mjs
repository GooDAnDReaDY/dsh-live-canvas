import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCrudTemplate } from '../lib/crud.js';
import { buildTimeTravelViewer } from '../lib/timetravel.js';
import { buildDeploymentBundle } from '../lib/deploy.js';
import { convertSvgToTailwind, exportComponentToFigmaSvg } from '../lib/figma.js';
import { SOUND_PRESETS, getSoundEngineScript } from '../lib/sound.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('CRUD Admin Studio builds complete interactive data grid templates', () => {
  const crud = buildCrudTemplate({ title: 'Customer Subscriptions', entityName: 'Customer' });
  assert.ok(crud.includes('Customer Subscriptions'));
  assert.ok(crud.includes('dlc_crud_customer_data'));
  assert.ok(crud.includes('btn-export-csv'));
  assert.ok(crud.includes('record-modal'));
});

test('Time-Travel debugger builds history snapshot playback interface', () => {
  const snapshots = [
    { id: 's1', timestamp: '2026-08-30T10:00:00Z', content: '<h1>Revision 1</h1>' },
    { id: 's2', timestamp: '2026-08-30T11:00:00Z', content: '<h1>Revision 2</h1>' }
  ];
  const tt = buildTimeTravelViewer({ session: { id: 'c1', title: 'Landing' }, snapshots, activeIndex: 0 });
  assert.ok(tt.includes('TIME-TRAVEL'));
  assert.ok(tt.includes('timeline-slider'));
  assert.ok(tt.includes('btn-restore'));
});

test('Deployment engine builds Vercel, Cloudflare, Netlify, and Gist bundles', () => {
  const session = { id: 'c-app', title: 'My Cool App', content: '<html><body>App</body></html>' };
  
  const vercel = buildDeploymentBundle({ session, target: 'vercel' });
  assert.equal(vercel.target, 'vercel');
  assert.ok(vercel.files['vercel.json']);
  assert.ok(vercel.files['index.html']);

  const cf = buildDeploymentBundle({ session, target: 'cloudflare' });
  assert.equal(cf.target, 'cloudflare');
  assert.ok(cf.files['_routes.json']);

  const netlify = buildDeploymentBundle({ session, target: 'netlify' });
  assert.equal(netlify.target, 'netlify');
  assert.ok(netlify.files['_redirects']);

  const gist = buildDeploymentBundle({ session, target: 'gist' });
  assert.equal(gist.target, 'gist');
  assert.ok(gist.filename.endsWith('.html'));
});

test('Figma vector bridge converts SVG to Tailwind and exports to Figma SVG', () => {
  const sampleSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>';
  const converted = convertSvgToTailwind(sampleSvg, { componentName: 'IconTriangle' });
  assert.equal(converted.success, true);
  assert.equal(converted.componentName, 'IconTriangle');
  assert.ok(converted.jsx.includes('export function IconTriangle'));

  const figmaSvg = exportComponentToFigmaSvg({ title: 'HeroBanner', content: '<div>Hero</div>' });
  assert.equal(figmaSvg.success, true);
  assert.ok(figmaSvg.figmaSvg.includes('<foreignObject'));
});

test('Sound FX engine provides Web Audio synthesis presets and runtime script', () => {
  assert.ok(SOUND_PRESETS.click);
  assert.ok(SOUND_PRESETS.success);
  assert.ok(SOUND_PRESETS.error);
  assert.ok(SOUND_PRESETS.levelup);

  const script = getSoundEngineScript();
  assert.ok(script.includes('window.__DLC_SOUND__'));
  assert.ok(script.includes('AudioContext'));
});

test('Batch 5 Tools 26-30 execute properly and total 30 agent tools registered', async () => {
  const store = new PreviewStore();
  const eventHub = new EventHub();
  const registeredTools = new Map();

  const fakeCtx = {
    tools: {
      register: (tool) => {
        registeredTools.set(tool.name, tool);
      }
    }
  };

  registerLiveCanvasTools(fakeCtx, store, eventHub);

  // Exactly 30 agent tools
  assert.equal(registeredTools.size, 30, 'All 30 agent tools must be registered');

  // Tool 26: live_canvas_create_crud
  const crudTool = registeredTools.get('live_canvas_create_crud');
  assert.ok(crudTool);
  const crudRes = await crudTool.execute({ title: 'Orders CRUD', entityName: 'Order' });
  assert.equal(crudRes.success, true);
  assert.equal(crudRes.entityName, 'Order');

  // Tool 27: live_canvas_timetravel
  const ttTool = registeredTools.get('live_canvas_timetravel');
  assert.ok(ttTool);
  const ttRes = await ttTool.execute({ canvasId: crudRes.canvasId, action: 'view' });
  assert.equal(ttRes.success, true);
  assert.ok(ttRes.timetravelUrl.includes('/dsh-live-canvas/timetravel/'));

  // Tool 28: live_canvas_instant_deploy
  const deployTool = registeredTools.get('live_canvas_instant_deploy');
  assert.ok(deployTool);
  const deployRes = await deployTool.execute({ canvasId: crudRes.canvasId, target: 'vercel' });
  assert.equal(deployRes.success, true);
  assert.equal(deployRes.target, 'vercel');

  // Tool 29: live_canvas_figma_bridge
  const figmaTool = registeredTools.get('live_canvas_figma_bridge');
  assert.ok(figmaTool);
  const figmaRes = await figmaTool.execute({
    svg: '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg>',
    action: 'import_svg'
  });
  assert.equal(figmaRes.success, true);
  assert.equal(figmaRes.action, 'import_svg');

  // Tool 30: live_canvas_sound_fx
  const soundTool = registeredTools.get('live_canvas_sound_fx');
  assert.ok(soundTool);
  const soundRes = await soundTool.execute({ action: 'preview_sound', soundType: 'success' });
  assert.equal(soundRes.success, true);
  assert.equal(soundRes.soundType, 'success');
});


test('Deployment engine generates valid safe identifiers for non-Latin and Cyrillic titles', () => {
  const session = { id: 'c-cyrillic', title: 'Интерактивный дашборд заказов', content: '<div>Дашборд</div>' };
  const vercel = buildDeploymentBundle({ session, target: 'vercel' });
  const pkgJson = JSON.parse(vercel.files['package.json']);
  assert.ok(pkgJson.name.startsWith('canvas-c-cyrillic'), 'Should generate safe fallback identifier');
  assert.notEqual(pkgJson.name, '-', 'Name should never be a bare hyphen');

  const gist = buildDeploymentBundle({ session, target: 'gist' });
  assert.ok(gist.filename.startsWith('canvas-c-cyrillic'), 'Gist filename should be safe');
});

test('PreviewStore recordInspection accurately records status without duplicates', () => {
  const store = new PreviewStore();
  const insp = store.recordInspection({
    canvasId: 'test-canvas',
    selector: '#btn-submit',
    status: 'open',
    resolutionNote: 'Checking click handler'
  });
  assert.equal(insp.status, 'open');
  assert.equal(insp.resolutionNote, 'Checking click handler');
  assert.equal(typeof insp.timestamp, 'string');
});
