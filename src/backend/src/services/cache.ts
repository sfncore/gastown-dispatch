/**
 * Generic caching utility for backend services.
 *
 * Provides:
 * - TTL-based caching with configurable expiry
 * - Request deduplication (coalescing concurrent requests)
 * - Stale-while-revalidate pattern for graceful degradation
 * - Error state tracking for degraded mode
 */

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	error?: string;
}

export interface CacheOptions {
	/** Time-to-live in milliseconds */
	ttl: number;
	/** Allow serving stale data while revalidating (graceful degradation) */
	staleWhileRevalidate?: boolean;
	/** Max age for stale data in ms (default: 5x TTL) */
	maxStaleAge?: number;
}

export interface CacheStats {
	hits: number;
	misses: number;
	staleHits: number;
	errors: number;
	lastFetch: number | null;
	lastError: string | null;
}

export class Cache<T> {
	private entry: CacheEntry<T> | null = null;
	private pendingRequest: Promise<T> | null = null;
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		staleHits: 0,
		errors: 0,
		lastFetch: null,
		lastError: null,
	};

	constructor(
		private readonly fetcher: () => Promise<T>,
		private readonly options: CacheOptions,
	) {}

	/**
	 * Get data from cache or fetch if expired.
	 * Handles request deduplication and stale-while-revalidate.
	 */
	async get(): Promise<T> {
		const now = Date.now();

		// Check if cache is valid
		if (this.entry && now - this.entry.timestamp < this.options.ttl) {
			this.stats.hits++;
			return this.entry.data;
		}

		// If request in flight, wait for it (deduplication)
		if (this.pendingRequest) {
			return this.pendingRequest;
		}

		// Check for stale data we can serve while revalidating
		const maxStaleAge = this.options.maxStaleAge ?? this.options.ttl * 5;
		const canServeStale =
			this.options.staleWhileRevalidate &&
			this.entry &&
			now - this.entry.timestamp < maxStaleAge;

		// Start fetch
		this.pendingRequest = this.doFetch();

		if (canServeStale && this.entry) {
			// Serve stale data immediately, revalidate in background
			this.stats.staleHits++;
			this.pendingRequest.catch(() => {
				// Ignore background revalidation errors - we served stale data
			});
			return this.entry.data;
		}

		// Wait for fresh data
		try {
			this.stats.misses++;
			return await this.pendingRequest;
		} finally {
			this.pendingRequest = null;
		}
	}

	/**
	 * Get cached data without triggering a fetch.
	 * Returns null if no cached data exists.
	 */
	getCached(): T | null {
		return this.entry?.data ?? null;
	}

	/**
	 * Check if cache is in degraded mode (serving stale data due to errors).
	 */
	isDegraded(): boolean {
		if (!this.entry) return false;
		const now = Date.now();
		return now - this.entry.timestamp >= this.options.ttl && !!this.entry.error;
	}

	/**
	 * Force invalidation of the cache.
	 */
	invalidate(): void {
		this.entry = null;
	}

	/**
	 * Get cache statistics.
	 */
	getStats(): CacheStats {
		return { ...this.stats };
	}

	private async doFetch(): Promise<T> {
		try {
			const data = await this.fetcher();
			this.entry = {
				data,
				timestamp: Date.now(),
			};
			this.stats.lastFetch = Date.now();
			this.stats.lastError = null;
			return data;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.stats.errors++;
			this.stats.lastError = errorMsg;

			// If we have stale data and stale-while-revalidate is enabled, update timestamp but keep data
			if (this.options.staleWhileRevalidate && this.entry) {
				this.entry.error = errorMsg;
				// Don't update timestamp - keep it stale so next request tries again
				throw err;
			}

			throw err;
		} finally {
			this.pendingRequest = null;
		}
	}
}

/**
 * Multi-tier cache for data with different freshness requirements.
 * Example: Unread count (fast poll) vs full inbox (slow poll)
 */
export class TieredCache<TFast, TFull> {
	private fastCache: Cache<TFast>;
	private fullCache: Cache<TFull>;

	constructor(
		fastFetcher: () => Promise<TFast>,
		fullFetcher: () => Promise<TFull>,
		fastOptions: CacheOptions,
		fullOptions: CacheOptions,
	) {
		this.fastCache = new Cache(fastFetcher, fastOptions);
		this.fullCache = new Cache(fullFetcher, fullOptions);
	}

	async getFast(): Promise<TFast> {
		return this.fastCache.get();
	}

	async getFull(): Promise<TFull> {
		return this.fullCache.get();
	}

	getCachedFast(): TFast | null {
		return this.fastCache.getCached();
	}

	getCachedFull(): TFull | null {
		return this.fullCache.getCached();
	}

	invalidateFast(): void {
		this.fastCache.invalidate();
	}

	invalidateFull(): void {
		this.fullCache.invalidate();
	}

	invalidateAll(): void {
		this.fastCache.invalidate();
		this.fullCache.invalidate();
	}

	getStats(): { fast: CacheStats; full: CacheStats } {
		return {
			fast: this.fastCache.getStats(),
			full: this.fullCache.getStats(),
		};
	}
}

/**
 * Staggered poller for multiple resources.
 * Distributes polling across time to avoid thundering herd.
 */
export class StaggeredPoller<K extends string, V> {
	private caches: Map<K, Cache<V>> = new Map();
	private pollInterval: NodeJS.Timeout | null = null;
	private pollIndex = 0;

	constructor(
		private readonly fetcherFactory: (key: K) => () => Promise<V>,
		private readonly options: CacheOptions & {
			/** Interval between individual polls in ms */
			staggerMs: number;
		},
	) {}

	/**
	 * Add a resource to poll.
	 */
	addResource(key: K): void {
		if (!this.caches.has(key)) {
			this.caches.set(key, new Cache(this.fetcherFactory(key), this.options));
		}
	}

	/**
	 * Remove a resource from polling.
	 */
	removeResource(key: K): void {
		this.caches.delete(key);
	}

	/**
	 * Get data for a specific resource.
	 */
	async get(key: K): Promise<V> {
		let cache = this.caches.get(key);
		if (!cache) {
			this.addResource(key);
			cache = this.caches.get(key)!;
		}
		return cache.get();
	}

	/**
	 * Get all cached data.
	 */
	getAllCached(): Map<K, V | null> {
		const result = new Map<K, V | null>();
		for (const [key, cache] of this.caches) {
			result.set(key, cache.getCached());
		}
		return result;
	}

	/**
	 * Start background polling with staggered intervals.
	 */
	startPolling(): void {
		if (this.pollInterval) return;

		const pollNext = async () => {
			const keys = Array.from(this.caches.keys());
			if (keys.length === 0) return;

			const key = keys[this.pollIndex % keys.length];
			this.pollIndex++;

			const cache = this.caches.get(key);
			if (cache) {
				try {
					await cache.get();
				} catch {
					// Errors handled by cache
				}
			}
		};

		// Initial poll of first resource
		pollNext();

		// Staggered polling
		this.pollInterval = setInterval(pollNext, this.options.staggerMs);
	}

	/**
	 * Stop background polling.
	 */
	stopPolling(): void {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}

	/**
	 * Check if any resources are in degraded mode.
	 */
	getDegradedResources(): K[] {
		const degraded: K[] = [];
		for (const [key, cache] of this.caches) {
			if (cache.isDegraded()) {
				degraded.push(key);
			}
		}
		return degraded;
	}
}
