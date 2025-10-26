declare module 'webtorrent' {
  interface Instance {
    add: (torrentId: string, options?: any, callback?: (torrent: any) => void) => any;
    destroy: (callback?: () => void) => void;
  }

  interface WebTorrentStatic {
    new (options?: any): Instance;
  }

  const WebTorrent: WebTorrentStatic;
  export = WebTorrent;
}