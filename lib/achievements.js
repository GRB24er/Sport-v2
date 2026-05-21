// Catalog of achievement badges users can earn.
// Each badge has an `id`, display info, and a `check(ctx) => earned ? { progress, meta } : null`
// where ctx contains: { user, stats, rounds, referrals, predictions }

export const BADGES = [
  {
    id: "first_win",
    name: "First Blood",
    icon: "🩸",
    description: "Win your first prediction round",
    tier: "bronze",
    check: ({ stats }) => (stats?.wins >= 1 ? { progress: 1 } : null),
  },
  {
    id: "five_wins",
    name: "On Fire",
    icon: "🔥",
    description: "Win 5 rounds total",
    tier: "bronze",
    check: ({ stats }) => (stats?.wins >= 5 ? { progress: 5 } : null),
  },
  {
    id: "ten_wins",
    name: "Veteran",
    icon: "🎖️",
    description: "Win 10 rounds total",
    tier: "silver",
    check: ({ stats }) => (stats?.wins >= 10 ? { progress: 10 } : null),
  },
  {
    id: "fifty_wins",
    name: "Sharp Shooter",
    icon: "🎯",
    description: "Win 50 rounds total",
    tier: "gold",
    check: ({ stats }) => (stats?.wins >= 50 ? { progress: 50 } : null),
  },
  {
    id: "streak_three",
    name: "Hat Trick",
    icon: "⚽",
    description: "Win 3 rounds in a row",
    tier: "bronze",
    check: ({ stats }) => (stats?.bestStreak >= 3 ? { progress: 3 } : null),
  },
  {
    id: "streak_five",
    name: "Streak Master",
    icon: "🔥",
    description: "Win 5 rounds in a row",
    tier: "silver",
    check: ({ stats }) => (stats?.bestStreak >= 5 ? { progress: 5 } : null),
  },
  {
    id: "streak_ten",
    name: "Unstoppable",
    icon: "💎",
    description: "Win 10 rounds in a row",
    tier: "gold",
    check: ({ stats }) => (stats?.bestStreak >= 10 ? { progress: 10 } : null),
  },
  {
    id: "gold_member",
    name: "Gold Member",
    icon: "🥇",
    description: "Subscribe to the Gold package",
    tier: "bronze",
    check: ({ user }) => (hasTier(user, "gold") ? { progress: 1 } : null),
  },
  {
    id: "platinum_member",
    name: "Platinum Elite",
    icon: "🥈",
    description: "Subscribe to the Platinum package",
    tier: "silver",
    check: ({ user }) => (hasTier(user, "platinum") ? { progress: 1 } : null),
  },
  {
    id: "diamond_member",
    name: "Diamond VIP",
    icon: "💎",
    description: "Subscribe to the Diamond package",
    tier: "gold",
    check: ({ user }) => (hasTier(user, "diamond") ? { progress: 1 } : null),
  },
  {
    id: "high_odds_win",
    name: "Big Score",
    icon: "💰",
    description: "Win a round with combined odds over 25x",
    tier: "silver",
    check: ({ rounds }) => {
      const big = (rounds || []).find(r => r.result === "won" && (r.totalOdd || 0) >= 25);
      return big ? { progress: big.totalOdd, meta: { roundId: big._id?.toString() } } : null;
    },
  },
  {
    id: "ultra_odds_win",
    name: "Jackpot Hunter",
    icon: "🏆",
    description: "Win a round with combined odds over 50x",
    tier: "gold",
    check: ({ rounds }) => {
      const huge = (rounds || []).find(r => r.result === "won" && (r.totalOdd || 0) >= 50);
      return huge ? { progress: huge.totalOdd, meta: { roundId: huge._id?.toString() } } : null;
    },
  },
  {
    id: "referrer_one",
    name: "Friend Maker",
    icon: "🤝",
    description: "Refer your first friend",
    tier: "bronze",
    check: ({ user }) => ((user?.referralCount || 0) >= 1 ? { progress: 1 } : null),
  },
  {
    id: "referrer_five",
    name: "Connector",
    icon: "🌐",
    description: "Refer 5 friends",
    tier: "silver",
    check: ({ user }) => ((user?.referralCount || 0) >= 5 ? { progress: 5 } : null),
  },
  {
    id: "referrer_ten",
    name: "Ambassador",
    icon: "👑",
    description: "Refer 10 friends",
    tier: "gold",
    check: ({ user }) => ((user?.referralCount || 0) >= 10 ? { progress: 10 } : null),
  },
];

function hasTier(user, tier) {
  if (!user?.gamePackages) return false;
  const gp = user.gamePackages instanceof Map ? user.gamePackages : new Map(Object.entries(user.gamePackages || {}));
  for (const [, val] of gp) {
    if (val?.package === tier) return true;
  }
  return false;
}

export function evaluateBadges(ctx) {
  return BADGES.map(b => ({ badge: b, result: b.check(ctx) })).filter(x => x.result);
}

export const TIER_COLORS = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#D4AF37",
};
