'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const sends = new Set(['capture:selected', 'capture:cancelled', 'result:close', 'result:toggle-pin', 'copy:text']);
const invokes = new Set(['settings:get', 'settings:save', 'translate:run']);
const events = new Set(['overlay:init', 'result:new', 'result:progress', 'result:ocr-done', 'result:ocr-error']);
contextBridge.exposeInMainWorld('snaptext', {
  send(channel, payload) {
    if (!sends.has(channel)) throw new Error('Unsupported message');
    ipcRenderer.send(channel, payload);
  },
  invoke(channel, payload) {
    if (!invokes.has(channel)) throw new Error('Unsupported request');
    return ipcRenderer.invoke(channel, payload);
  },
  on(channel, callback) {
    if (!events.has(channel) || typeof callback !== 'function') throw new Error('Unsupported event');
    ipcRenderer.on(channel, (_event, ...args) => callback(null, ...args));
  },
});
