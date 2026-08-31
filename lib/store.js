// dsh-live-canvas: in-memory store for active preview sessions, DOM click inspections, and runtime telemetry logs.
import crypto from 'node:crypto';

export class PreviewStore {
  constructor(options = {}) {
    this.maxSessions = options.maxSessions || 50;
    this.sessions = new Map();
    this.inspections = new Map(); // canvasId -> array of inspection records
    this.logs = new Map(); // canvasId -> array of telemetry logs
    this.lastInspection = null;
  }

  createOrUpdateSession(data = {}) {
    const id = data.id || data.canvasId || `canvas-${crypto.randomBytes(6).toString('hex')}`;
    const existing = this.sessions.get(id);

    const session = {
      id,
      title: data.title || existing?.title || 'Live Preview',
      content: typeof data.content === 'string' ? data.content : (existing?.content || ''),
      componentType: data.componentType || existing?.componentType || 'html',
      viewport: data.viewport || existing?.viewport || 'responsive',
      theme: data.theme || existing?.theme || 'dark',
      filePath: data.filePath !== undefined ? data.filePath : (existing?.filePath || null),
      customCss: data.customCss !== undefined ? data.customCss : (existing?.customCss || ''),
      customJs: data.customJs !== undefined ? data.customJs : (existing?.customJs || ''),
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    // LRU eviction
    if (!existing && this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
        this.inspections.delete(oldestKey);
        this.logs.delete(oldestKey);
      }
    }

    this.sessions.delete(id); // delete and set to refresh insertion order (LRU)
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;
    // Refresh LRU order on access
    this.sessions.delete(id);
    this.sessions.set(id, session);
    return session;
  }

  listSessions() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      title: s.title,
      componentType: s.componentType,
      viewport: s.viewport,
      theme: s.theme,
      filePath: s.filePath,
      updatedAt: s.updatedAt,
      contentLength: (s.content || '').length
    }));
  }

  // --- Inspections ---
  recordInspection(record = {}) {
    const canvasId = record.canvasId || 'default';
    const inspection = {
      id: `insp-${crypto.randomBytes(4).toString('hex')}`,
      canvasId,
      selector: record.selector || '',
      tagName: record.tagName || '',
      idAttr: record.idAttr || '',
      className: record.className || '',
      innerText: (record.innerText || '').slice(0, 500),
      outerHtml: (record.outerHtml || '').slice(0, 1000),
      attributes: record.attributes || {},
      rect: record.rect || null,
      timestamp: new Date().toISOString()
    };

    this.lastInspection = inspection;

    if (!this.inspections.has(canvasId)) {
      this.inspections.set(canvasId, []);
    }
    const list = this.inspections.get(canvasId);
    list.unshift(inspection);
    if (list.length > 50) list.pop(); // keep last 50

    return inspection;
  }

  getLastInspection(canvasId = null) {
    if (canvasId) {
      if (this.inspections.has(canvasId)) {
        const list = this.inspections.get(canvasId);
        return list.length > 0 ? list[0] : null;
      }
      return null;
    }
    return this.lastInspection;
  }

  listInspections(canvasId = null, limit = 20) {
    if (canvasId) {
      if (this.inspections.has(canvasId)) {
        return this.inspections.get(canvasId).slice(0, limit);
      }
      return [];
    }
    const all = [];
    for (const list of this.inspections.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  clearInspections(canvasId = null) {
    if (canvasId) {
      this.inspections.delete(canvasId);
    } else {
      this.inspections.clear();
      this.lastInspection = null;
    }
  }

  // --- Telemetry & Error Logs ---
  recordLog(record = {}) {
    const canvasId = record.canvasId || 'default';
    const entry = {
      id: `log-${crypto.randomBytes(4).toString('hex')}`,
      canvasId,
      level: record.level || 'info', // 'error' | 'warn' | 'info' | 'log'
      message: String(record.message || '').slice(0, 1000),
      stack: record.stack ? String(record.stack).slice(0, 2000) : null,
      timestamp: new Date().toISOString()
    };

    if (!this.logs.has(canvasId)) {
      this.logs.set(canvasId, []);
    }
    const list = this.logs.get(canvasId);
    list.unshift(entry);
    if (list.length > 100) list.pop(); // keep last 100 entries

    return entry;
  }

  getLogs(canvasId = null, level = null, limit = 50) {
    let list = [];
    if (canvasId) {
      if (this.logs.has(canvasId)) {
        list = this.logs.get(canvasId);
      } else {
        return [];
      }
    } else {
      for (const l of this.logs.values()) {
        list.push(...l);
      }
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    if (level && level !== 'all') {
      list = list.filter(item => item.level === level);
    }
    return list.slice(0, limit);
  }

  clearLogs(canvasId = null) {
    if (canvasId) {
      this.logs.delete(canvasId);
    } else {
      this.logs.clear();
    }
  }

  clear() {
    this.sessions.clear();
    this.inspections.clear();
    this.logs.clear();
    this.lastInspection = null;
  }
}