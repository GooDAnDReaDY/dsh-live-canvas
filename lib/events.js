// dsh-live-canvas: SSE event broadcaster and connection manager.
export class EventHub {
  constructor(options = {}) {
    this.clients = new Set();
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 15000;
    this.heartbeatTimer = null;
    this._startHeartbeat();
  }

  _startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this._pingAll();
    }, this.heartbeatIntervalMs);
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  _pingAll() {
    for (const client of this.clients) {
      try {
        client.write(':keepalive\n\n');
      } catch {
        this.clients.delete(client);
      }
    }
  }

  handleSseRequest(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(':connected\n\n');
    this.clients.add(res);

    const cleanup = () => {
      this.clients.delete(res);
      try {
        res.end();
      } catch {}
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('error', cleanup);

    return cleanup;
  }

  broadcast(eventType, payload = {}) {
    const data = JSON.stringify(payload);
    const message = `event: ${eventType}\ndata: ${data}\n\n`;
    let sentCount = 0;

    for (const client of this.clients) {
      try {
        client.write(message);
        sentCount++;
      } catch {
        this.clients.delete(client);
      }
    }

    return sentCount;
  }

  getClientCount() {
    return this.clients.size;
  }

  closeAll() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const client of this.clients) {
      try {
        client.write('event: close\ndata: {}\n\n');
        client.end();
      } catch {}
    }
    this.clients.clear();
  }
}