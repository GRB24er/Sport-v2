"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEF_PKGS = [
  { id:"gold", name:"Gold", odds:"15-25 Odds", price:40, color:"#D4AF37", icon:"\u{1F947}", max:3, features:["3 Prediction Rounds","15-25 Odds Range","EPL, La Liga, Serie A, Bundesliga","Standard Support"] },
  { id:"platinum", name:"Platinum", odds:"25-50 Odds", price:80, color:"#94A7BD", icon:"\u{1F948}", max:3, features:["3 Prediction Rounds","25-50 Odds Range","All Top European Leagues","Priority Support"] },
  { id:"diamond", name:"Diamond", odds:"HT/FT & Correct Score", price:160, color:"#7DD3E8", icon:"\u{1F48E}", max:3, features:["3 Prediction Rounds","HT/FT & Correct Score","High Odds from Our Sources","24/7 VIP Support"] },
];

export default function PackagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/users/${session.user.id}`).then(r => r.json()).then(d => { setUserData(d.user); setLoading(false); }).catch(() => setLoading(false));
  }, [session]);

  if (status === "loading" || loading) return (
    <div style={{minHeight:"100vh",background:"#0B0D10",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:44,height:44,border:"3px solid #1E2028",borderTopColor:"#0B9635",borderRadius:"50%",animation:"sp .8s linear infinite"}}/>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const gp = userData?.gamePackages || {};
  const footballPkg = gp["football"];
  const activePkg = footballPkg ? DEF_PKGS.find(p => p.id === footballPkg.package) : null;
  const used = footballPkg?.predictionsUsed || 0;
  const max = activePkg?.max || 0;
  const left = max - used;
  const daysLeft = footballPkg?.expiresAt ? Math.max(0, Math.ceil((new Date(footballPkg.expiresAt).getTime() - Date.now()) / (1000*60*60*24))) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  return (
    <div style={{minHeight:"100vh",background:"#0B0D10",color:"#F0F0F2",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu .5s cubic-bezier(.16,1,.3,1) both}@media(max-width:480px){.pkg-grid{grid-template-columns:1fr!important}}
.bnav{position:fixed;bottom:0;left:0;right:0;background:#0B0D10F5;backdrop-filter:blur(20px);border-top:1px solid #151820;display:flex;justify-content:space-around;padding:6px 0 env(safe-area-inset-bottom,6px);z-index:80}
.bn-i{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:10px;cursor:pointer;transition:all .15s;border:none;background:transparent;font-family:'DM Sans';-webkit-tap-highlight-color:transparent}
.bn-i:active{transform:scale(.92)}.bn-ic{font-size:18px;line-height:1}.bn-lb{font-size:9px;font-weight:700;letter-spacing:.5px}
.bn-i.on .bn-lb{color:#0B9635}.bn-i:not(.on) .bn-lb{color:#333}`}</style>

      <header style={{display:"flex",alignItems:"center",gap:10,padding:"14px 20px",borderBottom:"1px solid #151820",background:"#0B0D10F0",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90}}>
        <div style={{cursor:"pointer",display:"flex",alignItems:"center",gap:10}} onClick={() => router.push("/dashboard")}>
          <span style={{fontSize:18,color:"#888"}}>{"\u2190"}</span>
          <img src="/pego-logo.png" alt="BG" style={{height:40,width:"auto"}} />
        </div>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,marginLeft:"auto"}}>My Package</span>
      </header>

      <main style={{maxWidth:540,margin:"0 auto",padding:"28px 20px"}}>

        {/* CURRENT PACKAGE */}
        {activePkg && !isExpired ? (
          <div className="fu" style={{background:`linear-gradient(135deg,${activePkg.color}12,${activePkg.color}06)`,border:`1.5px solid ${activePkg.color}30`,borderRadius:20,padding:28,textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:52,marginBottom:8}}>{activePkg.icon}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:3,color:activePkg.color}}>{activePkg.name}</div>
            <div style={{fontSize:13,color:"#555",marginBottom:4}}>{activePkg.odds}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,margin:"8px 0"}}>${activePkg.price}</div>
            <div style={{fontSize:11,color:"#444",marginBottom:20}}>per package</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
              <div style={{background:"#0B0D1060",border:"1px solid #15182060",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#0B9635"}}>{left}</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase",marginTop:2}}>Rounds Left</div>
              </div>
              <div style={{background:"#0B0D1060",border:"1px solid #15182060",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22}}>{used}/{max}</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase",marginTop:2}}>Viewed</div>
              </div>
              <div style={{background:"#0B0D1060",border:"1px solid #15182060",borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:daysLeft!==null&&daysLeft<=3?"#E31725":daysLeft!==null&&daysLeft<=7?"#D4AF37":"#0B9635"}}>{daysLeft !== null ? daysLeft : "\u221E"}</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase",marginTop:2}}>Days Left</div>
              </div>
            </div>

            {activePkg.features.map(f => (
              <div key={f} style={{fontSize:13,color:"#888",marginBottom:8,display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                <span style={{color:"#0B9635"}}>✓</span> {f}
              </div>
            ))}

            <button onClick={() => router.push("/dashboard/predict?game=football")} style={{marginTop:16,width:"100%",padding:14,borderRadius:12,border:"none",background:activePkg.color,color:"#0B0D10",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"'DM Sans'"}}>
              View Predictions {"\u2192"}
            </button>
          </div>
        ) : (
          <div className="fu" style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:56,marginBottom:12}}>{isExpired ? "\u23F0" : "\u{1F4E6}"}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,marginBottom:8}}>{isExpired ? "Package Expired" : "No Active Package"}</div>
            <p style={{fontSize:14,color:"#555",marginBottom:24,lineHeight:1.6}}>{isExpired ? "Your package has expired. Subscribe again to continue getting predictions." : "Subscribe to get expert football predictions for EPL, La Liga, Serie A & Bundesliga."}</p>
            <button onClick={() => router.push("/dashboard?subscribe=true")} style={{padding:"14px 32px",borderRadius:12,border:"none",background:"#0B9635",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans'",transition:"transform .15s",":hover":{transform:"scale(1.02)"}}}>
              {isExpired ? `Renew ${activePkg?.name || "Package"} — $${activePkg?.price || ""}` : "Subscribe Now →"}
            </button>
          </div>
        )}

        {/* UPGRADE / ALL PACKAGES */}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#333",marginBottom:12,textTransform:"uppercase"}}>{"\u{1F4E6}"} {activePkg ? "UPGRADE OPTIONS" : "ALL PACKAGES"}</div>

        <div className="pkg-grid" style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
          {DEF_PKGS.filter(p => !activePkg || p.price > activePkg.price).map((p, i) => (
            <div key={p.id} className="fu" style={{background:"#12141A",border:`1px solid ${p.color}20`,borderRadius:16,padding:20,display:"flex",alignItems:"center",gap:16,animationDelay:`${(i+1)*0.08}s`}}>
              <div style={{fontSize:36,flexShrink:0}}>{p.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:p.color}}>{p.name}</div>
                <div style={{fontSize:12,color:"#555"}}>{p.odds} • 3 Rounds</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22}}>${p.price}</div>
                <button onClick={() => router.push("/dashboard")} style={{marginTop:4,padding:"6px 14px",borderRadius:8,border:`1.5px solid ${p.color}30`,background:"transparent",color:p.color,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>
                  {activePkg ? "Upgrade" : "Subscribe"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {activePkg && DEF_PKGS.filter(p => p.price > activePkg.price).length === 0 && (
          <div className="fu" style={{textAlign:"center",padding:"20px",color:"#0B9635",fontWeight:700,fontSize:14}}>
            {"\u{1F451}"} You're on the highest tier!
          </div>
        )}
        <div style={{height:70}} />
      </main>

      {/* BOTTOM NAV */}
      <nav className="bnav">
        {[
          {icon:"\u{1F3E0}",label:"Home",path:"/dashboard"},
          {icon:"\u26BD",label:"Predict",path:"/dashboard/predict?game=football"},
          {icon:"\u{1F4E6}",label:"Package",path:"/dashboard/package",active:true},
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
