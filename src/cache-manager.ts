import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface CacheEntry {
  id: string;
  data: Buffer;
  timestamp: number;
  accessCount: number;
  size: number;
}

export class CacheManager {
  private cacheDir: string;
  private maxSize: number; // Max cache size in bytes (500MB default)
  private lruCache: Map<string, CacheEntry> = new Map();
  private totalSize: number = 0;

  constructor(maxSizeMB: number = 500) {
    this.maxSize = maxSizeMB * 1024 * 1024;
    this.cacheDir = path.join(os.tmpdir(), 'lumiere-cache');

    // Ensure cache directory exists
    fs.ensureDirSync(this.cacheDir);

    // Load existing cache entries
    this.loadExistingCache();
  }

  private loadExistingCache(): void {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        const data = fs.readFileSync(filePath);

        const entry: CacheEntry = {
          id: file,
          data,
          timestamp: stats.mtime.getTime(),
          accessCount: 0,
          size: stats.size
        };

        this.lruCache.set(file, entry);
        this.totalSize += stats.size;
      }

      // Clean up if over size limit
      this.enforceSizeLimit();
    } catch (error) {
      console.warn('Failed to load existing cache:', error);
    }
  }

  async store(key: string, data: Buffer): Promise<void> {
    const filePath = path.join(this.cacheDir, key);

    // Remove old entry if exists
    if (this.lruCache.has(key)) {
      const oldEntry = this.lruCache.get(key)!;
      this.totalSize -= oldEntry.size;
      this.lruCache.delete(key);
    }

    // Check if we need to make space
    if (this.totalSize + data.length > this.maxSize) {
      this.enforceSizeLimit(data.length);
    }

    // Write to disk
    await fs.writeFile(filePath, data);

    // Add to cache
    const entry: CacheEntry = {
      id: key,
      data,
      timestamp: Date.now(),
      accessCount: 0,
      size: data.length
    };

    this.lruCache.set(key, entry);
    this.totalSize += data.length;
  }

  async get(key: string): Promise<Buffer | null> {
    const entry = this.lruCache.get(key);
    if (!entry) {
      return null;
    }

    // Update access count and timestamp
    entry.accessCount++;
    entry.timestamp = Date.now();

    return entry.data;
  }

  has(key: string): boolean {
    return this.lruCache.has(key);
  }

  private enforceSizeLimit(requiredSpace: number = 0): void {
    // Sort by LRU (least recently used)
    const sortedEntries = Array.from(this.lruCache.entries())
      .sort(([, a], [, b]) => {
        // First by access count (less accessed first), then by timestamp
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.timestamp - b.timestamp;
      });

    let spaceNeeded = this.totalSize + requiredSpace - this.maxSize;

    for (const [key, entry] of sortedEntries) {
      if (spaceNeeded <= 0) break;

      // Remove from disk
      const filePath = path.join(this.cacheDir, key);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`Failed to remove cache file ${key}:`, error);
      }

      // Remove from memory
      this.lruCache.delete(key);
      this.totalSize -= entry.size;
      spaceNeeded -= entry.size;
    }
  }

  getStats(): { totalSize: number; entryCount: number; maxSize: number } {
    return {
      totalSize: this.totalSize,
      entryCount: this.lruCache.size,
      maxSize: this.maxSize
    };
  }

  clear(): void {
    // Clear memory cache
    this.lruCache.clear();
    this.totalSize = 0;

    // Clear disk cache
    try {
      fs.emptyDirSync(this.cacheDir);
    } catch (error) {
      console.warn('Failed to clear cache directory:', error);
    }
  }

  destroy(): void {
    this.clear();
    try {
      fs.removeSync(this.cacheDir);
    } catch (error) {
      console.warn('Failed to remove cache directory:', error);
    }
  }
}