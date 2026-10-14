'use strict';
// OCR 引擎路由：
//   native    —— macOS 系统 Vision（原生、快、中文效果好、无空格问题），经
//                resources/bin/vision-ocr 帮助程序调用（scripts/build-vision-helper.sh 编译）
//   tesseract —— tesseract.js 本地 WASM，跨平台兜底；语言数据自动下载可预打包
//   auto      —— macOS 上有 Vision helper 就用 native，否则 tesseract
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { app } = require('electron');
const { createWorker } = require('tesseract.js');

// Tesseract 语言代码 → Vision 语言代码
const VISION_LANG_MAP = {
  chi_sim: 'zh-Hans',
  chi_tra: 'zh-Hant',
  eng: 'en-US',
  jpn: 'ja-JP',
  kor: 'ko-KR',
};

function visionHelperPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'bin', 'vision-ocr');
  }
  return path.join(__dirname, '..', '..', 'resources', 'bin', 'vision-ocr');
}

function visionAvailable() {
  return process.platform === 'darwin' && fs.existsSync(visionHelperPath());
}

// ---------- 引擎一：macOS Vision ----------

function recognizeNative(imageBuffer, langs) {
  const visionLangs = langs
    .split('+')
    .map((l) => VISION_LANG_MAP[l])
    .filter(Boolean);
  const tmp = path.join(app.getPath('temp'), `snaptext-ocr-${Date.now()}.png`);
  fs.writeFileSync(tmp, imageBuffer);
  return new Promise((resolve, reject) => {
    execFile(
      visionHelperPath(),
      [tmp, (visionLangs.length ? visionLangs : ['zh-Hans', 'en-US']).join(',')],
      { timeout: 15000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        fs.unlink(tmp, () => {});
        if (err) {
          reject(new Error('Vision 引擎失败：' + (stderr || err.message).trim()));
        } else {
          resolve(String(stdout).trim());
        }
      }
    );
  });
}

// ---------- 引擎二：Tesseract ----------

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
    return (
      fs.existsSync(path.join(dir, `${l}.traineddata.gz`)) ||
      fs.existsSync(path.join(dir, `${l}.traineddata`))
    );
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
  if (langFilesPresent(langs)) options.langPath = langDataDir();

  worker = await createWorker(langs, 1, options);
  workerLangs = langs;
  return worker;
}

async function recognizeTesseract(imageBuffer, langs, onProgress) {
  const w = await ensureWorker(langs, onProgress);
  const { data } = await w.recognize(imageBuffer);
  return data.text || '';
}

// ---------- 统一入口 ----------

async function recognizeBuffer(imageBuffer, langs, engine, onProgress) {
  const e = engine || 'auto';
  if (e === 'native' || (e === 'auto' && visionAvailable())) {
    if (!visionAvailable()) {
      throw new Error('当前平台不支持系统原生引擎（仅 macOS），请切换回 Tesseract');
    }
    return recognizeNative(imageBuffer, langs);
  }
  return recognizeTesseract(imageBuffer, langs, onProgress);
}

async function terminate() {
  if (worker) {
    const old = worker;
    worker = null;
    workerLangs = '';
    await old.terminate();
  }
}

module.exports = { recognizeBuffer, terminate, visionAvailable };
