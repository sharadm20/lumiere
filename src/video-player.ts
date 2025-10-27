import videojs from 'video.js';
import 'video.js/dist/video-js.css';

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
      preload: 'metadata',
      fluid: true,
      responsive: true
    });

    this.setupQualityLevels();
    this.setupNetworkMonitoring();
    this.setupErrorHandling();
  }

  private setupQualityLevels(): void {
    const qualityLevels = this.player.qualityLevels();

    qualityLevels.on('addqualitylevel', (_event: any) => {
      const qualityLevel = _event.qualityLevel;

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
    // Simple bandwidth estimation based on download progress
    // In a real implementation, you'd use more sophisticated methods
    const tech = this.player.tech();
    if (tech && tech.hls) {
      const hls = tech.hls;
      const stats = hls.stats;
      return stats.bandwidth || 1000000; // Default to 1Mbps
    }
    return 1000000; // Default fallback
  }

  private adjustQualityForNetwork(bandwidth: number): void {
    const qualityLevels = this.player.qualityLevels();

    // Adjust quality based on bandwidth
    for (let i = 0; i < qualityLevels.length; i++) {
      const level = qualityLevels.get(i);

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
      type: 'application/x-mpegURL'
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