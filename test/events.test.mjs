import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { EventHub } from '../lib/events.js';

function createMockReqRes() {
  const req = new EventEmitter();
  const res = new EventEmitter();
  res.headers = {};
  res.written = [];
  res.ended = false;

  res.writeHead = (status, headers) => {
    res.status = status;
    res.headers = headers;
  };
  res.write = (chunk) => {
    res.written.push(chunk);
    return true;
  };
  res.end = () => {
    res.ended = true;
  };

  return { req, res };
}

test('EventHub handles SSE connections and headers', () => {
  const hub = new EventHub({ heartbeatIntervalMs: 60000 });
  const { req, res } = createMockReqRes();

  hub.handleSseRequest(req, res);

  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'text/event-stream');
  assert.equal(res.headers['Cache-Control'], 'no-cache, no-transform');
  assert.equal(res.written[0], ':connected\n\n');
  assert.equal(hub.getClientCount(), 1);

  hub.closeAll();
});

test('EventHub broadcasts events to all active clients', () => {
  const hub = new EventHub({ heartbeatIntervalMs: 60000 });
  const c1 = createMockReqRes();
  const c2 = createMockReqRes();

  hub.handleSseRequest(c1.req, c1.res);
  hub.handleSseRequest(c2.req, c2.res);

  assert.equal(hub.getClientCount(), 2);

  const sent = hub.broadcast('update', { canvasId: 'canvas-123' });
  assert.equal(sent, 2);

  assert.ok(c1.res.written.some(w => w.includes('event: update') && w.includes('canvas-123')));
  assert.ok(c2.res.written.some(w => w.includes('event: update') && w.includes('canvas-123')));

  // Client disconnects
  c1.req.emit('close');
  assert.equal(hub.getClientCount(), 1);

  hub.closeAll();
  assert.equal(hub.getClientCount(), 0);
});