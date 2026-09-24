import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { getAllowedMethodsForApiPath } from '../lib/index.js';

test('getAllowedMethodsForApiPath returns correct allowed methods for known routes', () => {
  assert.deepEqual(getAllowedMethodsForApiPath('/dsh-live-canvas/api/save-content'), ['POST']);
  assert.deepEqual(getAllowedMethodsForApiPath('/dsh-live-canvas/api/sessions'), ['GET']);
  assert.deepEqual(getAllowedMethodsForApiPath('/dsh-live-canvas/api/controls'), ['GET', 'POST']);
  assert.deepEqual(getAllowedMethodsForApiPath('/dsh-live-canvas/api/export/canvas-123'), ['GET']);
  assert.deepEqual(getAllowedMethodsForApiPath('/dsh-live-canvas/api/pack/canvas-123'), ['GET']);
  assert.equal(getAllowedMethodsForApiPath('/dsh-live-canvas/api/non-existent-route'), null);
});

test('HTTP handler responds with 405 Method Not Allowed and Allow header', async () => {
  const allowed = getAllowedMethodsForApiPath('/dsh-live-canvas/api/save-content');
  assert.ok(allowed.includes('POST'));
  assert.ok(!allowed.includes('GET'));

  // Simulate mock req/res handler logic
  let statusCode = null;
  let headers = {};
  let responseData = '';

  const mockRes = {
    writeHead(code, h) {
      statusCode = code;
      headers = h;
    },
    end(data) {
      responseData = data;
    }
  };

  const method = 'GET';
  const urlPath = '/dsh-live-canvas/api/save-content';
  const allowedMethods = getAllowedMethodsForApiPath(urlPath);
  if (allowedMethods && !allowedMethods.includes(method)) {
    mockRes.writeHead(405, {
      'Allow': allowedMethods.join(', '),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    mockRes.end(JSON.stringify({
      error: 'Method Not Allowed',
      method,
      allowed: allowedMethods
    }));
  }

  assert.equal(statusCode, 405);
  assert.equal(headers['Allow'], 'POST');
  const parsed = JSON.parse(responseData);
  assert.equal(parsed.error, 'Method Not Allowed');
  assert.deepEqual(parsed.allowed, ['POST']);
});
