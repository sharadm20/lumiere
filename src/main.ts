import { app, BrowserWindow, Menu, ipcMain, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null;

function createWindow(): void {
  console.log('Creating main window...');

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png'), // Path from dist directory to root
    title: 'Lumière',
    show: false // Don't show until ready-to-show
  });

  console.log('Loading index.html...');
  // Load the app - path from dist directory to root index.html
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html')).then(() => {
    console.log('HTML file loaded successfully');
    if (mainWindow) {
      mainWindow.show();
    }
  }).catch((err) => {
    console.error('Failed to load HTML file:', err);
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development' && mainWindow) {
    console.log('Opening DevTools...');
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  if (mainWindow) {
    mainWindow.on('closed', () => {
      console.log('Main window closed');
      mainWindow = null;
    });

    // Handle window ready to show
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      if (mainWindow) {
        mainWindow.show();
      }
    });
  }
}

// Hot reload for development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(path.join(__dirname, '..', '..'), {
      electron: require('electron')
    });
  } catch (error) {
    console.error('Error setting up electron-reload:', error);
  }
}

// This method will be called when Electron has finished initialization
app.on('ready', () => {
  console.log('Electron app ready, creating window...');
  createWindow();
});

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
    createWindow();
  }
});

// Create application menu
const template: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Magnet URL',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('show-input-screen');
          }
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
ipcMain.on('load-magnet', (_event, magnetUrl) => {
  // Handle magnet URL loading
  if (mainWindow) {
    mainWindow.webContents.send('load-magnet-url', magnetUrl);
  }
});

ipcMain.on('back-to-input', () => {
  if (mainWindow) {
    mainWindow.webContents.send('show-input-screen');
  }
});

// Export for CommonJS compatibility
export {};