'use strict';
// 免费翻译提供方。全部无需 API key。
//
// 'google'  : Google 翻译的公开 web 接口（client=gtx），免费、无需密钥，
//             但属于非官方接口，随时可能变动 —— 失败时请切换 libre。
// 'libre'   : LibreTranslate 实例，可自建（docker run libretranslate/libretranslate），
//             公共实例有限流。
const { net } = require('electron');

const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await net.fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function googleFree(text, target) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t' +
    `&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Google 接口返回 ${res.status}`);
  const data = await res.json();
  // 返回结构: [[["译文","原文",...],["译文",...]], ...]
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Google 接口返回格式异常');
  }
  return data[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('');
}

async function libre(text, target, baseUrl) {
  const res = await fetchWithTimeout(baseUrl.replace(/\/+$/, '') + '/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'auto', target, format: 'text' }),
  });
  if (!res.ok) throw new Error(`LibreTranslate 返回 ${res.status}`);
  const data = await res.json();
  if (!data.translatedText) throw new Error('LibreTranslate 返回为空');
  return data.translatedText;
}

async function translate(text, { provider, targetLang, libreUrl }) {
  // GET URL 长度有限，超长文本按段落分块（Google 免费接口场景）
  const MAX_CHUNK = 1500;
  if (provider === 'google' && text.length > MAX_CHUNK) {
    const chunks = text.match(new RegExp(`[\\s\\S]{1,${MAX_CHUNK}}`, 'g')) || [];
    const parts = [];
    for (const c of chunks) parts.push(await googleFree(c, targetLang));
    return parts.join('');
  }
  if (provider === 'libre') return libre(text, targetLang, libreUrl);
  return googleFree(text, targetLang);
}

module.exports = { translate };
