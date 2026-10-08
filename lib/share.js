// dsh-live-canvas: QR Code mobile preview & local network share module.

import os from 'node:os';
import QRCode from 'qrcode';

export function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Generates standard ISO/IEC 18004 QR Code matrix for arbitrary string input (Byte Mode, Level L).
 */
export function createQrMatrix(text) {
  const qr = QRCode.create(String(text || ''), { errorCorrectionLevel: 'L' });
  const size = qr.modules.size;
  const matrix = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(qr.modules.get(r, c) ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

export function generateSimpleQrSvg(text = '', size = 200) {
  const safeText = String(text || '').replace(/[<>&"]/g, '');
  const matrix = createQrMatrix(text);
  const n = matrix.length;
  const margin = 2;
  const total = n + margin * 2;
  const cellSize = (size - 16) / total;
  const offset = 8 + margin * cellSize;

  let pathData = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 1) {
        const x = (offset + c * cellSize).toFixed(2);
        const y = (offset + r * cellSize).toFixed(2);
        const w = (cellSize + 0.05).toFixed(2);
        pathData += `M${x},${y}h${w}v${w}h-${w}Z `;
      }
    }
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR Code">
  <rect width="${size}" height="${size}" rx="12" fill="#18181b" stroke="#3f3f46" stroke-width="2"/>
  <rect x="8" y="8" width="${size - 16}" height="${size - 16}" rx="8" fill="#ffffff"/>
  <path d="${pathData.trim()}" fill="#09090b"/>
  <title>${safeText}</title>
</svg>
`.trim();
}

export function getShareDetails(canvasId = 'default', options = {}) {
  const host = options.host || getLocalNetworkIp();
  const port = options.port || 3080;
  const proto = options.protocol || 'https';
  const url = `${proto}://${host}:${port}/dsh-live-canvas/sandbox/${canvasId}`;
  const qrSvg = generateSimpleQrSvg(url);

  return {
    canvasId,
    previewUrl: url,
    localIp: host,
    port,
    qrSvg
  };
}
