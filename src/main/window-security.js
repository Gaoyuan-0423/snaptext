'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
function preferences() {
  return { preload: path.join(__dirname, '..', 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true };
}
function harden(win) {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('will-attach-webview', event => event.preventDefault());
}
function fromWindow(event, win, page) {
  return !!win && !win.isDestroyed() && event.sender === win.webContents &&
    event.senderFrame === win.webContents.mainFrame &&
    event.senderFrame.url === pathToFileURL(path.join(__dirname, '..', 'renderer', page, 'index.html')).href;
}
module.exports = { preferences, harden, fromWindow };
