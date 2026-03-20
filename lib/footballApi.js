// ═══════════════════════════════════════════════════════
// FOOTBALL DATA API — Fetch fixtures, standings, form
// Uses football-data.org v4 API
// ═══════════════════════════════════════════════════════

import { LEAGUES, LEAGUE_MAP, formatDate } from "./leagues";

const API_BASE = "https://api.football-data.org/v4";

function getHeaders() {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("FOOTBALL_API_KEY not configured");
  return { "X-Auth-Token": key };
}

async function apiFetch(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (res.status === 429) {
    // Rate limited — wait and retry once
    await new Promise(r => setTimeout(r, 65000));
    const retry = await fetch(url, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (!retry.ok) throw new Error(`football-data.org rate limited: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`football-data.org error [${res.status}]:`, text.slice(0, 300));
    throw new Error(`football-data.org returned ${res.status}`);
  }

  return res.json();
}

// Small delay to respect rate limits (free: 10 req/min)
function delay(ms = 7000) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── FETCH TODAY'S FIXTURES FOR ALL TARGET LEAGUES ───
export async function fetchTodayFixtures() {
  return fetchFixturesByDate(new Date());
}

// ─── FETCH FIXTURES FOR A SPECIFIC DATE ───
export async function fetchFixturesByDate(date) {
  const dateStr = formatDate(date);
  const allFixtures = [];

  for (const league of LEAGUES) {
    try {
      const data = await apiFetch(
        `/competitions/${league.code}/matches?dateFrom=${dateStr}&dateTo=${dateStr}`
      );

      for (const match of data.matches || []) {
        // Only scheduled matches
        if (match.status !== "SCHEDULED" && match.status !== "TIMED") continue;

        allFixtures.push({
          matchId: match.id,
          leagueCode: league.code,
          leagueName: league.name,
          leagueShort: league.short,
          homeTeam: match.homeTeam?.name || match.homeTeam?.shortName || "TBD",
          awayTeam: match.awayTeam?.name || match.awayTeam?.shortName || "TBD",
          homeTeamId: match.homeTeam?.id,
          awayTeamId: match.awayTeam?.id,
          matchTime: match.utcDate
            ? new Date(match.utcDate).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
              })
            : "",
          kickoff: match.utcDate,
          venue: match.venue || "",
          status: match.status,
          matchday: match.matchday ? `Matchday ${match.matchday}` : (match.stage || ""),
        });
      }

      await delay();
    } catch (err) {
      console.error(`Failed to fetch ${league.short} fixtures:`, err.message);
    }
  }

  return allFixtures.filter(f => f.homeTeam !== "TBD" && f.awayTeam !== "TBD");
}

// ─── FETCH LEAGUE STANDINGS ───
export async function fetchStandings(leagueCode) {
  try {
    const data = await apiFetch(`/competitions/${leagueCode}/standings`);
    const table = data.standings?.[0]?.table || [];

    return table.map(s => ({
      rank: s.position,
      teamId: s.team.id,
      teamName: s.team.name || s.team.shortName,
      points: s.points,
      played: s.playedGames,
      wins: s.won,
      draws: s.draw,
      losses: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalDifference,
      form: s.form || "",
    }));
  } catch (err) {
    console.error(`Failed to fetch standings for ${leagueCode}:`, err.message);
    return [];
  }
}

// ─── FETCH TEAM RECENT MATCHES (form) ───
export async function fetchTeamForm(teamId, limit = 5) {
  try {
    const data = await apiFetch(`/teams/${teamId}/matches?status=FINISHED&limit=${limit}`);

    return (data.matches || []).map(match => {
      const isHome = match.homeTeam?.id === teamId;
      const hg = match.score?.fullTime?.home ?? 0;
      const ag = match.score?.fullTime?.away ?? 0;

      let result = "D";
      if (isHome) result = hg > ag ? "W" : hg < ag ? "L" : "D";
      else result = ag > hg ? "W" : ag < hg ? "L" : "D";

      return {
        homeTeam: match.homeTeam?.name || match.homeTeam?.shortName || "",
        awayTeam: match.awayTeam?.name || match.awayTeam?.shortName || "",
        homeGoals: hg,
        awayGoals: ag,
        isHome,
        result,
        date: match.utcDate,
        totalGoals: hg + ag,
        btts: hg > 0 && ag > 0,
      };
    });
  } catch (err) {
    console.error(`Failed to fetch form for team ${teamId}:`, err.message);
    return [];
  }
}

// ─── FETCH HEAD TO HEAD ───
export async function fetchH2H(homeTeamId, awayTeamId) {
  try {
    const data = await apiFetch(`/teams/${homeTeamId}/matches?status=FINISHED&limit=10`);
    // Filter for only matches between these two teams
    const h2hMatches = (data.matches || []).filter(
      m => (m.homeTeam?.id === homeTeamId && m.awayTeam?.id === awayTeamId) ||
           (m.homeTeam?.id === awayTeamId && m.awayTeam?.id === homeTeamId)
    ).slice(0, 5);

    return h2hMatches.map(match => {
      const hg = match.score?.fullTime?.home ?? 0;
      const ag = match.score?.fullTime?.away ?? 0;
      return {
        homeTeam: match.homeTeam?.name || match.homeTeam?.shortName || "",
        awayTeam: match.awayTeam?.name || match.awayTeam?.shortName || "",
        homeGoals: hg,
        awayGoals: ag,
        date: match.utcDate,
        totalGoals: hg + ag,
        btts: hg > 0 && ag > 0,
      };
    });
  } catch (err) {
    console.error(`Failed to fetch H2H for ${homeTeamId} vs ${awayTeamId}:`, err.message);
    return [];
  }
}

// ─── FETCH FINISHED MATCHES FOR RESULT CHECKING ───
export async function fetchFinishedMatches(dateStr) {
  const allFinished = [];

  for (const league of LEAGUES) {
    try {
      const data = await apiFetch(
        `/competitions/${league.code}/matches?dateFrom=${dateStr}&dateTo=${dateStr}`
      );

      for (const match of data.matches || []) {
        if (match.status !== "FINISHED") continue;

        allFinished.push({
          matchId: match.id,
          homeTeam: match.homeTeam?.name || match.homeTeam?.shortName || "",
          awayTeam: match.awayTeam?.name || match.awayTeam?.shortName || "",
          homeGoals: match.score?.fullTime?.home ?? null,
          awayGoals: match.score?.fullTime?.away ?? null,
          htHome: match.score?.halfTime?.home ?? null,
          htAway: match.score?.halfTime?.away ?? null,
        });
      }

      await delay();
    } catch (err) {
      console.error(`Failed to fetch finished ${league.short} for ${dateStr}:`, err.message);
    }
  }

  return allFinished;
}

// ─── ENRICH FIXTURES WITH FORM + H2H + STANDINGS ───
export async function enrichFixtures(fixtures) {
  const enriched = [];
  const standingsCache = {};

  for (const fix of fixtures) {
    try {
      // Fetch standings if not cached
      if (!standingsCache[fix.leagueCode]) {
        standingsCache[fix.leagueCode] = await fetchStandings(fix.leagueCode);
        await delay();
      }

      const standings = standingsCache[fix.leagueCode];
      const homeStanding = standings.find(s => s.teamId === fix.homeTeamId);
      const awayStanding = standings.find(s => s.teamId === fix.awayTeamId);

      // Fetch team form + H2H (with delays for rate limiting)
      const homeForm = await fetchTeamForm(fix.homeTeamId, 5);
      await delay();
      const awayForm = await fetchTeamForm(fix.awayTeamId, 5);
      await delay();
      const h2h = await fetchH2H(fix.homeTeamId, fix.awayTeamId);
      await delay();

      enriched.push({
        ...fix,
        homeStanding,
        awayStanding,
        homeForm,
        awayForm,
        h2h,
      });
    } catch (err) {
      console.error(`Failed to enrich ${fix.homeTeam} vs ${fix.awayTeam}:`, err.message);
      enriched.push(fix);
    }
  }

  return enriched;
}

// ─── BUILD ANALYSIS PROMPT FOR GEMINI ───
export function buildMatchAnalysis(fixture) {
  const lines = [];
  lines.push(`## ${fixture.homeTeam} vs ${fixture.awayTeam}`);
  lines.push(`League: ${fixture.leagueName} | Kickoff: ${fixture.matchTime} UTC`);
  if (fixture.venue) lines.push(`Venue: ${fixture.venue}`);

  if (fixture.homeStanding) {
    const h = fixture.homeStanding;
    lines.push(`\n### ${fixture.homeTeam} (Position: ${h.rank})`);
    lines.push(`Form: ${h.form || "N/A"} | Pts: ${h.points} | P${h.played} W${h.wins} D${h.draws} L${h.losses}`);
    lines.push(`Goals: ${h.goalsFor}F ${h.goalsAgainst}A (GD: ${h.goalDiff})`);
  }

  if (fixture.awayStanding) {
    const a = fixture.awayStanding;
    lines.push(`\n### ${fixture.awayTeam} (Position: ${a.rank})`);
    lines.push(`Form: ${a.form || "N/A"} | Pts: ${a.points} | P${a.played} W${a.wins} D${a.draws} L${a.losses}`);
    lines.push(`Goals: ${a.goalsFor}F ${a.goalsAgainst}A (GD: ${a.goalDiff})`);
  }

  if (fixture.homeForm?.length) {
    const form = fixture.homeForm;
    const wins = form.filter(f => f.result === "W").length;
    const avgGoals = (form.reduce((a, f) => a + f.totalGoals, 0) / form.length).toFixed(1);
    const bttsRate = Math.round(form.filter(f => f.btts).length / form.length * 100);
    lines.push(`\n### ${fixture.homeTeam} Last ${form.length} Matches`);
    lines.push(`Results: ${form.map(f => f.result).join("")} | Wins: ${wins}/${form.length}`);
    lines.push(`Avg Goals: ${avgGoals} | BTTS Rate: ${bttsRate}%`);
  }

  if (fixture.awayForm?.length) {
    const form = fixture.awayForm;
    const wins = form.filter(f => f.result === "W").length;
    const avgGoals = (form.reduce((a, f) => a + f.totalGoals, 0) / form.length).toFixed(1);
    const bttsRate = Math.round(form.filter(f => f.btts).length / form.length * 100);
    lines.push(`\n### ${fixture.awayTeam} Last ${form.length} Matches`);
    lines.push(`Results: ${form.map(f => f.result).join("")} | Wins: ${wins}/${form.length}`);
    lines.push(`Avg Goals: ${avgGoals} | BTTS Rate: ${bttsRate}%`);
  }

  if (fixture.h2h?.length) {
    const h2h = fixture.h2h;
    const avgGoals = (h2h.reduce((a, m) => a + m.totalGoals, 0) / h2h.length).toFixed(1);
    const bttsRate = Math.round(h2h.filter(m => m.btts).length / h2h.length * 100);
    lines.push(`\n### Head to Head (Last ${h2h.length} Meetings)`);
    h2h.forEach(m => lines.push(`  ${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam}`));
    lines.push(`H2H Avg Goals: ${avgGoals} | H2H BTTS: ${bttsRate}%`);
  }

  return lines.join("\n");
}
