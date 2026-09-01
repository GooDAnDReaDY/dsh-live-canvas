import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listThemePresets, getThemeById, generateCssVariables, generateTailwindConfig } from '../lib/themes.js';
import { listMotionPresets, getMotionPresetById, generateMotionCss } from '../lib/motion.js';
import { generateUsers, generateProducts, generateAnalytics, generateMockDataset } from '../lib/faker.js';
import { generateSimpleQrSvg, getShareDetails } from '../lib/share.js';
import { PreviewStore } from '../lib/store.js';
import { EventHub } from '../lib/events.js';
import { registerLiveCanvasTools } from '../lib/tools.js';

test('AI Theme Tokens engine provides presets and generates CSS/Tailwind configs', () => {
  const presets = listThemePresets();
  assert.ok(presets.length >= 5, 'Should provide at least 5 theme presets');

  const linear = getThemeById('linear-dark');
  assert.equal(linear.id, 'linear-dark');
  assert.ok(linear.colors.bg);

  const cssVars = generateCssVariables('linear-dark');
  assert.ok(cssVars.includes('--dlc-bg: #090a0f'));

  const twConfig = generateTailwindConfig('vercel-clean');
  assert.ok(twConfig.includes('colors:'));
});

test('Motion studio provides animation presets and keyframes', () => {
  const presets = listMotionPresets();
  assert.ok(presets.length >= 4, 'Should provide at least 4 motion presets');

  const fadeUp = getMotionPresetById('stagger-fade-up');
  assert.ok(fadeUp);
  assert.ok(fadeUp.cssKeyframes.includes('@keyframes dlcFadeUp'));

  const allCss = generateMotionCss();
  assert.ok(allCss.includes('dlc-motion-tilt'));
});

test('Faker mock generator produces realistic zero-dependency datasets', () => {
  const users = generateUsers(4);
  assert.equal(users.length, 4);
  assert.ok(users[0].name);
  assert.ok(users[0].avatar.startsWith('https://'));

  const prods = generateProducts(3);
  assert.equal(prods.length, 3);
  assert.ok(prods[0].price > 0);

  const analytics = generateAnalytics(7);
  assert.equal(analytics.length, 7);
  assert.ok(analytics[0].visitors > 0);

  const dataset = generateMockDataset('users', 2);
  assert.equal(dataset.users.length, 2);
});

test('Share module generates mobile QR code and share details', () => {
  const qrSvg = generateSimpleQrSvg('https://192.168.1.111:3080/test', 180);
  assert.ok(qrSvg.includes('<svg'));
  assert.ok(qrSvg.includes('viewBox="0 0 180 180"'));

  const details = getShareDetails('session-123', { port: 3080, protocol: 'https' });
  assert.equal(details.canvasId, 'session-123');
  assert.ok(details.previewUrl.includes('/dsh-live-canvas/sandbox/session-123'));
  assert.ok(details.qrSvg);
});

test('Batch 3 Tools 18, 19, 20 execute properly and conform to DSL', async () => {
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

  // Total 20 tools
  assert.ok(registeredTools.size >= 20, 'All 20 agent tools must be registered');

  // 1. Tool 18: live_canvas_visual_audit
  const auditTool = registeredTools.get('live_canvas_visual_audit');
  assert.ok(auditTool);
  const auditRes = await auditTool.execute({ canvasId: 'test-canvas' });
  assert.equal(auditRes.success, true);
  assert.equal(typeof auditRes.score, 'number');

  // 2. Tool 19: live_canvas_generate_mock
  const mockTool = registeredTools.get('live_canvas_generate_mock');
  assert.ok(mockTool);
  const mockRes = await mockTool.execute({ datasetType: 'products', count: 4 });
  assert.equal(mockRes.success, true);
  assert.equal(mockRes.count, 4);
  assert.equal(mockRes.mockData.products.length, 4);

  // 3. Tool 20: live_canvas_share
  const shareTool = registeredTools.get('live_canvas_share');
  assert.ok(shareTool);
  const shareRes = await shareTool.execute({ canvasId: 'test-canvas-share' });
  assert.equal(shareRes.success, true);
  assert.ok(shareRes.shareUrl.includes('test-canvas-share'));
  assert.ok(shareRes.qrSvg);
});

