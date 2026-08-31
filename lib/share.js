// dsh-live-canvas: QR Code mobile preview & local network share module.

import os from 'node:os';

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

export function generateSimpleQrSvg(text = '', size = 200) {
  // Generates clean styled SVG placeholder / QR visual container
  const safeText = String(text).replace(/[<>&"]/g, '');
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="12" fill="#18181b" stroke="#3f3f46" stroke-width="2"/>
  <rect x="20" y="20" width="40" height="40" rx="6" fill="none" stroke="#60a5fa" stroke-width="6"/>
  <rect x="28" y="28" width="24" height="24" rx="2" fill="#60a5fa"/>
  <rect x="${size - 60}" y="20" width="40" height="40" rx="6" fill="none" stroke="#60a5fa" stroke-width="6"/>
  <rect x="${size - 52}" y="28" width="24" height="24" rx="2" fill="#60a5fa"/>
  <rect x="20" y="${size - 60}" width="40" height="40" rx="6" fill="none" stroke="#60a5fa" stroke-width="6"/>
  <rect x="28" y="${size - 52}" width="24" height="24" rx="2" fill="#60a5fa"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="16" fill="#38bdf8"/>
  <text x="${size / 2}" y="${size - 24}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">Scan for Mobile Live Preview</text>
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

