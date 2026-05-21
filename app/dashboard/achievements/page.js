"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const TIER_META = {
  bronze: { color: "#CD7F32", label: "BRONZE" },
  silver: { color: "#C0C0C0", label: "SILVER" },
  gold: { color: "#D4AF37", label: "GOLD" },
};

export default function AchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/achievements")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [session]);

  if (status === "loading" || !session || loading) {
    return <div style={{ minHeight: "100vh", background: "#0B0D10", color: "#F0F0F2", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>Loading…</div>;
  }

  const badges = data?.badges || [];
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);
  const total = badges.length;
  const earnedCount = earned.length;
  const pct = total ? Math.round((earnedCount / total) * 100) : 0;

  return (
    <div className="ach-root">
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0B0D10}
.ach-root{min-height:100dvh;background:#0B0D10;color:#F0F0F2;font-family:'DM Sans',sans-serif;padding-bottom:40px}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.au{animation:fadeUp 0.4s both}.d1{animation-delay:0.05s}.d2{animation-delay:0.1s}.d3{animation-delay:0.15s}

.ahdr{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #151820;background:#0B0D10F0;backdrop-filter:blur(20px);position:sticky;top:0;z-index:5}
.back{background:#12141A;border:1px solid #1E2028;color:#888;font-size:12px;font-weight:600;padding:7px 14px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.back:hover{border-color:#2A2D34;color:#F0F0F2}
.ahdr-t{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px}

.wrap{max-width:840px;margin:0 auto;padding:24px 20px 0}
.h1{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:2px;margin-bottom:4px;line-height:1.1}
.sub{color:#555;font-size:14px;margin-bottom:24px;line-height:1.5}

.prog-card{background:linear-gradient(135deg,#12141A,#0B963508);border:1px solid #0B963525;border-radius:16px;padding:22px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.prog-l{flex:1;min-width:200px}
.prog-pct{font-family:'Bebas Neue',sans-serif;font-size:48px;color:#0B9635;letter-spacing:1px;line-height:1}
.prog-c{font-size:13px;color:#666;margin-top:4px}
.prog-bar{flex:1;min-width:200px;height:10px;background:#0B0D10;border:1px solid #151820;border-radius:10px;overflow:hidden}
.prog-fill{height:100%;background:linear-gradient(90deg,#0B9635,#D4AF37);border-radius:10px;transition:width 1s cubic-bezier(0.16,1,0.3,1)}

.sect-lbl{font-size:10px;font-weight:700;letter-spacing:2px;color:#444;margin:8px 0 12px;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-bottom:28px}
.badge{background:#12141A;border:1px solid #1E2028;border-radius:14px;padding:18px 14px;text-align:center;transition:all 0.2s;position:relative;overflow:hidden}
.badge.on{border-color:#0B963540}
.badge.on:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(11,150,53,0.12)}
.badge.off{opacity:0.55;filter:grayscale(0.7)}
.badge-tier{position:absolute;top:8px;right:8px;font-size:8px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:4px}
.badge-icon{font-size:42px;margin-bottom:8px;filter:drop-shadow(0 4px 16px currentColor)}
.badge.off .badge-icon{filter:none}
.badge-name{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1.5px;margin-bottom:4px}
.badge-desc{font-size:11px;color:#666;line-height:1.4}
.badge-locked{position:absolute;top:8px;left:8px;font-size:14px;opacity:0.5}

.empty{text-align:center;padding:40px 20px;color:#444;font-size:13px}

@media(max-width:520px){
  .wrap{padding:16px 14px 0}
  .h1{font-size:28px}
  .prog-card{padding:18px;flex-direction:column;align-items:stretch}
  .prog-pct{font-size:36px}
  .grid{grid-template-columns:repeat(2,1fr);gap:10px}
  .badge{padding:14px 10px}
  .badge-icon{font-size:34px}
  .badge-name{font-size:15px}
  .badge-desc{font-size:10px}
}
      `}</style>

      <header className="ahdr">
        <div className="ahdr-t">🏆 ACHIEVEMENTS</div>
        <a href="/dashboard" className="back">← Dashboard</a>
      </header>

      <div className="wrap">
        <div className="au">
          <h1 className="h1">Your Trophy Case</h1>
          <p className="sub">Win rounds, build streaks, and refer friends to unlock all {total} badges.</p>
        </div>

        <div className="prog-card au d1">
          <div className="prog-l">
            <div className="prog-pct">{pct}%</div>
            <div className="prog-c">{earnedCount} of {total} earned</div>
          </div>
          <div className="prog-bar"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
        </div>

        {earned.length > 0 && (
          <div className="au d2">
            <div className="sect-lbl">✨ Earned ({earned.length})</div>
            <div className="grid">
              {earned.map(b => {
                const tier = TIER_META[b.tier] || TIER_META.bronze;
                return (
                  <div key={b.id} className="badge on" style={{ color: tier.color }}>
                    <span className="badge-tier" style={{ background: tier.color + "20", color: tier.color }}>{tier.label}</span>
                    <div className="badge-icon">{b.icon}</div>
                    <div className="badge-name">{b.name}</div>
                    <div className="badge-desc">{b.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div className="au d3">
            <div className="sect-lbl">🔒 Locked ({locked.length})</div>
            <div className="grid">
              {locked.map(b => {
                const tier = TIER_META[b.tier] || TIER_META.bronze;
                return (
                  <div key={b.id} className="badge off">
                    <span className="badge-locked">🔒</span>
                    <span className="badge-tier" style={{ background: tier.color + "15", color: tier.color }}>{tier.label}</span>
                    <div className="badge-icon">{b.icon}</div>
                    <div className="badge-name">{b.name}</div>
                    <div className="badge-desc">{b.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
