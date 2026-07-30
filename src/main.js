const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { RunAuditStore, runCrawlWithAudit } = require('./auditStore');
const { GotorBackend } = require('./gotorBackend');
const {
  buildExportPayload,
  normalizeCrawlRequest,
  normalizeExportRequest,
  normalizeTargetURL,
  normalizeTorStatusRequest,
} = require('./ipcValidation');

let mainWindow = null;
let auditStore = null;
let latestCompletedRun = null;
const backend = new GotorBackend({
  appRoot: path.resolve(__dirname, '..'),
  resourcesPath: process.resourcesPath,
});

function registerIPC() {
  ipcMain.handle('backend:status', () => backend.status());
  ipcMain.handle('tor:status', (_event, input = {}) => {
    const { host, port } = normalizeTorStatusRequest(input);
    return backend.torStatus(host, port);
  });
  ipcMain.handle('crawl:start', async (_event, input) => {
    const normalized = normalizeCrawlRequest(input);
    const job = await runCrawlWithAudit({ backend, auditStore, normalized });
    if (job.report) {
      latestCompletedRun = {
        auditId: job.audit.id,
        report: job.report,
      };
    }
    return job;
  });
  ipcMain.handle('crawl:cancel', () => backend.cancelActive());
  ipcMain.handle('external:open', (_event, rawURL) => {
    const parsedURL = normalizeTargetURL(rawURL);
    return shell.openExternal(parsedURL.toString());
  });
  ipcMain.handle('audit:show-latest', () => {
    const artifactPath = auditStore.getLatestPath();
    if (!artifactPath) {
      throw new Error('No crawl audit artifact is available.');
    }
    shell.showItemInFolder(artifactPath);
  });
  ipcMain.handle('report:export', async (_event, input) => {
    const options = normalizeExportRequest(input);
    if (!latestCompletedRun || latestCompletedRun.auditId !== options.auditId) {
      throw new Error('The export does not match the latest completed crawl.');
    }
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export reviewed crawl report',
      defaultPath: `torbot-report-${options.auditId.slice(0, 8)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    await fs.promises.writeFile(
      result.filePath,
      `${JSON.stringify(buildExportPayload(latestCompletedRun.report, options), null, 2)}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
    return { canceled: false, filePath: result.filePath };
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
  auditStore = new RunAuditStore(path.join(app.getPath('userData'), 'audit', 'runs'));
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
