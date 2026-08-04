/**
 * Icon Generation Script for ResultBoard
 *
 * Generates PNG icons at 16, 32, 48, and 128px from the brand design.
 * Uses only Node.js built-in APIs (no external dependencies like sharp/canvas).
 *
 * The icon design:
 * - Rounded square background with indigo-to-violet gradient (135deg, #6366f1 to #8b5cf6)
 * - 4 white rounded rectangles in 2x2 grid at varying opacities (0.9, 0.7, 0.55, 0.4)
 *
 * Run: npx tsx scripts/generate-icons.ts
 * Alt: node --experimental-strip-types scripts/generate-icons.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';
import { join } from 'path';

// Brand colors
const INDIGO = { r: 99, g: 102, b: 241 };
const VIOLET = { r: 139, g: 92, b: 246 };

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function gradientColor(x: number, y: number, size: number): Color {
  // 135-degree gradient: top-left is start, bottom-right is end
  const t = (x / size + y / size) / 2;
  return {
    r: Math.round(lerp(INDIGO.r, VIOLET.r, t)),
    g: Math.round(lerp(INDIGO.g, VIOLET.g, t)),
    b: Math.round(lerp(INDIGO.b, VIOLET.b, t)),
    a: 255,
  };
}

function isInsideRoundedRect(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): boolean {
  // Check if point (px, py) is inside a rounded rectangle
  const rx = Math.max(0, Math.min(r, w / 2));
  const ry = Math.max(0, Math.min(r, h / 2));

  // Check if outside bounding box
  if (px < x || px >= x + w || py < y || py >= y + h) return false;

  // Check corners
  const corners = [
    { cx: x + rx, cy: y + ry }, // top-left
    { cx: x + w - rx, cy: y + ry }, // top-right
    { cx: x + rx, cy: y + h - ry }, // bottom-left
    { cx: x + w - rx, cy: y + h - ry }, // bottom-right
  ];

  for (const corner of corners) {
    const inCornerRegion =
      (px < x + rx && py < y + ry && corner === corners[0]) ||
      (px >= x + w - rx && py < y + ry && corner === corners[1]) ||
      (px < x + rx && py >= y + h - ry && corner === corners[2]) ||
      (px >= x + w - rx && py >= y + h - ry && corner === corners[3]);

    if (inCornerRegion) {
      const dx = (px - corner.cx) / rx;
      const dy = (py - corner.cy) / ry;
      if (dx * dx + dy * dy > 1) return false;
    }
  }

  return true;
}

function antialiasedCoverage(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  samples: number = 4
): number {
  let inside = 0;
  const total = samples * samples;
  for (let sy = 0; sy < samples; sy++) {
    for (let sx = 0; sx < samples; sx++) {
      const spx = px + (sx + 0.5) / samples;
      const spy = py + (sy + 0.5) / samples;
      if (isInsideRoundedRect(spx, spy, x, y, w, h, r)) {
        inside++;
      }
    }
  }
  return inside / total;
}

function renderIcon(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);

  // Design parameters scaled to size
  const bgRadius = size * 0.1875; // 24/128

  // Grid squares
  const squareSize = size * 0.265625; // 34/128
  const squareRadius = size * 0.046875; // 6/128
  const offset1 = size * 0.1875; // 24/128
  const offset2 = size * 0.546875; // 70/128

  const squares = [
    { x: offset1, y: offset1, opacity: 0.9 },
    { x: offset2, y: offset1, opacity: 0.7 },
    { x: offset1, y: offset2, opacity: 0.55 },
    { x: offset2, y: offset2, opacity: 0.4 },
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check if pixel is inside the background rounded rect
      const bgCoverage = antialiasedCoverage(x, y, 0, 0, size, size, bgRadius);

      if (bgCoverage === 0) {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // Get gradient color at this pixel
      const bg = gradientColor(x, y, size);

      // Check each white square
      let finalR = bg.r;
      let finalG = bg.g;
      let finalB = bg.b;

      for (const sq of squares) {
        const sqCoverage = antialiasedCoverage(
          x,
          y,
          sq.x,
          sq.y,
          squareSize,
          squareSize,
          squareRadius
        );
        if (sqCoverage > 0) {
          const alpha = sq.opacity * sqCoverage;
          finalR = Math.round(lerp(finalR, 255, alpha));
          finalG = Math.round(lerp(finalG, 255, alpha));
          finalB = Math.round(lerp(finalB, 255, alpha));
        }
      }

      pixels[idx] = finalR;
      pixels[idx + 1] = finalG;
      pixels[idx + 2] = finalB;
      pixels[idx + 3] = Math.round(bgCoverage * 255);
    }
  }

  return pixels;
}

function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  // Create PNG file with proper encoding
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Create raw image data with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // No filter
    rgba.copy(rawData, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  // Compress with deflate
  const compressed = deflateSync(rawData, { level: 9 });

  // Build chunks
  const chunks: Buffer[] = [signature];

  // Helper to create a chunk
  function createChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
  }

  chunks.push(createChunk('IHDR', ihdr));
  chunks.push(createChunk('IDAT', compressed));
  chunks.push(createChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

// CRC32 implementation for PNG
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Main
const sizes = [16, 32, 48, 128];
const outputDir = join(process.cwd(), 'public', 'icon');

mkdirSync(outputDir, { recursive: true });

for (const size of sizes) {
  console.log(`Generating ${size}x${size} icon...`);
  const pixels = renderIcon(size);
  const png = encodePNG(size, size, pixels);
  const outPath = join(outputDir, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`  Written: ${outPath} (${png.length} bytes)`);
}

console.log('\nAll icons generated successfully.');
