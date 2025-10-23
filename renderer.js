const { ipcRenderer } = require('electron');
const WebTorrent = require('webtorrent');

let client;
let torrent;
let currentScreen = 'input';

// DOM Elements
const inputScreen = document.getElementById('input-screen');
const playerScreen = document.getElementById('player-screen');
const magnetForm = document.getElementById('magnet-form');
const magnetInput = document.getElementById('magnet-input');
const playBtn = document.getElementById('play-btn');
const backBtn = document.getElementById('back-btn');
const videoPlayer = document.getElementById('video-player');
const loadingIndicator = document.getElementById('loading-indicator');
const torrentInfo = document.getElementById('torrent-info');
const progressFill = document.getElementById('progress-fill');
const videoTitle = document.getElementById('video-title');
const errorMessage = document.getElementById('error-message');
const contextMenu = document.getElementById('context-menu');

// Stats elements
const downloadSpeed = document.getElementById('download-speed');
const peers = document.getElementById('peers');
const progress = document.getElementById('progress');

// Initialize WebTorrent client
function initWebTorrent() {
    client = new WebTorrent();
}

// Switch between screens
function switchScreen(screenName) {
    inputScreen.classList.remove('active');
    playerScreen.classList.remove('active');

    if (screenName === 'input') {
        inputScreen.classList.add('active');
        currentScreen = 'input';
    } else if (screenName === 'player') {
        playerScreen.classList.add('active');
        currentScreen = 'player';
    }
}

// Show loading state
function showLoading() {
    loadingIndicator.style.display = 'block';
    torrentInfo.style.display = 'none';
}

// Hide loading state
function hideLoading() {
    loadingIndicator.style.display = 'none';
    torrentInfo.style.display = 'block';
}

// Update torrent stats
function updateStats() {
    if (!torrent) return;

    const downloaded = torrent.downloaded;
    const total = torrent.length;
    const progressPercent = total > 0 ? (downloaded / total) * 100 : 0;

    progressFill.style.width = `${progressPercent}%`;
    progress.textContent = `${progressPercent.toFixed(1)}%`;

    // Download speed
    const speed = torrent.downloadSpeed;
    downloadSpeed.textContent = formatBytes(speed) + '/s';

    // Peers
    peers.textContent = `${torrent.numPeers} peers`;
}

// Format bytes for display
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Load magnet URL
function loadMagnet(magnetUrl) {
    if (!magnetUrl.startsWith('magnet:')) {
        showError('Invalid magnet URL. Please enter a valid magnet link.');
        return;
    }

    showLoading();
    switchScreen('player');
    videoTitle.textContent = 'Loading torrent...';

    // Destroy existing torrent if any
    if (torrent) {
        torrent.destroy();
    }

    try {
        client.add(magnetUrl, (torrentObj) => {
            torrent = torrentObj;

            // Set up torrent event listeners
            torrent.on('ready', () => {
                console.log('Torrent ready');
                videoTitle.textContent = torrent.name || 'Unknown';

                // Find the largest video file
                const videoFile = torrent.files.reduce((largest, file) => {
                    const isVideo = /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(file.name);
                    if (isVideo && (!largest || file.length > largest.length)) {
                        return file;
                    }
                    return largest;
                }, null);

                if (videoFile) {
                    hideLoading();
                    playVideo(videoFile);
                } else {
                    showError('No video files found in this torrent.');
                    switchScreen('input');
                }
            });

            torrent.on('download', () => {
                updateStats();
            });

            torrent.on('done', () => {
                console.log('Torrent download complete');
                updateStats();
            });

            torrent.on('error', (err) => {
                console.error('Torrent error:', err);
                showError('Error loading torrent: ' + err.message);
                switchScreen('input');
            });
        });
    } catch (error) {
        console.error('Error adding torrent:', error);
        showError('Error loading magnet URL: ' + error.message);
        switchScreen('input');
    }
}

// Play video file
function playVideo(file) {
    const fileURL = file.createReadStream();
    const chunks = [];

    fileURL.on('data', (chunk) => {
        chunks.push(chunk);
    });

    fileURL.on('end', () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        videoPlayer.src = url;
        videoPlayer.play();
    });
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Context menu functionality
function showContextMenu(x, y) {
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initWebTorrent();

    // Form submission
    magnetForm.addEventListener('submit', (e) => {
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
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (currentScreen === 'player') {
            showContextMenu(e.clientX, e.clientY);
        }
    });

    document.addEventListener('click', () => {
        hideContextMenu();
    });

    // Context menu actions
    contextMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        switch (action) {
            case 'play-pause':
                if (videoPlayer.paused) {
                    videoPlayer.play();
                } else {
                    videoPlayer.pause();
                }
                break;
            case 'fullscreen':
                if (videoPlayer.requestFullscreen) {
                    videoPlayer.requestFullscreen();
                }
                break;
            case 'back':
                backBtn.click();
                break;
        }
        hideContextMenu();
    });

    // IPC listeners
    ipcRenderer.on('show-input-screen', () => {
        switchScreen('input');
    });

    ipcRenderer.on('load-magnet-url', (event, magnetUrl) => {
        magnetInput.value = magnetUrl;
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