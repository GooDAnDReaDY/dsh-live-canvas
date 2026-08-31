// dsh-live-canvas: real-time workspace file watcher for auto-syncing live preview on code edits.
import fs from 'node:fs';
import path from 'node:path';
import { autoDetectType } from './transpiler.js';
import { sanitizePath } from './sandbox.js';

export class WorkspaceWatcher {
  constructor(store, eventHub, options = {}) {
    this.store = store;
    this.eventHub = eventHub;
    this.workspaceDir = options.workspaceDir || process.cwd();
    this.debounceMs = options.debounceMs || 150;
    this.watchers = new Map(); // canvasId -> { watcher, filePath, absPath, clearTimer }
  }

  watchFile(canvasId, relativePath) {
    if (!canvasId || !relativePath) return false;
    this.unwatch(canvasId);

    let absPath;
    try {
      absPath = sanitizePath(this.workspaceDir, relativePath);
    } catch {
      return false;
    }

    if (!fs.existsSync(absPath)) return false;

    let debounceTimer = null;
    const onChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          if (fs.existsSync(absPath)) {
            const content = fs.readFileSync(absPath, 'utf8');
            const compType = autoDetectType(content, relativePath);
            const session = this.store.createOrUpdateSession({
              id: canvasId,
              content,
              filePath: relativePath,
              componentType: compType
            });
            this.eventHub.broadcast('update', {
              canvasId: session.id,
              filePath: relativePath,
              updatedAt: session.updatedAt,
              source: 'file_watcher'
            });
          }
        } catch (err) {
          console.warn('[WorkspaceWatcher] Error updating session on file change:', err);
        }
      }, this.debounceMs);
    };

    try {
      const watcher = fs.watch(absPath, onChange);
      this.watchers.set(canvasId, {
        watcher,
        filePath: relativePath,
        absPath,
        clearTimer: () => { if (debounceTimer) clearTimeout(debounceTimer); }
      });
      return true;
    } catch (err) {
      console.warn('[WorkspaceWatcher] Failed to start watcher:', err);
      return false;
    }
  }

  unwatch(canvasId) {
    if (this.watchers.has(canvasId)) {
      const entry = this.watchers.get(canvasId);
      entry.clearTimer();
      try {
        entry.watcher.close();
      } catch {}
      this.watchers.delete(canvasId);
      return true;
    }
    return false;
  }

  getWatchStatus(canvasId = null) {
    if (canvasId) {
      const entry = this.watchers.get(canvasId);
      return entry ? { active: true, canvasId, filePath: entry.filePath } : { active: false, canvasId };
    }
    const list = [];
    for (const [cId, entry] of this.watchers.entries()) {
      list.push({ canvasId: cId, filePath: entry.filePath });
    }
    return { count: list.length, watchers: list };
  }

  closeAll() {
    for (const [cId] of this.watchers.entries()) {
      this.unwatch(cId);
    }
  }
}