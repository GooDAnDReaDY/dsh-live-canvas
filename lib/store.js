// dsh-live-canvas: in-memory store for active preview sessions, DOM click inspections, telemetry logs, visual annotations, component galleries, props controls, version snapshots, and mock data.
import crypto from 'node:crypto';

export class PreviewStore {
  constructor(options = {}) {
    this.maxSessions = options.maxSessions || 50;
    this.sessions = new Map();
    this.inspections = new Map(); // canvasId -> array of inspection records
    this.logs = new Map(); // canvasId -> array of telemetry logs
    this.annotations = new Map(); // canvasId -> array of visual annotations
    this.snapshots = new Map(); // canvasId -> array of version snapshots
    this.lastInspection = null;
  }

  createOrUpdateSession(data = {}) {
    const id = data.id || data.canvasId || `canvas-${crypto.randomBytes(6).toString('hex')}`;
    const existing = this.sessions.get(id);

    // Save previous version as snapshot if content changed
    if (existing && existing.content && typeof data.content === 'string' && data.content !== existing.content) {
      if (!this.snapshots.has(id)) {
        this.snapshots.set(id, []);
      }
      const snaps = this.snapshots.get(id);
      snaps.unshift({
        id: `snap-${crypto.randomBytes(4).toString('hex')}`,
        canvasId: id,
        title: existing.title,
        content: existing.content,
        componentType: existing.componentType,
        controlValues: existing.controlValues || {},
        timestamp: existing.updatedAt || new Date().toISOString()
      });
      if (snaps.length > 20) snaps.pop(); // keep last 20
    }

    const initialControls = data.controls || existing?.controls || null;
    let initialValues = { ...(existing?.controlValues || {}), ...(data.controlValues || {}) };

    if (initialControls && Object.keys(initialValues).length === 0) {
      for (const [key, ctrl] of Object.entries(initialControls)) {
        if (ctrl && ctrl.default !== undefined) {
          initialValues[key] = ctrl.default;
        }
      }
    }

    const session = {
      id,
      title: data.title || existing?.title || 'Live Preview',
      content: typeof data.content === 'string' ? data.content : (existing?.content || ''),
      componentType: data.componentType || existing?.componentType || 'html',
      viewport: data.viewport || existing?.viewport || 'responsive',
      theme: data.theme || existing?.theme || 'dark',
      filePath: data.filePath !== undefined ? data.filePath : (existing?.filePath || null),
      variants: Array.isArray(data.variants) ? data.variants : (existing?.variants || null),
      controls: initialControls,
      controlValues: initialValues,
      mockData: data.mockData || existing?.mockData || null,
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
        this.annotations.delete(oldestKey);
        this.snapshots.delete(oldestKey);
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
      variantsCount: s.variants ? s.variants.length : 0,
      hasControls: !!s.controls,
      hasMockData: !!s.mockData,
      snapshotsCount: this.snapshots.has(s.id) ? this.snapshots.get(s.id).length : 0,
      updatedAt: s.updatedAt,
      contentLength: (s.content || '').length
    }));
  }

  // --- Mock Data ---
  setMockData(canvasId, mockData = null) {
    const session = this.getSession(canvasId);
    if (!session) return null;
    session.mockData = mockData;
    return session;
  }

  getMockData(canvasId) {
    const session = this.getSession(canvasId);
    return session ? (session.mockData || {}) : null;
  }

  // --- Version Snapshots ---
  getSnapshots(canvasId = null, limit = 10) {
    if (canvasId) {
      if (this.snapshots.has(canvasId)) {
        return this.snapshots.get(canvasId).slice(0, limit);
      }
      return [];
    }
    const all = [];
    for (const list of this.snapshots.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  getSnapshot(canvasId, snapshotId) {
    const list = this.getSnapshots(canvasId, 50);
    return list.find(s => s.id === snapshotId) || null;
  }

  getLatestPreviousSnapshot(canvasId) {
    const list = this.getSnapshots(canvasId, 1);
    return list.length > 0 ? list[0] : null;
  }

  // --- Props Controls ---
  setControls(canvasId, controls = {}, values = {}) {
    const session = this.getSession(canvasId);
    if (!session) return null;
    session.controls = controls;
    session.controlValues = { ...(session.controlValues || {}), ...values };
    return session;
  }

  updateControlValues(canvasId, values = {}) {
    const session = this.getSession(canvasId);
    if (!session) return null;
    session.controlValues = { ...(session.controlValues || {}), ...values };
    return session.controlValues;
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
      level: record.level || 'info', // 'error' | 'warn' | 'info'
      message: String(record.message || '').slice(0, 1000),
      stack: record.stack ? String(record.stack).slice(0, 2000) : null,
      timestamp: new Date().toISOString()
    };

    if (!this.logs.has(canvasId)) {
      this.logs.set(canvasId, []);
    }
    const list = this.logs.get(canvasId);
    list.unshift(entry);
    if (list.length > 100) list.pop();

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

  // --- Visual Annotations ---
  recordAnnotation(record = {}) {
    const canvasId = record.canvasId || 'default';
    const annotation = {
      id: `ann-${crypto.randomBytes(4).toString('hex')}`,
      canvasId,
      comment: String(record.comment || '').slice(0, 500),
      selector: record.selector || '',
      tagName: record.tagName || '',
      box: {
        x: Math.round(record.box?.x ?? record.x ?? 0),
        y: Math.round(record.box?.y ?? record.y ?? 0),
        width: Math.round(record.box?.width ?? record.width ?? 0),
        height: Math.round(record.box?.height ?? record.height ?? 0)
      },
      timestamp: new Date().toISOString()
    };

    if (!this.annotations.has(canvasId)) {
      this.annotations.set(canvasId, []);
    }
    const list = this.annotations.get(canvasId);
    list.unshift(annotation);
    if (list.length > 50) list.pop(); // keep last 50

    return annotation;
  }

  getAnnotations(canvasId = null, limit = 20) {
    if (canvasId) {
      if (this.annotations.has(canvasId)) {
        return this.annotations.get(canvasId).slice(0, limit);
      }
      return [];
    }
    const all = [];
    for (const list of this.annotations.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  getLastAnnotation(canvasId = null) {
    const list = this.getAnnotations(canvasId, 1);
    return list.length > 0 ? list[0] : null;
  }

  clearAnnotations(canvasId = null) {
    if (canvasId) {
      this.annotations.delete(canvasId);
    } else {
      this.annotations.clear();
    }
  }

  clear() {
    this.sessions.clear();
    this.inspections.clear();
    this.logs.clear();
    this.annotations.clear();
    this.snapshots.clear();
    this.lastInspection = null;
  }
}

