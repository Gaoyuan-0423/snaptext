'use strict';
// 无头 OCR 自测：不截图，直接用离屏 canvas 画一张含文字的图，
// 走与正式流程完全相同的 ocr.recognizeBuffer() 管道。
// 运行：npm run test:ocr   （预期输出 TEST PASS，退出码 0）
const { app, BrowserWindow } = require('electron');
const path = require('path');

const ocr = require(path.join(__dirname, '..', 'src', 'main', 'ocr'));

const CANVAS_JS = `(() => {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 120;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 640, 120);
  x.fillStyle = '#000000'; x.font = '52px sans-serif';
  x.fillText('Hello SnapText 12345', 20, 80);
  return c.toDataURL('image/png');
})()`;

app.on('window-all-closed', (e) => e.preventDefault()); // 窗口关闭不退出，等测试跑完

app.whenReady().then(async () => {
  let code = 1;
  let win = null;
  try {
    win = new BrowserWindow({ show: false, width: 640, height: 120 });
    await win.loadURL('about:blank');
    const dataUrl = await win.webContents.executeJavaScript(CANVAS_JS);
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    // 注意：此处不能销毁窗口，否则所有窗口关闭会触发 app 退出

    process.stdout.write('初始化 OCR 引擎并识别 …\n');
    const t0 = Date.now();
    const text = await ocr.recognizeBuffer(buf, 'eng', (m) => {
      if (m.status === 'recognizing text' && m.progress != null) {
        process.stdout.write(`\r识别进度 ${Math.round(m.progress * 100)}%   `);
      }
    });
    process.stdout.write('\n');
    const trimmed = text.trim();
    console.log('识别输出:', JSON.stringify(trimmed));
    const ok = /12345/.test(trimmed);
    console.log(`用时 ${((Date.now() - t0) / 1000).toFixed(1)}s →`, ok ? 'TEST PASS' : 'TEST FAIL');
    code = ok ? 0 : 1;
  } catch (err) {
    console.error('TEST ERROR:', err);
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    await ocr.terminate().catch(() => {});
    app.exit(code);
  }
});
