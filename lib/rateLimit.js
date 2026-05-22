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
  const ip = (
    h.get?.("x-real-ip") ||
    h.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get?.("cf-connecting-ip") ||
    null
  );
  return ip && ip !== "::1" && ip !== "127.0.0.1" ? ip : null;
}

/**
 * Token-bucket-style fixed-window limiter.
 * Returns `{ ok: true }` (effectively disabled) when:
 *  - ip is null/unknown (avoid penalising every user sharing the same fallback)
 *  - NODE_ENV !== "production" (don't block local dev / staging testing)
 *  - opts.skip === true
 */
export function rateLimit({ key, limit, windowMs, skip }) {
  if (skip) return { ok: true, remaining: limit, resetAt: 0, retryAfter: 0 };
  if (process.env.NODE_ENV !== "production") return { ok: true, remaining: limit, resetAt: 0, retryAfter: 0 };
  if (!key || key.endsWith(":null") || key.endsWith(":unknown")) {
    return { ok: true, remaining: limit, resetAt: 0, retryAfter: 0 };
  }

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

