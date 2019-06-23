const { app, BrowserWindow } = require('electron');


// Used in configuring path to load html from React
const path = require('path');
const url = require('url');

let mainWindow;
function createWindow () {
    mainWindow = new BrowserWindow({width: 800, height: 600});

    const startURL = url.format({
      pathname: path.join(__dirname, '../dist/index.html'),
      protocol: 'file:', 
      slashes: true
    });
    mainWindow.loadURL(startURL);

    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
