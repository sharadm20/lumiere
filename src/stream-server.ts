import express from 'express';
import { CacheManager } from './cache-manager';
import { SegmentDownloader } from './segment-downloader';

export class StreamServer {
  private app: express.Application;
  private cacheManager: CacheManager;
  private segmentDownloader: SegmentDownloader;
  private server: any;
  private port: number;

  constructor(cacheManager: CacheManager, segmentDownloader: SegmentDownloader, port: number = 0) {
    this.cacheManager = cacheManager;
    this.segmentDownloader = segmentDownloader;
    this.port = port;
    this.app = express();

    this.setupRoutes();
    this.startServer();
  }

  private setupRoutes(): void {
    // Serve HLS playlist
    this.app.get('/playlist.m3u8', async (__req, res) => {
      try {
        const playlist = await this.generateHLSPlaylist();
        res.type('application/vnd.apple.mpegurl');
        res.send(playlist);
      } catch (error) {
        console.error('Error generating playlist:', error);
        res.status(500).send('Error generating playlist');
      }
    });

    // Serve video segments
    this.app.get('/segment/:id', async (_req, res) => {
      const segmentId = _req.params.id;

      try {
        // Check cache first
        let segment = await this.cacheManager.get(segmentId);

        if (!segment) {
          // Download segment if not cached
          segment = await this.segmentDownloader.downloadSegment(segmentId);
          if (segment) {
            await this.cacheManager.store(segmentId, segment);
          }
        }

        if (segment) {
          res.type('video/MP2T');
          res.send(segment);
        } else {
          res.status(404).send('Segment not found');
        }
      } catch (error) {
        console.error(`Error serving segment ${segmentId}:`, error);
        res.status(500).send('Error serving segment');
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', cache: this.cacheManager.getStats() });
    });
  }

  private async generateHLSPlaylist(): Promise<string> {
    // For now, generate a simple playlist
    // In a real implementation, this would be based on the actual video segments
    const segments = await this.getAvailableSegments();

    let playlist = '#EXTM3U8\n';
    playlist += '#EXT-X-VERSION:3\n';
    playlist += '#EXT-X-TARGETDURATION:10\n';
    playlist += '#EXT-X-MEDIA-SEQUENCE:0\n';

    for (const segment of segments) {
      playlist += `#EXTINF:10.0,\n`;
      playlist += `segment/${segment}\n`;
    }

    playlist += '#EXT-X-ENDLIST\n';
    return playlist;
  }

  private async getAvailableSegments(): Promise<string[]> {
    // This is a placeholder - in reality, you'd track available segments
    // For now, return some dummy segments
    return ['segment1', 'segment2', 'segment3'];
  }

  private startServer(): void {
    this.server = this.app.listen(this.port, () => {
      const address = this.server.address();
      if (typeof address === 'object' && address !== null) {
        console.log(`Stream server listening on port ${address.port}`);
        this.port = address.port;
      }
    });
  }

  getPort(): number {
    return this.port;
  }

  getPlaylistUrl(): string {
    return `http://localhost:${this.port}/playlist.m3u8`;
  }

  destroy(): void {
    if (this.server) {
      this.server.close();
    }
  }
}