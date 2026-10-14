'use strict';
// 生成应用图标（纯 Node，无依赖）：用 SDF 画圆角矩形 + 抗锯齿，直接编码 PNG。
//   build/icon.png                    512 彩色应用图标（electron-builder 会自动转 icns/ico）
//   resources/icons/trayTemplate.png  32  黑白模板托盘图标（macOS）
//   resources/icons/icon-32.png       32  彩色托盘图标（Windows）
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function writePNG(file, w, h, pixelAt) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log('wrote', file, `${w}x${h}`, `${png.length} bytes`);
}

// ---------- 几何 ----------
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// 圆角矩形有符号距离（<0 在内部），用于 1px 抗锯齿
function sdRoundBox(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

const cov = (d) => clamp01(0.5 - d);

// 在 512 逻辑坐标里描述图案，按 scale 缩放到目标尺寸
function layout(scale) {
  const S = (v) => v * scale;
  const C = 512 * scale; // 目标画布尺寸
  const shapes = [];
  const m = S(112), L = S(128), t = S(30), r = t / 2;
  // 四角括号（每角横竖两条圆头短臂）
  const corners = [
    [m, m, 1, 1], [C - m, m, -1, 1],
    [m, C - m, 1, -1], [C - m, C - m, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    shapes.push({ cx: cx + dx * (L / 2 - r), cy, hw: L / 2 - r, hh: r, r, color: 'fg' });
    shapes.push({ cx, cy: cy + dy * (L / 2 - r), hw: r, hh: L / 2 - r, r, color: 'fg' });
  }
  // 三条“文字行”，最后一条橙色（点睛）
  const barH = S(30), gap = S(40), total = barH * 3 + gap * 2;
  const y0 = (C - total) / 2 + barH / 2;
  const widths = [S(226), S(168), S(198)];
  widths.forEach((w, i) => {
    shapes.push({
      cx: C / 2, cy: y0 + i * (barH + gap),
      hw: w / 2, hh: barH / 2, r: barH / 2,
      color: i === 2 ? 'accent' : 'fg',
    });
  });
  return { shapes, bgRadius: S(112) };
}

const COLORS = { bg: [47, 111, 237], fg: [255, 255, 255], accent: [255, 169, 77] };

function render(size, { withBg, mono }) {
  const scale = size / 512;
  const { shapes, bgRadius } = layout(scale);
  const half = size / 2;
  return (x, y) => {
    // 从上往下合成：底色 → 白色元素
    let out = [0, 0, 0, 0];
    if (withBg) {
      const a = cov(sdRoundBox(x, y, half, half, half, half, 112 * scale));
      if (a > 0) out = mono ? [0, 0, 0, Math.round(a * 255)] : [...COLORS.bg, Math.round(a * 255)];
    }
    for (const s of shapes) {
      const a = cov(sdRoundBox(x, y, s.cx, s.cy, s.hw, s.hh, s.r));
      if (a <= 0) continue;
      const color = mono ? [0, 0, 0] : s.color === 'accent' ? COLORS.accent : COLORS.fg;
      const na = a + (out[3] / 255) * (1 - a);
      out = [
        Math.round((color[0] * a + out[0] * (out[3] / 255) * (1 - a)) / (na || 1)),
        Math.round((color[1] * a + out[1] * (out[3] / 255) * (1 - a)) / (na || 1)),
        Math.round((color[2] * a + out[2] * (out[3] / 255) * (1 - a)) / (na || 1)),
        Math.round(na * 255),
      ];
    }
    return out;
  };
}

const root = path.join(__dirname, '..');
writePNG(path.join(root, 'build', 'icon.png'), 512, 512, render(512, { withBg: true, mono: false }));
writePNG(path.join(root, 'resources', 'icons', 'trayTemplate.png'), 32, 32, render(32, { withBg: false, mono: true }));
writePNG(path.join(root, 'resources', 'icons', 'icon-32.png'), 32, 32, render(32, { withBg: true, mono: false }));
console.log('done.');
