// Use require in a way that avoids module system in the compiled output
const { ipcRenderer } = require('electron');
const WebTorrent = require('webtorrent');

// Define types for our WebTorrent elements
interface TorrentFile {
  name: string;
  length: number;
  createReadStream: () => any;
  appendTo: (selector: string | HTMLElement, callback?: (err: Error | null, elem?: HTMLElement) => void) => void;
  renderTo: (selector: string | HTMLElement, options: any, callback?: (err: Error | null, elem?: HTMLElement) => void) => void;
}

interface Torrent {
  name: string;
  files: TorrentFile[];
  downloaded: number;
  length: number;
  downloadSpeed: number;
  numPeers: number;
  on: (event: string, callback: (...args: any[]) => void) => void;
  destroy: () => void;
}

let client: any | null;
let torrent: Torrent | null = null;
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

// Initialize WebTorrent client
function initWebTorrent(): void {
  console.log('Initializing WebTorrent client...');
  client = new WebTorrent();
  console.log('WebTorrent client initialized');
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

// Update torrent stats
function updateStats(): void {
  if (!torrent || !progressFill || !progress || !downloadSpeed || !peers) return;

  const downloaded = torrent.downloaded;
  const total = torrent.length;
  const progressPercent = total > 0 ? (downloaded / total) * 100 : 0;

  progressFill.style.width = `${progressPercent}%`;
  if (progress) progress.textContent = `${progressPercent.toFixed(1)}%`;

  // Download speed
  const speed = torrent.downloadSpeed;
  if (downloadSpeed) downloadSpeed.textContent = formatBytes(speed) + '/s';

  // Peers
  if (peers) peers.textContent = `${torrent.numPeers} peers`;
}

// Format bytes for display
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}



// Load magnet URL
function loadMagnet(magnetUrl: string): void {
  if (!magnetUrl.startsWith('magnet:')) {
    showError('Invalid magnet URL. Please enter a valid magnet link.');
    return;
  }

  if (!client) {
    showError('WebTorrent client not initialized.');
    return;
  }

  showLoading();
  switchScreen('player');
  if (videoTitle) videoTitle.textContent = 'Loading torrent...';

  // Destroy existing torrent if any
  if (torrent) {
    torrent.destroy();
  }

  try {
    client.add(magnetUrl, (torrentObj: any) => {
      torrent = torrentObj as Torrent;

      // Set up torrent event listeners
      torrent.on('ready', () => {
        console.log('Torrent ready');
        if (torrent) {  // Check that torrent is still available
          const videoFiles = torrent.files.filter(file => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(file.name));
          const videoFile = videoFiles.length > 0 ? videoFiles.reduce((largest, file) => 
            !largest || file.length > largest.length ? file : largest, null as TorrentFile | null) : null;
          
          if (videoFile) {
            console.log('Found video file:', videoFile.name, 'Size:', videoFile.length);
            if (videoTitle) videoTitle.textContent = torrent.name || 'Unknown';
            hideLoading();
            playVideo(videoFile);
          } else {
            console.log('No video files found in torrent');
            showError('No video files found in this torrent.');
            switchScreen('input');
          }
        }
      });

      torrent.on('download', () => {
        updateStats();
      });

      torrent.on('done', () => {
        console.log('Torrent download complete');
        updateStats();
      });

      torrent.on('error', (err: Error) => {
        console.error('Torrent error:', err);
        showError('Error loading torrent: ' + err.message);
        switchScreen('input');
      });
    });
  } catch (error) {
    console.error('Error adding torrent:', error);
    showError('Error loading magnet URL: ' + (error as Error).message);
    switchScreen('input');
  }
}

// Play video file
function playVideo(file: TorrentFile): void {
  console.log('Playing video file:', file.name, 'Size:', file.length);

  if (!videoPlayer) {
    showError('Video player element not found.');
    return;
  }

  // Determine MIME type based on file extension
  let mimeType = 'video/mp4'; // default
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'mp4':
      mimeType = 'video/mp4';
      break;
    case 'mkv':
      mimeType = 'video/x-matroska';
      break;
    case 'avi':
      mimeType = 'video/x-msvideo';
      break;
    case 'mov':
      mimeType = 'video/quicktime';
      break;
    case 'wmv':
      mimeType = 'video/x-ms-wmv';
      break;
    case 'flv':
      mimeType = 'video/x-flv';
      break;
    case 'webm':
      mimeType = 'video/webm';
      break;
  }

  console.log('Using MIME type:', mimeType, 'for file:', file.name);

  try {
    // Clear previous event listeners
    const onVideoLoaded = () => {
      console.log('Video loaded successfully');
      if (videoPlayer) {
        videoPlayer.play().catch(err => {
          console.error('Error playing video:', err);
          showError('Error playing video: ' + (err as Error).message);
        });
      }
    };

    const onVideoError = (e: Event) => {
      console.error('Video element error:', e);
      showError('Error loading video file. The file format may not be supported.');
    };

    videoPlayer.removeEventListener('loadeddata', onVideoLoaded);
    videoPlayer.removeEventListener('error', onVideoError);

    // Add new event listeners
    videoPlayer.addEventListener('loadeddata', onVideoLoaded);
    videoPlayer.addEventListener('error', onVideoError);

    // Create a stream immediately and start loading
    const stream = file.createReadStream();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    // For Soda Player-like experience, we'll implement progressive loading
    stream.on('data', (chunk: Buffer) => {
      console.log('Received chunk of size:', chunk.length);
      // Convert Buffer to array of bytes to avoid ArrayBuffer compatibility issues
      const bytes = new Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        bytes[i] = chunk[i];
      }
      chunks.push(new Uint8Array(bytes));
      totalSize += chunk.length;

      // Start playing as soon as we have enough data
      if (totalSize > 1024 * 1024 && videoPlayer.src === '') { // 1MB threshold
        const uint8Array = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
          uint8Array.set(chunk, offset);
          offset += chunk.length;
        }
        const blob = new Blob([uint8Array], { type: mimeType });
        const url = URL.createObjectURL(blob);
        videoPlayer.src = url;
        
        // Play once we have enough data
        videoPlayer.play().catch(err => {
          console.error('Error playing video:', err);
          // This is expected if the blob isn't fully loaded yet
        });
      }
    });

    stream.on('end', () => {
      console.log('Stream ended, finalizing video');
      
      // Create final blob if not already done
      if (videoPlayer.src === '') {
        const uint8Array = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
          uint8Array.set(chunk, offset);
          offset += chunk.length;
        }
        const blob = new Blob([uint8Array], { type: mimeType });
        const url = URL.createObjectURL(blob);
        videoPlayer.src = url;
        videoPlayer.play().catch(err => {
          console.error('Error playing video:', err);
          showError('Error playing video: ' + (err as Error).message);
        });
      }
    });

    stream.on('error', (err: Error) => {
      console.error('Stream error:', err);
      showError('Error streaming video: ' + err.message);
    });
  } catch (error) {
    console.error('Error in playVideo:', error);
    showError('Error playing video: ' + (error as Error).message);
    
    // Use the fallback method
    fallbackToManualStreaming(file, mimeType);
  }
}

// Fallback function for manual streaming
function fallbackToManualStreaming(file: TorrentFile, mimeType: string): void {
  if (!videoPlayer) {
    showError('Video player element not found.');
    return;
  }

  // Use WebTorrent's createReadStream to manually create the video source
  const fileStream = file.createReadStream();
  const chunks: ArrayBuffer[] = [];
  let totalSize = 0;

  fileStream.on('data', (chunk: any) => {
    // Ensure chunk is an ArrayBuffer
    let buffer: ArrayBuffer;
    if (chunk instanceof ArrayBuffer) {
      buffer = chunk;
    } else if (chunk instanceof Buffer) {
      // Convert Buffer to ArrayBuffer
      buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
    } else if (chunk.buffer) {
      // Handle TypedArray
      buffer = chunk.buffer;
    } else {
      // Convert to Buffer first, then to ArrayBuffer
      const buf = Buffer.from(chunk);
      buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    
    chunks.push(buffer);
    totalSize += buffer.byteLength;
  });

  fileStream.on('end', () => {
    try {
      // Create a blob from the accumulated chunks - use ArrayBuffers directly
      const uint8Arrays = chunks.map(chunk => new Uint8Array(chunk));
      const blob = new Blob(uint8Arrays, { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Clear previous event listeners
      videoPlayer.removeEventListener('loadeddata', onVideoLoaded);
      videoPlayer.removeEventListener('error', onVideoError);

      // Add new event listeners
      videoPlayer.addEventListener('loadeddata', onVideoLoaded);
      videoPlayer.addEventListener('error', onVideoError);

      if (videoPlayer) {
        videoPlayer.src = url;
      }

      function onVideoLoaded(): void {
        console.log('Video loaded successfully');
        if (videoPlayer) {
          videoPlayer.play().catch(err => {
            console.error('Error playing video:', err);
            showError('Error playing video: ' + (err as Error).message);
          });
        }
      }

      function onVideoError(e: Event): void {
        console.error('Video element error:', e);
        showError('Error loading video file. The file format may not be supported.');
      }
    } catch (error) {
      console.error('Error creating blob from chunks:', error);
      showError('Error preparing video for playback: ' + (error as Error).message);
    }
  });

  fileStream.on('error', (err: Error) => {
    console.error('Stream error:', err);
    showError('Error streaming video file: ' + err.message);
  });
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
  initWebTorrent();
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
    if (torrent) {
      torrent.destroy();
      torrent = null;
    }
    videoPlayer.src = '';
    switchScreen('input');
    magnetInput.value = '';
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
  if (torrent) {
    torrent.destroy();
  }
  if (client) {
    client.destroy();
  }
});

