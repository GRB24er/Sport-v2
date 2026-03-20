"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const fmtMatchDate = (d) => { if(!d) return ""; try { const dt = new Date(d); if(isNaN(dt)) return d; return dt.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}) + " • " + dt.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}); } catch(e){ return d; } };
const PKGS_DEF = { gold:{name:"Gold",max:3,icon:"\u{1F947}",color:"#D4AF37"}, platinum:{name:"Platinum",max:3,icon:"\u{1F948}",color:"#94A7BD"}, diamond:{name:"Diamond",max:3,icon:"\u{1F48E}",color:"#7DD3E8"} };
const GMETA = {
  "football":{name:"Football Predictions",icon:"\u26BD",color:"#0B9635"},
  "virtual-football":{name:"Football Predictions",icon:"\u26BD",color:"#0B9635"},
  "egames":{name:"Football Predictions",icon:"\u26BD",color:"#0B9635"},
  "instant-virtual":{name:"Football Predictions",icon:"\u26BD",color:"#0B9635"},
  "basketball":{name:"Basketball Predictions",icon:"\u{1F3C0}",color:"#E36414"},
  "tennis":{name:"Tennis Predictions",icon:"\u{1F3BE}",color:"#D4AF37"},
};

export default function PredictPage() {
  const {data:session,status}=useSession();
  const router=useRouter();
  const sp=useSearchParams();
  const gameId=sp.get("game")||"football";
  const gm=GMETA[gameId]||GMETA["football"];

  const [userData,setUserData]=useState(null);
  const [siteSettings,setSiteSettings]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  // Rounds state
  const [rounds,setRounds]=useState([]);
  const [claiming,setClaiming]=useState(null);
  const [expanded,setExpanded]=useState(null);
  const [confFilter,setConfFilter]=useState("all"); // "all" | "high" | "medium"

  useEffect(()=>{if(status==="unauthenticated")router.push("/login");},[status]);

  const isFirstLoad=useRef(true);
  const loadAll=async()=>{
    if(!session?.user?.id||session.user.id==="admin") return;
    if(isFirstLoad.current) setLoading(true);
    try{
      const [uR,sR]=await Promise.all([
        fetch(`/api/users/${session.user.id}`),
        fetch("/api/admin/settings"),
      ]);
      if(uR.ok){const d=await uR.json();setUserData(d.user);}
      else if(isFirstLoad.current){setError("Failed to load your data. Please refresh.");}
      if(sR.ok){const d=await sR.json();if(d.settings)setSiteSettings(d.settings);}

      const rR=await fetch(`/api/rounds?gameId=${gameId}`);
      if(rR.ok){const d=await rR.json();setRounds(d.rounds||[]);}
    }catch(e){
      if(isFirstLoad.current) setError("Network error. Check your connection.");
    }
    setLoading(false);
    isFirstLoad.current=false;
  };

  useEffect(()=>{isFirstLoad.current=true;loadAll();},[session,gameId]);
  useEffect(()=>{if(!session?.user?.id)return;const i=setInterval(loadAll,45000);return()=>clearInterval(i);},[session,gameId]);

  // Claim a round (uses 1 credit)
  const claimRound=async(roundId)=>{
    setClaiming(roundId);setError("");
    try{
      const res=await fetch("/api/rounds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({roundId})});
      const data=await res.json();
      if(res.status===429){setError(data.message);loadAll();setClaiming(null);return;}
      if(!res.ok){setError(data.error||"Failed");setClaiming(null);return;}
      setExpanded(roundId);loadAll();
    }catch(e){setError("Network error");}
    setClaiming(null);
  };

  if(status==="loading"||!session) return(
    <div style={{minHeight:"100vh",background:"#0B0D10",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:44,height:44,border:"3px solid #1E2028",borderTopColor:"#0B9635",borderRadius:"50%",animation:"sp .8s linear infinite"}}/>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const pss = siteSettings || {};
  const PKGS = {
    gold:{...PKGS_DEF.gold, max:pss.goldMaxPreds||3},
    platinum:{...PKGS_DEF.platinum, max:pss.platinumMaxPreds||3},
    diamond:{...PKGS_DEF.diamond, max:pss.diamondMaxPreds||3},
  };

  const gp=userData?.gamePackages||{};
  const gamePkg=gp[gameId];
  const hasPkg=!!gamePkg;
  const pkg=hasPkg?PKGS[gamePkg.package]:null;
  const used=gamePkg?.predictionsUsed||0;
  const max=pkg?.max||0;
  const left=max-used;

  const isExpired = hasPkg && gamePkg.expiresAt && new Date(gamePkg.expiresAt).getTime() < Date.now();
  const validPkg = hasPkg && !isExpired;
  const canAccess = validPkg;

  // Separate free rounds from paid rounds
  const freeRounds = rounds.filter(r => r.isFree);
  const paidRounds = rounds.filter(r => !r.isFree);
  const hasFreeRounds = freeRounds.length > 0;

  return(
    <div className="pg">
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10;overflow-x:hidden}
.pg{min-height:100vh;background:#0B0D10;color:#F0F0F2;font-family:'DM Sans',sans-serif}
@keyframes sp{to{transform:rotate(360deg)}}@keyframes su{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes pu{0%,100%{opacity:1}50%{opacity:.4}}
.asu{animation:su .5s cubic-bezier(.16,1,.3,1) both}.ad1{animation-delay:.05s}.ad2{animation-delay:.1s}.ad3{animation-delay:.15s}
.vbg{position:fixed;inset:0;z-index:0;opacity:.02;pointer-events:none}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #151820;background:#0B0D10F0;backdrop-filter:blur(20px);position:sticky;top:0;z-index:90}
.mn{max-width:540px;margin:0 auto;padding:24px 20px;position:relative;z-index:1}
.cd{background:#12141A;border:1px solid #1E2028;border-radius:16px;overflow:hidden;margin-bottom:14px}
.lbl{font-size:10px;font-weight:700;letter-spacing:2px;color:#444;text-transform:uppercase;margin-bottom:4px}
.bv{font-family:'Bebas Neue',sans-serif;letter-spacing:1px}
.btn{padding:12px 20px;border-radius:10px;border:none;font-weight:700;font-size:13px;cursor:pointer;font-family:'DM Sans';transition:all .15s;width:100%}.btn:active{transform:scale(.97)}.btn:disabled{opacity:.4;cursor:not-allowed}
.err{background:#E3172510;border:1px solid #E3172520;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#E31725;font-weight:600}
.empty{text-align:center;padding:48px 20px;color:#444}
.match{background:#0B0D10;border:1px solid #151820;border-radius:12px;padding:14px;margin-bottom:8px}
.pick{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #15182050}.pick:last-child{border-bottom:none}
.round-num{font-size:10px;font-weight:800;letter-spacing:2px;padding:3px 12px;border-radius:6px;display:inline-flex;align-items:center;gap:5px}
/* Bottom Nav */
.bnav{position:fixed;bottom:0;left:0;right:0;background:#0B0D10F5;backdrop-filter:blur(20px);border-top:1px solid #151820;display:flex;justify-content:space-around;padding:6px 0 env(safe-area-inset-bottom,6px);z-index:80}
.bn-i{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:10px;cursor:pointer;transition:all .15s;border:none;background:transparent;font-family:'DM Sans';-webkit-tap-highlight-color:transparent}
.bn-i:active{transform:scale(.92)}.bn-ic{font-size:18px;line-height:1}.bn-lb{font-size:9px;font-weight:700;letter-spacing:.5px}
.bn-i.on .bn-lb{color:#0B9635}.bn-i:not(.on) .bn-lb{color:#333}
@media(max-width:420px){.hdr{padding:8px 12px!important}.mn{padding:16px 12px!important}}
      `}</style>

      <div className="vbg"/>
      <header className="hdr">
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>router.push("/dashboard")}>
          <span style={{fontSize:18,color:"#888"}}>{"\u2190"}</span>
          <img src="/pego-logo.png" alt="BG" style={{height:40,width:"auto"}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>{gm.icon}</span>
          <span className="bv" style={{fontSize:18,letterSpacing:2}}>{gm.name}</span>
          {pkg&&<span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:6,background:pkg.color+"18",color:pkg.color}}>{pkg.icon} {left} left</span>}
        </div>
      </header>

      <main className="mn">

        {/* FREE ROUNDS — always visible */}
        {!loading&&hasFreeRounds&&(
          <div className="asu" style={{marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#0B9635",marginBottom:10}}>{"\u{1F381}"} FREE BETS ({freeRounds.length})</div>
            {freeRounds.map((r,i)=>(
              <div key={r._id} className={`cd asu ad${Math.min(i+1,3)}`} style={{borderColor:"#0B963530"}}>
                <div style={{padding:"16px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span className="round-num" style={{background:"#0B963518",color:"#0B9635"}}>FREE</span>
                      {r.result&&r.result!=="pending"&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:r.result==="won"?"#0B963518":"#E3172518",color:r.result==="won"?"#0B9635":"#E31725"}}>{r.result==="won"?"\u2705 WON":"\u274C LOST"}</span>}
                    </div>
                    <span className="bv" style={{fontSize:22,color:"#D4AF37"}}>{r.totalOdd?.toFixed(2)}x</span>
                  </div>
                  {r.matches?.map((m,mi)=>(
                    <div key={mi} className="match">
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{m.homeTeam} vs {m.awayTeam}</div>
                          {m.matchTime&&<div style={{fontSize:11,color:"#444",marginTop:2}}>{"\u{1F4C5}"} {fmtMatchDate(m.matchTime)}</div>}
                        </div>
                        <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:"#0B963512",color:"#0B9635"}}>MATCH {mi+1}</span>
                      </div>
                      {m.picks?.map((pk,pi)=>(
                        <div key={pi} className="pick">
                          <div>
                            <div style={{fontSize:10,color:"#444",fontWeight:700}}>{pk.market}</div>
                            <div style={{fontSize:15,fontWeight:800,marginTop:2}}>{pk.pick}</div>
                          </div>
                          <span style={{color:"#0B9635",fontWeight:700,fontSize:14}}>{pk.odd}x</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {r.adminNote&&<div style={{marginTop:8,padding:"8px 12px",background:"#D4AF3708",border:"1px solid #D4AF3718",borderRadius:8,fontSize:11,color:"#D4AF37"}}>{"\u{1F4A1}"} {r.adminNote}</div>}
                  {r.betLink&&<a href={r.betLink} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:8,padding:12,background:"#0B963510",border:"1px solid #0B963520",borderRadius:10,textAlign:"center",textDecoration:"none",fontSize:13,fontWeight:700,color:"#0B9635"}}>Place Bet {"\u2192"}</a>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NO PACKAGE */}
        {!canAccess&&!loading&&(
          <div className="asu empty">
            <div style={{fontSize:56,marginBottom:12}}>{"\u{1F512}"}</div>
            <div className="bv" style={{fontSize:28,color:"#F0F0F2",marginBottom:8}}>{isExpired ? "Package Expired" : "No Active Package"}</div>
            <p style={{fontSize:14,marginBottom:24}}>{isExpired ? "Your package has expired. Subscribe again to continue." : `Subscribe to get ${gm.name.toLowerCase()}.`}</p>
            <button className="btn" onClick={()=>router.push("/dashboard")} style={{background:"#0B9635",color:"#fff",maxWidth:260,margin:"0 auto"}}>{"\u2190"} Back to Dashboard</button>
          </div>
        )}

        {/* HAS PACKAGE */}
        {canAccess&&(
          <div className="asu">
            {/* Stats bar */}
            {(()=>{
              const daysLeft = gamePkg?.expiresAt ? Math.max(0, Math.ceil((new Date(gamePkg.expiresAt).getTime() - Date.now()) / (1000*60*60*24))) : null;
              return (
                <div style={{marginBottom:20}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    <div className="cd" style={{padding:14,textAlign:"center"}}><div className="lbl">ROUNDS LEFT</div><div className="bv" style={{fontSize:24,color:"#0B9635"}}>{left}</div></div>
                    <div className="cd" style={{padding:14,textAlign:"center"}}><div className="lbl">PACKAGE</div><div className="bv" style={{fontSize:16,color:pkg.color}}>{pkg.icon} {pkg.name}</div></div>
                    <div className="cd" style={{padding:14,textAlign:"center"}}><div className="lbl">VIEWED</div><div className="bv" style={{fontSize:24}}>{used}/{max}</div></div>
                  </div>
                  {daysLeft !== null && (
                    <div className="cd" style={{padding:"8px 14px",marginTop:8,textAlign:"center",borderColor:daysLeft<=3?"#E3172530":"#0B963520"}}>
                      <span style={{fontSize:11,fontWeight:700,color:daysLeft<=3?"#E31725":daysLeft<=7?"#D4AF37":"#0B9635"}}>{daysLeft<=0?"EXPIRES TODAY":daysLeft===1?"1 DAY LEFT":`${daysLeft} DAYS LEFT`}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {error&&<div className="err">{"\u26A0"} {error}</div>}

            {loading?(
              <div className="empty"><div style={{width:36,height:36,border:"3px solid #1E2028",borderTopColor:gm.color,borderRadius:"50%",animation:"sp .8s linear infinite",margin:"0 auto 12px"}}/><div>Loading rounds...</div></div>
            ):(
              <div>
                {rounds.length===0?(
                  <div className="empty">
                    <div style={{width:64,height:64,borderRadius:16,background:"#0B963508",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                      <div style={{width:28,height:28,border:"3px solid #1E2028",borderTopColor:"#0B9635",borderRadius:"50%",animation:"sp 1.5s linear infinite"}}/>
                    </div>
                    <div style={{fontWeight:700,fontSize:16,color:"#F0F0F2",marginBottom:6}}>Waiting for New Rounds</div>
                    <div style={{fontSize:13,lineHeight:1.6,maxWidth:300,margin:"0 auto",marginBottom:16}}>Our analysts are preparing the next batch of predictions. Check back shortly.</div>
                    <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#0B963508",padding:"8px 16px",borderRadius:8}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:"#0B9635",animation:"pu 1.5s infinite"}}/>
                      <span style={{fontSize:11,color:"#0B9635",fontWeight:700,letterSpacing:1}}>UPDATES COMING SOON</span>
                    </div>
                  </div>
                ):(
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#333"}}>{gm.icon} YOUR ROUNDS ({rounds.length})</div>
                      {rounds.some(r=>r.aiGenerated&&r.aiConfidence)&&(
                        <div style={{display:"flex",gap:4}}>
                          {[{k:"all",l:"All"},{k:"high",l:"75%+"},{k:"medium",l:"60%+"}].map(f=>(
                            <button key={f.k} onClick={()=>setConfFilter(f.k)} style={{padding:"3px 10px",fontSize:10,fontWeight:700,borderRadius:6,border:"1px solid "+(confFilter===f.k?"#8B5CF650":"#1E2028"),background:confFilter===f.k?"#8B5CF615":"transparent",color:confFilter===f.k?"#8B5CF6":"#555",cursor:"pointer"}}>{f.l}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {rounds.filter(r=>{if(confFilter==="all")return true;if(!r.aiGenerated||!r.aiConfidence)return true;if(confFilter==="high")return r.aiConfidence>=75;return r.aiConfidence>=60;}).map((r,i)=>{
                      const isClaimed=r.claimed;
                      const isLocked=!isClaimed&&left<=0;
                      const isOpen=expanded===r._id;
                      const roundNum = i + 1;
                      return(
                        <div key={r._id} className={`cd asu ad${Math.min(i+1,3)}`} style={{borderColor:isClaimed?gm.color+"30":"#1E2028"}}>
                          <div style={{padding:"16px 18px",cursor:"pointer"}} onClick={()=>setExpanded(isOpen?null:r._id)}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span className="round-num" style={{background:isClaimed?"#0B963518":isLocked?"#88888812":"#D4AF3715",color:isClaimed?"#0B9635":isLocked?"#888":"#D4AF37"}}>
                                  {r.aiGenerated?"\u{1F916} ":""}ROUND {roundNum}
                                </span>
                                {r.aiGenerated&&r.aiPackageTier&&<span style={{fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:4,background:"#8B5CF610",color:"#8B5CF6",letterSpacing:1}}>{r.aiPackageTier.toUpperCase()}</span>}
                                {isClaimed&&r.result&&r.result!=="pending"&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:r.result==="won"?"#0B963518":"#E3172518",color:r.result==="won"?"#0B9635":"#E31725"}}>{r.result==="won"?"\u2705 WON":"\u274C LOST"}</span>}
                                {isClaimed&&(!r.result||r.result==="pending")&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#0B963518",color:"#0B9635"}}>{"\u2705"} VIEWED</span>}
                                {!isClaimed&&!isLocked&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:gm.color+"15",color:gm.color}}>{"\u{1F525}"} NEW</span>}
                                {isLocked&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#0B963515",color:"#888"}}>{"\u{1F512}"} LOCKED</span>}
                              </div>
                              {isClaimed?<span className="bv" style={{fontSize:22,color:"#0B9635"}}>{r.totalOdd}x</span>:<span className="bv" style={{fontSize:20,color:"#444"}}>???</span>}
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <div style={{fontWeight:700,fontSize:14}}>{r.matches.length} Matches</div>
                              {!isClaimed && r.expiresAt && (()=>{
                                const ms = new Date(r.expiresAt).getTime() - Date.now();
                                if (ms <= 0) return <span style={{fontSize:10,fontWeight:700,color:"#E31725"}}>EXPIRED</span>;
                                const mins = Math.floor(ms/60000);
                                const hrs = Math.floor(mins/60);
                                const remMins = mins % 60;
                                return <span style={{fontSize:10,fontWeight:700,color:mins<30?"#E31725":mins<120?"#D4AF37":"#0B9635",display:"inline-flex",alignItems:"center",gap:4}}>{"\u23F0"} {hrs>0?`${hrs}h ${remMins}m`:`${remMins}m`} left</span>;
                              })()}
                            </div>
                            <div style={{fontSize:12,color:"#555",marginTop:2}}>{r.matches.map(m=>`${m.homeTeam} vs ${m.awayTeam}`).join(" \u2022 ")}</div>
                          </div>

                          {isClaimed&&isOpen&&(
                            <div style={{padding:"0 18px 18px",animation:"fi .3s"}}>
                              {r.matches.map((m,mi)=>(
                                <div key={mi} className="match">
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                                    <div>
                                      <div style={{fontWeight:700,fontSize:14}}>{m.homeTeam} vs {m.awayTeam}</div>
                                      {m.matchTime&&<div style={{fontSize:11,color:"#444",marginTop:2}}>{"\u{1F4C5}"} {fmtMatchDate(m.matchTime)}</div>}
                                    </div>
                                    <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:gm.color+"12",color:gm.color}}>MATCH {mi+1}</span>
                                  </div>
                                  {m.picks?.map((pk,pi)=>(
                                    <div key={pi} className="pick">
                                      <div>
                                        <div style={{fontSize:10,color:"#444",fontWeight:700}}>{pk.market}</div>
                                        <div style={{fontSize:15,fontWeight:800,marginTop:2}}>{pk.pick}</div>
                                      </div>
                                      <span style={{color:"#0B9635",fontWeight:700,fontSize:14}}>{pk.odd}x</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                              {r.aiGenerated&&r.aiConfidence&&<div style={{marginTop:8,padding:"8px 12px",background:"#8B5CF608",border:"1px solid #8B5CF618",borderRadius:8,fontSize:11,color:"#8B5CF6",display:"flex",alignItems:"center",gap:8}}>{"\u{1F916}"} <strong>AI Confidence:</strong> <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16}}>{r.aiConfidence}%</span></div>}
                              {r.adminNote&&<div style={{marginTop:8,padding:"8px 12px",background:"#D4AF3708",border:"1px solid #D4AF3718",borderRadius:8,fontSize:11,color:"#D4AF37"}}>{"\u{1F4A1}"} <strong>Why these picks:</strong> {r.adminNote}</div>}
                              {r.betLink&&<a href={r.betLink} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:8,padding:12,background:"#0B963510",border:"1px solid #0B963520",borderRadius:10,textAlign:"center",textDecoration:"none",fontSize:13,fontWeight:700,color:"#0B9635"}}>Place Bet {"\u2192"}</a>}
                              {/* Share Round */}
                              <button onClick={(e)=>{e.stopPropagation();const txt=`\u26BD BetGenius AI Round ${roundNum}\n${r.matches.map(m=>`${m.homeTeam} vs ${m.awayTeam}`).join("\n")}\n\nTotal Odds: ${r.totalOdd}x\n\nGet predictions: ${typeof window!=="undefined"?window.location.origin:""}`;if(navigator.share)navigator.share({title:"BetGenius AI",text:txt}).catch(()=>{});else{navigator.clipboard?.writeText(txt);}}} style={{display:"block",marginTop:8,padding:10,background:"transparent",border:"1.5px solid #15182080",borderRadius:10,textAlign:"center",fontSize:12,fontWeight:700,color:"#888",cursor:"pointer",fontFamily:"'DM Sans'",width:"100%"}}>{"\u{1F4E4}"} Share Round</button>
                            </div>
                          )}

                          {!isClaimed&&(
                            <div style={{padding:"0 18px 18px"}}>
                              <div style={{background:"#0B0D10",borderRadius:10,padding:16,textAlign:"center",marginBottom:10}}>
                                <div style={{fontSize:24,marginBottom:6,filter:"blur(3px)",color:"#333"}}>{"\u{1F512}"} {"\u{1F512}"} {"\u{1F512}"}</div>
                                <div style={{fontSize:12,color:"#555"}}>{isLocked?"No rounds left. Subscribe again to continue.":"Unlock to see all predictions"}</div>
                              </div>
                              <button className="btn" disabled={isLocked||claiming===r._id} onClick={()=>claimRound(r._id)} style={{background:isLocked?"#151820":gm.color,color:isLocked?"#444":"#fff",padding:14,fontSize:14}}>
                                {claiming===r._id?"Unlocking...":isLocked?"\u{1F512} No Rounds Left":`View Round ${roundNum} \u2014 ${left} round${left!==1?"s":""} left`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{height:70}} />
      </main>

      {/* BOTTOM NAV */}
      <nav className="bnav">
        {[
          {icon:"\u{1F3E0}",label:"Home",path:"/dashboard"},
          {icon:"\u26BD",label:"Predict",path:"/dashboard/predict?game=football",active:true},
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
