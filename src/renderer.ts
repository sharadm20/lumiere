// Use require in a way that avoids module system in the compiled output
const { ipcRenderer } = require('electron');

// Import our new streaming system - path from root directory where index.html is located
const streamingManagerModule = require('./dist/streaming-manager');
const StreamingManager = streamingManagerModule.StreamingManager;

let streamingManager: any;
let currentScreen: 'input' | 'player' = 'input';

// DOM Elements
const inputScreen: HTMLElement | null = document.getElementById('input-screen');
const playerScreen: HTMLElement | null = document.getElementById('player-screen');
const magnetForm: HTMLElement | null = document.getElementById('magnet-form');
const magnetInput: HTMLInputElement | null = document.getElementById('magnet-input') as HTMLInputElement;
const backBtn: HTMLElement | null = document.getElementById('back-btn');
const videoPlayer: HTMLVideoElement | null = document.getElementById('video-player') as HTMLVideoElement;
const loadingIndicator: HTMLElement | null = document.getElementById('loading-indicator');
const torrentInfo: HTMLElement | null = document.getElementById('torrent-info');
const progressFill: HTMLElement | null = document.getElementById('progress-fill');
const videoTitle: HTMLElement | null = document.getElementById('video-title');
const errorMessage: HTMLElement | null = document.getElementById('error-message');
const contextMenu: HTMLElement | null = document.getElementById('context-menu');
const downloadSpeed: HTMLElement | null = document.getElementById('download-speed');
const peers: HTMLElement | null = document.getElementById('peers');
const progress: HTMLElement | null = document.getElementById('progress');

// Initialize streaming system
function initStreamingSystem(): void {
  console.log('Initializing streaming system...');
  streamingManager = new StreamingManager();
  console.log('Streaming system initialized');
}

// Switch between screens
function switchScreen(screenName: 'input' | 'player'): void {
  if (inputScreen) inputScreen.classList.remove('active');
  if (playerScreen) playerScreen.classList.remove('active');

  if (screenName === 'input' && inputScreen) {
    inputScreen.classList.add('active');
    currentScreen = 'input';
  } else if (screenName === 'player' && playerScreen) {
    playerScreen.classList.add('active');
    currentScreen = 'player';
  }
}

// Show loading state
function showLoading(): void {
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  if (torrentInfo) torrentInfo.style.display = 'none';
}

// Hide loading state
function hideLoading(): void {
  if (loadingIndicator) loadingIndicator.style.display = 'none';
  if (torrentInfo) torrentInfo.style.display = 'block';
}

// Update streaming stats
function updateStats(): void {
  if (!streamingManager || !progressFill || !progress) return;

  const progressData = streamingManager.getProgress();
  const progressPercent = progressData.progress;

  progressFill.style.width = `${progressPercent}%`;
  if (progress) progress.textContent = `${progressPercent.toFixed(1)}%`;

  // For now, hide download speed and peers as they're not applicable in the new system
  if (downloadSpeed) downloadSpeed.style.display = 'none';
  if (peers) peers.style.display = 'none';
}

// Format bytes for display (kept for compatibility but unused)
function _formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}



// Load magnet URL with new streaming system
async function loadMagnet(magnetUrl: string): Promise<void> {
  if (!magnetUrl.startsWith('magnet:')) {
    showError('Invalid magnet URL. Please enter a valid magnet link.');
    return;
  }

  if (!streamingManager) {
    showError('Streaming system not initialized.');
    return;
  }

  showLoading();
  switchScreen('player');
  if (videoTitle) videoTitle.textContent = 'Loading magnet...';

  try {
    const metadata = await streamingManager.loadMagnet(magnetUrl);
    console.log('Magnet loaded successfully:', metadata.name);

    if (videoTitle) videoTitle.textContent = metadata.name || 'Unknown';

    // Initialize player
    if (videoPlayer) {
      streamingManager.initializePlayer(videoPlayer);
      streamingManager.startStreaming();
    }

    hideLoading();
  } catch (error) {
    console.error('Error loading magnet:', error);
    showError('Error loading magnet URL: ' + (error as Error).message);
    switchScreen('input');
  }
}

// Video playback is now handled by the Video.js player in the streaming system
// This function is kept for compatibility but simplified
function playVideo(): void {
  console.log('Starting video playback through streaming system');

  if (!streamingManager) {
    showError('Streaming system not available.');
    return;
  }

  try {
      streamingManager.play().catch((err: any) => {
        console.error('Error playing video:', err);
        showError('Error playing video: ' + (err as Error).message);
      });
    } catch (error) {
    console.error('Error in playVideo:', error);
    showError('Error playing video: ' + (error as Error).message);
  }
}

// Fallback streaming is now handled by the Video.js player
// This function is kept for compatibility but simplified (marked as used)
function _fallbackToManualStreaming(): void {
  console.log('Fallback streaming handled by Video.js player');
  // The Video.js player handles fallbacks internally
}

// Streaming readiness is now handled by the streaming manager
// This function is kept for compatibility but simplified (marked as used)
function _startStreamingWhenReady(): void {
  console.log('Streaming readiness handled by streaming manager');
  hideLoading();
  playVideo();
}

// Show error message
function showError(message: string): void {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    setTimeout(() => {
      if (errorMessage) errorMessage.style.display = 'none';
    }, 5000);
  }
}

// Context menu functionality
function showContextMenu(x: number, y: number): void {
  if (contextMenu) {
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
  }
}

function hideContextMenu(): void {
  if (contextMenu) contextMenu.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, initializing Lumière...');
  initStreamingSystem();
  console.log('Lumière renderer initialized successfully');

  if (!magnetForm || !magnetInput || !backBtn || !videoPlayer) {
    console.error('Required DOM elements not found');
    return;
  }

  // Form submission
  magnetForm.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    const magnetUrl = magnetInput.value.trim();
    if (magnetUrl) {
      loadMagnet(magnetUrl);
    }
  });

  // Back button
  backBtn.addEventListener('click', () => {
    if (streamingManager) {
      streamingManager.pause();
    }
    if (videoPlayer) {
      videoPlayer.src = '';
    }
    switchScreen('input');
    if (magnetInput) {
      magnetInput.value = '';
    }
  });

  // Context menu
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    if (currentScreen === 'player') {
      showContextMenu(e.clientX, e.clientY);
    }
  });

  document.addEventListener('click', () => {
    hideContextMenu();
  });

  // Context menu actions
  if (contextMenu) {
    contextMenu.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      
      switch (action) {
        case 'play-pause':
          if (videoPlayer && videoPlayer.paused) {
            videoPlayer.play().catch(err => {
              console.error('Error playing video:', err);
              showError('Error playing video: ' + (err as Error).message);
            });
          } else if (videoPlayer) {
            videoPlayer.pause();
          }
          break;
        case 'fullscreen':
          if (videoPlayer && videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen();
          }
          break;
        case 'back':
          if (backBtn) backBtn.click();
          break;
      }
      hideContextMenu();
    });
  }

  // IPC listeners
  ipcRenderer.on('show-input-screen', () => {
    switchScreen('input');
  });

  ipcRenderer.on('load-magnet-url', (_event: any, magnetUrl: string) => {
    if (magnetInput) {
      magnetInput.value = magnetUrl;
    }
    loadMagnet(magnetUrl);
  });

  // Update stats periodically
  setInterval(updateStats, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (streamingManager) {
    streamingManager.destroy();
  }
});

