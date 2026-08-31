// dsh-live-canvas: real-time workspace file watcher and explorer for auto-syncing live preview on code edits.
import fs from 'node:fs';
import path from 'node:path';
import { autoDetectType } from './transpiler.js';
import { sanitizePath } from './sandbox.js';

const PREVIEWABLE_EXTS = new Set(['.html', '.htm', '.jsx', '.tsx', '.svg', '.mermaid', '.mmd', '.md', '.vue', '.css']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.worktrees', '.agents', '.dsh', '.next', '.cache', '.system_generated', 'target', '.vscode', '.idea']);

export class WorkspaceWatcher {
  constructor(store, eventHub, options = {}) {
    this.store = store;
    this.eventHub = eventHub;
    this.workspaceDir = options.workspaceDir || process.cwd();
    this.debounceMs = options.debounceMs || 150;
    this.watchers = new Map(); // canvasId -> { watcher, filePath, absPath, clearTimer }
  }

  listWorkspaceFiles(subDir = '', maxDepth = 5) {
    const results = [];
    const base = this.workspaceDir;

    function walk(currentDir, currentRel, depth) {
      if (depth > maxDepth) return;
      let entries = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.') {
          if (IGNORED_DIRS.has(entry.name)) continue;
        }
        if (IGNORED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);
        const relPath = currentRel ? path.join(currentRel, entry.name).replace(/\\/g, '/') : entry.name;

        if (entry.isDirectory()) {
          walk(fullPath, relPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (PREVIEWABLE_EXTS.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              results.push({
                path: relPath,
                name: entry.name,
                ext,
                size: stat.size,
                mtime: stat.mtime.toISOString(),
                type: autoDetectType('', relPath)
              });
            } catch {}
          }
        }
      }
    }

    try {
      const targetDir = subDir ? sanitizePath(base, subDir) : base;
      walk(targetDir, subDir.replace(/\\/g, '/'), 0);
    } catch (err) {
      console.warn('[WorkspaceWatcher] Error listing workspace files:', err);
    }

    return results.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
  }

  openWorkspaceFile(relativePath) {
    if (!relativePath) throw new Error('relativePath is required');
    const absPath = sanitizePath(this.workspaceDir, relativePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${relativePath}`);
    }

    const content = fs.readFileSync(absPath, 'utf8');
    const compType = autoDetectType(content, relativePath);
    const title = path.basename(relativePath);

    // Look for existing session with same filePath or create new
    let session = this.store.listSessions().find(s => s.filePath === relativePath || s.filePath === absPath);
    if (!session) {
      session = this.store.createOrUpdateSession({
        title,
        content,
        filePath: relativePath,
        componentType: compType
      });
    } else {
      session = this.store.createOrUpdateSession({
        id: session.id,
        title,
        content,
        filePath: relativePath,
        componentType: compType
      });
    }

    this.watchFile(session.id, relativePath);
    this.eventHub.broadcast('update', {
      canvasId: session.id,
      filePath: relativePath,
      updatedAt: session.updatedAt,
      source: 'open_file'
    });

    return session;
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

