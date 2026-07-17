const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { GotorBackend } = require('./gotorBackend');

let mainWindow = null;
const backend = new GotorBackend({
  appRoot: path.resolve(__dirname, '..'),
  resourcesPath: process.resourcesPath,
});

function normalizeCrawlRequest(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('A crawl request is required.');
  }

  let parsedURL;
  try {
    parsedURL = new URL(String(input.url));
  } catch {
    throw new Error('Enter a valid absolute URL.');
  }
  if (!['http:', 'https:'].includes(parsedURL.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs can be crawled.');
  }

  const depth = Number(input.depth);
  if (!Number.isInteger(depth) || depth < 0 || depth > 10) {
    throw new Error('Depth must be a whole number between 0 and 10.');
  }

  const useTor = input.useTor !== false;
  const socks5Host = String(input.socks5Host || '127.0.0.1').trim();
  const socks5Port = Number(input.socks5Port || 9050);
  if (!socks5Host || socks5Host.length > 255) {
    throw new Error('Enter a valid SOCKS5 host.');
  }
  if (!Number.isInteger(socks5Port) || socks5Port < 1 || socks5Port > 65535) {
    throw new Error('SOCKS5 port must be between 1 and 65535.');
  }

  return {
    url: parsedURL.toString(),
    depth,
    useTor,
    socks5Host,
    socks5Port,
    workers: 12,
    queueSize: 2048,
    requestsPerSecond: 5,
    burst: 5,
    perHostParallel: 2,
    perHostDelayMs: 100,
    maxResponseBytes: 5 * 1024 * 1024,
    allowNonHtml: false,
    randomizeHeaders: true,
  };
}

function registerIPC() {
  ipcMain.handle('backend:status', () => backend.status());
  ipcMain.handle('tor:status', (_event, input = {}) => {
    const host = String(input.host || '127.0.0.1').trim();
    const port = Number(input.port || 9050);
    if (!host || host.length > 255) {
      throw new Error('Enter a valid Tor SOCKS5 host.');
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Tor SOCKS5 port must be between 1 and 65535.');
    }
    return backend.torStatus(host, port);
  });
  ipcMain.handle('crawl:start', (_event, input) => {
    return backend.runCrawl(normalizeCrawlRequest(input));
  });
  ipcMain.handle('crawl:cancel', () => backend.cancelActive());
  ipcMain.handle('external:open', (_event, rawURL) => {
    const parsedURL = new URL(String(rawURL));
    if (!['http:', 'https:'].includes(parsedURL.protocol)) {
      throw new Error('Refusing to open a non-HTTP URL.');
    }
    return shell.openExternal(parsedURL.toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 680,
    backgroundColor: '#0b0d12',
    title: 'TorBot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetURL) => {
    if (!targetURL.startsWith('file:')) {
      event.preventDefault();
    }
  });
  if (process.env.TORBOT_SCREENSHOT_PATH) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await mainWindow.webContents.capturePage();
        fs.writeFileSync(process.env.TORBOT_SCREENSHOT_PATH, image.toPNG());
        app.quit();
      }, 2500);
    });
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  registerIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  backend.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = { normalizeCrawlRequest };
