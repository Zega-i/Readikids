/**
 * Generator ikon PWA placeholder (192px & 512px) tanpa dependensi —
 * encoder PNG minimal (zlib bawaan Node) + huruf "RK" dari bitmap 5x7.
 *
 * Jalankan: node scripts/generate-icons.mjs
 * Ikon final dari desainer tinggal menimpa public/pwa-icon-*.png.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Indigo-600 (#4F46E5) — selaras UI prototype.
const BG = [79, 70, 229];
const FG = [255, 255, 255];

// Bitmap 5x7 huruf R dan K.
const GLYPHS = {
  R: ['1111.', '1...1', '1...1', '1111.', '1.1..', '1..1.', '1...1'],
  K: ['1...1', '1..1.', '1.1..', '11...', '1.1..', '1..1.', '1...1'],
};

// — CRC32 (spesifikasi PNG) —
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  // pixels: Uint8Array RGB per baris; tiap scanline diawali filter byte 0.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) px.set(BG, i * 3);

  // "RK" di tengah, dalam zona aman maskable (~60% tengah).
  const text = ['R', 'K'];
  const scale = Math.floor(size / 16); // tiap sel bitmap = scale px
  const glyphW = 5 * scale;
  const gap = scale;
  const totalW = text.length * glyphW + (text.length - 1) * gap;
  const x0 = Math.floor((size - totalW) / 2);
  const y0 = Math.floor((size - 7 * scale) / 2);

  text.forEach((ch, gi) => {
    const rows = GLYPHS[ch];
    rows.forEach((row, ry) => {
      for (let rx = 0; rx < 5; rx++) {
        if (row[rx] !== '1') continue;
        const startX = x0 + gi * (glyphW + gap) + rx * scale;
        const startY = y0 + ry * scale;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            px.set(FG, ((startY + dy) * size + startX + dx) * 3);
          }
        }
      }
    });
  });
  return encodePng(size, px);
}

for (const size of [192, 512]) {
  const file = join(OUT_DIR, `pwa-icon-${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log(`✅ ${file}`);
}
