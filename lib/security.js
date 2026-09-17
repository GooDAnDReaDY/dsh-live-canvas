import fs from 'node:fs';
import path from 'node:path';

/**
 * Check if an IP address is loopback / localhost.
 */
export function isLoopbackAddress(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1' || addr === 'localhost' || addr === 'localhost.') {
    return true;
  }
  if (addr.startsWith('127.') || addr.startsWith('::ffff:127.')) {
    return true;
  }
  return false;
}

/**
 * Check if an incoming HTTP request is trusted (local loopback or same-origin matching host).
 * Modelled on dsh-key-rotation isTrustedBridgeRequest and dsh-issue-reporter isTrustedUpdateRequest.
 */
export function isTrustedRequest(req) {
  const remoteAddress = req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? (req?.socket === undefined ? '127.0.0.1' : undefined);
  if (!isLoopbackAddress(remoteAddress)) return false;

  const origin = req?.headers?.origin;
  if (!origin) {
    // Same-origin navigation or local non-browser tool call from loopback
    return true;
  }

  if (req?.headers?.['sec-fetch-site'] === 'cross-site') {
    return false;
  }

  const hostHeader = req?.headers?.host;
  if (!hostHeader) return false;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== hostHeader) return false;
    return isLoopbackAddress(originUrl.hostname) || originUrl.hostname === 'localhost';
  } catch {
    return false;
  }
}

/**
 * Validates and safely resolves a file path against an allowlist of workspace roots.
 * Guards against:
 * 1. Directory traversal attacks (.. sequences).
 * 2. Absolute path escape outside allowed roots.
 * 3. Symlink target escape outside allowed roots (via realpath).
 *
 * @param {string} targetPath - Relative or absolute path requested.
 * @param {string|string[]} allowedRoots - Allowed workspace root directory or list of roots.
 * @returns {string} Fully resolved absolute path within an allowed root.
 */
export function resolveSafePath(targetPath, allowedRoots) {
  if (!targetPath || typeof targetPath !== 'string') {
    const err = new Error('Path is required and must be a non-empty string');
    err.code = 'ERR_INVALID_PATH';
    throw err;
  }

  const rawRoots = Array.isArray(allowedRoots) ? allowedRoots : [allowedRoots];
  const roots = rawRoots.filter(Boolean).map(r => path.resolve(r));
  if (roots.length === 0) {
    roots.push(process.cwd());
  }

  let resolved = null;
  let matchedRoot = null;

  if (path.isAbsolute(targetPath)) {
    const candidate = path.resolve(targetPath);
    matchedRoot = roots.find(root => {
      const rel = path.relative(root, candidate);
      return !rel.startsWith('..') && !path.isAbsolute(rel);
    });
    if (matchedRoot) {
      resolved = candidate;
    }
  } else {
    for (const root of roots) {
      const candidate = path.resolve(root, targetPath);
      const rel = path.relative(root, candidate);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        resolved = candidate;
        matchedRoot = root;
        break;
      }
    }
  }

  if (!matchedRoot || !resolved) {
    const err = new Error(`Security Violation: Path traversal or unauthorized access outside base workspace roots: ${targetPath}`);
    err.code = 'ERR_PATH_OUTSIDE_ROOTS';
    err.allowedRoots = roots;
    err.targetPath = targetPath;
    throw err;
  }

  // If the file or link exists on disk, verify symlink resolution does not escape allowed roots
  if (fs.existsSync(resolved)) {
    try {
      const realTarget = fs.realpathSync(resolved);
      const realMatched = roots.some(root => {
        const realRoot = fs.existsSync(root) ? fs.realpathSync(root) : root;
        const rel = path.relative(realRoot, realTarget);
        return !rel.startsWith('..') && !path.isAbsolute(rel);
      });

      if (!realMatched) {
        const err = new Error(`Security Violation: Symlink target '${realTarget}' escapes allowed workspace roots for path '${targetPath}'`);
        err.code = 'ERR_SYMLINK_ESCAPE';
        err.allowedRoots = roots;
        err.targetPath = targetPath;
        throw err;
      }
    } catch (e) {
      if (e.code === 'ERR_SYMLINK_ESCAPE') throw e;
      const err = new Error(`Security Violation: Unable to safely verify realpath for '${targetPath}': ${e.message}`);
      err.code = 'ERR_SYMLINK_ESCAPE';
      err.allowedRoots = roots;
      err.targetPath = targetPath;
      throw err;
    }
  }

  return resolved;
}

/**
 * Backward-compatible sanitizePath delegating to resolveSafePath.
 */
export function sanitizePath(baseDir, targetRelativePath) {
  if (!targetRelativePath) return path.resolve(baseDir);
  return resolveSafePath(targetRelativePath, [baseDir]);
}
