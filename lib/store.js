// dsh-live-canvas: in-memory preview session and inspection store.
import crypto from 'node:crypto';

export class PreviewStore {
  constructor(options = {}) {
    this.maxSessions = options.maxSessions || 50;
    this.sessions = new Map();
    this.inspections = [];
    this.maxInspections = 100;
  }

  generateId() {
    return 'canvas-' + crypto.randomBytes(6).toString('hex');
  }

  createOrUpdateSession(params) {
    const id = params.id || this.generateId();
    const now = new Date().toISOString();
    const existing = this.sessions.get(id);

    const session = {
      id,
      title: params.title || (existing ? existing.title : 'Live Preview'),
      content: typeof params.content === 'string' ? params.content : (existing ? existing.content : ''),
      componentType: params.componentType || (existing ? existing.componentType : 'html'),
      viewport: params.viewport || (existing ? existing.viewport : 'responsive'),
      filePath: params.filePath || (existing ? existing.filePath : null),
      customCss: typeof params.customCss === 'string' ? params.customCss : (existing ? existing.customCss : ''),
      customJs: typeof params.customJs === 'string' ? params.customJs : (existing ? existing.customJs : ''),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      renderedHtml: null
    };

    // LRU eviction
    if (!existing && this.sessions.size >= this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
      }
    }

    // Re-insert to keep MRU order
    this.sessions.delete(id);
    this.sessions.set(id, session);

    return session;
  }

  getSession(id) {
    const session = this.sessions.get(id);
    if (!session) return null;
    // Refresh MRU order
    this.sessions.delete(id);
    this.sessions.set(id, session);
    return session;
  }

  deleteSession(id) {
    return this.sessions.delete(id);
  }

  listSessions() {
    return Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      title: s.title,
      componentType: s.componentType,
      viewport: s.viewport,
      filePath: s.filePath,
      updatedAt: s.updatedAt,
      contentLength: s.content ? s.content.length : 0
    }));
  }

  recordInspection(data) {
    const record = {
      id: 'insp-' + crypto.randomBytes(4).toString('hex'),
      canvasId: data.canvasId || null,
      selector: data.selector || '',
      tagName: data.tagName || '',
      idAttr: data.idAttr || '',
      className: data.className || '',
      innerText: (data.innerText || '').slice(0, 500),
      outerHtml: (data.outerHtml || '').slice(0, 2000),
      attributes: data.attributes || {},
      rect: data.rect || null,
      timestamp: new Date().toISOString()
    };

    this.inspections.unshift(record);
    if (this.inspections.length > this.maxInspections) {
      this.inspections.pop();
    }

    return record;
  }

  getLastInspection(canvasId) {
    if (!canvasId) {
      return this.inspections[0] || null;
    }
    return this.inspections.find(i => i.canvasId === canvasId) || null;
  }

  listInspections(canvasId, limit = 20) {
    if (!canvasId) {
      return this.inspections.slice(0, limit);
    }
    return this.inspections.filter(i => i.canvasId === canvasId).slice(0, limit);
  }

  clearInspections(canvasId) {
    if (!canvasId) {
      this.inspections = [];
    } else {
      this.inspections = this.inspections.filter(i => i.canvasId !== canvasId);
    }
  }

  clear() {
    this.sessions.clear();
    this.inspections = [];
  }
}