// ═══════════════════════════════════════════════════════
// VIRTUALBET CONSTANTS
// ═══════════════════════════════════════════════════════

export const GHS_TO_USD = 0.077;
export const SIGNUP_FEE_GHS = 250;
export const REFERRAL_BONUS_GHS = 20;

// Currency helpers
export const fmtGHS = (v) => `GH₵${Number(v).toLocaleString()}`;
export const fmtUSD = (v) => `$${(Number(v) * GHS_TO_USD).toFixed(2)}`;
export const fmtBoth = (v) => `GH₵${Number(v).toLocaleString()} (≈ $${(Number(v) * GHS_TO_USD).toFixed(2)})`;

// Packages
export const PACKAGES = [
  {
    id: "gold",
    name: "Gold",
    odds: "3-5 Odds",
    tag: "Small Odds",
    priceGHS: 500,
    color: "#D4AF37",
    icon: "🥇",
    maxPredictions: 5,
    features: [
      "Daily 3-5 Odds Tips",
      "SMS Alerts",
      "Basic Support",
      "SportyBet Integration",
      "Real AI Predictions (5/day)",
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    odds: "5-15 Odds",
    tag: "Medium Odds",
    priceGHS: 1000,
    color: "#A0B2C6",
    icon: "🥈",
    maxPredictions: 15,
    popular: true,
    features: [
      "Daily 5-15 Odds Tips",
      "Priority SMS Alerts",
      "VIP Support",
      "SportyBet Integration",
      "Real AI Predictions (15/day)",
      "Weekly Accumulators",
    ],
  },
  {
    id: "diamond",
    name: "Diamond",
    odds: "15-50 Odds",
    tag: "High Odds",
    priceGHS: 2000,
    color: "#B9F2FF",
    icon: "💎",
    maxPredictions: 999,
    features: [
      "Daily 15-50 Odds Tips",
      "Instant SMS Alerts",
      "24/7 Premium Support",
      "SportyBet Integration",
      "Unlimited Real AI Predictions",
      "Daily Accumulators",
      "Exclusive Mega Odds",
    ],
  },
];

// Virtual Teams for AI Predictions
export const VIRTUAL_TEAMS = [
  "FC Barcelona VR", "Manchester City VR", "Bayern Munich VR", "PSG Virtual",
  "Real Madrid VR", "Liverpool VR", "Juventus VR", "AC Milan VR",
  "Chelsea VR", "Arsenal VR", "Dortmund VR", "Inter Milan VR",
  "Atletico VR", "Napoli VR", "Ajax VR", "Porto VR",
  "Benfica VR", "Roma VR", "Tottenham VR", "Leicester VR",
];

// Prediction Markets
export const PREDICTION_MARKETS = [
  { name: "Match Result", options: ["Home Win", "Draw", "Away Win"] },
  { name: "Over/Under 2.5", options: ["Over 2.5", "Under 2.5"] },
  { name: "Both Teams Score", options: ["Yes", "No"] },
  { name: "Correct Score", options: ["1-0", "2-1", "2-0", "1-1", "0-0", "3-1", "2-2", "0-1", "1-2", "0-2", "3-0", "3-2"] },
  { name: "First Half Result", options: ["Home", "Draw", "Away"] },
  { name: "Total Goals", options: ["0-1", "2-3", "4-5", "6+"] },
  { name: "Half Time / Full Time", options: ["Home/Home", "Draw/Home", "Home/Draw", "Draw/Draw", "Away/Away", "Draw/Away"] },
];

// Theme Colors — Green & Gold Sports Theme
export const COLORS = {
  primary: "#0B9635",
  primaryDark: "#076B25",
  accent: "#D4AF37",
  accentLight: "#F0D060",
  green: "#0B9635",
  gold: "#D4AF37",
  steel: "#5B5C5F",
  slate: "#343944",
  bg: "#0B0D10",
  card: "#12141A",
  input: "#1A1D22",
  white: "#EEEFF1",
};

// Payment Methods
export const PAYMENT_METHODS = {
  MOMO: ["mtn", "telecel", "airteltigo"],
  CRYPTO: ["usdt_trc20", "usdt_erc20", "btc"],
};

export const CRYPTO_NAMES = {
  usdt_trc20: "USDT (TRC20)",
  usdt_erc20: "USDT (ERC20)",
  btc: "Bitcoin (BTC)",
};

export const CRYPTO_ICONS = {
  usdt_trc20: "₮",
  usdt_erc20: "₮",
  btc: "₿",
};

// User statuses
export const USER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};
