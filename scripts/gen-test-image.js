'use strict';
// 生成 OCR 测试图：/tmp/snaptext-zh.png（纯中文）与 /tmp/snaptext-mix.png（中英混合）
// 运行：npx electron scripts/gen-test-image.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');

const ZH = `(() => {
  const c = document.createElement('canvas');
  c.width = 500; c.height = 100;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 500, 100);
  x.fillStyle = '#000'; x.font = '44px "PingFang SC", sans-serif';
  x.fillText('截图识字中文测试七十八九', 15, 66);
  return c.toDataURL('image/png');
})()`;

const MIX = `(() => {
  const c = document.createElement('canvas');
  c.width = 700; c.height = 170;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 700, 170);
  x.fillStyle = '#000'; x.font = '44px "PingFang SC", sans-serif';
  x.fillText('Hello SnapText 12345', 15, 70);
  x.fillText('截图识字无空格测试', 15, 145);
  return c.toDataURL('image/png');
})()`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('about:blank');
  for (const [js, file] of [[ZH, '/tmp/snaptext-zh.png'], [MIX, '/tmp/snaptext-mix.png']]) {
    const dataUrl = await win.webContents.executeJavaScript(js);
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('wrote', file);
  }
  win.destroy();
  app.exit(0);
});
