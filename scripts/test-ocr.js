'use strict';
// 无头 OCR 自测：不截图，用离屏 canvas 画一张含中英文的图，
// 分别走 Tesseract 与系统 Vision 两条管道（Vision 可用时）。
// 运行：npm run test:ocr   （预期每个引擎输出 PASS，退出码 0）
const { app, BrowserWindow } = require('electron');

const ocr = require('../src/main/ocr');

const CANVAS_JS = `(() => {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 800, 160);
  x.fillStyle = '#000000'; x.font = '48px sans-serif';
  x.fillText('Hello SnapText 12345', 20, 70);
  x.fillText('截图识字无空格测试', 20, 140);
  return c.toDataURL('image/png');
})()`;

app.on('window-all-closed', (e) => e.preventDefault()); // 窗口关闭不退出，等测试跑完

app.whenReady().then(async () => {
  let code = 0;
  let win = null;
  try {
    win = new BrowserWindow({ show: false, width: 800, height: 160 });
    await win.loadURL('about:blank');
    const dataUrl = await win.webContents.executeJavaScript(CANVAS_JS);
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    // 注意：此处不能销毁窗口，否则所有窗口关闭会触发 app 退出

    // 引擎一：Tesseract（英文断言）
    {
      const t0 = Date.now();
      const text = await ocr.recognizeBuffer(buf, 'eng', 'tesseract');
      const ok = /12345/.test(text);
      console.log(`[tesseract] ${((Date.now() - t0) / 1000).toFixed(1)}s →`, ok ? 'PASS' : 'FAIL');
      console.log('  输出:', JSON.stringify(text.replace(/\\n/g, ' ').slice(0, 80)));
      if (!ok) code = 1;
    }

    // 引擎二：auto 路由（健康时走 Vision，中文模型卡死时自动降级 Tesseract）
    if (ocr.visionAvailable()) {
      const t0 = Date.now();
      const text = await ocr.recognizeBuffer(buf, 'chi_sim+eng', 'auto');
      const okEn = /12345/.test(text);
      // Tesseract 中文可能带字间空格，断言容忍空白
      const okZh = /截\s*图\s*识\s*字/.test(text);
      const okOrder = text.indexOf('12345') < text.indexOf('截');
      console.log(
        `[auto]      ${((Date.now() - t0) / 1000).toFixed(1)}s →`,
        okEn && okZh && okOrder ? 'PASS' : `FAIL(en:${okEn} zh:${okZh} order:${okOrder})`
      );
      console.log('  输出:', JSON.stringify(text.replace(/\\n/g, ' ').slice(0, 80)));
      if (!(okEn && okZh && okOrder)) code = 1;
    } else {
      console.log('[vision]    跳过（未编译 helper，macOS 运行 bash scripts/build-vision-helper.sh）');
    }
  } catch (err) {
    console.error('TEST ERROR:', err);
    code = 1;
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    await ocr.terminate().catch(() => {});
    app.exit(code);
  }
});
