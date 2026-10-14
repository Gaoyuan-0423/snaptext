'use strict';
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  // 全局快捷键（Electron accelerator 格式）
  shortcut: 'CommandOrControl+Shift+1',
  // OCR 语言包，+ 分隔。常用：eng / chi_sim+eng / chi_tra+eng / jpn+eng / kor+eng
  ocrLangs: 'chi_sim+eng',
  // 翻译目标语言（Google 语言代码，如 zh-CN / en / ja / ko）
  targetLang: 'zh-CN',
  // 翻译服务：'google'（免费无密钥）| 'libre'（自建/公共 LibreTranslate）
  provider: 'google',
  libreUrl: 'https://libretranslate.com',
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
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
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
    Object.assign(this.data, partial);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    return this.all();
  }
}

module.exports = { Settings, DEFAULTS };
