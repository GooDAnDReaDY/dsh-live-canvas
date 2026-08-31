// dsh-live-canvas: automatic workspace component scanner and Storybook UI Kit matrix generator.

import fs from 'node:fs';
import path from 'node:path';

export function scanWorkspaceComponents(workspaceDir) {
  if (!workspaceDir || !fs.existsSync(workspaceDir)) return [];

  const found = [];
  const skipDirs = new Set(['node_modules', '.git', '.worktrees', 'dist', 'build', '.next', '.cache']);

  function scan(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      if (ent.isDirectory()) {
        if (!skipDirs.has(ent.name) && !ent.name.startsWith('.')) {
          scan(path.join(dir, ent.name));
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (['.jsx', '.tsx', '.vue'].includes(ext) || (ext === '.js' && /^[A-Z]/.test(ent.name))) {
          const fullPath = path.join(dir, ent.name);
          const relPath = path.relative(workspaceDir, fullPath).replace(/\\/g, '/');
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const nameMatch = ent.name.replace(/\.[^.]+$/, '');
            found.push({
              name: nameMatch,
              filePath: relPath,
              componentType: ext === '.vue' ? 'vue' : 'react',
              content: content.slice(0, 10000)
            });
          } catch {}
        }
      }
    }
  }

  scan(workspaceDir);
  return found;
}

export function buildStorybookMatrixData(components = []) {
  const variants = [];

  for (const comp of components) {
    variants.push({
      name: `${comp.name} (Default)`,
      description: `File: ${comp.filePath}`,
      componentType: comp.componentType,
      content: comp.content,
      filePath: comp.filePath
    });
  }

  return {
    title: 'Workspace Storybook & UI Kit Matrix',
    componentType: 'gallery',
    variants
  };
}

