'use strict';
// Text is sent only to the LibreTranslate instance explicitly configured by the user.
const { net } = require('electron');
const { validateSettings, validateText } = require('./validation');
const TIMEOUT_MS = 10000;

async function translate(text, { targetLang, libreUrl, libreApiKey = '' }) {
  validateText(text);
  validateSettings({ targetLang, libreUrl, libreApiKey });
  if (!libreUrl) throw new Error('请先在设置中填写 LibreTranslate 地址及实例要求的 API Key');
  if (!text.trim()) throw new Error('请输入需要翻译的文字');
  const endpoint = new URL(libreUrl);
  if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)) {
    throw new Error('远程翻译服务请使用 HTTPS；HTTP 仅用于本机自建服务');
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, '') + '/translate';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await net.fetch(endpoint.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'error',
      credentials: 'omit',
      signal: controller.signal,
      body: JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text',
        ...(libreApiKey ? { api_key: libreApiKey } : {}) }),
    });
    if (response.status === 401 || response.status === 403) throw new Error('API Key 无效或无权访问，请检查实例设置');
    if (response.status === 429) throw new Error('翻译服务请求过多或额度已用完，请稍后再试');
    if (!response.ok) throw new Error(`LibreTranslate 返回 ${response.status}，请检查服务地址和支持的语言`);
    const data = await response.json();
    if (typeof data.translatedText !== 'string' || !data.translatedText.trim()) throw new Error('LibreTranslate 返回格式无效或没有译文');
    return data.translatedText;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('翻译请求超时，请检查网络或服务地址');
    if (error instanceof TypeError || error instanceof SyntaxError) throw new Error('无法连接翻译服务或响应无效，请检查地址与网络');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
module.exports = { translate };
