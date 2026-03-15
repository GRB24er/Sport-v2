import Settings from "@/models/Settings";

const DURATION_DEFAULTS = { gold: 30, platinum: 30, diamond: 30 };

let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 60000; // 60s

export async function getPackageDurations() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;
  try {
    const s = await Settings.findOne({ key: "main" }).lean();
    _cache = {
      gold: s?.goldDurationDays || DURATION_DEFAULTS.gold,
      platinum: s?.platinumDurationDays || DURATION_DEFAULTS.platinum,
      diamond: s?.diamondDurationDays || DURATION_DEFAULTS.diamond,
    };
    _cacheTime = now;
    return _cache;
  } catch (e) {
    return DURATION_DEFAULTS;
  }
}

export function calculateExpiresAt(packageId, durationDays) {
  const days = durationDays || DURATION_DEFAULTS[packageId] || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Check if a game package is expired (time-based).
 * Returns true if expired.
 */
export function isPackageExpired(gamePkg) {
  if (!gamePkg) return true;
  if (!gamePkg.expiresAt) return false; // Legacy packages without expiresAt — treat as not expired for migration
  return new Date(gamePkg.expiresAt).getTime() < Date.now();
}

/**
 * Full package validity check: exists, not expired, has credits left.
 */
export function isPackageValid(gamePkg, maxPreds) {
  if (!gamePkg) return false;
  if (isPackageExpired(gamePkg)) return false;
  if ((gamePkg.predictionsUsed || 0) >= maxPreds) return false;
  return true;
}
