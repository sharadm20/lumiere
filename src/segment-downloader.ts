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

  async downloadSegment(_segmentId: string): Promise<Buffer | null> {
    if (!this.videoFile || !this.torrent) {
      throw new Error('Torrent not initialized');
    }

    // For now, download the entire file in chunks
    // In a real implementation, you'd parse segmentId to determine which part to download
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = this.videoFile!.createReadStream();

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      stream.on('error', (err: any) => {
        reject(err);
      });
    });
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