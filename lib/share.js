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

/**
 * Generates standard ISO/IEC 18004 QR Code matrix for arbitrary string input (Byte Mode, Level L).
 */
export function createQrMatrix(text) {
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  function gmul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  const VERSIONS = [
    null,
    { ver: 1, size: 21, dataBytes: 19, ecBytes: 7, align: [] },
    { ver: 2, size: 25, dataBytes: 34, ecBytes: 10, align: [6, 18] },
    { ver: 3, size: 29, dataBytes: 55, ecBytes: 15, align: [6, 22] },
    { ver: 4, size: 33, dataBytes: 80, ecBytes: 20, align: [6, 26] },
    { ver: 5, size: 37, dataBytes: 108, ecBytes: 26, align: [6, 30] },
    { ver: 6, size: 41, dataBytes: 136, ecBytes: 28, align: [6, 34] }
  ];

  const utf8Bytes = Buffer.from(String(text || ''), 'utf8');
  let chosenVer = null;
  for (let v = 1; v < VERSIONS.length; v++) {
    const neededBytes = 2 + utf8Bytes.length;
    if (neededBytes <= VERSIONS[v].dataBytes) {
      chosenVer = VERSIONS[v];
      break;
    }
  }
  if (!chosenVer) chosenVer = VERSIONS[6];

  const { size, dataBytes, ecBytes, align } = chosenVer;

  const bits = [];
  function pushBits(val, num) {
    for (let i = num - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // Byte mode (0100)
  pushBits(0b0100, 4);
  const charCount = Math.min(utf8Bytes.length, dataBytes - 2);
  pushBits(charCount, 8);
  for (let i = 0; i < charCount; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminator
  const maxDataBits = dataBytes * 8;
  const termLen = Math.min(4, maxDataBits - bits.length);
  pushBits(0, termLen);

  while (bits.length % 8 !== 0) bits.push(0);

  let padToggle = false;
  while (bits.length < maxDataBits) {
    pushBits(padToggle ? 0x11 : 0xec, 8);
    padToggle = !padToggle;
  }

  const dataCodewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCodewords.push(b);
  }

  let genPoly = [1];
  for (let i = 0; i < ecBytes; i++) {
    const factor = EXP[i];
    const res = new Array(genPoly.length + 1).fill(0);
    for (let j = 0; j < genPoly.length; j++) {
      res[j] ^= gmul(genPoly[j], factor);
      res[j + 1] ^= genPoly[j];
    }
    genPoly = res;
  }

  const ecCodewords = new Array(ecBytes).fill(0);
  for (let i = 0; i < dataCodewords.length; i++) {
    const factor = dataCodewords[i] ^ ecCodewords[0];
    ecCodewords.shift();
    ecCodewords.push(0);
    for (let j = 0; j < ecBytes; j++) {
      ecCodewords[j] ^= gmul(genPoly[j], factor);
    }
  }

  const allCodewords = dataCodewords.concat(ecCodewords);

  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r, c, val) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  function addFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBlack = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          setFunction(nr, nc, isBlack ? 1 : 0);
        } else {
          setFunction(nr, nc, 0);
        }
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  if (align.length >= 2) {
    for (const r of align) {
      for (const c of align) {
        if (matrix[r][c] !== null) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0));
            setFunction(r + dr, c + dc, isBlack ? 1 : 0);
          }
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) setFunction(6, i, i % 2 === 0 ? 1 : 0);
    if (matrix[i][6] === null) setFunction(i, 6, i % 2 === 0 ? 1 : 0);
  }

  setFunction(size - 8, 8, 1);

  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) { matrix[8][i] = 0; isFunction[8][i] = true; }
    if (matrix[i][8] === null) { matrix[i][8] = 0; isFunction[i][8] = true; }
  }
  for (let i = 0; i < 8; i++) {
    if (matrix[8][size - 1 - i] === null) { matrix[8][size - 1 - i] = 0; isFunction[8][size - 1 - i] = true; }
    if (matrix[size - 1 - i][8] === null) { matrix[size - 1 - i][8] = 0; isFunction[size - 1 - i][8] = true; }
  }

  const codewordBits = [];
  for (const cw of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      codewordBits.push((cw >> b) & 1);
    }
  }

  let bitIdx = 0;
  let dir = -1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    let row = dir === -1 ? size - 1 : 0;
    while (row >= 0 && row < size) {
      for (let c = col; c >= col - 1; c--) {
        if (!isFunction[row][c]) {
          const bit = bitIdx < codewordBits.length ? codewordBits[bitIdx++] : 0;
          const mask = ((row + c) % 2 === 0) ? 1 : 0;
          matrix[row][c] = bit ^ mask;
        }
      }
      row += dir;
    }
    dir = -dir;
  }

  const formatBits = 0x23d6;
  const fBits = [];
  for (let i = 14; i >= 0; i--) fBits.push((formatBits >> i) & 1);

  const coords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[coords1[i][0]][coords1[i][1]] = fBits[i];
  }

  const coords2 = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[coords2[i][0]][coords2[i][1]] = fBits[i];
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
