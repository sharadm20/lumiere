const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// Export functions for testing
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add an icon later
    title: 'Lumière'
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// function createWindow() {
//   // Create the browser window
//   mainWindow = new BrowserWindow({
//     width: 1200,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false,
//       enableRemoteModule: true
//     },
//     icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add an icon later
//     title: 'Magnet Player'
//   });

//   // Load the app
//   mainWindow.loadFile('index.html');

//   // Open DevTools in development
//   if (process.env.NODE_ENV === 'development') {
//     mainWindow.webContents.openDevTools();
//   }

//   // Emitted when the window is closed
//   mainWindow.on('closed', () => {
//     mainWindow = null;
//   });
// }

// This method will be called when Electron has finished initialization
app.on('ready', () => {
  // createWindow();
});

// Export functions for testing
module.exports = {
  createWindow,
  get mainWindow() { return mainWindow; },
  set mainWindow(value) { mainWindow = value; }
};

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    // createWindow();
  }
});

// Create application menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Magnet URL',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          mainWindow.webContents.send('show-input-screen');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
        click: () => {
          app.quit();
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About Lumière',
        click: () => {
          // Show about dialog
        }
      }
    ]
  }
];

// Set the menu
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// IPC handlers
ipcMain.on('load-magnet', (event, magnetUrl) => {
  // Handle magnet URL loading
  mainWindow.webContents.send('load-magnet-url', magnetUrl);
});

ipcMain.on('back-to-input', () => {
  mainWindow.webContents.send('show-input-screen');
});