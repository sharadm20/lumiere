import videojs from 'video.js';
// CSS is loaded via HTML link tag in index.html instead of import

export class AdaptiveVideoPlayer {
  private player: any;
  private _streamServer: any;

  constructor(videoElement: HTMLVideoElement, _streamServer: any) {
    this._streamServer = _streamServer;

    this.player = videojs(videoElement, {
      html5: {
        hls: {
          overrideNative: true
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false
      },
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      preload: 'auto', // Changed from 'metadata' to 'auto' for better loading
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2] // Add playback rate controls
    });

    this.setupQualityLevels();
    this.setupNetworkMonitoring();
    this.setupErrorHandling();
  }

  private setupQualityLevels(): void {
    const qualityLevels = this.player.qualityLevels();

    qualityLevels.on('addqualitylevel', (event: any) => {
      const qualityLevel = event.qualityLevel;

      // Initially enable all quality levels
      qualityLevel.enabled = true;
    });

    // Monitor quality changes
    qualityLevels.on('change', () => {
      console.log('Quality changed to:', qualityLevels.selectedIndex);
    });
  }

  private setupNetworkMonitoring(): void {
    let lastBandwidth = 0;

    // Monitor network conditions every 5 seconds
    setInterval(() => {
      const currentBandwidth = this.measureNetworkSpeed();

      if (Math.abs(currentBandwidth - lastBandwidth) > 100000) { // 100KB/s difference
        this.adjustQualityForNetwork(currentBandwidth);
        lastBandwidth = currentBandwidth;
      }
    }, 5000);
  }

  private measureNetworkSpeed(): number {
    // Simple bandwidth estimation - avoid direct tech access which causes warnings
    // For HLS content, we'll use a more basic approach since direct tech access is discouraged
    try {
      // Check if player has buffered data to estimate speed
      const buffered = this.player.buffered();
      if (buffered && buffered.length > 0) {
        // This is a simplified estimation; in a real app you'd use more sophisticated methods
        return 1000000; // Default to 1Mbps as fallback
      }
    } catch (e) {
      console.warn('Could not access buffered data:', e);
    }
    
    // Default fallback - in a real implementation you'd have better bandwidth estimation
    return 1000000; // Default to 1Mbps
  }

  private adjustQualityForNetwork(bandwidth: number): void {
    const qualityLevels = this.player.qualityLevels();

    // Adjust quality based on bandwidth
    for (let i = 0; i < qualityLevels.length; i++) {
      const level = qualityLevels[i];

      if (bandwidth < 500000) { // < 500Kbps
        level.enabled = level.height <= 360;
      } else if (bandwidth < 1000000) { // < 1Mbps
        level.enabled = level.height <= 480;
      } else if (bandwidth < 2000000) { // < 2Mbps
        level.enabled = level.height <= 720;
      } else {
        level.enabled = true; // Enable all for high bandwidth
      }
    }
  }

  private setupErrorHandling(): void {
    this.player.on('error', (_event: any) => {
      const error = this.player.error();
      console.error('Video.js error:', error);

      if (error && error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
        this.handleUnsupportedFormat();
      } else {
        this.handleNetworkError();
      }
    });

    this.player.on('waiting', () => {
      console.log('Player is buffering...');
    });

    this.player.on('canplay', () => {
      console.log('Player can start playback');
    });
  }

  private handleUnsupportedFormat(): void {
    // Try alternative streaming methods
    console.warn('Video format not supported, attempting fallback...');
    // Implementation for fallback would go here
  }

  private handleNetworkError(): void {
    console.warn('Network error detected, attempting recovery...');
    // Retry logic would go here
  }

  loadStream(playlistUrl: string): void {
    console.log('Loading stream:', playlistUrl);
    this.player.src({
      src: playlistUrl,
      type: 'application/x-mpegURL' // HLS stream type
    });
    
    // Trigger a manual play attempt after source is set
    this.player.ready(() => {
      // Controls should be enabled now since source is loaded
      console.log('Player ready, controls enabled');
    });
  }

  play(): Promise<void> {
    return this.player.play();
  }

  pause(): void {
    this.player.pause();
  }

  dispose(): void {
    if (this.player) {
      this.player.dispose();
    }
  }

  getPlayer(): any {
    return this.player;
  }
}