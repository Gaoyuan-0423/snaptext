'use strict';
// 预下载 Tesseract 语言数据到 resources/tessdata/，实现完全离线的 OCR。
// 用法：npm run fetch:tessdata            （下载默认语言 chi_sim + eng）
//       npm run fetch:tessdata -- jpn kor （自定义语言列表）
// 说明：不预下载也能用 —— 首次识别时会自动下载并缓存到 userData。
const fs = require('fs');
const path = require('path');
const https = require('https');

const langs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['chi_sim', 'eng'];

const OUT_DIR = path.join(__dirname, '..', 'resources', 'tessdata');
const MIRRORS = [
  'https://tessdata.projectnaptha.com/4.0.0_fast',
  'https://tessdata.projectnaptha.com/4.0.0',
];

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    https
      .get(url, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          return resolve(download(new URL(res.headers.location, url).href, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const lang of langs) {
    const file = path.join(OUT_DIR, `${lang}.traineddata.gz`);
    if (fs.existsSync(file) && fs.statSync(file).size > 1000) {
      console.log(`✓ ${lang} 已存在，跳过`);
      continue;
    }
    let done = false;
    for (const base of MIRRORS) {
      try {
        process.stdout.write(`下载 ${lang} (${base}) … `);
        const buf = await download(`${base}/${lang}.traineddata.gz`);
        fs.writeFileSync(file, buf);
        console.log(`完成，${(buf.length / 1024 / 1024).toFixed(1)} MB`);
        done = true;
        break;
      } catch (err) {
        console.log(`失败：${err.message}`);
      }
    }
    if (!done) {
      failed++;
      console.error(`✗ ${lang} 所有镜像均失败`);
    }
  }
  if (failed) process.exit(1);
  console.log('语言数据就绪，打包时可完全离线运行。');
})();
