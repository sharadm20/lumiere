// Mock path module for all tests
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/'))
}));

// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    on: jest.fn((event, callback) => {
      // For test purposes, we'll call the callback immediately only for 'ready' event
      if (event === 'ready') {
        // Don't call it immediately to avoid issues during import
        return;
      }
      callback && callback();
    }),
    quit: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(),
    getAllWindows: jest.fn().mockReturnValue([]),
  },
  BrowserWindow: Object.assign(
    jest.fn().mockImplementation(() => ({
      loadFile: jest.fn().mockResolvedValue(),
      on: jest.fn(),
      once: jest.fn(),
      webContents: {
        openDevTools: jest.fn(),
        send: jest.fn()
      },
      show: jest.fn()
    })),
    {
      getAllWindows: jest.fn().mockReturnValue([])
    }
  ),
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  ipcMain: {
    on: jest.fn((event, callback) => {})
  }
}));

// Mock electron-reload if it exists
jest.mock('electron-reload', () => jest.fn());

// Mock WebTorrent
jest.mock('webtorrent', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    destroy: jest.fn()
  }));
});

// Mock DOM elements for renderer tests
global.document = {
  getElementById: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

global.window = {
  addEventListener: jest.fn()
};

// Mock URL
global.URL = {
  createObjectURL: jest.fn(),
  revokeObjectURL: jest.fn()
};

// Mock Blob
global.Blob = jest.fn();

// Mock console methods to avoid noise in tests
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};