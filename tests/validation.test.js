'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSettings, validateText, validateRect } = require('../src/main/validation');
const { fromWindow } = require('../src/main/window-security');
const { pathToFileURL } = require('url');
const path = require('path');
test('settings reject arbitrary keys, paths and invalid values', () => {
  for (const value of [{ arbitrary:true }, {ocrLangs:'../../file'}, {autoCopy:'true'}, {libreUrl:'file:///tmp/a'}, {libreUrl:'https://a:b@example.com'}, {provider:'unknown'}]) assert.throws(()=>validateSettings(value));
  assert.deepEqual(validateSettings({libreUrl:'http://localhost:5000',libreApiKey:'test',autoCopy:false}),{libreUrl:'http://localhost:5000',libreApiKey:'test',autoCopy:false});
});
test('text limits reject non-text and over-limit input',()=>{
  assert.equal(validateText('测试'), '测试');
  assert.throws(()=>validateText({})); assert.throws(()=>validateText('a'.repeat(100001)));
});
test('capture rectangles reject invalid geometry and stay within the display',()=>{
  assert.equal(validateRect({x:0,y:0,width:NaN,height:20},{width:100,height:100}),null);
  assert.equal(validateRect({x:100,y:0,width:10,height:20},{width:100,height:100}),null);
  assert.deepEqual(validateRect({x:90,y:90,width:30,height:40},{width:100,height:100}),{x:90,y:90,width:10,height:10});
});
test('IPC accepts only the expected window main frame and local page',()=>{
  const mainFrame={url:pathToFileURL(path.resolve('src/renderer/result/index.html')).href};
  const webContents={mainFrame}; const win={isDestroyed:()=>false,webContents};
  assert.equal(fromWindow({sender:webContents,senderFrame:mainFrame},win,'result'),true);
  assert.equal(fromWindow({sender:{},senderFrame:mainFrame},win,'result'),false);
  assert.equal(fromWindow({sender:webContents,senderFrame:{...mainFrame}},win,'result'),false);
  mainFrame.url='https://example.com';
  assert.equal(fromWindow({sender:webContents,senderFrame:mainFrame},win,'result'),false);
});
