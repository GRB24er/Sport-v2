"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const GAME_ICONS = { football:"⚽", "instant-virtual":"⚽", "virtual-football":"⚽", egames:"🎮", basketball:"🏀", tennis:"🎾" };
const GAME_NAMES = { football:"Football", "instant-virtual":"Virtual", "virtual-football":"Virtual Football", egames:"E-Games", basketball:"Basketball", tennis:"Tennis" };
const TIER_COLORS = { gold:"#D4AF37", platinum:"#94A7BD", diamond:"#7DD3E8" };
const TIER_NAMES = { gold:"Gold", platinum:"Platinum", diamond:"Diamond" };

export default function StatsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/login"); return; }
    fetch(`/api/users/${session.user.id}/stats`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setStats(d); })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, [session, status]);

  if (status === "loading" || loading) return (
    <div style={{ minHeight:"100vh", background:"#0B0D10", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:44, height:44, border:"3px solid #1E2028", borderTopColor:"#0B9635", borderRadius:"50%", animation:"sp .8s linear infinite" }} />
      <style>{"@keyframes sp{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:"#0B0D10", display:"flex", alignItems:"center", justifyContent:"center", color:"#FF4444", fontFamily:"'DM Sans'" }}>
      {error}
    </div>
  );

  const rs = stats?.roundStats || {};
  const tier = stats?.tierStats || {};
  const recent = stats?.recentRounds || [];

  return (
    <div style={{ minHeight:"100vh", background:"#0B0D10", color:"#E8E8E8", fontFamily:"'DM Sans', sans-serif", paddingBottom:80 }}>
      {/* Header */}
      <div style={{ padding:"16px 20px 12px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => router.push("/dashboard")} style={{ background:"none", border:"none", color:"#888", fontSize:20, cursor:"pointer", padding:4 }}>←</button>
        <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Performance Stats</h1>
      </div>

      <div style={{ padding:"0 16px" }}>
        {/* Win Rate Hero */}
        <div style={{ background:"linear-gradient(135deg,#0B9635,#054d18)", borderRadius:16, padding:"28px 24px", marginBottom:16, textAlign:"center", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"rgba(255,255,255,0.05)", borderRadius:"50%" }} />
          <div style={{ fontSize:48, fontWeight:900, lineHeight:1, marginBottom:4 }}>{rs.winRate || 0}%</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>Win Rate</div>
          <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:16 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:"#4ADE80" }}>{rs.wins || 0}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:.5 }}>WINS</div>
            </div>
            <div style={{ width:1, background:"rgba(255,255,255,0.15)" }} />
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:"#FF6B6B" }}>{rs.losses || 0}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:.5 }}>LOSSES</div>
            </div>
            <div style={{ width:1, background:"rgba(255,255,255,0.15)" }} />
            <div>
              <div style={{ fontSize:22, fontWeight:800 }}>{rs.total || 0}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontWeight:600, letterSpacing:.5 }}>TOTAL</div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
          {[
            { label:"Current Streak", value: rs.streak || 0, icon:"🔥", color:"#F97316" },
            { label:"Best Streak", value: rs.bestStreak || 0, icon:"🏆", color:"#D4AF37" },
            { label:"Avg Odds (W)", value: rs.avgOdds || "—", icon:"📊", color:"#8B5CF6" },
          ].map((s, i) => (
            <div key={i} style={{ background:"#12141A", borderRadius:12, padding:"16px 12px", textAlign:"center", border:"1px solid #1E2028" }}>
              <div style={{ fontSize:16, marginBottom:6 }}>{s.icon}</div>
              <div style={{ fontSize:20, fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:9, color:"#666", fontWeight:700, letterSpacing:.5, marginTop:6, textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Win/Loss Bar */}
        {rs.resolved > 0 && (
          <div style={{ background:"#12141A", borderRadius:12, padding:16, marginBottom:16, border:"1px solid #1E2028" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#888", marginBottom:10, letterSpacing:.5, textTransform:"uppercase" }}>Win/Loss Ratio</div>
            <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:10 }}>
              <div style={{ width:`${rs.winRate}%`, background:"#4ADE80", transition:"width .5s" }} />
              <div style={{ flex:1, background:"#FF6B6B" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#888" }}>
              <span>{rs.wins}W ({rs.winRate}%)</span>
              <span>{rs.losses}L ({100 - rs.winRate}%)</span>
            </div>
          </div>
        )}

        {/* Tier Performance */}
        {Object.values(tier).some(t => t.total > 0) && (
          <div style={{ background:"#12141A", borderRadius:12, padding:16, marginBottom:16, border:"1px solid #1E2028" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#888", marginBottom:12, letterSpacing:.5, textTransform:"uppercase" }}>Performance by Tier</div>
            {["gold", "platinum", "diamond"].map(t => {
              const s = tier[t];
              if (!s || s.total === 0) return null;
              return (
                <div key={t} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #1A1D24" }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:`${TIER_COLORS[t]}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:TIER_COLORS[t] }}>
                    {t === "gold" ? "🥇" : t === "platinum" ? "🥈" : "💎"}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:TIER_COLORS[t] }}>{TIER_NAMES[t]}</div>
                    <div style={{ fontSize:11, color:"#666" }}>{s.wins}W - {s.losses}L ({s.total} rounds)</div>
                  </div>
                  <div style={{ fontSize:18, fontWeight:800, color: s.winRate >= 50 ? "#4ADE80" : "#FF6B6B" }}>{s.winRate}%</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Results */}
        <div style={{ background:"#12141A", borderRadius:12, padding:16, marginBottom:16, border:"1px solid #1E2028" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#888", marginBottom:12, letterSpacing:.5, textTransform:"uppercase" }}>Recent Results</div>
          {recent.length === 0 ? (
            <div style={{ textAlign:"center", padding:"24px 0", color:"#555", fontSize:13 }}>No rounds claimed yet. Start playing to see your stats!</div>
          ) : recent.map((r, i) => (
            <div key={r._id || i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom: i < recent.length - 1 ? "1px solid #1A1D24" : "none" }}>
              <div style={{
                width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800,
                background: r.result === "won" ? "#4ADE8020" : r.result === "lost" ? "#FF6B6B20" : r.result === "partial" ? "#F9731620" : "#33333340",
                color: r.result === "won" ? "#4ADE80" : r.result === "lost" ? "#FF6B6B" : r.result === "partial" ? "#F97316" : "#888",
              }}>
                {r.result === "won" ? "W" : r.result === "lost" ? "L" : r.result === "partial" ? "P" : "?"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {GAME_ICONS[r.gameId] || "⚽"} {r.teams || `${r.matchCount} matches`}
                </div>
                <div style={{ fontSize:10, color:"#666", marginTop:2 }}>
                  {r.totalOdd ? `${r.totalOdd.toFixed(1)} odds` : ""}{r.resultNote ? ` · ${r.resultNote}` : ""}
                </div>
              </div>
              <div style={{ fontSize:10, color:"#555", whiteSpace:"nowrap" }}>
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month:"short", day:"numeric" }) : ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"#0B0D10F5", backdropFilter:"blur(20px)", borderTop:"1px solid #151820", display:"flex", justifyContent:"space-around", padding:"6px 0", zIndex:80 }}>
        {[
          { icon:"🏠", label:"Home", path:"/dashboard" },
          { icon:"⚽", label:"Predict", path:"/dashboard/predict?game=football" },
          { icon:"📊", label:"Stats", path:"/dashboard/stats", active:true },
          { icon:"📦", label:"Package", path:"/dashboard/package" },
          { icon:"👤", label:"Account", path:"/dashboard/account" },
        ].map(n => (
          <button key={n.label} onClick={() => !n.active && router.push(n.path)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"6px 12px", borderRadius:10, cursor:n.active ? "default" : "pointer", border:"none", background:n.active ? "#0B963520" : "transparent", fontFamily:"'DM Sans'" }}>
            <span style={{ fontSize:18, lineHeight:1 }}>{n.icon}</span>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:.5, color:n.active ? "#0B9635" : "#333" }}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
