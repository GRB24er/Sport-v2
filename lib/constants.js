// ═══════════════════════════════════════════════════════
// BETGENIUS AI CONSTANTS
// ═══════════════════════════════════════════════════════

export const SIGNUP_FEE = 20;
export const REFERRAL_BONUS = 2;

// Currency helper (USD only)
export const fmtUSD = (v) => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Packages — all get 3 rounds, differentiated by odds level
export const PACKAGES = [
  {
    id: "gold",
    name: "Gold",
    odds: "15-25 Odds",
    tag: "Standard Odds",
    price: 40,
    color: "#D4AF37",
    icon: "🥇",
    maxPredictions: 3,
    features: [
      "3 Prediction Rounds",
      "15-25 Odds Range",
      "EPL, La Liga, Serie A, Bundesliga",
      "Basic Support",
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    odds: "25-50 Odds",
    tag: "High Odds",
    price: 80,
    color: "#A0B2C6",
    icon: "🥈",
    maxPredictions: 3,
    popular: true,
    features: [
      "3 Prediction Rounds",
      "25-50 Odds Range",
      "EPL, La Liga, Serie A, Bundesliga",
      "Priority Support",
    ],
  },
  {
    id: "diamond",
    name: "Diamond",
    odds: "HT/FT & Correct Score",
    tag: "Premium Picks",
    price: 160,
    color: "#B9F2FF",
    icon: "💎",
    maxPredictions: 3,
    features: [
      "3 Prediction Rounds",
      "HT/FT & Correct Score",
      "High Odds from Our Sources",
      "24/7 VIP Support",
    ],
  },
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
  { name: "Corners Over/Under", options: ["Over 8.5", "Under 8.5", "Over 9.5", "Under 9.5", "Over 10.5", "Under 10.5", "Over 11.5", "Under 11.5"] },
  { name: "Bookings Over/Under", options: ["Over 2.5", "Under 2.5", "Over 3.5", "Under 3.5", "Over 4.5", "Under 4.5", "Over 5.5", "Under 5.5"] },
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
  MOMO: [], // Dynamically configured by admin
  CRYPTO: ["usdt_trc20", "usdt_erc20", "btc"],
  CARD: [],
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
  BANNED: "banned",
  BLOCKED: "blocked",
};

// Game names (shared across API routes)
export const GAME_NAMES = {
  football: "Football Predictions",
  "instant-virtual": "Football Predictions",
  egames: "Football Predictions",
  "virtual-football": "Football Predictions",
  basketball: "Basketball Predictions",
  tennis: "Tennis Predictions",
};

// Sport-specific prediction markets
export const BASKETBALL_MARKETS = [
  { name: "Moneyline", options: ["Home Win", "Away Win"] },
  { name: "Point Spread", options: ["+Spread Home", "-Spread Home", "+Spread Away", "-Spread Away"] },
  { name: "Over/Under Points", options: ["Over", "Under"] },
  { name: "Quarter Winner", options: ["Home Q1", "Away Q1", "Home Q2", "Away Q2", "Home Q3", "Away Q3", "Home Q4", "Away Q4"] },
  { name: "Total Points Range", options: ["Under 180.5", "Over 180.5", "Under 200.5", "Over 200.5", "Under 220.5", "Over 220.5"] },
];

export const TENNIS_MARKETS = [
  { name: "Match Winner", options: ["Player 1", "Player 2"] },
  { name: "Set Winner", options: ["Player 1 Set", "Player 2 Set"] },
  { name: "Total Sets", options: ["2 Sets", "3 Sets", "4 Sets", "5 Sets"] },
  { name: "Game Handicap", options: ["+1.5 P1", "-1.5 P1", "+1.5 P2", "-1.5 P2", "+2.5 P1", "-2.5 P1", "+2.5 P2", "-2.5 P2"] },
  { name: "Over/Under Games", options: ["Over 20.5", "Under 20.5", "Over 22.5", "Under 22.5"] },
];

// Package names
export const PKG_NAMES = { gold: "Gold", platinum: "Platinum", diamond: "Diamond" };

// Default package prediction limits
export const PKG_LIMITS_DEF = { gold: 3, platinum: 3, diamond: 3 };
