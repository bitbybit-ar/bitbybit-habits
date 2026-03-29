/**
 * In-memory sliding window rate limiter
 */

interface RateLimitEntry {
  attempts: number[];
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function createRateLimiter(maxAttempts: number, windowMs: number) {
  // Disable rate limiting in development
  if (process.env.NODE_ENV !== "production") {
    return {
      check: (): RateLimitResult => ({ success: true, remaining: maxAttempts }),
    };
  }

  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 5 minutes to avoid memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      entry.attempts = entry.attempts.filter((t) => now - t < windowMs);
      if (entry.attempts.length === 0) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Prevent Node.js from hanging on this interval
  cleanupInterval.unref();

  return {
    check: (identifier: string): RateLimitResult => {
      const now = Date.now();
      let entry = store.get(identifier);

      if (!entry) {
        entry = { attempts: [] };
        store.set(identifier, entry);
      }

      // Remove attempts outside the sliding window
      entry.attempts = entry.attempts.filter((t) => now - t < windowMs);

      if (entry.attempts.length >= maxAttempts) {
        const oldestAttempt = entry.attempts[0];
        const retryAfterMs = windowMs - (now - oldestAttempt);

        return {
          success: false,
          remaining: 0,
          retryAfterMs: Math.ceil(retryAfterMs),
        };
      }

      // Record this attempt
      entry.attempts.push(now);

      return {
        success: true,
        remaining: maxAttempts - entry.attempts.length,
      };
    },
  };
}
