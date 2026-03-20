"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const fUSD = v => '$' + Number(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});

// Tiered referral system
const REF_TIERS = [
  { min: 0, max: 5, bonus: 2, label: "Starter", color: "#888", next: 6 },
  { min: 6, max: 15, bonus: 3, label: "Pro Referrer", color: "#D4AF37", next: 16 },
  { min: 16, max: Infinity, bonus: 5, label: "Elite Referrer", color: "#0B9635", next: null },
];
const getTier = (count) => REF_TIERS.find(t => count >= t.min && count <= t.max) || REF_TIERS[0];

export default function ReferralsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status]);

  useEffect(() => {
    fetch("/api/referrals").then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (status === "loading" || loading) return (
    <div style={{minHeight:"100vh",background:"#0B0D10",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:44,height:44,border:"3px solid #1E2028",borderTopColor:"#0B9635",borderRadius:"50%",animation:"sp .8s linear infinite"}}/>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const stats = data?.stats || { total: 0, approved: 0, pending: 0, totalEarned: 0 };
  const referrals = data?.referrals || [];
  const refCode = session?.user?.referralCode || "";

  const copyCode = () => {
    navigator.clipboard?.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    const url = typeof window !== "undefined" ? window.location.origin + `/signup?ref=${refCode}` : "";
    const text = `Join BetGenius AI and get expert football predictions! Use my code: ${refCode}`;
    if (navigator.share) navigator.share({ title: "BetGenius AI", text, url }).catch(() => {});
    else { navigator.clipboard?.writeText(`${text}\n${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#0B0D10",color:"#F0F0F2",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu .5s cubic-bezier(.16,1,.3,1) both}
.bnav{position:fixed;bottom:0;left:0;right:0;background:#0B0D10F5;backdrop-filter:blur(20px);border-top:1px solid #151820;display:flex;justify-content:space-around;padding:6px 0 env(safe-area-inset-bottom,6px);z-index:80}
.bn-i{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:10px;cursor:pointer;transition:all .15s;border:none;background:transparent;font-family:'DM Sans';-webkit-tap-highlight-color:transparent}
.bn-i:active{transform:scale(.92)}.bn-ic{font-size:18px;line-height:1}.bn-lb{font-size:9px;font-weight:700;letter-spacing:.5px}
.bn-i.on .bn-lb{color:#0B9635}.bn-i:not(.on) .bn-lb{color:#333}`}</style>

      <header style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",borderBottom:"1px solid #151820",background:"#0B0D10F0",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90}}>
        <div style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onClick={() => router.push("/dashboard")}>
          <span style={{fontSize:18,color:"#888"}}>{"\u2190"}</span>
          <img src="/pego-logo.png" alt="BG" style={{height:40,width:"auto"}} />
        </div>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,marginLeft:"auto"}}>Referrals</span>
      </header>

      <main style={{maxWidth:540,margin:"0 auto",padding:"28px 20px"}}>

        {(()=>{ const tier = getTier(stats.approved); const nextTier = REF_TIERS.find(t => t.min > tier.max); return (<>
        <div className="fu" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:2,marginBottom:4}}>My Referrals</div>
        <p className="fu" style={{fontSize:14,color:"#555",marginBottom:24,animationDelay:".05s"}}>
          Earn <strong style={{color:tier.color}}>{fUSD(tier.bonus)}</strong> for every approved signup!
        </p>

        {/* TIER BADGE */}
        <div className="fu" style={{background:tier.color+"10",border:`1px solid ${tier.color}25`,borderRadius:14,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",animationDelay:".08s"}}>
          <div>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:2,color:tier.color,textTransform:"uppercase",marginBottom:2}}>{"\u{1F3C5}"} {tier.label}</div>
            <div style={{fontSize:13,color:"#888"}}>{fUSD(tier.bonus)} per referral</div>
          </div>
          {nextTier && (
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"#555"}}>{nextTier.min - stats.approved} more to unlock</div>
              <div style={{fontSize:12,fontWeight:700,color:nextTier.color}}>{nextTier.label} ({fUSD(nextTier.bonus)}/ref)</div>
            </div>
          )}
          {!nextTier && <div style={{fontSize:12,fontWeight:700,color:tier.color}}>{"\u2705"} Max tier!</div>}
        </div>

        {/* TIER PROGRESS */}
        {nextTier && (
          <div className="fu" style={{marginBottom:16,animationDelay:".09s"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:700,color:"#444",marginBottom:4}}>
              <span>{tier.label}</span><span>{nextTier.label}</span>
            </div>
            <div style={{height:6,background:"#1E2028",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${tier.color},${nextTier.color})`,borderRadius:3,width:`${Math.min(100,((stats.approved - tier.min) / (nextTier.min - tier.min)) * 100)}%`,transition:"width .5s"}} />
            </div>
            <div style={{fontSize:10,color:"#555",marginTop:4,textAlign:"center"}}>{stats.approved}/{nextTier.min} referrals</div>
          </div>
        )}

        {/* STATS */}
        <div className="fu" style={{background:"linear-gradient(135deg,#0B963510,#0B963505)",border:"1px solid #0B963520",borderRadius:16,padding:20,marginBottom:20,animationDelay:".1s"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center"}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1}}>{stats.total}</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Total</div>
            </div>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:"#0B9635"}}>{stats.approved}</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Approved</div>
            </div>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:"#D4AF37"}}>{fUSD(stats.totalEarned)}</div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Earned</div>
            </div>
          </div>
        </div>
        </>);})()}

        {/* REFERRAL CODE */}
        <div className="fu" style={{background:"#12141A",border:"1px solid #1E2028",borderRadius:16,padding:20,marginBottom:20,animationDelay:".15s"}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",textTransform:"uppercase",marginBottom:8}}>YOUR REFERRAL CODE</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:4,color:"#0B9635"}}>{refCode || "N/A"}</div>
            <button onClick={copyCode} style={{padding:"8px 18px",borderRadius:8,border:"none",background:copied?"#0B963520":"#0B963512",color:"#0B9635",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",transition:"all .15s"}}>
              {copied ? "\u2713 Copied" : "\u{1F4CB} Copy"}
            </button>
          </div>
          <button onClick={share} style={{width:"100%",padding:14,borderRadius:10,border:"1.5px solid #0B963525",background:"#0B963508",color:"#0B9635",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",transition:"all .15s"}}>
            {"\u{1F4E4}"} Share & Earn ${getTier(stats.approved).bonus} per Referral
          </button>
        </div>

        {/* REFERRAL LIST */}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#333",marginBottom:12,textTransform:"uppercase"}}>{"\u{1F91D}"} REFERRED USERS</div>

        {referrals.length === 0 ? (
          <div className="fu" style={{textAlign:"center",padding:"48px 20px",animationDelay:".2s"}}>
            <div style={{fontSize:48,marginBottom:12}}>{"\u{1F517}"}</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>No referrals yet</div>
            <div style={{fontSize:13,color:"#555"}}>Share your code to start earning!</div>
          </div>
        ) : (
          referrals.map((r, i) => {
            const stColor = r.status === "approved" ? "#0B9635" : "#D4AF37";
            return (
              <div key={r._id} className="fu" style={{background:"#12141A",border:"1px solid #1E2028",borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,animationDelay:`${0.2 + i * 0.05}s`}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{r.name}</div>
                  <div style={{fontSize:11,color:"#555",marginTop:2}}>{r.phone}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"4px 12px",borderRadius:6,background:stColor+"15",color:stColor,letterSpacing:1,textTransform:"uppercase"}}>{r.status}</span>
              </div>
            );
          })
        )}
        <div style={{height:70}} />
      </main>

      {/* BOTTOM NAV */}
      <nav className="bnav">
        {[
          {icon:"\u{1F3E0}",label:"Home",path:"/dashboard"},
          {icon:"\u26BD",label:"Predict",path:"/dashboard/predict?game=football"},
          {icon:"\u{1F4E6}",label:"Package",path:"/dashboard/package"},
          {icon:"\u{1F4CA}",label:"Stats",path:"/dashboard/stats"},
          {icon:"\u{1F464}",label:"Account",path:"/dashboard/account"},
        ].map(n=>(
          <button key={n.label} className={`bn-i${n.active?" on":""}`} onClick={()=>router.push(n.path)}>
            <span className="bn-ic">{n.icon}</span><span className="bn-lb">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
