// Lightweight in-memory IP rate limiter.
//
// Scope: per process — fine for a single Vercel function instance and good
// enough to slow down trivial abuse. For production-grade rate limiting
// across regions, swap this for Upstash Ratelimit (Redis) — same interface.

const buckets = new Map();
const SWEEP_INTERVAL = 60 * 1000;
let lastSweep = Date.now();

function sweep(now) {
  if (now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function getClientIp(req) {
  const h = req.headers;
  return (
    h.get?.("x-real-ip") ||
    h.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get?.("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Token-bucket-style fixed-window limiter.
 * @param {object} opts
 * @param {string} opts.key   — scope identifier, usually `${route}:${ip}` or `${route}:${userId}`
 * @param {number} opts.limit — max requests per window
 * @param {number} opts.windowMs — window length in ms
 * @returns {{ ok: boolean, remaining: number, resetAt: number, retryAfter: number }}
 */
export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  sweep(now);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count++;
  const ok = bucket.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

// Standard 429 response with Retry-After + RateLimit-* headers
export function rateLimitResponse(NextResponse, result, message = "Too many requests. Please slow down.") {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    }
  );
}
