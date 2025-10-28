const { JSDOM } = require('jsdom');

// Mock WebTorrent before importing renderer code
jest.mock('webtorrent');

// Mock Electron IPC
jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn()
  }
}));

// Set up JSDOM for DOM testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock video element
const mockVideoElement = {
  src: '',
  play: jest.fn().mockResolvedValue(),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestFullscreen: jest.fn().mockResolvedValue(),
  paused: false
};

// Mock DOM elements
document.getElementById = jest.fn((id) => {
  const elements = {
    'input-screen': { classList: { remove: jest.fn(), add: jest.fn(), contains: jest.fn() } },
    'player-screen': { classList: { remove: jest.fn(), add: jest.fn(), contains: jest.fn() } },
    'magnet-form': { addEventListener: jest.fn() },
    'magnet-input': { value: '', addEventListener: jest.fn() },
    'play-btn': {},
    'back-btn': { click: jest.fn(), addEventListener: jest.fn() },
    'video-player': mockVideoElement,
    'loading-indicator': { style: {} },
    'torrent-info': { style: {} },
    'progress-fill': { style: {} },
    'video-title': { textContent: '' },
    'error-message': { textContent: '', style: {} },
    'context-menu': { style: {}, addEventListener: jest.fn() },
    'download-speed': { textContent: '' },
    'peers': { textContent: '' },
    'progress': { textContent: '' }
  };
  return elements[id] || null;
});

document.addEventListener = jest.fn();
global.window.addEventListener = jest.fn();

// Mock URL and Blob
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};
global.Blob = jest.fn();

// Import the renderer code after mocks are set up
const renderer = require('../dist/renderer');

describe('Renderer Tests', () => {
  let mockClient;
  let mockTorrent;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset global variables
    renderer.client = null;
    renderer.torrent = null;
    renderer.currentScreen = 'input';

    // Mock WebTorrent client
    mockClient = {
      add: jest.fn(),
      destroy: jest.fn()
    };

    // Mock torrent object
    mockTorrent = {
      name: 'Test Movie',
      files: [
        { name: 'movie.mp4', length: 1000000, createReadStream: jest.fn() },
        { name: 'subtitle.srt', length: 1000, createReadStream: jest.fn() }
      ],
      downloaded: 500000,
      length: 1000000,
      downloadSpeed: 102400,
      numPeers: 5,
      on: jest.fn(),
      destroy: jest.fn()
    };

    // Set up WebTorrent mock
    const WebTorrent = require('webtorrent');
    WebTorrent.mockImplementation(() => mockClient);
  });

  describe('initWebTorrent', () => {
    test('should initialize WebTorrent client', () => {
      renderer.initWebTorrent();
      expect(renderer.client).toBe(mockClient);
    });
  });

  describe('switchScreen', () => {
    test('should switch to input screen', () => {
      const inputScreen = document.getElementById('input-screen');
      const playerScreen = document.getElementById('player-screen');

      renderer.switchScreen('input');

      expect(inputScreen.classList.add).toHaveBeenCalledWith('active');
      expect(playerScreen.classList.remove).toHaveBeenCalledWith('active');
      expect(renderer.currentScreen).toBe('input');
    });

    test('should switch to player screen', () => {
      const inputScreen = document.getElementById('input-screen');
      const playerScreen = document.getElementById('player-screen');

      renderer.switchScreen('player');

      expect(playerScreen.classList.add).toHaveBeenCalledWith('active');
      expect(inputScreen.classList.remove).toHaveBeenCalledWith('active');
      expect(renderer.currentScreen).toBe('player');
    });
  });

  describe('formatBytes', () => {
    test('should format bytes correctly', () => {
      expect(renderer.formatBytes(0)).toBe('0 B');
      expect(renderer.formatBytes(1024)).toBe('1.0 KB');
      expect(renderer.formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(renderer.formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('updateStats', () => {
    test('should update torrent statistics', () => {
      renderer.torrent = mockTorrent;

      renderer.updateStats();

      const progressFill = document.getElementById('progress-fill');
      const downloadSpeed = document.getElementById('download-speed');
      const peers = document.getElementById('peers');
      const progress = document.getElementById('progress');

      expect(progressFill.style.width).toBe('50%');
      expect(downloadSpeed.textContent).toBe('100.0 KB/s');
      expect(peers.textContent).toBe('5 peers');
      expect(progress.textContent).toBe('50.0%');
    });

    test('should handle zero torrent length', () => {
      renderer.torrent = { ...mockTorrent, length: 0 };

      renderer.updateStats();

      const progress = document.getElementById('progress');
      expect(progress.textContent).toBe('0.0%');
    });
  });

  describe('showError', () => {
    test('should display error message', () => {
      const errorMessage = document.getElementById('error-message');

      renderer.showError('Test error message');

      expect(errorMessage.textContent).toBe('Test error message');
      expect(errorMessage.style.display).toBe('block');
    });

    test('should hide error after timeout', () => {
      jest.useFakeTimers();
      const errorMessage = document.getElementById('error-message');

      renderer.showError('Test error');

      expect(errorMessage.style.display).toBe('block');

      jest.advanceTimersByTime(5000);

      expect(errorMessage.style.display).toBe('none');

      jest.useRealTimers();
    });
  });

  describe('loadMagnet', () => {
    beforeEach(() => {
      renderer.initWebTorrent();
    });

    test('should reject invalid magnet URLs', () => {
      const showError = jest.spyOn(renderer, 'showError');

      renderer.loadMagnet('invalid-url');

      expect(showError).toHaveBeenCalledWith('Invalid magnet URL. Please enter a valid magnet link.');
    });

    test('should add valid magnet URL to client', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:test-hash';
      const switchScreen = jest.spyOn(renderer, 'switchScreen');

      renderer.loadMagnet(magnetUrl);

      expect(mockClient.add).toHaveBeenCalledWith(magnetUrl, expect.any(Function));
      expect(switchScreen).toHaveBeenCalledWith('player');
    });

    test('should handle torrent ready event', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:test-hash';
      const hideLoading = jest.spyOn(renderer, 'hideLoading');
      const playVideo = jest.spyOn(renderer, 'playVideo');
      const videoTitle = document.getElementById('video-title');

      renderer.loadMagnet(magnetUrl);

      // Get the callback passed to client.add
      const addCallback = mockClient.add.mock.calls[0][1];

      // Simulate torrent ready
      addCallback(mockTorrent);

      // Trigger ready event
      const readyCallback = mockTorrent.on.mock.calls.find(call => call[0] === 'ready')[1];
      readyCallback();

      expect(videoTitle.textContent).toBe('Test Movie');
      expect(hideLoading).toHaveBeenCalled();
      expect(playVideo).toHaveBeenCalledWith(mockTorrent.files[0]);
    });

    test('should handle no video files in torrent', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:test-hash';
      const showError = jest.spyOn(renderer, 'showError');
      const switchScreen = jest.spyOn(renderer, 'switchScreen');

      // Mock torrent with no video files
      const noVideoTorrent = {
        ...mockTorrent,
        files: [{ name: 'document.pdf', length: 1000, createReadStream: jest.fn() }]
      };

      renderer.loadMagnet(magnetUrl);

      const addCallback = mockClient.add.mock.calls[0][1];
      addCallback(noVideoTorrent);

      const readyCallback = noVideoTorrent.on.mock.calls.find(call => call[0] === 'ready')[1];
      readyCallback();

      expect(showError).toHaveBeenCalledWith('No video files found in this torrent.');
      expect(switchScreen).toHaveBeenCalledWith('input');
    });

    test('should handle torrent errors', () => {
      const magnetUrl = 'magnet:?xt=urn:btih:test-hash';
      const showError = jest.spyOn(renderer, 'showError');
      const switchScreen = jest.spyOn(renderer, 'switchScreen');

      renderer.loadMagnet(magnetUrl);

      const addCallback = mockClient.add.mock.calls[0][1];
      addCallback(mockTorrent);

      const errorCallback = mockTorrent.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Network error');
      errorCallback(testError);

      expect(showError).toHaveBeenCalledWith('Error loading torrent: Network error');
      expect(switchScreen).toHaveBeenCalledWith('input');
    });
  });

  describe('playVideo', () => {
    let mockFile;
    let mockStream;

    beforeEach(() => {
      mockFile = {
        name: 'test.mp4',
        length: 1000000,
        createReadStream: jest.fn()
      };

      mockStream = {
        on: jest.fn(),
        emit: jest.fn()
      };

      mockFile.createReadStream.mockReturnValue(mockStream);
      global.URL.createObjectURL.mockReturnValue('blob:test-url');
    });

    test('should create video stream and play', () => {
      const videoPlayer = document.getElementById('video-player');

      renderer.playVideo(mockFile);

      expect(mockFile.createReadStream).toHaveBeenCalled();
      expect(mockStream.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockStream.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockStream.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should handle stream data and create blob', () => {
      const videoPlayer = document.getElementById('video-player');
      const testChunk = Buffer.from('test video data');

      renderer.playVideo(mockFile);

      // Get data callback
      const dataCallback = mockStream.on.mock.calls.find(call => call[0] === 'data')[1];
      dataCallback(testChunk);

      // Get end callback and trigger it
      const endCallback = mockStream.on.mock.calls.find(call => call[0] === 'end')[1];
      endCallback();

      expect(global.Blob).toHaveBeenCalledWith([testChunk], { type: 'video/mp4' });
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(videoPlayer.src).toBe('blob:test-url');
      expect(videoPlayer.play).toHaveBeenCalled();
    });

    test('should determine correct MIME types', () => {
      const testCases = [
        { filename: 'video.mp4', expectedType: 'video/mp4' },
        { filename: 'video.mkv', expectedType: 'video/x-matroska' },
        { filename: 'video.avi', expectedType: 'video/x-msvideo' },
        { filename: 'video.mov', expectedType: 'video/quicktime' },
        { filename: 'video.wmv', expectedType: 'video/x-ms-wmv' },
        { filename: 'video.flv', expectedType: 'video/x-flv' },
        { filename: 'video.webm', expectedType: 'video/webm' },
        { filename: 'video.unknown', expectedType: 'video/mp4' } // default
      ];

      testCases.forEach(({ filename, expectedType }) => {
        const testFile = { ...mockFile, name: filename };
        renderer.playVideo(testFile);

        const endCallback = mockStream.on.mock.calls.find(call => call[0] === 'end')[1];
        endCallback();

        expect(global.Blob).toHaveBeenCalledWith(expect.any(Array), { type: expectedType });
      });
    });

    test('should handle stream errors', () => {
      const showError = jest.spyOn(renderer, 'showError');

      renderer.playVideo(mockFile);

      const errorCallback = mockStream.on.mock.calls.find(call => call[0] === 'error')[1];
      const testError = new Error('Stream error');
      errorCallback(testError);

      expect(showError).toHaveBeenCalledWith('Error streaming video file: Stream error');
    });

    test('should handle video playback errors', () => {
      const showError = jest.spyOn(renderer, 'showError');
      const videoPlayer = document.getElementById('video-player');

      renderer.playVideo(mockFile);

      const endCallback = mockStream.on.mock.calls.find(call => call[0] === 'end')[1];
      endCallback();

      // Simulate video error
      const errorCallback = videoPlayer.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      errorCallback();

      expect(showError).toHaveBeenCalledWith('Error loading video file. The file format may not be supported.');
    });
  });

  describe('context menu functionality', () => {
    test('should show context menu on right click in player screen', () => {
      renderer.currentScreen = 'player';
      const contextMenu = document.getElementById('context-menu');
      const showContextMenu = jest.spyOn(renderer, 'showContextMenu');

      // Simulate right-click event
      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 100,
        clientY: 200
      };

      // Trigger context menu event listener
      const contextMenuListener = document.addEventListener.mock.calls.find(
        call => call[0] === 'contextmenu'
      )[1];
      contextMenuListener(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(showContextMenu).toHaveBeenCalledWith(100, 200);
    });

    test('should not show context menu on right click in input screen', () => {
      renderer.currentScreen = 'input';
      const showContextMenu = jest.spyOn(renderer, 'showContextMenu');

      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 100,
        clientY: 200
      };

      const contextMenuListener = document.addEventListener.mock.calls.find(
        call => call[0] === 'contextmenu'
      )[1];
      contextMenuListener(mockEvent);

      expect(showContextMenu).not.toHaveBeenCalled();
    });

    test('should handle context menu actions', () => {
      const contextMenu = document.getElementById('context-menu');
      const videoPlayer = document.getElementById('video-player');
      const backBtn = document.getElementById('back-btn');

      // Mock click event on play-pause
      const mockClickEvent = {
        target: { dataset: { action: 'play-pause' } }
      };

      const clickListener = contextMenu.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      clickListener(mockClickEvent);

      expect(videoPlayer.play).toHaveBeenCalled();

      // Mock click event on fullscreen
      mockClickEvent.target.dataset.action = 'fullscreen';
      clickListener(mockClickEvent);

      expect(videoPlayer.requestFullscreen).toHaveBeenCalled();

      // Mock click event on back
      mockClickEvent.target.dataset.action = 'back';
      clickListener(mockClickEvent);

      expect(backBtn.click).toHaveBeenCalled();
    });
  });
});