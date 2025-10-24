// Mock Electron modules
jest.mock('electron', () => ({
  app: {
    on: jest.fn(),
    quit: jest.fn(),
    whenReady: jest.fn().mockResolvedValue(),
    getAllWindows: jest.fn().mockReturnValue([]),
    on: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      send: jest.fn()
    }
  })),
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  ipcMain: {
    on: jest.fn()
  }
}));

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