const { app, BrowserWindow } = require('electron');

console.log('Testing basic Electron functionality...');
console.log('app:', typeof app);
console.log('BrowserWindow:', typeof BrowserWindow);

function createWindow() {
  console.log('Creating test window...');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Electron Test'
  });

  console.log('Window created, loading content...');

  win.loadURL('data:text/html,<html><body><h1>Electron Test Successful!</h1><p>If you can see this, Electron is working.</p></body></html>');

  console.log('Content loaded, showing window...');
  win.show();

  win.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully!');
  });
}

if (app) {
  console.log('App found, setting up ready event...');
  app.whenReady().then(() => {
    console.log('App ready, creating window...');
    createWindow();
  });

  app.on('window-all-closed', () => {
    console.log('All windows closed, quitting...');
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
} else {
  console.error('ERROR: app is undefined!');
  process.exit(1);
}