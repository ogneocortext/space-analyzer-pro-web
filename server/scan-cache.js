const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const webStorageCache = require("./utils/web-storage-cache");

class ScanCache {
  constructor(cacheDir = path.join(__dirname, "..", ".cache", "scans")) {
    this.cacheDir = cacheDir;
    this.cache = new Map();
    this.webCache = webStorageCache;
    this.ttl = 24 * 60 * 60 * 1000; // 24 hours default TTL
    this.maxCacheSize = 1000; // Maximum number of cached scans
    this.useWebStorage = true; // Use Web Storage API when available
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadCacheIndex();
    } catch (error) {
      console.error("Failed to initialize scan cache:", error);
    }
  }

  async loadCacheIndex() {
    try {
      const indexPath = path.join(this.cacheDir, "index.json");
      const data = await fs.readFile(indexPath, "utf8");
      const index = JSON.parse(data);

      // Load valid cache entries
      for (const [key, entry] of Object.entries(index)) {
        if (this.isValidEntry(entry)) {
          this.cache.set(key, entry);
        }
      }

      // Clean up expired entries
      await this.cleanup();
    } catch (error) {
      // Index doesn't exist or is corrupted, start fresh
      console.log("Cache index not found, starting fresh");
    }
  }

  isValidEntry(entry) {
    return entry && entry.timestamp && entry.data && Date.now() - entry.timestamp < this.ttl;
  }

  generateKey(directoryPath, options = {}) {
    // Create a hash based on directory path and relevant options
    const hashInput = {
      path: directoryPath.toLowerCase(),
      includeHidden: options.includeHidden || false,
      maxDepth: options.maxDepth || 10,
      profile: options.profile || "full",
    };

    // Safe JSON stringify to prevent circular reference crashes
    let hashString;
    try {
      hashString = JSON.stringify(hashInput);
    } catch (circularError) {
      // Fallback: create string from primitive values only
      hashString = `${hashInput.path}:${hashInput.includeHidden}:${hashInput.maxDepth}:${hashInput.profile}`;
    }

    return crypto.createHash("md5").update(hashString).digest("hex");
  }

  async get(directoryPath, options = {}) {
    const key = this.generateKey(directoryPath, options);

    // Try Web Storage cache first if enabled
    if (this.useWebStorage) {
      const webEntry = this.webCache.get(`scan:${key}`);
      if (webEntry) {
        // Check if directory has been modified since cache was created
        const dirStat = await this.getDirectoryStats(directoryPath);
        if (dirStat && dirStat.mtime > webEntry.timestamp) {
          this.webCache.delete(`scan:${key}`);
        } else {
          console.log(`🎯 Web Storage cache hit for ${directoryPath}`);
          return webEntry.data;
        }
      }
    }

    // Fallback to memory cache
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if the cache is still valid
    if (!this.isValidEntry(entry)) {
      this.cache.delete(key);
      await this.removeCacheFile(key);
      return null;
    }

    // Check if directory has been modified since cache was created
    const dirStat = await this.getDirectoryStats(directoryPath);
    if (dirStat && dirStat.mtime > entry.timestamp) {
      this.cache.delete(key);
      await this.removeCacheFile(key);
      return null;
    }

    console.log(`🎯 Memory cache hit for ${directoryPath}`);
    return entry.data;
  }

  async set(directoryPath, data, options = {}) {
    const key = this.generateKey(directoryPath, options);

    const entry = {
      timestamp: Date.now(),
      data: data,
      directoryPath: directoryPath,
      options: options,
    };

    // Add to memory cache
    this.cache.set(key, entry);

    // Store in Web Storage cache if enabled (with 1 hour TTL for session storage)
    if (this.useWebStorage) {
      // Use session storage for scan results (faster access, shorter TTL)
      this.webCache.set(`scan:${key}`, entry, 60 * 60 * 1000, true); // 1 hour TTL
    }

    // Save to disk
    await this.saveCacheEntry(key, entry);

    // Maintain cache size
    if (this.cache.size > this.maxCacheSize) {
      await this.evictOldest();
    }

    console.log(`💾 Cached scan for ${directoryPath}`);
  }

  async saveCacheEntry(key, entry) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));

      // Update index
      await this.updateIndex();
    } catch (error) {
      console.error("Failed to save cache entry:", error);
    }
  }

  async removeCacheFile(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore
    }
  }

  async updateIndex() {
    try {
      const indexPath = path.join(this.cacheDir, "index.json");
      const index = {};

      for (const [key, entry] of this.cache.entries()) {
        index[key] = {
          timestamp: entry.timestamp,
          directoryPath: entry.directoryPath,
          options: entry.options,
        };
      }

      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error("Failed to update cache index:", error);
    }
  }

  async getDirectoryStats(directoryPath) {
    try {
      return await fs.stat(directoryPath);
    } catch (error) {
      return null;
    }
  }

  async cleanup() {
    const now = Date.now();
    const toDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidEntry(entry)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
      await this.removeCacheFile(key);
    }

    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} expired cache entries`);
      await this.updateIndex();
    }
  }

  async evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      await this.removeCacheFile(oldestKey);
      await this.updateIndex();
      console.log(`🗑️ Evicted oldest cache entry`);
    }
  }

  async invalidate(directoryPath) {
    const toDelete = [];

    for (const [key, entry] of this.cache.entries()) {
      if (
        entry.directoryPath === directoryPath ||
        entry.directoryPath.startsWith(directoryPath + path.sep)
      ) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
      await this.removeCacheFile(key);
    }

    if (toDelete.length > 0) {
      console.log(`🗑️ Invalidated ${toDelete.length} cache entries for ${directoryPath}`);
      await this.updateIndex();
    }
  }

  getMetrics() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      if (this.isValidEntry(entry)) {
        validEntries++;
        totalSize += JSON.stringify(entry.data).length;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      estimatedSizeBytes: totalSize,
      hitRate: this.hits / (this.hits + this.misses) || 0,
      cacheDirectory: this.cacheDir,
    };
  }

  async clear() {
    // Clear all cache entries
    for (const key of this.cache.keys()) {
      await this.removeCacheFile(key);
    }

    this.cache.clear();

    // Clear index
    try {
      const indexPath = path.join(this.cacheDir, "index.json");
      await fs.unlink(indexPath);
    } catch (error) {
      // Index might not exist
    }

    console.log("🗑️ Cleared all cache entries");
  }
}

module.exports = ScanCache;
