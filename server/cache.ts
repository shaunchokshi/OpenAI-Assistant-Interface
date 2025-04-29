import { Request, Response, NextFunction } from 'express';

// Simple in-memory cache implementation
const cache = new Map<string, { 
  value: any; 
  expiry: number; 
}>();

// Clear expired items from cache (called periodically)
function clearExpiredCache() {
  const now = Date.now();
  // Convert to array to avoid iterator issues
  Array.from(cache.entries()).forEach(([key, { expiry }]) => {
    if (now > expiry) {
      cache.delete(key);
    }
  });
}

// Set up interval to clear expired cache entries
setInterval(clearExpiredCache, 60 * 1000); // Run every minute

/**
 * Middleware for caching API responses
 * @param duration Cache duration in seconds
 * @returns Express middleware
 */
export function cacheMiddleware(duration: number = 300) { // Default 5 minutes
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated requests
    if (req.isAuthenticated()) {
      return next();
    }

    const key = `${req.originalUrl}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse && cachedResponse.expiry > Date.now()) {
      // Return cached response
      return res.json(cachedResponse.value);
    }

    // Override res.json to store response in cache
    const originalJson = res.json;
    res.json = function(body) {
      cache.set(key, {
        value: body,
        expiry: Date.now() + (duration * 1000)
      });
      return originalJson.call(this, body);
    };

    next();
  };
}

// Helper function to manually invalidate cache
export function invalidateCache(pattern?: RegExp) {
  if (pattern) {
    Array.from(cache.keys()).forEach(key => {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    });
  } else {
    cache.clear();
  }
}