'use strict';
// OCR 引擎路由：
//   native    —— macOS 系统 Vision（原生、快、中文效果好、无空格问题），经
//                resources/bin/vision-ocr 帮助程序调用（scripts/build-vision-helper.sh 编译）
//   tesseract —— tesseract.js 本地 WASM，跨平台兜底；语言数据自动下载可预打包
//   auto      —— macOS 上有 Vision helper 就用 native，否则 tesseract
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { randomUUID } = require('crypto');
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

// 中文模型健康探针图（resources/probe-zh.png，含真实中文文字）。
// 个别 macOS 版本的中文 Live Text 资产会卡死：任何真正要识别中文的 Vision 请求
// 会无限挂起（空白图测不出来，必须用真文字图）。
let zhVisionHealthy; // undefined = 未探测；true/false = 探测结果（本次会话内缓存）

function probeZhPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'probe-zh.png')
    : path.join(__dirname, '..', '..', 'resources', 'probe-zh.png');
}

function probeChineseVision() {
  if (zhVisionHealthy !== undefined) return Promise.resolve(zhVisionHealthy);
  return new Promise((resolve) => {
    execFile(visionHelperPath(), [probeZhPath(), 'zh-Hans'], { timeout: 4000 }, (err, stdout) => {
      // 健康 = 4 秒内完成且真的认出了中文
      zhVisionHealthy = !err && /截\s*图/.test(String(stdout));
      console.log(
        '[ocr] vision zh probe:',
        zhVisionHealthy ? 'healthy' : 'UNHEALTHY（系统中文模型卡死，中文改走 Tesseract；重启 macOS 通常可恢复）'
      );
      resolve(zhVisionHealthy);
    });
  });
}

function recognizeNative(imageBuffer, langs) {
  const visionLangs = langs
    .split('+')
    .map((l) => VISION_LANG_MAP[l])
    .filter(Boolean);
  const tmp = path.join(app.getPath('temp'), `snaptext-ocr-${randomUUID()}.png`);
  fs.writeFileSync(tmp, imageBuffer, { mode: 0o600 });
  return new Promise((resolve, reject) => {
    execFile(
      visionHelperPath(),
      [tmp, (visionLangs.length ? visionLangs : ['zh-Hans', 'en-US']).join(',')],
      { timeout: 8000, maxBuffer: 10 * 1024 * 1024 },
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
      if (e === 'native') {
        throw new Error('当前平台不支持系统原生引擎（仅 macOS），请切换回 Tesseract');
      }
      return recognizeTesseract(imageBuffer, langs, onProgress);
    }
    // 请求含中文时先探针：系统中文模型卡死则直接走 Tesseract，避免每次卡满超时
    const needsZh = /chi_(sim|tra)/.test(langs);
    if (e === 'auto' && needsZh && !(await probeChineseVision())) {
      return recognizeTesseract(imageBuffer, langs, onProgress);
    }
    try {
      const text = await recognizeNative(imageBuffer, langs);
      if (text || e === 'native') return text;
      // auto 且 Vision 空结果时也交给 Tesseract 兜底（如个别系统模型缺失）
      console.warn('[ocr] vision empty result, falling back to tesseract');
    } catch (err) {
      if (e === 'native') throw err;
      // 系统引擎偶发异常（如系统更新后的模型问题）时自动降级，用户无感
      console.warn('[ocr] vision failed, falling back to tesseract:', err.message);
    }
    return recognizeTesseract(imageBuffer, langs, onProgress);
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
