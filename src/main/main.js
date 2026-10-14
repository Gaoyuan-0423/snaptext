'use strict';
const {
  app,
  Tray,
  Menu,
  globalShortcut,
  BrowserWindow,
  ipcMain,
  nativeImage,
  clipboard,
  dialog,
} = require('electron');
const path = require('path');
const { Settings } = require('./settings');
const capture = require('./capture');
const ocr = require('./ocr');
const { translate } = require('./translate');

let settings = null;
let tray = null;
let resultWin = null;
let settingsWin = null;

// ---------- 托盘 ----------

function trayIconPath() {
  // macOS 用黑白 template 图标（自动适配浅色/深色菜单栏），Windows 用彩色图标
  if (process.platform === 'darwin') {
    return path.join(__dirname, '..', '..', 'resources', 'icons', 'trayTemplate.png');
  }
  return path.join(__dirname, '..', '..', 'resources', 'icons', 'icon-32.png');
}

function buildTrayMenu() {
  const s = settings.all();
  return Menu.buildFromTemplate([
    { label: `截图识字（${prettyShortcut(s.shortcut)}）`, click: () => startCapture() },
    { type: 'separator' },
    {
      label: '开机自启',
      type: 'checkbox',
      checked: s.launchAtLogin,
      click: (item) => applyLoginItem(item.checked),
    },
    { label: '设置…', click: () => openSettings() },
    { label: '关于 SnapText', click: () => about() },
    { type: 'separator' },
    { role: 'quit', label: '退出' },
  ]);
}

function prettyShortcut(accelerator) {
  return accelerator
    .replace('CommandOrControl', process.platform === 'darwin' ? '⇧⌘' : 'Ctrl+Shift')
    .replace(/Shift\+/g, '')
    .replace('+', '');
}

function setupTray() {
  const img = nativeImage.createFromPath(trayIconPath());
  if (process.platform === 'darwin') img.setTemplateImage(true);
  tray = new Tray(img);
  tray.setToolTip('SnapText 截图识字');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => tray.popUpContextMenu());
}

// ---------- 快捷键 ----------

function registerShortcut() {
  globalShortcut.unregisterAll();
  const acc = settings.get('shortcut');
  try {
    globalShortcut.register(acc, () => startCapture());
    return true;
  } catch {
    return false;
  }
}

// ---------- 截图 → OCR → 结果窗 ----------

function startCapture() {
  capture.start(); // 选区结果由 wire() 里的回调处理
}

async function onSelected(image, display, rect) {
  const win = ensureResultWindow();
  const bounds = display.workArea;
  // 结果窗尽量出现在选区附近（workArea 内）
  const cx = rect ? display.bounds.x + rect.x + rect.width / 2 : bounds.x + bounds.width / 2;
  const cy = rect ? display.bounds.y + rect.y : bounds.y + bounds.height / 3;
  const [w, h] = win.getSize();
  win.setPosition(
    Math.round(Math.min(Math.max(cx - w / 2, bounds.x), bounds.x + bounds.width - w)),
    Math.round(Math.min(Math.max(cy - 40, bounds.y), bounds.y + bounds.height - h))
  );
  if (!win.isVisible()) win.show();
  win.focus();

  win.webContents.send('result:new', {
    image: image.toDataURL(),
  });

  const t0 = Date.now();
  try {
    const text = await ocr.recognizeBuffer(image.toPNG(), settings.get('ocrLangs'), (m) => {
      if (m.status === 'recognizing text') {
        win.webContents.send('result:progress', Math.round((m.progress || 0) * 100));
      } else if (m.status === 'loading language traineddata' || m.status === 'loading tesseract core') {
        win.webContents.send('result:progress', -1); // -1 = 正在准备语言数据
      }
    });
    const trimmed = text.trim();
    if (settings.get('autoCopy') && trimmed) {
      clipboard.writeText(trimmed);
    }
    win.webContents.send('result:ocr-done', {
      text: trimmed,
      elapsed: ((Date.now() - t0) / 1000).toFixed(1),
      autoCopied: Boolean(settings.get('autoCopy') && trimmed),
    });
  } catch (err) {
    win.webContents.send('result:ocr-error', String(err.message || err));
  }
}

function ensureResultWindow() {
  if (resultWin && !resultWin.isDestroyed()) return resultWin;
  resultWin = new BrowserWindow({
    width: 520,
    height: 460,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  resultWin.loadFile(
    path.join(__dirname, '..', 'renderer', 'result', 'index.html')
  );
  resultWin.on('closed', () => (resultWin = null));
  return resultWin;
}

// ---------- 设置窗口 ----------

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 480,
    height: 560,
    resizable: false,
    title: 'SnapText 设置',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  settingsWin.loadFile(
    path.join(__dirname, '..', 'renderer', 'settings', 'index.html')
  );
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => (settingsWin = null));
}

function applyLoginItem(enabled) {
  settings.patch({ launchAtLogin: enabled });
  try {
    if (enabled) app.setLoginItemSettings({ openAtLogin: true });
    else app.setLoginItemSettings({ openAtLogin: false });
  } catch {
    // 开发模式（未打包）下系统可能拒绝写入登录项，忽略即可
  }
  tray.setContextMenu(buildTrayMenu());
}

function about() {
  dialog.showMessageBox({
    type: 'info',
    title: '关于 SnapText',
    message: 'SnapText 截图识字',
    detail:
      `版本 ${app.getVersion()}\n\n` +
      '截图 → 本地 OCR → 免费翻译\n' +
      'OCR 完全离线（Tesseract，Apache-2.0）。\n' +
      '开源软件，遵循 MIT 许可证。\n' +
      'https://github.com/your-name/snaptext',
    buttons: ['好的'],
  });
}

// ---------- IPC ----------

function wireIpc() {
  capture.wire(onSelected);

  ipcMain.handle('settings:get', () => settings.all());

  ipcMain.on('settings:save', (_e, partial) => {
    const prevShortcut = settings.get('shortcut');
    settings.patch(partial);
    if (partial.shortcut && partial.shortcut !== prevShortcut) {
      if (!registerShortcut()) {
        dialog.showErrorBox(
          '快捷键注册失败',
          `「${partial.shortcut}」不可用或已被其他应用占用，请换一个组合。`
        );
      }
    }
    if (typeof partial.launchAtLogin === 'boolean') {
      try {
        app.setLoginItemSettings({ openAtLogin: partial.launchAtLogin });
      } catch {
        dialog.showErrorBox('设置失败', '写入开机自启失败（未打包或权限受限）。');
      }
    }
    if (tray) tray.setContextMenu(buildTrayMenu());
  });

  ipcMain.handle('translate:run', async (_e, text) => {
    return translate(text, {
      provider: settings.get('provider'),
      targetLang: settings.get('targetLang'),
      libreUrl: settings.get('libreUrl'),
    });
  });

  ipcMain.on('result:close', () => resultWin && resultWin.close());
  ipcMain.on('result:toggle-pin', () => {
    if (resultWin) resultWin.setAlwaysOnTop(!resultWin.isAlwaysOnTop());
  });
  ipcMain.on('copy:text', (_e, text) => clipboard.writeText(text));
}

// ---------- 生命周期 ----------

app.whenReady().then(() => {
  settings = new Settings();
  if (settings.get('launchAtLogin')) {
    try {
      app.setLoginItemSettings({ openAtLogin: true });
    } catch {
      // 未打包环境下可能无权限写登录项
    }
  }
  if (process.platform === 'darwin') app.dock.hide(); // 纯菜单栏应用
  setupTray();
  registerShortcut();
  wireIpc();
});

app.on('window-all-closed', () => {
  // 托盘常驻：不退出（macOS 惯例；Windows 托盘同样驻留）
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  ocr.terminate();
});
