'use strict';
// 截图流程：
//   1. desktopCapturer 抓取每块屏幕的画面（相当于“冻结”屏幕）
//   2. 每块屏幕盖上一个全屏无边框窗口，用户拖框选区
//   3. 选区矩形发回主进程，用 NativeImage.crop 裁剪出图片
// macOS 首次使用需要“屏幕录制”权限；检测到画面为空时弹引导。
const {
  desktopCapturer,
  screen,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
} = require('electron');
const path = require('path');

let overlays = []; // {win, image, display}
let inFlight = false;

function openScreenRecordingGuide() {
  dialog.showMessageBox({
    type: 'warning',
    title: '需要屏幕录制权限',
    message: 'SnapText 需要「屏幕录制」权限才能截取屏幕。',
    detail: '请在 系统设置 → 隐私与安全性 → 屏幕录制 中勾选 SnapText（或正在运行的终端/Electron），然后重启应用。',
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

async function start(onSelected) {
  if (inFlight) return;
  inFlight = true;
  try {
    const displays = screen.getAllDisplays();

    // thumbnailSize 取所有屏幕中最大的像素需求，避免高分屏截图被缩小
    let tw = 0;
    let th = 0;
    for (const d of displays) {
      const s = d.scaleFactor || 1;
      tw = Math.max(tw, Math.ceil(d.bounds.width * s));
      th = Math.max(th, Math.ceil(d.bounds.height * s));
    }
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: tw, height: th },
    });
    if (sources.length === 0) throw new Error('NO_SOURCES');

    let gotAny = false;
    for (const d of displays) {
      // 优先用 display_id 匹配，失败则按顺序兜底
      let src =
        sources.find(
          (s) => s.display_id && s.display_id === String(d.id)
        ) || sources[displays.indexOf(d)] || sources[0];
      if (!src) continue;
      const image = src.thumbnail;
      if (image.isEmpty()) continue; // 无权限的屏幕会返回空图
      gotAny = true;

      const win = new BrowserWindow({
        x: d.bounds.x,
        y: d.bounds.y,
        width: d.bounds.width,
        height: d.bounds.height,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        hasShadow: false,
        backgroundColor: '#000000',
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });
      win.setAlwaysOnTop(true, 'screen-saver');
      const entry = { win, image, display: d };
      overlays.push(entry);
      await win.loadFile(path.join(__dirname, '..', 'renderer', 'overlay', 'index.html'));
      win.webContents.send('overlay:init', {
        displayId: d.id,
        imageUrl: image.toDataURL(),
        bounds: d.bounds,
        imgSize: image.getSize(),
      });
      win.show();
    }

    if (!gotAny) {
      cleanup();
      openScreenRecordingGuide();
      return;
    }
  } catch (err) {
    cleanup();
    if (String(err.message || err).includes('NO_SOURCES')) openScreenRecordingGuide();
    else throw err;
  }
}

function cleanup() {
  for (const o of overlays) {
    if (!o.win.isDestroyed()) o.win.destroy();
  }
  overlays = [];
  inFlight = false;
}

function wire(onSelected) {
  ipcMain.on('capture:selected', (_e, payload) => {
    const entry = overlays.find((o) => o.display.id === payload.displayId);
    cleanup(); // 先收起遮罩，体验更干脆
    if (!entry) return;
    const { image, display } = entry;
    const size = image.getSize();
    const sx = size.width / display.bounds.width;
    const sy = size.height / display.bounds.height;
    const rect = payload.rect; // CSS 像素，相对该屏幕
    const crop = {
      x: Math.max(0, Math.round(rect.x * sx)),
      y: Math.max(0, Math.round(rect.y * sy)),
      width: Math.max(1, Math.round(rect.width * sx)),
      height: Math.max(1, Math.round(rect.height * sy)),
    };
    const cropped = image.crop(crop);
    onSelected(cropped, display, payload.isFull ? null : rect);
  });
  ipcMain.on('capture:cancelled', () => cleanup());
}

module.exports = { start, wire };
