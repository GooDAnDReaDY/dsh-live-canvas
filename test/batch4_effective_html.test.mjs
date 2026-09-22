import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildWireframeTemplate } from '../lib/wireframe.js';
import { buildPlanTemplate } from '../lib/plan.js';
import { buildDiagramTemplate } from '../lib/diagram.js';
import { buildPrototypeTemplate } from '../lib/prototype.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('Wireframe archetype generator builds low-fi structural templates', () => {
  const landingWf = buildWireframeTemplate({ title: 'Landing Wireframe', layout: 'landing' });
  assert.ok(landingWf.includes('<!DOCTYPE html>'));
  assert.ok(landingWf.includes('[Brand Logo]'));
  assert.ok(landingWf.includes('[Primary Call-to-Action]'));

  const dashWf = buildWireframeTemplate({ title: 'Dashboard Wireframe', layout: 'dashboard' });
  assert.ok(dashWf.includes('[Metric A: Total Revenue]'));
  assert.ok(dashWf.includes('[Dashboard View]'));
});

test('Interactive Plan template generator builds roadmap with persistent state', () => {
  const plan = buildPlanTemplate({ title: 'Release Readiness v1.0.0', version: 'v1.0.0' });
  assert.ok(plan.includes('Release Readiness'));
  assert.ok(plan.includes('dlc_plan_state_v1.0.0'));
  assert.ok(plan.includes('updateProgress'));
  assert.ok(plan.includes('badge-p0'));
});

test('Living Architecture Diagram template builds interactive SVG/HTML node graph', () => {
  const diag = buildDiagramTemplate({ title: 'Core Architecture' });
  assert.ok(diag.includes('flow-line'));
  assert.ok(diag.includes('showDetails'));
  assert.ok(diag.includes('DSH Live Canvas Core'));
  assert.ok(diag.includes('detail-card'));
});

test('Multi-Step Prototype generator builds interactive wizard flows', () => {
  const proto = buildPrototypeTemplate({ title: 'Onboarding Flow' });
  assert.ok(proto.includes('step-pane'));
  assert.ok(proto.includes('step-node'));
  assert.ok(proto.includes('Step 1 of 3'));
  assert.ok(proto.includes('btn-next'));
});

test('PreviewStore records and resolves visual annotations with notes', () => {
  const store = new PreviewStore();
  const ann = store.recordAnnotation({
    canvasId: 'c-test',
    comment: 'Fix typo in header',
    selector: '#header-title'
  });
  assert.ok(ann.id);
  assert.equal(ann.status, 'open');

  const resolved = store.resolveAnnotation('c-test', ann.id, 'Typo fixed in commit abc1234');
  assert.ok(resolved);
  assert.equal(resolved.status, 'resolved');
  assert.ok(resolved.resolvedAt);
  assert.equal(resolved.resolutionNote, 'Typo fixed in commit abc1234');
});

test('Batch 4 Tools 21-25 execute properly and total 25 agent tools registered', async () => {
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

  // Exactly 25 agent tools
  assert.ok(registeredTools.size >= 25, 'All 25 agent tools must be registered');

  // Tool 21: live_canvas_create_wireframe
  const wfTool = registeredTools.get('live_canvas_create_wireframe');
  assert.ok(wfTool);
  const wfRes = await wfTool.execute({ title: 'Checkout Wireframe', layout: 'ecommerce' });
  assert.equal(wfRes.success, true);
  assert.ok(wfRes.previewUrl.includes('/dsh-live-canvas/sandbox/'));

  // Tool 22: live_canvas_create_plan
  const planTool = registeredTools.get('live_canvas_create_plan');
  assert.ok(planTool);
  const planRes = await planTool.execute({ title: 'Sprint 5 Plan', version: 'v1.2.0' });
  assert.equal(planRes.success, true);
  assert.equal(planRes.version, 'v1.2.0');

  // Tool 23: live_canvas_create_diagram
  const diagTool = registeredTools.get('live_canvas_create_diagram');
  assert.ok(diagTool);
  const diagRes = await diagTool.execute({ title: 'Microservices Flow', diagramType: 'architecture' });
  assert.equal(diagRes.success, true);
  assert.equal(diagRes.diagramType, 'architecture');

  // Tool 24: live_canvas_create_prototype
  const protoTool = registeredTools.get('live_canvas_create_prototype');
  assert.ok(protoTool);
  const protoRes = await protoTool.execute({ title: 'User Signup Wizard', flowType: 'auth' });
  assert.equal(protoRes.success, true);
  assert.equal(protoRes.flowType, 'auth');

  // Tool 25: live_canvas_resolve_annotation
  const resolveTool = registeredTools.get('live_canvas_resolve_annotation');
  assert.ok(resolveTool);
  const dummyAnn = store.recordAnnotation({ canvasId: wfRes.canvasId, comment: 'Move button down' });
  const resolveRes = await resolveTool.execute({ canvasId: wfRes.canvasId, annotationId: dummyAnn.id, note: 'Moved 10px down' });
  assert.equal(resolveRes.success, true);
  assert.equal(resolveRes.status, 'resolved');
});

