'use strict';
// 截图流程（macOS ⌘⇧4 同款“实时模式”）：
//   1. 每块屏幕盖一层完全透明的全屏窗口（十字光标，只在上面画选框边线）
//   2. 用户在实时屏幕上拖框；松手时先把所有遮罩隐藏（避免被截进去）
//   3. 隐藏 ~200ms 后用 desktopCapturer 截取该屏幕，按框裁剪 → 送去 OCR
// 优点：屏幕不冻结、无整屏变暗；只在松手瞬间才发生真正的截屏。
const {
  desktopCapturer,
  screen,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  systemPreferences,
} = require('electron');
const path = require('path');

let overlays = []; // {win, display}
let inFlight = false;

function openScreenRecordingGuide() {
  dialog.showMessageBox({
    type: 'warning',
    title: '需要屏幕录制权限',
    message: 'SnapText 需要「屏幕录制」权限才能截取屏幕。',
    detail:
      '请在 系统设置 → 隐私与安全性 → 屏幕录制 中勾选 SnapText（或正在运行的终端/Electron），然后重启应用。',
    buttons: ['打开系统设置', '取消'],
    defaultId: 0,
  }).then(({ response }) => {
    if (response === 0) {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      );
    }
  });
}

async function start() {
  if (inFlight) return;
  inFlight = true;
  try {
    // macOS 屏幕录制权限状态：not-determined / granted / denied / restricted
    const mediaStatus = process.platform === 'darwin'
      ? systemPreferences.getMediaAccessStatus('screen')
      : 'granted';
    console.log('[capture] screen media access status:', mediaStatus);
    if (mediaStatus === 'denied') {
      cleanup();
      openScreenRecordingGuide();
      return;
    }

    for (const d of screen.getAllDisplays()) {
      const win = new BrowserWindow({
        x: d.bounds.x,
        y: d.bounds.y,
        width: d.bounds.width,
        height: d.bounds.height,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        minimizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: false,
        backgroundColor: '#00000000',
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });
      win.setAlwaysOnTop(true, 'screen-saver');
      overlays.push({ win, display: d });
      await win.loadFile(path.join(__dirname, '..', 'renderer', 'overlay', 'index.html'));
      win.webContents.send('overlay:init', { displayId: d.id });
      win.show();
    }
  } catch (err) {
    cleanup();
    throw err;
  }
}

function cleanup() {
  for (const o of overlays) {
    if (!o.win.isDestroyed()) o.win.destroy();
  }
  overlays = [];
  inFlight = false;
}

async function captureDisplay(display) {
  const s = display.scaleFactor || 1;
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.ceil(display.bounds.width * s),
      height: Math.ceil(display.bounds.height * s),
    },
  });
  const src =
    sources.find((x) => x.display_id === String(display.id)) || sources[0];
  console.log(
    '[capture] sources:', sources.length,
    'emptyThumbnails:', sources.filter((x) => x.thumbnail.isEmpty()).length
  );
  if (!src || src.thumbnail.isEmpty()) return null;
  return src.thumbnail;
}

function wire(onSelected) {
  ipcMain.on('capture:selected', (_e, payload) => {
    const entry = overlays.find((o) => o.display.id === payload.displayId);
    if (!entry) {
      cleanup();
      return;
    }
    // 先隐藏所有遮罩，等合成器刷新一帧后再截屏，避免把遮罩截进去
    for (const o of overlays) o.win.hide();
    const { display } = entry;
    const rect = payload.rect; // CSS 像素，相对该屏幕

    setTimeout(async () => {
      try {
        const image = await captureDisplay(display);
        if (!image) {
          cleanup();
          openScreenRecordingGuide();
          return;
        }
        const size = image.getSize();
        const sx = size.width / display.bounds.width;
        const sy = size.height / display.bounds.height;
        const cropped = image.crop({
          x: Math.max(0, Math.round(rect.x * sx)),
          y: Math.max(0, Math.round(rect.y * sy)),
          width: Math.max(1, Math.round(rect.width * sx)),
          height: Math.max(1, Math.round(rect.height * sy)),
        });
        cleanup();
        onSelected(cropped, display, payload.isFull ? null : rect);
      } catch (err) {
        cleanup();
        console.error('[capture] failed:', err);
      }
    }, 200);
  });
  ipcMain.on('capture:cancelled', () => cleanup());
}

module.exports = { start, wire };
