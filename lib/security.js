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
 * Check if an IP address belongs to RFC1918 private LAN ranges or IPv6 equivalent.
 */
export function isPrivateLanAddress(ip) {
  if (!ip || typeof ip !== 'string') return false;
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '');
  const ipv4 = addr.startsWith('::ffff:') ? addr.slice(7) : addr;
  return (
    ipv4.startsWith('192.168.') ||
    ipv4.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipv4)
  );
}

/**
 * Validates whether a Host header specifies a trusted local or LAN address,
 * preventing DNS-rebinding attacks.
 */
export function isTrustedHost(host) {
  if (!host || typeof host !== 'string') return false;
  let hostname = host.trim();
  if (hostname.startsWith('[')) {
    const end = hostname.indexOf(']');
    if (end > 0) hostname = hostname.slice(1, end);
  } else {
    hostname = hostname.split(':')[0];
  }
  hostname = hostname.toLowerCase();
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname.endsWith('.local')) return true;
  if (isLoopbackAddress(hostname) || isPrivateLanAddress(hostname)) return true;
  return false;
}

/**
 * Extract client IP from socket, connection, or request info.
 */
export function getClientIp(req) {
  return (
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress ||
    req?.info?.remoteAddress ||
    ''
  );
}

/**
 * Evaluates whether an incoming HTTP request is trusted and authenticated.
 * Fixes:
 * - #156: Strict fail-closed when remoteAddress cannot be determined from socket/connection.
 * - #199: Accepts private LAN requests from dsh-lanmode while verifying origin/host parity.
 * - #215: Enforces DSH connection service authentication on LAN clients; rejects unauthenticated
 *         LAN callers attempting to bypass guards by omitting Origin header.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {{ connection?: { requestRejection?: (req: any) => number | undefined }, requireAuth?: boolean }} [options]
 * @returns {number|undefined} Rejection HTTP status code (401, 403), or undefined if allowed.
 */
export function getRejectionStatus(req, options = {}) {
  // 1. Authoritative DSH connection service check (#215)
  const connection = options?.connection;
  if (connection && typeof connection.requestRejection === 'function') {
    try {
      const rejection = connection.requestRejection(req);
      if (rejection !== undefined && rejection !== null && rejection !== false) {
        if (typeof rejection === 'number' && Number.isInteger(rejection) && rejection >= 400 && rejection < 600) {
          return rejection;
        }
        return rejection === 401 ? 401 : 403;
      }
    } catch {
      return 403;
    }
  }

  // 2. Explicit DSH token verification if configured in environment
  const expectedToken = process.env.DSH_AUTH_TOKEN || process.env.DSH_TOKEN;
  const rawAuth = req?.headers?.['authorization'] || req?.headers?.['x-dsh-auth'];
  let hasValidToken = false;
  if (expectedToken && typeof rawAuth === 'string') {
    const token = rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : rawAuth.trim();
    if (token && token === expectedToken) {
      hasValidToken = true;
    }
  }

  // 3. Network boundary validation
  const remoteAddress = getClientIp(req);
  const hasSocket = !!(req?.socket || req?.connection);

  if (hasSocket) {
    if (!remoteAddress) {
      // Fail closed on missing/empty socket address (#156)
      return 403;
    }
    const isLoopback = isLoopbackAddress(remoteAddress);
    const isLan = isPrivateLanAddress(remoteAddress);
    if (!isLoopback && !isLan) {
      // WAN / public remote caller is strictly forbidden
      return 403;
    }

    if (isLan) {
      // Unauthenticated LAN callers cannot access protected endpoints (#215)
      // Absence of Origin is NOT trust: non-browser clients must be authenticated
      const isPeerAuthenticated =
        (connection && typeof connection.requestRejection === 'function' && connection.requestRejection(req) === undefined) ||
        hasValidToken;

      const origin = req?.headers?.origin;
      if (!origin) {
        // LAN caller without Origin header requires peer authentication
        if (!isPeerAuthenticated) {
          return options?.requireAuth ? 401 : 403;
        }
      } else {
        // LAN caller with Origin: if connection service is available, it must be admitted
        if (connection && typeof connection.requestRejection === 'function' && !isPeerAuthenticated) {
          return 401;
        }
        if (options?.requireAuth && !isPeerAuthenticated) {
          return 401;
        }
      }
    }
  } else {
    // Synthetic mock request without socket: check host header for loopback
    const hostHeader = req?.headers?.host;
    if (hostHeader) {
      const hostname = hostHeader.split(':')[0].toLowerCase();
      if (!isLoopbackAddress(hostname) && hostname !== 'localhost') {
        return 403;
      }
    } else if (!connection) {
      return 403;
    }
  }

  // 4. Strict rejection of cross-site requests
  const secFetchSite = req?.headers?.['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    return 403;
  }

  // 5. Origin and Host verification if present
  const hostHeader = req?.headers?.host;
  const origin = req?.headers?.origin;

  if (origin !== undefined) {
    if (origin === 'null' || !origin) return 403;
    if (!hostHeader) return 403;
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== hostHeader) return 403;
      const hostname = originUrl.hostname.toLowerCase();
      if (!isLoopbackAddress(hostname) && !isPrivateLanAddress(hostname) && hostname !== 'localhost') {
        return 403;
      }
    } catch {
      return 403;
    }
  }

  return undefined;
}

/**
 * Evaluates whether an incoming HTTP write/mutating request is safe for execution.
 * Fixes:
 * - #215: Strict write guard requiring peer authentication for any non-loopback write.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {{ connection?: { requestRejection?: (req: any) => number | undefined } }} [options]
 * @returns {number|undefined} Rejection HTTP status code (401, 403), or undefined if allowed.
 */
export function getWriteRejectionStatus(req, options = {}) {
  // 1. Must satisfy all base rejection checks with requireAuth = true
  const baseStatus = getRejectionStatus(req, { ...options, requireAuth: true });
  if (baseStatus !== undefined) {
    return baseStatus;
  }

  const connection = options?.connection;
  const remoteAddress = getClientIp(req);
  const isLoopback = remoteAddress ? isLoopbackAddress(remoteAddress) : false;

  // 2. Strict write checks for remote/LAN callers
  if (!isLoopback) {
    const isPeerAuthenticated = (connection && typeof connection.requestRejection === 'function' && connection.requestRejection(req) === undefined);
    const expectedToken = process.env.DSH_AUTH_TOKEN || process.env.DSH_TOKEN;
    const rawAuth = req?.headers?.['authorization'] || req?.headers?.['x-dsh-auth'];
    const token = typeof rawAuth === 'string' ? (rawAuth.startsWith('Bearer ') ? rawAuth.slice(7).trim() : rawAuth.trim()) : '';
    const hasValidToken = expectedToken && token === expectedToken;

    if (!isPeerAuthenticated && !hasValidToken) {
      return 401;
    }
  }

  // 3. Sec-Fetch-Site for writes must not be cross-site or same-site with untrusted origin
  const secFetchSite = req?.headers?.['sec-fetch-site'];
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return 403;
  }

  // 4. Origin & Host parity
  const hostHeader = req?.headers?.host;
  const origin = req?.headers?.origin;
  if (origin) {
    if (origin === 'null') return 403;
    try {
      const originUrl = new URL(origin);
      if (hostHeader && originUrl.host !== hostHeader) return 403;
    } catch {
      return 403;
    }
  }

  return undefined;
}

/**
 * Check if an incoming HTTP request is trusted (local loopback or authenticated private LAN).
 */
export function isTrustedRequest(req, options = {}) {
  return getRejectionStatus(req, options) === undefined;
}

/**
 * Check if an incoming HTTP write request is trusted.
 */
export function isTrustedWriteRequest(req, options = {}) {
  return getWriteRejectionStatus(req, options) === undefined;
}

/**
 * Helper to write rejection response if untrusted.
 */
export function rejectUntrustedRequest(req, res, options = {}) {
  const status = getRejectionStatus(req, options);
  if (status !== undefined) {
    try {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        ok: false,
        error: {
          code: status === 401 ? 'unauthorized' : 'forbidden',
          message: status === 401 ? 'Unauthorized: authentication required' : 'Forbidden: untrusted origin or network'
        }
      }));
    } catch {
      /* ignore socket errors */
    }
    return true;
  }
  return false;
}

/**
 * Helper to write rejection response if write is untrusted.
 */
export function rejectUntrustedWrite(req, res, options = {}) {
  const status = getWriteRejectionStatus(req, options);
  if (status !== undefined) {
    try {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify({
        ok: false,
        error: {
          code: status === 401 ? 'unauthorized' : 'forbidden',
          message: status === 401 ? 'Unauthorized: authentication required' : 'Forbidden: same-origin or local loopback only'
        }
      }));
    } catch {
      /* ignore socket errors */
    }
    return true;
  }
  return false;
}

/**
 * Safely replaces substring occurrences without regex pattern expansion ($&, $1, etc.)
 * Fixes:
 * - #159: Never expands replacement patterns from user-provided text.
 * - #200: Supports occurrenceIndex (targeting exact DOM element) or replaceAll.
 *
 * @param {string} content - Source file text
 * @param {string} originalText - Substring to locate
 * @param {string} newText - New text to insert literally
 * @param {object} [options] - Replacement options: { occurrenceIndex, replaceAll }
 * @returns {string} Updated content
 */
export function safeReplaceSubstring(content, originalText, newText, options = {}) {
  if (typeof content !== 'string' || typeof originalText !== 'string' || originalText.length === 0) {
    return content;
  }
  const replacement = typeof newText === 'string' ? newText : String(newText ?? '');
  const { occurrenceIndex, replaceAll } = options;

  if (replaceAll) {
    return content.replaceAll(originalText, () => replacement);
  }

  if (occurrenceIndex !== undefined && occurrenceIndex !== null && occurrenceIndex >= 0) {
    let current = 0;
    let searchPos = 0;
    while (true) {
      const idx = content.indexOf(originalText, searchPos);
      if (idx === -1) break;
      if (current === occurrenceIndex) {
        return content.slice(0, idx) + replacement + content.slice(idx + originalText.length);
      }
      current++;
      searchPos = idx + originalText.length;
    }
  }

  const firstIdx = content.indexOf(originalText);
  if (firstIdx === -1) return content;
  return content.slice(0, firstIdx) + replacement + content.slice(firstIdx + originalText.length);
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
