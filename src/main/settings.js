'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { validateSettings } = require('./validation');

const DEFAULTS = {
  // 全局快捷键（Electron accelerator 格式）
  shortcut: 'CommandOrControl+Shift+1',
  // OCR 语言包，+ 分隔。常用：eng / chi_sim+eng / chi_tra+eng / jpn+eng / kor+eng
  ocrLangs: 'chi_sim+eng',
  // OCR 引擎：auto（macOS 用系统 Vision，其余平台 Tesseract）| native | tesseract
  ocrEngine: 'auto',
  // LibreTranslate 语言代码；具体可用语言由实例决定。
  targetLang: 'zh',
  provider: 'libre',
  libreUrl: '',
  libreApiKey: '',
  // 识别成功后自动复制到剪贴板
  autoCopy: true,
  // 开机自启
  launchAtLogin: false,
};

class Settings {
  constructor() {
    this.file = path.join(app.getPath('userData'), 'settings.json');
    this.data = { ...DEFAULTS, ...this.read() };
  }

  read() {
    try {
      return validateSettings(migrateSettings(JSON.parse(fs.readFileSync(this.file, 'utf8'))));
    } catch {
      return {}; // 首次运行或文件损坏时回退到默认值
    }
  }

  all() {
    return { ...this.data };
  }

  get(key) {
    return this.data[key];
  }

  patch(partial) {
    const next = { ...this.data, ...validateSettings(partial) };
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const temporary = this.file + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, this.file);
    this.data = next;
    return this.all();
  }
}

function migrateSettings(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return saved;
  const next = { ...saved, provider: 'libre' };
  // Users of the removed provider must explicitly choose a translation instance.
  if (saved.provider !== 'libre') { next.libreUrl = ''; next.libreApiKey = ''; }
  if (next.targetLang === 'zh-CN') next.targetLang = 'zh';
  if (next.targetLang === 'zh-TW') next.targetLang = 'zt';
  return next;
}
module.exports = { Settings, DEFAULTS, migrateSettings };
