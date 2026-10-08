import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!process.env.DSH_HOME || !process.env.DSH_HOME.includes('dsh-canvas-test-')) {
  const sandboxDir = mkdtempSync(join(tmpdir(), 'dsh-canvas-test-'));
  process.env.DSH_HOME = sandboxDir;

  process.on('exit', () => {
    try {
      if (existsSync(sandboxDir)) {
        rmSync(sandboxDir, { recursive: true, force: true });
      }
    } catch (_err) {
      // non-fatal cleanup
    }
  });
}

export function getTestSandboxDir() {
  return process.env.DSH_HOME;
}
