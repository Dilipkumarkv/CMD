import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createTerminalIconPng(size) {
  // RGBA buffer: size * (1 + size * 4) bytes
  const rawData = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;

  const bgR = 12, bgG = 36, bgB = 86; // #0c2456 dark navy terminal
  const borderR = 14, borderG = 165, borderB = 233; // #0ea5e9 sky cyan
  const promptR = 56, promptG = 189, promptB = 248; // #38bdf8 sky-400
  const cursorR = 34, cursorG = 197, cursorB = 94; // #22c55e emerald

  const cornerRadius = size * 0.18;
  const padding = size * 0.12;

  for (let y = 0; y < size; y++) {
    rawData[offset++] = 0; // Filter byte: 0 (None)

    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Rounded rect boundary check
      let inCard = false;
      let dx = 0, dy = 0;
      if (x < cornerRadius) dx = cornerRadius - x;
      else if (x > size - 1 - cornerRadius) dx = x - (size - 1 - cornerRadius);
      if (y < cornerRadius) dy = cornerRadius - y;
      else if (y > size - 1 - cornerRadius) dy = y - (size - 1 - cornerRadius);

      if (dx * dx + dy * dy <= cornerRadius * cornerRadius || (dx === 0 || dy === 0)) {
        inCard = true;
      }

      if (inCard) {
        // Base dark navy terminal color
        r = bgR;
        g = bgG;
        b = bgB;
        a = 255;

        // Subtle gradient towards bottom
        const grad = Math.floor((y / size) * 30);
        r = Math.max(8, r - grad);
        g = Math.max(20, g - grad);
        b = Math.max(50, b - grad);

        // Border
        const isBorder = (
          x < 4 || x >= size - 4 || y < 4 || y >= size - 4 ||
          (dx > 0 && dy > 0 && Math.abs(Math.sqrt(dx * dx + dy * dy) - cornerRadius) < 4)
        );
        if (isBorder) {
          r = borderR;
          g = borderG;
          b = borderB;
        }

        // Top bar title / window dots
        const topBarHeight = size * 0.22;
        if (y < topBarHeight) {
          r = Math.floor(r * 0.7);
          g = Math.floor(g * 0.7);
          b = Math.floor(b * 0.7);

          // 3 small dots
          const dotY = topBarHeight * 0.5;
          const dotRadius = size * 0.035;
          const d1X = size * 0.18;
          const d2X = size * 0.28;
          const d3X = size * 0.38;

          const dist1 = Math.hypot(x - d1X, y - dotY);
          const dist2 = Math.hypot(x - d2X, y - dotY);
          const dist3 = Math.hypot(x - d3X, y - dotY);

          if (dist1 <= dotRadius) { r = 239; g = 68; b = 68; } // Red dot
          else if (dist2 <= dotRadius) { r = 245; g = 158; b = 11; } // Amber dot
          else if (dist3 <= dotRadius) { r = 34; g = 197; b = 94; } // Green dot
        }

        // Draw '>' chevron prompt symbol in center
        // Chevron vertices: (x1, y1) -> (x2, y2) -> (x3, y3)
        const chevX1 = size * 0.24;
        const chevY1 = size * 0.38;
        const chevX2 = size * 0.44;
        const chevY2 = size * 0.56;
        const chevY3 = size * 0.74;
        const thick = size * 0.055;

        // Top leg of chevron
        if (y >= chevY1 && y <= chevY2) {
          const targetX = chevX1 + ((y - chevY1) / (chevY2 - chevY1)) * (chevX2 - chevX1);
          if (Math.abs(x - targetX) < thick) {
            r = promptR; g = promptG; b = promptB;
          }
        }
        // Bottom leg of chevron
        if (y >= chevY2 && y <= chevY3) {
          const targetX = chevX2 - ((y - chevY2) / (chevY3 - chevY2)) * (chevX2 - chevX1);
          if (Math.abs(x - targetX) < thick) {
            r = promptR; g = promptG; b = promptB;
          }
        }

        // Draw '_' underscore cursor
        const cursorX1 = size * 0.52;
        const cursorX2 = size * 0.78;
        const cursorY = size * 0.70;
        const cursorH = size * 0.06;

        if (x >= cursorX1 && x <= cursorX2 && y >= cursorY && y <= cursorY + cursorH) {
          r = cursorR; g = cursorG; b = cursorB;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // ColorType: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

// Generate icons
const icon192 = createTerminalIconPng(192);
const icon512 = createTerminalIconPng(512);
const appleIcon = createTerminalIconPng(180);

fs.writeFileSync('public/pwa-192x192.png', icon192);
fs.writeFileSync('public/pwa-512x512.png', icon512);
fs.writeFileSync('public/pwa-maskable-512x512.png', icon512);
fs.writeFileSync('public/apple-touch-icon.png', appleIcon);
console.log('Successfully generated PNG icons in /public');
