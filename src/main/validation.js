'use strict';
function validateText(text) {
  if (typeof text !== 'string' || text.length > 100000) throw new Error('文字过长或格式无效');
  return text;
}
function validateSettings(partial) {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) throw new Error('设置格式无效');
  const result = {};
  const choices = {
    ocrLangs: ['chi_sim+eng','chi_tra+eng','eng','jpn+eng','kor+eng','chi_sim+chi_tra+eng'],
    ocrEngine: ['auto','native','tesseract'], provider: ['libre'],
    targetLang: ['zh','zt','en','ja','ko','fr','de','ru'],
  };
  for (const [key, value] of Object.entries(partial)) {
    if (choices[key]) {
      if (!choices[key].includes(value)) throw new Error('设置选项无效：' + key);
    } else if (key === 'autoCopy' || key === 'launchAtLogin') {
      if (typeof value !== 'boolean') throw new Error('设置类型无效：' + key);
    } else if (key === 'shortcut') {
      if (typeof value !== 'string' || value.length < 3 || value.length > 100 || !/^[A-Za-z0-9+ -]+$/.test(value)) throw new Error('快捷键格式无效');
    } else if (key === 'libreUrl') {
      if (value === '') { result[key] = ''; continue; }
      let url;
      try { url = new URL(value); } catch { throw new Error('LibreTranslate 地址无效'); }
      if (typeof value !== 'string' || value.length > 2048 || !['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new Error('请输入 HTTP(S) 服务地址，不要在地址中包含密钥');
    } else if (key === 'libreApiKey') {
      if (typeof value !== 'string' || value.length > 4096) throw new Error('API Key 格式无效');
    } else { throw new Error('未知设置：' + key); }
    result[key] = value;
  }
  return result;
}
function validateRect(rect, bounds) {
  if (!rect || !['x','y','width','height'].every(k => Number.isFinite(rect[k]))) return null;
  const x = Math.max(0, Math.min(rect.x, bounds.width));
  const y = Math.max(0, Math.min(rect.y, bounds.height));
  const width = Math.min(rect.width, bounds.width - x);
  const height = Math.min(rect.height, bounds.height - y);
  return width >= 1 && height >= 1 ? { x, y, width, height } : null;
}
module.exports = { validateText, validateSettings, validateRect };
