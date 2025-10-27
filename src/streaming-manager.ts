import { MagnetResolver, TorrentMetadata } from './magnet-resolver';
import { CacheManager } from './cache-manager';
import { SegmentDownloader } from './segment-downloader';
import { StreamServer } from './stream-server';
import { AdaptiveVideoPlayer } from './video-player';

export class StreamingManager {
  private magnetResolver: MagnetResolver;
  private cacheManager: CacheManager;
  private segmentDownloader: SegmentDownloader;
  private streamServer: StreamServer;
  private videoPlayer: AdaptiveVideoPlayer | null = null;
  private currentMetadata: TorrentMetadata | null = null;

  constructor() {
    this.magnetResolver = new MagnetResolver();
    this.cacheManager = new CacheManager();
    this.segmentDownloader = new SegmentDownloader();
    this.streamServer = new StreamServer(this.cacheManager, this.segmentDownloader);
  }

  async loadMagnet(magnetUri: string): Promise<TorrentMetadata> {
    try {
      console.log('Resolving magnet metadata...');
      this.currentMetadata = await this.magnetResolver.resolveMetadata(magnetUri);
      console.log('Metadata resolved:', this.currentMetadata.name);

      console.log('Initializing torrent for streaming...');
      await this.segmentDownloader.initializeTorrent(magnetUri);

      return this.currentMetadata;
    } catch (error) {
      console.error('Error loading magnet:', error);
      throw error;
    }
  }

  initializePlayer(videoElement: HTMLVideoElement): void {
    this.videoPlayer = new AdaptiveVideoPlayer(videoElement, this.streamServer);
  }

  startStreaming(): void {
    if (!this.videoPlayer) {
      throw new Error('Player not initialized');
    }

    const playlistUrl = this.streamServer.getPlaylistUrl();
    console.log('Starting stream with playlist:', playlistUrl);
    this.videoPlayer.loadStream(playlistUrl);
  }

  play(): Promise<void> {
    if (!this.videoPlayer) {
      throw new Error('Player not initialized');
    }
    return this.videoPlayer.play();
  }

  pause(): void {
    if (this.videoPlayer) {
      this.videoPlayer.pause();
    }
  }

  getProgress(): { downloaded: number; total: number; progress: number } {
    return this.segmentDownloader.getProgress();
  }

  getCacheStats() {
    return this.cacheManager.getStats();
  }

  destroy(): void {
    if (this.videoPlayer) {
      this.videoPlayer.dispose();
    }
    this.streamServer.destroy();
    this.segmentDownloader.destroy();
    this.cacheManager.destroy();
    this.magnetResolver.destroy();
  }
}