// server/cache.ts
var cache = /* @__PURE__ */ new Map();
function clearExpiredCache() {
  const now = Date.now();
  Array.from(cache.entries()).forEach(([key, { expiry }]) => {
    if (now > expiry) {
      cache.delete(key);
    }
  });
}
setInterval(clearExpiredCache, 60 * 1e3);
function cacheMiddleware(duration = 300) {
  return (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }
    if (req.isAuthenticated()) {
      return next();
    }
    const key = `${req.originalUrl}`;
    const cachedResponse = cache.get(key);
    if (cachedResponse && cachedResponse.expiry > Date.now()) {
      return res.json(cachedResponse.value);
    }
    const originalJson = res.json;
    res.json = function(body) {
      cache.set(key, {
        value: body,
        expiry: Date.now() + duration * 1e3
      });
      return originalJson.call(this, body);
    };
    next();
  };
}
function invalidateCache(pattern) {
  if (pattern) {
    Array.from(cache.keys()).forEach((key) => {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    });
  } else {
    cache.clear();
  }
}
export {
  cacheMiddleware,
  invalidateCache
};
