import WebTorrent from 'webtorrent';
import { TorrentFile } from './magnet-resolver';

export class SegmentDownloader {
  private client: any;
  private torrent: any = null;
  private videoFile: any = null;

  constructor() {
    this.client = new WebTorrent();
  }

  async initializeTorrent(magnetUri: string): Promise<TorrentFile[]> {
    return new Promise((resolve, reject) => {
      this.torrent = this.client.add(magnetUri, { destroyOnDone: false });

      this.torrent.on('metadata', () => {
        const videoFiles = this.torrent!.files.filter((file: any) =>
          /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(file.name)
        );

        if (videoFiles.length === 0) {
          this.torrent!.destroy();
          reject(new Error('No video files found in torrent'));
          return;
        }

        // Select the largest video file
        this.videoFile = videoFiles.reduce((largest: any, file: any) =>
          !largest || file.length > largest.length ? file : largest
        );

        resolve(this.torrent!.files.map((f: any) => ({
          name: f.name,
          length: f.length,
          path: f.path
        })));
      });

      this.torrent.on('error', (err: any) => {
        reject(err);
      });

      // Timeout
      setTimeout(() => {
        if (this.torrent) {
          this.torrent.destroy();
        }
        reject(new Error('Torrent initialization timeout'));
      }, 60000);
    });
  }

  async downloadSegment(segmentId: string): Promise<Buffer | null> {
    if (!this.videoFile || !this.torrent) {
      throw new Error('Torrent not initialized');
    }

    // Parse segmentId to determine which segment is being requested
    const segmentIndex = this.parseSegmentIndex(segmentId);
    
    // Calculate the segment size based on file size to create proper segments
    const segmentSize = Math.ceil(this.videoFile.length / 10); // Divide file into 10 segments
    const start = segmentIndex * segmentSize;
    const end = Math.min(start + segmentSize - 1, this.videoFile.length - 1);

    // Check if the requested segment is beyond the file size
    if (start >= this.videoFile.length) {
      return null; // No more segments to return
    }

    return new Promise((resolve, reject) => {
      try {
        // Create a stream for the specific byte range
        const stream = this.videoFile.createReadStream({ start, end });
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });

        stream.on('error', (err: any) => {
          console.error(`Error reading segment range ${start}-${end}:`, err);
          reject(err);
        });
      } catch (error) {
        console.error('Error creating stream for segment:', error);
        reject(error);
      }
    });
  }

  private parseSegmentIndex(segmentId: string): number {
    // Extract segment index from segmentId like "segment1", "segment2", etc.
    const match = segmentId.match(/segment(\d+)/);
    if (match) {
      return parseInt(match[1], 10) - 1; // Convert to 0-based index
    }
    return 0;
  }

  getProgress(): { downloaded: number; total: number; progress: number } {
    if (!this.torrent) {
      return { downloaded: 0, total: 0, progress: 0 };
    }

    const downloaded = this.torrent.downloaded;
    const total = this.torrent.length;
    const progress = total > 0 ? (downloaded / total) * 100 : 0;

    return { downloaded, total, progress };
  }

  destroy(): void {
    if (this.torrent) {
      this.torrent.destroy();
      this.torrent = null;
      this.videoFile = null;
    }
    if (this.client) {
      this.client.destroy();
    }
  }
}