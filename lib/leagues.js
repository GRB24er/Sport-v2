// ═══════════════════════════════════════════════════════
// LEAGUE CONFIGURATION — football-data.org competition codes
// ═══════════════════════════════════════════════════════

export const LEAGUES = [
  {
    code: "PL",
    name: "English Premier League",
    short: "EPL",
    country: "England",
    flag: "\ud83c\udff4\udb40\udc67\udb40\udc62\udb40\udc65\udb40\udc6e\udb40\udc67\udb40\udc7f",
    icon: "\u26bd",
    matchDays: [0, 1, 2, 3, 5, 6],
  },
  {
    code: "PD",
    name: "Spanish La Liga",
    short: "La Liga",
    country: "Spain",
    flag: "\ud83c\uddea\ud83c\uddf8",
    icon: "\u26bd",
    matchDays: [0, 1, 5, 6],
  },
  {
    code: "SA",
    name: "Italian Serie A",
    short: "Serie A",
    country: "Italy",
    flag: "\ud83c\uddee\ud83c\uddf9",
    icon: "\u26bd",
    matchDays: [0, 1, 5, 6],
  },
  {
    code: "BL1",
    name: "German Bundesliga",
    short: "Bundesliga",
    country: "Germany",
    flag: "\ud83c\udde9\ud83c\uddea",
    icon: "\u26bd",
    matchDays: [0, 5, 6],
  },
  {
    code: "CL",
    name: "UEFA Champions League",
    short: "UCL",
    country: "Europe",
    flag: "\ud83c\uddea\ud83c\uddfa",
    icon: "\ud83c\udfc6",
    matchDays: [2, 3],
  },
];

// Map league codes for quick lookup
export const LEAGUE_MAP = Object.fromEntries(LEAGUES.map(l => [l.code, l]));

// Format date as YYYY-MM-DD
export function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// Get current season year (European seasons span Aug-May)
export function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? year : year - 1;
}
