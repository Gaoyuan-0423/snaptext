'use strict';
// 本地 OCR：Tesseract（tesseract.js），完全离线、免费、无密钥。
// 语言数据查找顺序：
//   1. 打包/资源目录 resources/tessdata（`npm run fetch:tessdata` 预下载，可完全离线）
//   2. userData/tessdata 缓存（首次使用时自动从 CDN 下载一次并缓存）
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { createWorker } = require('tesseract.js');

let worker = null;
let workerLangs = '';

function langDataDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'tessdata')
    : path.join(__dirname, '..', '..', 'resources', 'tessdata');
}

function cacheDir() {
  return path.join(app.getPath('userData'), 'tessdata');
}

function langFilesPresent(langs) {
  const dir = langDataDir();
  if (!fs.existsSync(dir)) return false;
  return langs.split('+').every((l) => {
    const gz = path.join(dir, `${l}.traineddata.gz`);
    const raw = path.join(dir, `${l}.traineddata`);
    return fs.existsSync(gz) || fs.existsSync(raw);
  });
}

async function ensureWorker(langs, onProgress) {
  if (worker && workerLangs === langs) return worker;
  if (worker) {
    const old = worker;
    worker = null; // 防止并发重建时重复 terminate
    await old.terminate();
  }
  const options = {
    cachePath: cacheDir(),
    gzip: true,
    logger: (m) => {
      if (onProgress) onProgress(m);
    },
  };
  // 仅当所有语言都能从本地目录读到时才指向本地，否则走默认 CDN + 本地缓存
  if (langFilesPresent(langs)) options.langPath = langDataDir();

  worker = await createWorker(langs, 1, options);
  workerLangs = langs;
  return worker;
}

async function recognizeBuffer(imageBuffer, langs, onProgress) {
  const w = await ensureWorker(langs, onProgress);
  const { data } = await w.recognize(imageBuffer);
  return data.text || '';
}

async function terminate() {
  if (worker) {
    const old = worker;
    worker = null;
    workerLangs = '';
    await old.terminate();
  }
}

module.exports = { recognizeBuffer, terminate };
