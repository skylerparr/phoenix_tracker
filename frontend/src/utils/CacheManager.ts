/**
 * Generic cache manager for services
 * Provides consistent caching behavior across all data services
 */
export class CacheManager<T> {
  private cache: Map<string, T> = new Map();
  private callbacks: Map<string, Array<(data: T) => void>> = new Map();

  /**
   * Get cached data for a key
   */
  get(key: string): T | null {
    return this.cache.get(key) || null;
  }

  /**
   * Set cached data for a key
   */
  set(key: string, data: T): void {
    this.cache.set(key, data);
    this.notifyCallbacks(key, data);
  }

  /**
   * Check if data exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Subscribe to cache updates for a specific key
   */
  subscribe(key: string, callback: (data: T) => void): void {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }
    this.callbacks.get(key)!.push(callback);

    // If data already exists, notify immediately
    const cachedData = this.get(key);
    if (cachedData !== null) {
      callback(cachedData);
    }
  }

  /**
   * Unsubscribe from cache updates for a specific key
   */
  unsubscribe(key: string, callback: (data: T) => void): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // Clean up empty callback arrays
      if (callbacks.length === 0) {
        this.callbacks.delete(key);
      }
    }
  }

  /**
   * Get all active cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all keys that have active subscriptions (callbacks)
   */
  getSubscribedKeys(): string[] {
    return Array.from(this.callbacks.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearByPattern(pattern: RegExp): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (pattern.test(key)) {
        this.clear(key);
      }
    }
  }

  /**
   * Notify all callbacks for a specific key
   */
  private notifyCallbacks(key: string, data: T): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalKeys: number; totalCallbacks: number } {
    const totalCallbacks = Array.from(this.callbacks.values()).reduce(
      (sum, callbacks) => sum + callbacks.length,
      0,
    );

    return {
      totalKeys: this.cache.size,
      totalCallbacks,
    };
  }
}

/**
 * Global cache manager instances for different data types
 */
export const IssueCacheManager = new CacheManager<any[]>();
export const UserCacheManager = new CacheManager<any[]>();
export const TagCacheManager = new CacheManager<any[]>();
export const ProjectCacheManager = new CacheManager<any[]>();
export const IssueAssigneeCacheManager = new CacheManager<any[]>();

/**
 * Cache key constants to avoid magic strings
 */
export const CacheKeys = {
  ISSUES: {
    ALL: "issues:all",
    MY_ISSUES: "issues:my",
    ACCEPTED: "issues:accepted",
    ICEBOX: "issues:icebox",
    BY_TAG: (tagId: number) => `issues:tag:${tagId}`,
    BY_USER: (userId: number) => `issues:user:${userId}`,
  },
  TAGS: {
    ALL: "tags:all",
  },
  USERS: {
    ALL: "users:all",
  },
  PROJECTS: {
    USER_PROJECTS: "projects:user",
  },
  ASSIGNEES: {
    BY_ISSUE: (issueId: number) => `assignees:issue:${issueId}`,
  },
} as const;

/**
 * Utility to clear project-specific caches when switching projects
 */
export function clearProjectCaches(): void {
  IssueCacheManager.clearAll();
  UserCacheManager.clearAll();
  TagCacheManager.clearAll();
  // Note: Don't clear ProjectCacheManager as user projects don't change on project switch
}
