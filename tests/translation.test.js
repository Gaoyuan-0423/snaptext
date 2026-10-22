'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// 通过 require 缓存注入 electron 桩，随后用字面量路径加载被测模块
const ELECTRON_ID = require.resolve('electron');
const TRANSLATE_ID = require.resolve('../src/main/translate.js');
const SETTINGS_ID = require.resolve('../src/main/settings.js');

function stubElectron(electronStub) {
  delete require.cache[ELECTRON_ID];
  require.cache[ELECTRON_ID] = { exports: electronStub };
}

function freshTranslate(electronStub) {
  stubElectron(electronStub);
  delete require.cache[TRANSLATE_ID];
  return require('../src/main/translate.js');
}

function freshSettings(electronStub) {
  stubElectron(electronStub);
  delete require.cache[SETTINGS_ID];
  return require('../src/main/settings.js');
}

const { translate } = freshTranslate({ net: { fetch } });
const { migrateSettings, DEFAULTS } = freshSettings({
  app: { getPath: () => '/tmp', isPackaged: false },
});

test('unconfigured translation does not send a request and OCR settings remain usable', async () => {
  let requests = 0;
  const module = freshTranslate({ net: { fetch: () => { requests++; throw new Error('unexpected'); } } });
  await assert.rejects(module.translate('hello', DEFAULTS), /请先在设置中填写/);
  assert.equal(requests, 0);
  assert.equal(DEFAULTS.libreUrl, '');
});

test('migration retains OCR preferences but requires former Google users to choose a service', () => {
  const old = {provider:'google', libreUrl:'https://libretranslate.com', libreApiKey:'old', shortcut:'Alt+X', autoCopy:false, ocrEngine:'native', targetLang:'zh-CN'};
  const next = migrateSettings(old);
  assert.equal(next.provider, 'libre');
  assert.equal(next.libreUrl, '');
  assert.equal(next.libreApiKey, '');
  assert.equal(next.targetLang, 'zh');
  assert.equal(next.shortcut, 'Alt+X');
  assert.equal(next.autoCopy, false);
  assert.equal(next.ocrEngine, 'native');
  assert.equal(old.provider, 'google');
  assert.deepEqual(migrateSettings({provider:'libre',libreUrl:'https://example.com',libreApiKey:'own',targetLang:'zh-TW'}),
    {provider:'libre',libreUrl:'https://example.com',libreApiKey:'own',targetLang:'zt'});
});

test('reject remote cleartext endpoints and invalid input before networking', async () => {
  const opts = {targetLang:'zh', libreUrl:'http://example.com', libreApiKey:'test-key'};
  await assert.rejects(translate('hello', opts), /HTTPS/);
  await assert.rejects(translate('hello', {...opts,libreUrl:'https://user:pass@example.com'}), /地址/);
  await assert.rejects(translate('hello', {...opts,libreUrl:'https://example.com',targetLang:'zh-CN'}), /设置选项/);
});

test('LibreTranslate HTTP contract, auth failures, malformed results and redirects', async () => {
  const requests = [];
  let mode = 'success';
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({url:req.url,method:req.method,body:JSON.parse(body || '{}')});
    if (mode === 'redirect') { res.writeHead(307,{Location:'/leak'}); res.end(); return; }
    if (mode === 'auth') {res.writeHead(403);res.end('private data must not appear');return;}
    if (mode === 'rate') {res.writeHead(429);res.end();return;}
    res.setHeader('Content-Type','application/json');
    res.end(mode === 'malformed' ? '{broken' : JSON.stringify({translatedText:mode === 'object' ? {} : '你好'}));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const opts = {targetLang:'zh', libreUrl:`http://127.0.0.1:${server.address().port}/api/`,libreApiKey:'test-only-key'};
    assert.equal(await translate('Hello',opts),'你好');
    assert.deepEqual(requests[0],{url:'/api/translate',method:'POST',body:{q:'Hello',source:'auto',target:'zh',format:'text',api_key:'test-only-key'}});
    await translate('Hello',{...opts,libreApiKey:''});
    assert.equal('api_key' in requests[1].body,false);
    mode='auth'; await assert.rejects(translate('Hello',opts), /API Key 无效/);
    mode='rate'; await assert.rejects(translate('Hello',opts), /额度/);
    mode='malformed'; await assert.rejects(translate('Hello',opts), /响应无效/);
    mode='object'; await assert.rejects(translate('Hello',opts), /格式无效/);
    mode='redirect'; const before=requests.length;
    await assert.rejects(translate('Hello',opts));
    assert.equal(requests.length,before+1);
    assert.equal(requests.some(r=>r.url==='/leak'),false);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
