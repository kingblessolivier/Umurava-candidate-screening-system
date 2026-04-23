/**
 * Rate Limiting & Caching Service for Gemini API
 * Handles quota limits, request queuing, and graceful degradation
 */

import NodeCache from "node-cache";

interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

interface QueuedRequest {
  id: string;
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  retries: number;
  createdAt: number;
}

const CACHE_TTL = 3600;           // 1 hour
const REQUEST_TIMEOUT = 180000;   // 3 minutes — thinking mode can be slow
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;      // 3 seconds base (exponential backoff)
const MAX_CONCURRENT_REQUESTS = 2;
const REQUEST_QUEUE_LIMIT = 50;

export class RateLimitedGeminiService {
  private cache: NodeCache;
  private requestQueue: QueuedRequest[] = [];
  private activeRequests: Set<string> = new Set();
  private lastRequestTime: number = 0;
  private quotaResetTime: number = 0;
  private isQuotaExceeded: boolean = false;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL,
      checkperiod: 600,
      useClones: true,
    });
  }

  /**
   * Executes a function with rate limiting, caching, and retry logic
   */
  async executeWithRateLimit<T>(
    cacheKey: string,
    fn: () => Promise<T>,
    options: { useCache?: boolean; bypassQuotaCheck?: boolean } = {}
  ): Promise<T> {
    const { useCache = true, bypassQuotaCheck = false } = options;

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        console.log(`[Cache HIT] ${cacheKey}`);
        return cached;
      }
    }

    // If quota is exceeded and we're not bypassing checks, return degraded response
    if (this.isQuotaExceeded && !bypassQuotaCheck) {
      const timeUntilReset = Math.max(0, this.quotaResetTime - Date.now());
      console.warn(`[Quota Exceeded] Returning degraded response. Reset in ${timeUntilReset}ms`);
      throw new Error(
        `Gemini API quota exceeded. Please retry in ${Math.ceil(timeUntilReset / 1000)} seconds.`
      );
    }

    // Queue and execute the request
    return this.queueRequest<T>(cacheKey, fn);
  }

  private async queueRequest<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    if (this.requestQueue.length >= REQUEST_QUEUE_LIMIT) {
      throw new Error(
        `Too many pending requests. Queue is full (${REQUEST_QUEUE_LIMIT} max). Please try again later.`
      );
    }

    return new Promise<T>((resolve, reject) => {
      const requestId = `${cacheKey}-${Date.now()}-${Math.random()}`;
      const queuedRequest: QueuedRequest = {
        id: requestId,
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        retries: 0,
        createdAt: Date.now(),
      };

      this.requestQueue.push(queuedRequest);
      this.processQueue<T>();
    });
  }

  private async processQueue<T>(): Promise<void> {
    // Respect concurrency limits
    if (this.activeRequests.size >= MAX_CONCURRENT_REQUESTS) {
      return;
    }

    const next = this.requestQueue.shift();
    if (!next) return;

    this.activeRequests.add(next.id);

    try {
      // Rate limiting: ensure minimum delay between requests (Gemini: ~1 req/sec)
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minDelay = 500; // 500ms minimum between requests
      if (timeSinceLastRequest < minDelay) {
        await this.sleep(minDelay - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();
      const result = await this.executeWithRetry(next, 0);
      next.resolve(result);
    } catch (error) {
      next.reject(error);
    } finally {
      this.activeRequests.delete(next.id);
      // Process next request in queue
      this.processQueue<T>();
    }
  }

  private async executeWithRetry(
    request: QueuedRequest,
    retryCount: number
  ): Promise<unknown> {
    try {
      const startTime = Date.now();
      const result = await request.fn();
      const duration = Date.now() - startTime;

      console.log(
        `[Request Success] ${request.id} completed in ${duration}ms (attempt ${retryCount + 1})`
      );
      return result;
    } catch (error: unknown) {
      const errorObj = error as { status?: number; statusText?: string; message?: string; errorDetails?: unknown[] };
      const status = errorObj?.status;
      const statusText = errorObj?.statusText;
      const message = errorObj?.message || String(error);

      // Handle 429 (quota exceeded)
      if (status === 429) {
        this.handleQuotaExceeded(errorObj as { errorDetails?: unknown[] });

        if (retryCount < MAX_RETRIES) {
          const backoffMs = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
          console.warn(
            `[Quota 429] Retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
          );
          await this.sleep(backoffMs);
          return this.executeWithRetry(request, retryCount + 1);
        } else {
          console.error(
            `[Quota 429] Max retries (${MAX_RETRIES}) exceeded. Marking quota as exceeded.`
          );
          throw error;
        }
      }

      // Handle other retryable errors (5xx)
      if (status && status >= 500 && status < 600 && retryCount < MAX_RETRIES) {
        const backoffMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
        console.warn(
          `[Server ${status}] Retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        );
        await this.sleep(backoffMs);
        return this.executeWithRetry(request, retryCount + 1);
      }

      console.error(
        `[Request Failed] ${request.id} - ${statusText || status} - ${message}`
      );
      throw error;
    }
  }

  private handleQuotaExceeded(error: { errorDetails?: unknown[] } = {}): void {
    this.isQuotaExceeded = true;

    // Extract retry-after time from error details if available
    const retryDetails = error.errorDetails?.find(
      (d: unknown) => (d as { "@type"?: string })["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
    ) as { retryDelay?: string } | undefined;

    if (retryDetails?.retryDelay) {
      const retrySeconds = parseInt(retryDetails.retryDelay.replace("s", ""), 10);
      this.quotaResetTime = Date.now() + retrySeconds * 1000;
      console.warn(
        `[Quota Reset] Set to ${new Date(this.quotaResetTime).toISOString()}`
      );

      // Reset quota flag after retry time
      setTimeout(() => {
        this.isQuotaExceeded = false;
        console.log("[Quota Reset] Attempting requests again");
      }, retrySeconds * 1000 + 1000);
    } else {
      // Default: 60 seconds — conservative but not permanently locked
      const fallbackMs = 60 * 1000;
      this.quotaResetTime = Date.now() + fallbackMs;
      setTimeout(() => {
        this.isQuotaExceeded = false;
        console.log("[Quota Reset] Retrying after default backoff");
      }, fallbackMs + 1000);
    }
  }

  /**
   * Cache results for reuse
   */
  cacheResult<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, data, ttl || CACHE_TTL);
    console.log(`[Cache SET] ${key}`);
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): {
    queueLength: number;
    activeRequests: number;
    isQuotaExceeded: boolean;
    quotaResetIn: number;
  } {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests.size,
      isQuotaExceeded: this.isQuotaExceeded,
      quotaResetIn: Math.max(0, this.quotaResetTime - Date.now()),
    };
  }

  /**
   * Clear cache (useful for development/testing)
   */
  clearCache(): void {
    this.cache.flushAll();
    console.log("[Cache] Cleared all entries");
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const rateLimitService = new RateLimitedGeminiService();
