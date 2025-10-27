import WebTorrent from 'webtorrent';

export interface TorrentFile {
  name: string;
  length: number;
  path: string;
}

export interface TorrentMetadata {
  name: string;
  files: TorrentFile[];
  infoHash: string;
  length: number;
}

export class MagnetResolver {
  private client: any;

  constructor() {
    this.client = new WebTorrent();
  }

  async resolveMetadata(magnetUri: string): Promise<TorrentMetadata> {
    return new Promise((resolve, reject) => {
      const torrent = this.client.add(magnetUri, { destroyOnDone: false });

      torrent.on('metadata', () => {
        const metadata: TorrentMetadata = {
          name: torrent.name,
          files: torrent.files.map((f: any) => ({
            name: f.name,
            length: f.length,
            path: f.path
          })),
          infoHash: torrent.infoHash,
          length: torrent.length
        };
        torrent.destroy();
        resolve(metadata);
      });

      torrent.on('error', (err: any) => {
        torrent.destroy();
        reject(err);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        torrent.destroy();
        reject(new Error('Metadata resolution timeout'));
      }, 30000);
    });
  }

  destroy(): void {
    if (this.client) {
      this.client.destroy();
    }
  }
}