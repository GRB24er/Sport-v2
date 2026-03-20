"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const LOGO = 60;
const DEF_FEE = 20;
const fG = v => `$${Number(v).toLocaleString()}`;
const DEF_PKGS = [
  { id:"gold",name:"Gold",price:40,color:"#D4AF37",icon:"🥇",max:3 },
  { id:"platinum",name:"Platinum",price:80,color:"#94A7BD",icon:"🥈",max:3 },
  { id:"diamond",name:"Diamond",price:160,color:"#7DD3E8",icon:"💎",max:3 },
];
const NOPKG = { id:"none",name:"None",odds:"—",price:0,color:"#444",icon:"—",max:0,features:[] };
const tAgo = d => { if(!d) return "—"; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60) return "just now"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago"; };
const fDate = d => { if(!d) return "—"; try { return new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch(e) { return "—"; }};

export default function AdminDash() {
  const {data:session,status} = useSession();
  const router = useRouter();
  const [tab,setTab] = useState("overview");
  const [sidebar,setSidebar] = useState(false);
  const [users,setUsers] = useState([]);
  const [preds,setPreds] = useState([]);
  const [uploads,setUploads] = useState([]);
  const [respForm,setRespForm] = useState(null);
  const [notifs,setNotifs] = useState([]);
  const [filter,setFilter] = useState("all");
  const [expanded,setExpanded] = useState(null);
  const [modal,setModal] = useState(false);
  const [userModal,setUserModal] = useState(null);
  const [mf,setMf] = useState({gameId:"football",note:"",expire:60,bettingLink:"",matches:[{home:"",away:"",time:"",mkt:"1X2",pick:"",odd:""},{home:"",away:"",time:"",mkt:"Over/Under 2.5",pick:"",odd:""},{home:"",away:"",time:"",mkt:"BTTS",pick:"",odd:""}]});
  const [sending,setSending] = useState(false);
  const [refData,setRefData] = useState({ usersWithCodes:[], allReferred:[], stats:{} });
  const [settings,setSettings] = useState(null);
  const [broadcasts,setBroadcasts] = useState([]);
  const [supportThreads,setSupportThreads] = useState([]);
  const [supportUnread,setSupportUnread] = useState(0);
  const [pkgRequests,setPkgRequests] = useState([]);
  const [activeChat,setActiveChat] = useState(null);
  const [chatMessages,setChatMessages] = useState([]);
  const [chatUser,setChatUser] = useState(null);
  const [replyText,setReplyText] = useState("");
  const [broadcastForm,setBroadcastForm] = useState({subject:"",body:""});
  const [settingsForm,setSettingsForm] = useState(null);
  const [saving,setSaving] = useState(false);
  const [refreshing,setRefreshing] = useState(false);
  const [dataLoaded,setDataLoaded] = useState(false);
  const [uploadsWithImages,setUploadsWithImages] = useState(null);
  const [loadingImages,setLoadingImages] = useState(false);

  useEffect(() => {
    if(status==="unauthenticated") router.push("/login");
    if(session && session.user.role!=="admin") router.push("/dashboard");
  },[status,session,router]);

  // Single consolidated fetch — 1 serverless cold start instead of 9
  const load = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      const d = await res.json();
      if (d.error) { console.error("Dashboard load error:", d.error); setRefreshing(false); return; }
      setUsers(d.users||[]);
      setPreds(d.rounds||[]);
      setUploads(d.uploads||[]);
      setNotifs(d.notifications||[]);
      setRefData(d.referralData||{ usersWithCodes:[], allReferred:[], stats:{} });
      if(d.settings) { setSettings(d.settings); if(!settingsForm) {
        // Unpack momoProviders array into flat fields for the form
        const sf = { ...d.settings };
        const mp = sf.momoProviders || [];
        for (let i = 0; i < 3; i++) {
          sf[`momoProvider${i+1}Name`] = mp[i]?.name || "";
          sf[`momoProvider${i+1}Number`] = mp[i]?.number || "";
          sf[`momoProvider${i+1}Account`] = mp[i]?.accountName || "";
        }
        setSettingsForm(sf);
      } }
      setBroadcasts(d.broadcasts||[]);
      setSupportThreads(d.support?.threads||[]);
      setSupportUnread(d.support?.totalUnread||0);
      setPkgRequests(d.packageRequests||[]);
      setDataLoaded(true);
      setUploadsWithImages(null); // Clear image cache so it refetches when tab is opened
    } catch(e) { console.error("Load error",e); }
    setRefreshing(false);
  };

  useEffect(() => { if(session?.user?.role==="admin") load(); },[session]);

  // Lazy-load upload images only when Uploads tab is opened
  useEffect(() => {
    if(tab==="uploads" && !uploadsWithImages && !loadingImages) {
      setLoadingImages(true);
      fetch("/api/uploads?withImage=true")
        .then(r=>r.json())
        .then(d=>{ if(d.uploads) setUploadsWithImages(d.uploads); })
        .catch(e=>console.error("Image load error:",e))
        .finally(()=>setLoadingImages(false));
    }
  },[tab]);

  // Use image-enriched uploads when available, fall back to metadata-only
  const displayUploads = uploadsWithImages || uploads;

  const LoadingSkeleton = () => (
    <div style={{minHeight:"100vh",background:"#0B0D10",padding:24}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:32}}>
          <div style={{width:60,height:60,borderRadius:12,background:"#1E2028"}} />
          <div><div style={{width:180,height:24,background:"#1E2028",borderRadius:6,marginBottom:8}} /><div style={{width:120,height:14,background:"#1A1C22",borderRadius:4}} /></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
          {[1,2,3].map(i=><div key={i} style={{background:"#14161B",border:"1px solid #1E2028",borderRadius:12,padding:24}}><div style={{width:80,height:12,background:"#1E2028",borderRadius:4,marginBottom:12}} /><div style={{width:120,height:32,background:"#1E2028",borderRadius:6}} /></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
          {[1,2,3,4].map(i=><div key={i} style={{background:"#14161B",border:"1px solid #1E2028",borderRadius:12,padding:20}}><div style={{width:60,height:10,background:"#1E2028",borderRadius:4,marginBottom:10}} /><div style={{width:80,height:24,background:"#1E2028",borderRadius:6}} /></div>)}
        </div>
        <div style={{textAlign:"center",color:"#555",fontSize:14,marginTop:40}}>Loading dashboard data...</div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:0.4}50%{opacity:0.8}} [style*="background: #1E2028"],[style*="background:#1E2028"]{animation:pulse 1.5s ease-in-out infinite}`}</style>
    </div>
  );

  if(status==="loading"||!session) return <LoadingSkeleton />;
  if(!dataLoaded && refreshing) return <LoadingSkeleton />;

  // ── CALCULATED STATS ──
  const pending = users.filter(u=>u.status==="pending");
  const approved = users.filter(u=>u.status==="approved");

  // Dynamic prices from settings
  const ss = settings || {};
  const FEE = ss.signupFee || DEF_FEE;
  const PKGS = [
    { ...DEF_PKGS[0], price: ss.goldPrice || DEF_PKGS[0].price, max: ss.goldMaxPreds || DEF_PKGS[0].max },
    { ...DEF_PKGS[1], price: ss.platinumPrice || DEF_PKGS[1].price, max: ss.platinumMaxPreds || DEF_PKGS[1].max },
    { ...DEF_PKGS[2], price: ss.diamondPrice || DEF_PKGS[2].price, max: ss.diamondMaxPreds || DEF_PKGS[2].max },
  ];
  const getPkg = id => { if(!id) return NOPKG; return PKGS.find(p => p.id === id) || NOPKG; };
  const rejected = users.filter(u=>u.status==="rejected");
  const unread = notifs.filter(n=>!n.read).length;
  const filtered = (filter==="all"?users:users.filter(u=>u.status===filter)).filter(u=>{const q=typeof window!=="undefined"?window._userSearch||"":"";if(!q)return true;return(u.name||"").toLowerCase().includes(q)||(u.phone||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q)});

  // Revenue calculations
  const calcRevenue = (userList) => {
    return userList.reduce((total, u) => total + (u.amountPaid || 0), 0);
  };
  const totalRevenue = calcRevenue(approved);
  const todayUsers = approved.filter(u => {
    const d = new Date(u.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const thisWeekUsers = approved.filter(u => {
    const d = new Date(u.createdAt);
    const now = new Date();
    const weekAgo = new Date(now - 7*24*60*60*1000);
    return d >= weekAgo;
  });

  // Package stats — count from per-game gamePackages Map
  const pkgStats = PKGS.map(p => {
    let count = 0;
    approved.forEach(u => {
      if (u.gamePackages) {
        const gp = u.gamePackages instanceof Map ? u.gamePackages : new Map(Object.entries(u.gamePackages || {}));
        gp.forEach(val => { if (val.package === p.id) count++; });
      }
    });
    const revenue = count * p.price;
    return { ...p, count, revenue };
  });

  // Prediction stats
  const pendUploads = uploads.filter(u => u.status === "pending");
  const doneUploads = uploads.filter(u => u.status === "responded");
  const todayUploads = uploads.filter(u => new Date(u.createdAt).toDateString() === new Date().toDateString());

  // Referral stats
  const totalReferrals = users.filter(u => u.referredBy).length;
  const approvedReferrals = approved.filter(u => u.referredBy).length;
  const referralBonus = approvedReferrals * (ss.referralBonus || 2);

  // Top referrers
  const referrerMap = {};
  users.forEach(u => {
    if(u.referredBy) {
      if(!referrerMap[u.referredBy]) referrerMap[u.referredBy] = { code: u.referredBy, total: 0, approved: 0 };
      referrerMap[u.referredBy].total++;
      if(u.status === "approved") referrerMap[u.referredBy].approved++;
    }
  });
  const topReferrers = Object.values(referrerMap).sort((a,b) => b.approved - a.approved).slice(0,5);
  // Match referral codes to user names
  topReferrers.forEach(r => {
    const u = users.find(u => u.referralCode === r.code);
    r.name = u ? u.name : r.code;
    r.bonus = r.approved * (ss.referralBonus || 2);
  });

  // Active users (have active game packages)
  const PKG_MAX = { gold: ss.goldMaxPreds || 3, platinum: ss.platinumMaxPreds || 3, diamond: ss.diamondMaxPreds || 3 };
  const activeUsers = approved.filter(u => {
    if (!u.gamePackages) return false;
    const gp = u.gamePackages instanceof Map ? u.gamePackages : new Map(Object.entries(u.gamePackages || {}));
    let hasActive = false;
    gp.forEach(val => {
      const max = PKG_MAX[val.package] || 3;
      const left = max - (val.predictionsUsed || 0);
      const notExpired = !val.expiresAt || new Date(val.expiresAt) > new Date();
      if (left > 0 && notExpired) hasActive = true;
    });
    return hasActive;
  });
  const lockedUsers = approved.filter(u => {
    if (!u.gamePackages) return false;
    const gp = u.gamePackages instanceof Map ? u.gamePackages : new Map(Object.entries(u.gamePackages || {}));
    let allUsed = true;
    let hasAny = false;
    gp.forEach(val => {
      hasAny = true;
      const max = PKG_MAX[val.package] || 3;
      const left = max - (val.predictionsUsed || 0);
      const notExpired = !val.expiresAt || new Date(val.expiresAt) > new Date();
      if (left > 0 && notExpired) allUsed = false;
    });
    return hasAny && allUsed;
  });

  const approve = async id => { await fetch("/api/users/approve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:id})}); load(); };
  const reject = async id => { await fetch("/api/users/reject",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:id})}); load(); };
  const remove = async id => { if(!confirm("Delete this user permanently? This cannot be undone.")) return; await fetch(`/api/users/${id}`,{method:"DELETE"}); setUserModal(null); load(); };
  const generateCode = async (userId) => {
    const res = await fetch("/api/referrals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    const data = await res.json();
    if(res.ok) { alert("Code generated: "+data.code); load(); } else { alert(data.error||"Failed"); }
  };
  const markRead = async () => { await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({markAll:true})}); load(); };

  const upgradeUser = async (id, newPkg, gameId = "football") => {
    const pkg = { package: newPkg, predictionsUsed: 0, activatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
    await fetch(`/api/users/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({[`gamePackages.${gameId}`]: pkg})});
    setUserModal(null); load();
  };
  const approvePkg = async (userId, gameId) => { await fetch("/api/packages",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,gameId,action:"approve"})}); load(); };
  const rejectPkg = async (userId, gameId) => { if(!confirm("Reject this package request? The user will need to re-submit.")) return; await fetch("/api/packages",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,gameId,action:"reject"})}); load(); };

  const FOOTBALL_MKTS = {
    "1X2":["1 (Home)","X (Draw)","2 (Away)"],
    "Over/Under 1.5":["Over 1.5","Under 1.5"],
    "Over/Under 2.5":["Over 2.5","Under 2.5"],
    "Over/Under 3.5":["Over 3.5","Under 3.5"],
    "BTTS":["Yes","No"],
    "Double Chance":["1X","12","X2"],
    "Correct Score":["1-0","2-0","2-1","3-0","3-1","0-0","1-1","2-2","0-1","0-2","1-2"],
    "HT Result":["1 (Home)","X (Draw)","2 (Away)"],
    "HT/FT":["1/1","1/X","1/2","X/1","X/X","X/2","2/1","2/X","2/2"],
    "Total Goals":["0-1","2-3","4-5","6+"],
  };
  const BASKETBALL_MKTS = {
    "Moneyline":["Home Win","Away Win"],
    "Point Spread":["+Spread Home","-Spread Home","+Spread Away","-Spread Away"],
    "Over/Under Points":["Over","Under"],
    "Quarter Winner":["Home Q1","Away Q1","Home Q2","Away Q2","Home Q3","Away Q3","Home Q4","Away Q4"],
    "Total Points Range":["Under 180.5","Over 180.5","Under 200.5","Over 200.5","Under 220.5","Over 220.5"],
  };
  const TENNIS_MKTS = {
    "Match Winner":["Player 1","Player 2"],
    "Set Winner":["Player 1 Set","Player 2 Set"],
    "Total Sets":["2 Sets","3 Sets","4 Sets","5 Sets"],
    "Game Handicap":["+1.5 P1","-1.5 P1","+1.5 P2","-1.5 P2","+2.5 P1","-2.5 P1","+2.5 P2","-2.5 P2"],
    "Over/Under Games":["Over 20.5","Under 20.5","Over 22.5","Under 22.5"],
  };
  const MKTS = mf.gameId === "basketball" ? BASKETBALL_MKTS : mf.gameId === "tennis" ? TENNIS_MKTS : FOOTBALL_MKTS;
  const MKT_KEYS = Object.keys(MKTS);

  const updMatch = (idx, field, val) => setMf(f => {
    const matches = [...f.matches];
    matches[idx] = { ...matches[idx], [field]: val };
    if (field === "mkt") matches[idx].pick = "";
    return { ...f, matches };
  });

  const sendPred = async () => {
    const valid = mf.matches.filter(m => m.home && m.away && m.pick);
    if (valid.length === 0) return;
    setSending(true);
    await fetch("/api/rounds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      gameId: mf.gameId,
      matches: valid.map(m => ({ homeTeam: m.home, awayTeam: m.away, matchTime: m.time, picks: [{ market: m.mkt, pick: m.pick, odd: parseFloat(m.odd) || 1.5 }] })),
      adminNote: mf.note, bettingLink: mf.bettingLink,
      goLive: true,
      expiresInMinutes: parseInt(mf.expire) || 60,
      isFree: !!mf.isFree,
    })});
    setSending(false); setModal(false);
    setMf({gameId:"football",note:"",expire:60,bettingLink:"",isFree:false,matches:[{home:"",away:"",time:"",mkt:"1X2",pick:"",odd:""},{home:"",away:"",time:"",mkt:"Over/Under 2.5",pick:"",odd:""},{home:"",away:"",time:"",mkt:"BTTS",pick:"",odd:""}]});
    load();
  };

  const saveSettings = async () => {
    if(!settingsForm) return;
    setSaving(true);
    // Build momoProviders array from flat fields
    const sf = { ...settingsForm };
    const momoProviders = [];
    for (let i = 1; i <= 3; i++) {
      const name = sf[`momoProvider${i}Name`];
      const number = sf[`momoProvider${i}Number`];
      if (name && number) {
        momoProviders.push({ id: `momo_${name.toLowerCase().replace(/\s/g,"_")}`, name, number, accountName: sf[`momoProvider${i}Account`] || "", color: "#0B9635", enabled: true });
      }
      delete sf[`momoProvider${i}Name`]; delete sf[`momoProvider${i}Number`]; delete sf[`momoProvider${i}Account`];
    }
    sf.momoProviders = momoProviders;
    sf.momoEnabled = momoProviders.length > 0;
    const res = await fetch("/api/admin/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(sf)});
    const data = await res.json();
    if(data.settings) { setSettings(data.settings);
      const sf2 = { ...data.settings }; const mp2 = sf2.momoProviders || [];
      for (let i = 0; i < 3; i++) { sf2[`momoProvider${i+1}Name`] = mp2[i]?.name || ""; sf2[`momoProvider${i+1}Number`] = mp2[i]?.number || ""; sf2[`momoProvider${i+1}Account`] = mp2[i]?.accountName || ""; }
      setSettingsForm(sf2);
    }
    setSaving(false);
  };
  const sendBroadcast = async () => {
    if(!broadcastForm.body.trim()) return;
    setSending(true);
    await fetch("/api/admin/broadcast",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:broadcastForm.subject,message:broadcastForm.body})});
    setSending(false); setBroadcastForm({subject:"",body:""}); load();
  };
  const openChat = async (threadId) => {
    setActiveChat(threadId);
    const res = await fetch(`/api/support?threadId=${threadId}`).then(r=>r.json());
    setChatMessages(res.messages||[]); setChatUser(res.user||null);
  };
  const sendReply = async () => {
    if(!replyText.trim()||!activeChat) return;
    await fetch("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:replyText,threadId:activeChat})});
    setReplyText(""); openChat(activeChat); load();
  };
  const TABS = [
    {id:"overview",icon:"📊",label:"Overview"},
    {id:"pending",icon:"⏳",label:"Pending",cnt:pending.length,cc:"#0B9635"},
    {id:"pkg-requests",icon:"📦",label:"Packages",cnt:pkgRequests.length,cc:pkgRequests.length>0?"#D4AF37":null},
    {id:"users",icon:"👥",label:"Users",cnt:users.length},
    {id:"uploads",icon:"📸",label:"Uploads",cnt:uploads.filter(u=>u.status==="pending").length},
    {id:"rounds",icon:"⚽",label:"Prediction Rounds",cnt:preds.filter(r=>r.status==="live").length,cc:preds.filter(r=>r.status==="live").length>0?"#0B9635":null},
    {id:"referrals",icon:"🔗",label:"Referrals",cnt:totalReferrals},
    {id:"notifs",icon:"🔔",label:"Alerts",cnt:unread,cc:unread>0?"#0B9635":null},
    {id:"payments",icon:"💳",label:"Payments"},
    {id:"support",icon:"💬",label:"Support",cnt:supportUnread,cc:supportUnread>0?"#0B9635":null},
    {id:"broadcast",icon:"📢",label:"Broadcast",cnt:broadcasts.length},
    {id:"settings",icon:"⚙️",label:"Settings"},
  ];

  // Shared styles
  const card = {background:"#12141A",border:"1px solid #151820",borderRadius:14,padding:22,marginBottom:14,transition:"all 0.2s"};
  const stat = {background:"#12141A",border:"1px solid #151820",borderRadius:14,padding:18,transition:"all 0.2s"};
  const lbl = {fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",textTransform:"uppercase",marginBottom:6};
  const val = {fontFamily:"'Bebas Neue'",letterSpacing:1};
  const section = {fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",textTransform:"uppercase",margin:"20px 0 10px"};
  const btn = (bg,c) => ({background:bg,color:c||"#fff",border:"none",padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",transition:"all .2s"});
  const badge = (bg,c) => ({fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:10,background:bg,color:c,letterSpacing:.5,whiteSpace:"nowrap"});
  const inp = p => ({...p,style:{width:"100%",padding:"12px 14px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none",...(p.style||{})}});

  return (
    <div style={{minHeight:"100vh",background:"#0B0D10",color:"#F0F0F2",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
@keyframes slideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
.as{animation:slideIn .5s cubic-bezier(.16,1,.3,1) both}
.d1{animation-delay:.05s}.d2{animation-delay:.1s}.d3{animation-delay:.15s}.d4{animation-delay:.2s}.d5{animation-delay:.25s}.d6{animation-delay:.3s}
.abg{position:fixed;inset:0;z-index:0;background-image:url(/backdrop.png);background-size:380px auto;background-repeat:repeat;opacity:.02;pointer-events:none}
@media(max-width:768px){
  .aside{position:fixed!important;left:-260px;top:53px;bottom:0;z-index:85;transition:left .3s!important;width:240px!important}
  .aside.open{left:0!important}
  .aover{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:80}
  .aover.show{display:block!important}
  .aham{display:block!important}
  .amain{padding:20px 16px!important}
  .agrid2{grid-template-columns:1fr 1fr!important}
  .agrid3{grid-template-columns:1fr 1fr!important}
  .agrid4{grid-template-columns:1fr 1fr!important}
  .ahdr{padding:10px 16px!important}
  .atable-wrap{overflow-x:auto}
}
@media(max-width:480px){.agrid2,.agrid3,.agrid4{grid-template-columns:1fr!important}.amain{padding:16px 12px!important}}
      `}</style>

      <div className="abg" />

      {/* HEADER */}
      <header className="ahdr" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 24px",borderBottom:"1px solid #151820",background:"#0B0D10F0",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:90}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button className="aham" style={{display:"none",background:"none",border:"none",color:"#F0F0F2",fontSize:22,cursor:"pointer"}} onClick={()=>setSidebar(!sidebar)}>☰</button>
          <a href="/"><img src="/images/logo.png" alt="BG" style={{height:LOGO,width:"auto",objectFit:"contain"}} /></a>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:1.5,padding:"4px 12px",borderRadius:8,background:"#0B963518",color:"#0B9635"}}>ADMIN</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={load} disabled={refreshing} style={{...btn("#151820","#888"),opacity:refreshing?.5:1}}>{refreshing?"⟳":"↻"} Refresh</button>
          <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setTab("notifs")}><span style={{fontSize:18}}>🔔</span>{unread>0&&<span style={{position:"absolute",top:-4,right:-6,background:"#0B9635",color:"#fff",fontSize:8,fontWeight:800,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}</div>
          <button onClick={()=>signOut({callbackUrl:"/"})} style={{...btn("transparent","#555"),border:"1px solid #1E2028"}}>Logout</button>
        </div>
      </header>

      <div style={{display:"flex",position:"relative",zIndex:1,minHeight:"calc(100vh - 53px)"}}>
        <div className={`aover ${sidebar?"show":""}`} onClick={()=>setSidebar(false)} />

        {/* SIDEBAR */}
        <aside className={`aside ${sidebar?"open":""}`} style={{width:220,background:"#0E1015",borderRight:"1px solid #151820",padding:"16px 0",flexShrink:0,display:"flex",flexDirection:"column"}}>
          <nav style={{flex:1}}>{TABS.map(t=>(
            <div key={t.id} onClick={()=>{setTab(t.id);setSidebar(false)}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 20px",cursor:"pointer",borderLeft:tab===t.id?"3px solid #0B9635":"3px solid transparent",background:tab===t.id?"#0B963508":"transparent",color:tab===t.id?"#F0F0F2":"#555",fontSize:13,fontWeight:500,transition:"all .15s"}}>
              <span style={{fontSize:16,width:22,textAlign:"center"}}>{t.icon}</span><span>{t.label}</span>
              {t.cnt!=null&&<span style={{marginLeft:"auto",fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,background:(t.cc||"#555")+"18",color:t.cc||"#555"}}>{t.cnt}</span>}
            </div>
          ))}</nav>
          {/* Revenue summary in sidebar */}
          <div style={{padding:"14px 20px",borderTop:"1px solid #151820",marginBottom:8}}>
            <div style={lbl}>TOTAL REVENUE</div>
            <div style={{...val,fontSize:20,color:"#0B9635"}}>{fG(totalRevenue)}</div>
          </div>
          <div style={{padding:"0 20px 14px"}}><button onClick={()=>setModal(true)} style={{width:"100%",padding:14,background:"#0B9635",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>+ Create Round</button></div>
        </aside>

        {/* CONTENT */}
        <main className="amain" style={{flex:1,padding:"28px 32px",overflowY:"auto",maxHeight:"calc(100vh - 53px)"}}>

          {/* ═══ OVERVIEW ═══ */}
          {tab==="overview"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Admin Dashboard</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Platform overview — real-time data</p>

            {/* Top stats row */}
            <div className="agrid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {[
                {l:"TOTAL REVENUE",v:fG(totalRevenue),c:"#0B9635",s:`${approved.length} approved`,icon:"💰"},
                {l:"TOTAL USERS",v:users.length,s:`${approved.length} approved • ${pending.length} pending`,icon:"👥"},
                {l:"UPLOADS",v:uploads.length,c:"#0B9635",s:`${pendUploads.length} pending • ${doneUploads.length} done`,icon:"📸"},
              ].map((s,i)=>(
                <div key={s.l} className={`as d${i+1}`} style={stat}>
                  <div style={lbl}>{s.icon} {s.l}</div>
                  <div style={{...val,fontSize:28,color:s.c||"#F0F0F2"}}>{s.v}</div>
                  <div style={{fontSize:11,color:"#444",marginTop:2}}>{s.s}</div>
                </div>
              ))}
            </div>

            {/* Secondary stats */}
            <div className="agrid4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[
                {l:"TODAY",v:todayUsers.length+" new",icon:"📅",s:todayUploads.length+" uploads"},
                {l:"THIS WEEK",v:thisWeekUsers.length+" users",icon:"📆",s:fG(calcRevenue(thisWeekUsers))},
                {l:"ACTIVE",v:activeUsers.length,icon:"⚡",c:"#0B9635",s:lockedUsers.length+" locked"},
                {l:"REFERRALS",v:totalReferrals,icon:"🔗",s:fG(referralBonus)+" owed"},
              ].map((s,i)=>(
                <div key={s.l} className={`as d${i+1}`} style={stat}>
                  <div style={lbl}>{s.icon} {s.l}</div>
                  <div style={{...val,fontSize:22,color:s.c||"#F0F0F2"}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#444",marginTop:2}}>{s.s}</div>
                </div>
              ))}
            </div>

            {/* AI Predictor Performance */}
            {(()=>{const aiRounds=preds.filter(r=>r.aiGenerated);const aiWon=aiRounds.filter(r=>r.result==="won").length;const aiLost=aiRounds.filter(r=>r.result==="lost").length;const aiResolved=aiWon+aiLost;const aiRate=aiResolved>0?Math.round(aiWon/aiResolved*100):0;const aiPending=aiRounds.filter(r=>r.result==="pending").length;return aiRounds.length>0?(
            <div style={{marginBottom:16}}>
              <div style={section}>AI PREDICTOR PERFORMANCE</div>
              <div className="agrid4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                {[
                  {l:"AI ROUNDS",v:aiRounds.length,icon:"\u{1F916}",s:`${aiRounds.filter(r=>r.status==="live").length} live`,c:"#8B5CF6"},
                  {l:"WIN RATE",v:aiRate+"%",icon:"\u{1F3AF}",s:`${aiWon}W / ${aiLost}L`,c:aiRate>=70?"#0B9635":aiRate>=50?"#D4AF37":"#E53E3E"},
                  {l:"PENDING",v:aiPending,icon:"\u23F3",s:"awaiting results",c:"#D4AF37"},
                  {l:"AVG CONFIDENCE",v:Math.round(aiRounds.reduce((a,r)=>a+(r.aiConfidence||0),0)/aiRounds.length)+"%",icon:"\u{1F4CA}",s:"AI self-rating",c:"#94A7BD"},
                ].map((s,i)=>(
                  <div key={s.l} className={`as d${i+1}`} style={stat}>
                    <div style={lbl}>{s.icon} {s.l}</div>
                    <div style={{...val,fontSize:22,color:s.c||"#F0F0F2"}}>{s.v}</div>
                    <div style={{fontSize:10,color:"#444",marginTop:2}}>{s.s}</div>
                  </div>
                ))}
              </div>
            </div>
            ):null;})()}

            {/* Package breakdown */}
            <div style={section}>PACKAGE BREAKDOWN</div>
            <div className="agrid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {pkgStats.map((p,i)=>(
                <div key={p.id} className={`as d${i+1}`} style={{...stat,textAlign:"center",borderColor:p.count>0?p.color+"30":"#151820"}}>
                  <div style={{fontSize:32,marginBottom:4}}>{p.icon}</div>
                  <div style={{...val,fontSize:18,color:p.color,letterSpacing:1}}>{p.name}</div>
                  <div style={{...val,fontSize:32}}>{p.count}</div>
                  <div style={{fontSize:11,color:"#0B9635",fontWeight:700}}>{fG(p.revenue)}</div>
                  <div style={{fontSize:10,color:"#444",marginTop:4}}>{fG(p.revenue)} revenue</div>
                </div>
              ))}
            </div>

            {/* Pending alerts */}
            {pending.length>0&&(<div>
              <div style={{...section,color:"#0B9635"}}>🔴 PENDING APPROVALS ({pending.length})</div>
              {pending.map(u=>{const pgp=u.pendingGamePackages?(typeof u.pendingGamePackages==='object'?Object.values(u.pendingGamePackages):[]):[];const firstPkg=pgp[0];const p=firstPkg?getPkg(firstPkg.package):NOPKG;return(
                <div key={u._id} className="as" style={{...card,borderColor:"#0B963520",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:15}}>{u.name} <span style={{color:"#444",fontWeight:400,fontSize:12}}>({u.phone})</span></div>
                    <div style={{fontSize:12,color:"#444",marginTop:2}}>
                      Ref: <span style={{color:"#0B9635",fontWeight:700,fontFamily:"monospace"}}>{u.referenceNumber}</span> • {p.icon} {p.name} • Total: {fG(FEE + p.price)}
                    </div>
                    <div style={{fontSize:11,color:"#333",marginTop:2}}>Submitted {tAgo(u.createdAt)}{u.referredBy ? ` • Referred by: ${u.referredBy}` : ""}</div>
                    {u.paymentProofUrl&&<div style={{marginTop:8}}><img src={u.paymentProofUrl} alt="Payment proof" onClick={()=>window.open(u.paymentProofUrl,"_blank")} style={{maxHeight:120,borderRadius:8,border:"1px solid #1E2028",cursor:"pointer",objectFit:"cover"}} /><div style={{fontSize:10,color:"#555",marginTop:2}}>Click to enlarge</div></div>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>approve(u._id)} style={btn("#0B9635")}>✓ Approve</button>
                    <button onClick={()=>reject(u._id)} style={btn("#076B25")}>✗ Reject</button>
                  </div>
                </div>
              );})}
            </div>)}

            {/* Package requests */}
            {pkgRequests.length>0&&(<div>
              <div style={{...section,color:"#D4AF37"}}>📦 PACKAGE REQUESTS ({pkgRequests.length})</div>
              {pkgRequests.slice(0,3).map((r,i)=>{const pc={gold:"#D4AF37",platinum:"#94A7BD",diamond:"#7DD3E8"};const pi={gold:"🥇",platinum:"🥈",diamond:"💎"};const gc={football:"⚽",["virtual-football"]:"⚽",egames:"⚽",["instant-virtual"]:"⚽",basketball:"🏀",tennis:"🎾"};return(
                <div key={r.userId+r.gameId} className="as" style={{...card,borderColor:(pc[r.packageId]||"#D4AF37")+"25",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>{r.userName} <span style={{color:"#444",fontWeight:400,fontSize:12}}>({r.userPhone})</span></div><div style={{fontSize:12,color:"#444",marginTop:2}}>{gc[r.gameId]||"🎮"} <strong>{r.gameName}</strong> → {pi[r.packageId]} <span style={{color:pc[r.packageId],fontWeight:700}}>{r.packageName}</span> — ${r.packagePrice} • {r.providerName} • Ref: <span style={{color:"#0B9635",fontFamily:"monospace",fontWeight:700}}>{r.referenceNumber}</span>{r.senderName?` • From: ${r.senderName}`:""}</div>{r.paymentProofUrl&&<div style={{marginTop:6}}><img src={r.paymentProofUrl} alt="Proof" onClick={()=>window.open(r.paymentProofUrl,"_blank")} style={{maxHeight:100,borderRadius:8,border:"1px solid #1E2028",cursor:"pointer",objectFit:"cover"}} /></div>}</div>
                  <div style={{display:"flex",gap:6}}><button onClick={()=>approvePkg(r.userId,r.gameId)} style={btn("#0B9635")}>✓ Activate</button><button onClick={()=>rejectPkg(r.userId,r.gameId)} style={btn("#076B25")}>✗</button></div>
                </div>
              );})}
              {pkgRequests.length>3&&<button style={{...btn("#151820","#888"),width:"100%",marginTop:4}} onClick={()=>setTab("pkg-requests")}>View all {pkgRequests.length} requests</button>}
            </div>)}

            {/* Top referrers */}
            {topReferrers.length>0&&(<div>
              <div style={section}>🏆 TOP REFERRERS</div>
              <div style={card}>
                {topReferrers.map((r,i)=>(
                  <div key={r.code} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<topReferrers.length-1?"1px solid #151820":"none"}}>
                    <div><span style={{fontWeight:700}}>{r.name}</span><span style={{color:"#444",fontSize:12,marginLeft:8}}>{r.code}</span></div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:12,color:"#444"}}>{r.approved}/{r.total} approved</span>
                      <span style={{...val,fontSize:16,color:"#0B9635"}}>{fG(r.bonus)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>)}

            {/* Recent activity */}
            <div style={section}>RECENT ACTIVITY</div>
            <div style={card}>
              {notifs.slice(0,5).map((n,i)=>(
                <div key={n._id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<4?"1px solid #151820":"none"}}>
                  <span>{n.type==="payment"?"💰":n.type==="manual_prediction"?"🤖":n.type==="prediction_request"?"📸":"🔔"}</span>
                  {!n.read&&<span style={badge("#0B963518","#0B9635")}>NEW</span>}
                  <div style={{flex:1,fontSize:13,color:"#888"}}>{n.message}</div>
                  <span style={{fontSize:10,color:"#333",whiteSpace:"nowrap"}}>{tAgo(n.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>)}

          {/* ═══ PENDING ═══ */}
          {tab==="pending"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Pending Payments ({pending.length})</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Verify payment before approving. Expected: {fG(FEE)} registration fee per user.</p>

            {pending.length===0?(
              <div style={{...card,textAlign:"center",padding:48,color:"#444",border:"1px solid #0B963520"}}><div style={{fontSize:48,marginBottom:8}}>✅</div><div style={{fontWeight:700,fontSize:16}}>All caught up!</div><div style={{fontSize:13,marginTop:4}}>No pending payments</div></div>
            ):pending.map((u,i)=>{const pgp=u.pendingGamePackages?Object.values(typeof u.pendingGamePackages==="object"?u.pendingGamePackages:{}):[];const gpp=u.gamePackages?Object.values(typeof u.gamePackages==="object"?u.gamePackages:{}):[];const fp=pgp[0]||gpp[0];const p=fp?getPkg(fp.package):NOPKG;return(
              <div key={u._id} className={`as d${Math.min(i+1,5)}`} style={{...card,borderColor:"#0B963520"}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:17,marginBottom:8}}>{u.name}</div>
                    <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"4px 12px",fontSize:13}}>
                      {[
                        {l:"Phone",v:u.phone},
                        {l:"Email",v:u.email||"—"},
                        {l:"Reference",v:u.referenceNumber,c:"#0B9635",m:true},
                        {l:"Provider",v:u.paymentProvider||"Not specified"},
                        {l:"Expected",v:fG(FEE),c:"#0B9635"},
                        {l:"Betting ID",v:u.bettingId||"—"},
                        {l:"Referred By",v:u.referredBy||"None",c:u.referredBy?"#D4AF37":"#333"},
                        {l:"Submitted",v:fDate(u.createdAt)},
                      ].map(r=>(<>
                        <span key={r.l+"l"} style={{color:"#444",fontWeight:600}}>{r.l}:</span>
                        <span key={r.l+"v"} style={{color:r.c||"#F0F0F2",fontWeight:600,fontFamily:r.m?"monospace":"inherit"}}>{r.v}</span>
                      </>))}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button onClick={()=>approve(u._id)} style={{...btn("#0B9635"),padding:"14px 24px",fontSize:14}}>✓ Verify & Approve</button>
                    <button onClick={()=>reject(u._id)} style={{...btn("#076B25"),padding:"14px 24px",fontSize:14}}>✗ Reject</button>
                  </div>
                </div>
              </div>
            );})}
          </div>)}

          {/* ═══ USERS ═══ */}
          {tab==="users"&&(<div className="as">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
              <h1 style={{...val,fontSize:28}}>All Users ({filtered.length})</h1>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["all","approved","pending","rejected","banned","blocked","suspended"].map(f=>{const cnt=f==="all"?users.length:users.filter(u=>u.status===f).length;if(cnt===0&&f!=="all"&&f!=="approved"&&f!=="pending") return null;return(
                <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",border:filter===f?"1px solid #0B9635":"1px solid #1E2028",background:filter===f?"#0B9635":"transparent",color:filter===f?"#fff":"#555",fontFamily:"'DM Sans'",letterSpacing:.5,textTransform:"uppercase"}}>{f} ({cnt})</button>
              );})}</div>
            </div>
            {/* Search bar */}
            <input placeholder="Search by name, phone, or email..." onChange={e=>{const q=e.target.value.toLowerCase();setFilter(prev=>{window._userSearch=q;return prev})}} style={{width:"100%",padding:"12px 16px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:10,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none",marginBottom:14}} />
            <div className="atable-wrap">
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>{["Name","Phone","Pkg","Preds","Revenue","Ref Code","Status","Joined","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 8px",color:"#444",fontSize:10,fontWeight:700,letterSpacing:1.5,borderBottom:"1px solid #151820"}}>{h}</th>)}</tr></thead>
                <tbody>{filtered.map(u=>{const gp=u.gamePackages?(typeof u.gamePackages==='object'?Object.values(u.gamePackages):[]):[];const firstPkg=gp[0];const p=firstPkg?getPkg(firstPkg.package):NOPKG;const rev=u.amountPaid||0;return(
                  <tr key={u._id} style={{borderBottom:"1px solid #15182080",cursor:"pointer"}} onClick={()=>setUserModal(u)}>
                    <td style={{padding:"10px 8px",fontWeight:600}}>{u.name}</td>
                    <td style={{padding:"10px 8px",color:"#555"}}>{u.phone}</td>
                    <td style={{padding:"10px 8px"}}><span style={badge(p.color+"18",p.color)}>{p.icon} {p.name}</span></td>
                    <td style={{padding:"10px 8px"}}><span style={{color:(firstPkg?.predictionsUsed||0)>=p.max?"#E31725":"#0B9635",fontWeight:700}}>{firstPkg?.predictionsUsed||0}/{p.max}</span></td>
                    <td style={{padding:"10px 8px",color:"#0B9635",fontWeight:700}}>{fG(rev)}</td>
                    <td style={{padding:"10px 8px",fontFamily:"monospace",fontSize:11,color:"#555"}}>{u.referralCode||"—"}</td>
                    <td style={{padding:"10px 8px"}}><span style={badge(u.status==="approved"?"#0B963518":u.status==="pending"?"#D4AF3718":u.status==="banned"?"#E3172518":u.status==="blocked"?"#E3172518":u.status==="suspended"?"#94A7BD18":"#E3172518",u.status==="approved"?"#0B9635":u.status==="pending"?"#D4AF37":u.status==="banned"?"#E31725":u.status==="blocked"?"#E31725":u.status==="suspended"?"#94A7BD":"#E31725")}>{u.status}</span></td>
                    <td style={{padding:"10px 8px",fontSize:11,color:"#444"}}>{tAgo(u.createdAt)}</td>
                    <td style={{padding:"10px 8px"}}><div style={{display:"flex",gap:4}}>
                      {u.status==="pending"&&<button onClick={e=>{e.stopPropagation();approve(u._id)}} style={btn("#0B9635")}>Approve</button>}
                      <button onClick={e=>{e.stopPropagation();remove(u._id)}} style={btn("#076B25")}>Delete</button>
                    </div></td>
                  </tr>
                )})}</tbody>
              </table>
            </div>
          </div>)}

          {/* ═══ PREDICTIONS ═══ */}
          {tab==="uploads"&&(<div className="as">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div><h1 style={{...val,fontSize:28}}>Uploads ({displayUploads.length})</h1><p style={{fontSize:12,color:"#444"}}>{displayUploads.filter(u=>u.status==="pending").length} pending • {displayUploads.filter(u=>u.status==="responded").length} responded</p></div>
            </div>
            {loadingImages&&<div style={{textAlign:"center",padding:"12px 0",color:"#D4AF37",fontSize:12,fontWeight:600}}>Loading screenshots...</div>}

            {displayUploads.filter(u=>u.status==="pending").length===0&&displayUploads.filter(u=>u.status==="responded").length===0&&(
              <div style={{...card,textAlign:"center",padding:48,color:"#444"}}><div style={{fontSize:48,marginBottom:8}}>📸</div>No uploads yet. Users will send screenshots here.</div>
            )}

            {/* Pending uploads */}
            {displayUploads.filter(u=>u.status==="pending").length>0&&(
              <div style={{marginBottom:20}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#D4AF37",marginBottom:8}}>⏳ PENDING — NEED YOUR PREDICTION</div>
                {displayUploads.filter(u=>u.status==="pending").map((up,i)=>(
                  <div key={up._id} className={`as d${Math.min(i+1,5)}`} style={{background:"#12141A",border:"1px solid #D4AF3730",borderRadius:14,marginBottom:12,overflow:"hidden"}}>
                    <div style={{padding:16}}>
                      <div style={{display:"flex",gap:14,marginBottom:12}}>
                        <div style={{width:100,height:100,borderRadius:10,overflow:"hidden",border:"1px solid #1E2028",flexShrink:0,cursor:"pointer",background:"#1E2028",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setExpanded(expanded===up._id?null:up._id)}>
                          {up.imageData?<img src={up.imageData} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="screenshot"/>:<span style={{fontSize:24}}>📸</span>}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14}}>{up.userName}</div>
                          <div style={{fontSize:12,color:"#444"}}>{up.userPhone}</div>
                          <div style={{fontSize:11,color:"#555",marginTop:4}}>{new Date(up.createdAt).toLocaleString()}</div>
                          <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:6}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:"#D4AF37",animation:"pulse 1.5s infinite"}}/>
                            <span style={{fontSize:10,fontWeight:700,color:"#D4AF37"}}>WAITING FOR YOUR PREDICTION</span>
                          </div>
                        </div>
                      </div>

                      {/* Full screenshot */}
                      {expanded===up._id&&(
                        <div style={{marginBottom:14,borderRadius:12,overflow:"hidden",border:"1px solid #1E2028"}}>
                          {up.imageData?<img src={up.imageData} style={{width:"100%",maxHeight:400,objectFit:"contain",display:"block",background:"#0B0D10"}} alt="full screenshot"/>:<div style={{padding:32,textAlign:"center",color:"#555",background:"#0B0D10",fontSize:13}}>Loading image...</div>}
                        </div>
                      )}

                      {/* Response form — up to 3 matches */}
                      {respForm===up._id?(
                        <div style={{background:"#0B0D10",border:"1px solid #1E2028",borderRadius:12,padding:14}}>
                          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#0B9635",marginBottom:10}}>ENTER PREDICTIONS (2-3 MATCHES)</div>
                          {[0,1,2].map(mi=>(
                            <div key={mi} style={{background:"#12141A",border:"1px solid #1E2028",borderRadius:10,padding:10,marginBottom:8}}>
                              <div style={{fontSize:9,fontWeight:700,color:"#0B9635",letterSpacing:1,marginBottom:6}}>MATCH {mi+1}{mi===2?" (optional)":""}</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:4}}>
                                <input id={`h${mi}-${up._id}`} placeholder="Home" style={{padding:"8px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:6,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none"}}/>
                                <input id={`a${mi}-${up._id}`} placeholder="Away" style={{padding:"8px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:6,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none"}}/>
                              </div>
                              <select id={`mk${mi}-${up._id}`} style={{width:"100%",padding:"7px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:6,color:"#F0F0F2",fontSize:10,fontFamily:"'DM Sans'",outline:"none",marginBottom:4,cursor:"pointer"}}>
                                <option value="1X2">1X2</option><option value="Over/Under 1.5">O/U 1.5</option><option value="Over/Under 2.5">O/U 2.5</option><option value="Over/Under 3.5">O/U 3.5</option><option value="BTTS">BTTS</option><option value="Double Chance">Double Chance</option><option value="Correct Score">Correct Score</option><option value="HT Result">HT Result</option><option value="Total Goals">Total Goals</option>
                              </select>
                              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:4}}>
                                <input id={`pk${mi}-${up._id}`} placeholder="Pick" style={{padding:"8px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:6,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none"}}/>
                                <input id={`od${mi}-${up._id}`} placeholder="Odd" style={{padding:"8px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:6,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none"}}/>
                              </div>
                            </div>
                          ))}
                          <input id={`nt-${up._id}`} placeholder="Note (optional)" style={{width:"100%",padding:"8px",background:"#12141A",border:"1px solid #1E2028",borderRadius:6,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none",marginBottom:8}}/>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>setRespForm(null)} style={{flex:1,padding:10,background:"transparent",border:"1px solid #1E2028",borderRadius:8,color:"#888",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>Cancel</button>
                            <button onClick={async()=>{
                              const matches=[];
                              for(let i=0;i<3;i++){
                                const h=document.getElementById(`h${i}-${up._id}`)?.value;
                                const a=document.getElementById(`a${i}-${up._id}`)?.value;
                                const mk=document.getElementById(`mk${i}-${up._id}`)?.value;
                                const pk=document.getElementById(`pk${i}-${up._id}`)?.value;
                                const od=document.getElementById(`od${i}-${up._id}`)?.value;
                                if(h&&a&&pk) matches.push({homeTeam:h,awayTeam:a,picks:[{market:mk||"1X2",pick:pk,odd:parseFloat(od)||1.5}]});
                              }
                              if(matches.length===0) return;
                              const nt=document.getElementById(`nt-${up._id}`)?.value;
                              await fetch("/api/uploads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({uploadId:up._id,matches,adminNote:nt||""})});
                              setRespForm(null);load();
                            }} style={{flex:2,padding:10,background:"#0B9635",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>✅ Send Predictions</button>
                          </div>
                        </div>
                      ):(
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setRespForm(up._id);setExpanded(up._id);}} style={{flex:2,padding:10,background:"#0B9635",border:"none",borderRadius:10,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>📝 Enter Prediction</button>
                          <button onClick={async()=>{await fetch("/api/uploads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({uploadId:up._id,action:"reject",adminNote:"Unclear screenshot"})});load();}} style={{flex:1,padding:10,background:"#0B963510",border:"1px solid #0B963520",borderRadius:10,color:"#0B9635",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>✗ Reject</button>
                          <button onClick={async()=>{if(confirm("Delete this upload?")){await fetch("/api/uploads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({uploadId:up._id,action:"delete"})});load();}}} style={{padding:10,background:"#151820",border:"1px solid #1E2028",borderRadius:10,color:"#555",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Responded uploads */}
            {displayUploads.filter(u=>u.status==="responded").length>0&&(
              <div>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#0B9635",marginBottom:8}}>✅ RESPONDED</div>
                {displayUploads.filter(u=>u.status==="responded").map((up,i)=>(
                  <div key={up._id} style={{background:"#12141A",border:"1px solid #0B963520",borderRadius:14,marginBottom:10,padding:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:12,color:"#444"}}>{up.userName} ({up.userPhone})</div>
                        <div style={{fontSize:11,color:"#555"}}>{up.matches?.length||0} matches • {tAgo(up.respondedAt||up.updatedAt)}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{...val,fontSize:18,color:"#0B9635"}}>{up.totalOdd}x</div>
                        <button onClick={async()=>{if(confirm("Delete?")){await fetch("/api/uploads",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({uploadId:up._id,action:"delete"})});load();}}} style={{padding:"4px 10px",background:"#151820",border:"1px solid #1E2028",borderRadius:6,fontSize:10,color:"#555",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>🗑</button>
                      </div>
                    </div>
                    {up.matches?.map((m,mi)=>(
                      <div key={mi} style={{background:"#0B0D10",border:"1px solid #151820",borderRadius:8,padding:8,marginBottom:4}}>
                        <div style={{fontWeight:700,fontSize:12}}>{m.homeTeam} vs {m.awayTeam}</div>
                        <div style={{display:"flex",gap:4,marginTop:3,flexWrap:"wrap"}}>{m.picks?.map((pk,j)=>(<span key={j} style={{padding:"2px 8px",background:"#0B963510",border:"1px solid #0B963520",borderRadius:4,fontSize:10,color:"#0B9635",fontWeight:600}}>{pk.market}: {pk.pick} ({pk.odd}x)</span>))}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>)}


          {/* ═══ eGAMES ROUNDS ═══ */}
          {tab==="rounds"&&(<div className="as">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
              <div><h1 style={{...val,fontSize:28}}>Prediction Rounds ({preds.length})</h1><p style={{fontSize:12,color:"#444"}}>{preds.filter(r=>r.status==="live").length} live \u2022 {preds.filter(r=>r.status==="closed"||r.status==="expired").length} ended \u2022 {preds.filter(r=>r.aiGenerated).length} AI {(()=>{const w=preds.filter(r=>r.aiGenerated&&r.result==="won").length;const l=preds.filter(r=>r.aiGenerated&&r.result==="lost").length;return w+l>0?`(${w}W/${l}L)`:"";})()}</p></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{if(!confirm("Trigger AI to generate predictions for today's matches?"))return;try{const r=await fetch("/api/cron/predict",{method:"POST"});const d=await r.json();alert(d.message||JSON.stringify(d));load();}catch(e){alert("Failed: "+e.message);}}} style={{...btn("#8B5CF6"),padding:"10px 20px",fontSize:13}}>{"\u{1F916}"} AI Predict</button>
                <button onClick={async()=>{try{const r=await fetch("/api/cron/results",{method:"POST"});const d=await r.json();alert(d.message||JSON.stringify(d));load();}catch(e){alert("Failed: "+e.message);}}} style={{...btn("#D4AF37"),padding:"10px 20px",fontSize:13}}>{"\u2705"} Check Results</button>
                <button onClick={()=>setModal(true)} style={{...btn("#0B9635"),padding:"10px 20px",fontSize:13}}>+ Create Round</button>
              </div>
            </div>

            {preds.length===0?<div style={{...card,textAlign:"center",padding:48,color:"#444"}}><div style={{fontSize:48,marginBottom:8}}>🎮</div>No rounds yet. Create one to get started.</div>:
            preds.map((r,i)=>(
              <div key={r._id||i} className={`as d${Math.min(i+1,5)}`} style={{background:"#12141A",border:`1px solid ${r.status==="live"?"#8B5CF630":"#1E2028"}`,borderRadius:14,marginBottom:10,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={badge(r.status==="live"?"#8B5CF618":"#44444418",r.status==="live"?"#8B5CF6":"#444")}>{r.status==="live"?"🟢 LIVE":r.status==="draft"?"📝 Draft":r.status==="expired"?"⏰ Expired":"🔴 Closed"}</span>
                    {r.aiGenerated&&<span style={badge("#8B5CF610","#8B5CF6")}>{"\u{1F916}"} AI {r.aiPackageTier?r.aiPackageTier.toUpperCase():""}{r.aiConfidence?` ${r.aiConfidence}%`:""}</span>}
                    <span style={{fontSize:12,color:"#555"}}>{r.matches?.length||0} matches • {(r.claimedBy||[]).length} claims</span>
                    {r.result&&r.result!=="pending"&&<span style={badge(r.result==="won"?"#0B963518":"#E3172518",r.result==="won"?"#0B9635":"#E31725")}>{r.result==="won"?"✅ WON":"❌ LOST"}</span>}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {r.status==="live"&&<button onClick={async()=>{await fetch("/api/rounds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({roundId:r._id,action:"close"})});load();}} style={{padding:"6px 12px",background:"#0B963510",border:"1px solid #0B963520",borderRadius:6,color:"#0B9635",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>Close</button>}
                    {r.status==="draft"&&<button onClick={async()=>{await fetch("/api/rounds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({roundId:r._id,action:"publish",expiresInMinutes:60})});load();}} style={{padding:"6px 12px",background:"#8B5CF6",border:"none",borderRadius:6,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>Publish</button>}
                    {(r.status==="closed"||r.status==="expired"||(r.claimedBy||[]).length>0)&&r.result!=="won"&&<button onClick={async()=>{await fetch("/api/rounds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({roundId:r._id,action:"result",result:"won"})});load();}} style={{padding:"6px 12px",background:"#0B963510",border:"1px solid #0B963520",borderRadius:6,color:"#0B9635",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>✅ Won</button>}
                    {(r.status==="closed"||r.status==="expired"||(r.claimedBy||[]).length>0)&&r.result!=="lost"&&<button onClick={async()=>{await fetch("/api/rounds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({roundId:r._id,action:"result",result:"lost"})});load();}} style={{padding:"6px 12px",background:"#E3172510",border:"1px solid #E3172520",borderRadius:6,color:"#E31725",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>❌ Lost</button>}
                    <button onClick={async()=>{if(confirm("Delete this round?")){await fetch("/api/rounds",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({roundId:r._id,action:"delete"})});load();}}} style={{padding:"6px 12px",background:"#151820",border:"1px solid #1E2028",borderRadius:6,color:"#555",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>🗑</button>
                  </div>
                </div>
                {r.matches?.map((m,mi)=>(
                  <div key={mi} style={{background:"#0B0D10",border:"1px solid #151820",borderRadius:10,padding:10,marginBottom:4}}>
                    <div style={{fontWeight:700,fontSize:13}}>{m.homeTeam} vs {m.awayTeam}{m.matchTime?` • ${m.matchTime}`:""}</div>
                    <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>{m.picks?.map((pk,pi)=>(<span key={pi} style={{padding:"2px 8px",background:"#8B5CF610",border:"1px solid #8B5CF620",borderRadius:4,fontSize:10,color:"#8B5CF6",fontWeight:600}}>{pk.market}: {pk.pick} ({pk.odd}x)</span>))}</div>
                  </div>
                ))}
                <div style={{fontSize:10,color:"#444",marginTop:6}}>{r.totalOdd}x total • {tAgo(r.createdAt)}{r.expiresAt?` • expires ${new Date(r.expiresAt).toLocaleTimeString()}`:""}</div>
              </div>
            ))}
          </div>)}

          {/* ═══ REFERRALS ═══ */}
          {tab==="referrals"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Referral Management</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Generate codes, track referrals, monitor payouts</p>

            <div className="agrid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              <div style={stat}><div style={lbl}>TOTAL REFERRALS</div><div style={{...val,fontSize:28}}>{refData.stats?.totalReferrals||0}</div><div style={{fontSize:10,color:"#444"}}>{refData.stats?.approvedReferrals||0} approved</div></div>
              <div style={stat}><div style={lbl}>TOTAL PAID OUT</div><div style={{...val,fontSize:28,color:"#0B9635"}}>{fG(refData.stats?.totalBonusPaid||0)}</div><div style={{fontSize:10,color:"#444"}}>To all referrers</div></div>
              <div style={stat}><div style={lbl}>OUTSTANDING</div><div style={{...val,fontSize:28,color:"#D4AF37"}}>{fG(refData.stats?.totalOutstanding||0)}</div><div style={{fontSize:10,color:"#444"}}>Current balances</div></div>
            </div>

            {/* Users with codes */}
            <div style={section}>ACTIVE REFERRAL CODES</div>
            <div style={card}>
              {(refData.usersWithCodes||[]).length===0?<div style={{textAlign:"center",padding:28,color:"#444"}}>No referral codes generated yet</div>:
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr>{["User","Code","Referred","Balance","Total Earned"].map(h=><th key={h} style={{textAlign:"left",padding:"8px",color:"#444",fontSize:10,fontWeight:700,letterSpacing:1.5,borderBottom:"1px solid #151820"}}>{h}</th>)}</tr></thead>
                <tbody>{(refData.usersWithCodes||[]).map(u=>(
                  <tr key={u._id}><td style={{padding:8,fontWeight:600}}>{u.name}<div style={{fontSize:10,color:"#444"}}>{u.phone}</div></td><td style={{padding:8,fontFamily:"monospace",color:"#0B9635",fontWeight:700,letterSpacing:1}}>{u.referralCode}</td><td style={{padding:8}}>{u.referralCount||0}</td><td style={{padding:8,color:"#D4AF37",fontWeight:700}}>{fG(u.referralBalance||0)}</td><td style={{padding:8,color:"#0B9635",fontWeight:700}}>{fG(u.referralTotalEarned||0)}</td></tr>
                ))}</tbody>
              </table>}
            </div>

            {/* Users without codes */}
            <div style={section}>GENERATE NEW CODES</div>
            <div style={card}>
              {approved.filter(u=>!u.referralCode).length===0?<div style={{textAlign:"center",padding:20,color:"#444"}}>All approved users have referral codes</div>:
              approved.filter(u=>!u.referralCode).map((u,i)=>(
                <div key={u._id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<approved.filter(x=>!x.referralCode).length-1?"1px solid #151820":"none"}}>
                  <div><div style={{fontWeight:700}}>{u.name}</div><div style={{fontSize:11,color:"#444"}}>{u.phone} • {(()=>{const gv=u.gamePackages?Object.values(typeof u.gamePackages==="object"?u.gamePackages:{}):[];const fp=gv[0];const pk=fp?getPkg(fp.package):NOPKG;return pk.icon+" "+pk.name;})()}</div></div>
                  <button onClick={()=>generateCode(u._id)} style={{...btn("#0B9635"),padding:"8px 20px"}}>Generate Code</button>
                </div>
              ))}
            </div>

            {/* All referred users */}
            <div style={section}>REFERRED USERS</div>
            <div style={card}>
              {(refData.allReferred||[]).length===0?<div style={{textAlign:"center",padding:28,color:"#444"}}>No referrals yet</div>:
              (refData.allReferred||[]).map((u,i)=>(
                <div key={u._id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<(refData.allReferred||[]).length-1?"1px solid #151820":"none"}}>
                  <div><div style={{fontWeight:700}}>{u.name} <span style={{color:"#444",fontSize:12}}>({u.phone})</span></div><div style={{fontSize:11,color:"#444"}}>Code used: <span style={{color:"#D4AF37",fontFamily:"monospace"}}>{u.referredBy}</span></div></div>
                  <div style={{textAlign:"right"}}><span style={badge(u.status==="approved"?"#0B963518":"#D4AF3718",u.status==="approved"?"#0B9635":"#D4AF37")}>{u.status}</span>{u.status==="approved"&&<div style={{fontSize:11,color:"#0B9635",fontWeight:700,marginTop:2}}>+{fG(10)} paid</div>}</div>
                </div>
              ))}
            </div>
          </div>)}


          {/* ═══ NOTIFICATIONS ═══ */}
          {tab==="notifs"&&(<div className="as">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h1 style={{...val,fontSize:28}}>Notifications ({notifs.length})</h1>
              <div style={{display:"flex",gap:6}}>
                <button onClick={markRead} style={{...btn("transparent","#F0F0F2"),border:"1px solid #2A2D34"}}>Mark All Read</button>
                <button onClick={async()=>{if(confirm("Delete ALL notifications?")){await fetch("/api/notifications",{method:"DELETE"});load();}}} style={{...btn("#151820","#0B9635"),border:"1px solid #0B963520"}}>🗑 Delete All</button>
              </div>
            </div>
            {notifs.length===0?<div style={{textAlign:"center",padding:48,color:"#444"}}>No notifications</div>:
            notifs.map((n,i)=>(
              <div key={n._id||i} className={`as d${Math.min(i+1,5)}`} style={{borderRadius:12,padding:"14px 18px",marginBottom:8,border:"1px solid "+(n.read?"#151820":"#0B963518"),background:n.read?"#12141A":"#0B963506"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span>{n.type==="payment"?"💰":n.type==="manual_prediction"?"🤖":n.type==="prediction_request"?"📸":n.type==="approval"?"✅":n.type==="rejection"?"❌":"🔔"}</span>
                  {!n.read&&<span style={badge("#0B963518","#0B9635")}>NEW</span>}
                  <span style={{fontSize:11,color:"#333"}}>{tAgo(n.createdAt)}</span>
                </div>
                <div style={{fontSize:13,color:"#888",lineHeight:1.5}}>{n.message}</div>
              </div>
            ))}
          </div>)}


          {/* ═══ PAYMENTS ═══ */}


          {/* ═══ PACKAGE REQUESTS ═══ */}
          {tab==="pkg-requests"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Package Requests ({pkgRequests.length})</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Verify payment and activate user game packages</p>

            {pkgRequests.length===0?(
              <div style={{...card,textAlign:"center",padding:48,color:"#444",borderColor:"#0B963520"}}><div style={{fontSize:48,marginBottom:8}}>✅</div><div style={{fontWeight:700,fontSize:16}}>No pending requests</div><div style={{fontSize:13,marginTop:4}}>All game packages verified</div></div>
            ):pkgRequests.map((r,i)=>{
              const pc={gold:"#D4AF37",platinum:"#94A7BD",diamond:"#7DD3E8"};
              const pi={gold:"🥇",platinum:"🥈",diamond:"💎"};
              const gc={football:"⚽",["virtual-football"]:"⚽",egames:"⚽",["instant-virtual"]:"⚽"};
              const c=pc[r.packageId]||"#D4AF37";
              return(
                <div key={r.userId+r.gameId} className={"as d"+Math.min(i+1,5)} style={{...card,borderColor:c+"30"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                    <div style={{width:44,height:44,borderRadius:12,background:"#0B9635",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:"#fff",flexShrink:0}}>{r.userName?.slice(0,2).toUpperCase()}</div>
                    <div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>{r.userName}</div><div style={{fontSize:12,color:"#555"}}>{r.userPhone} • {r.userEmail||""}</div></div>
                    <div style={{textAlign:"right"}}><span style={{fontSize:10,fontWeight:700,padding:"4px 12px",borderRadius:8,background:c+"18",color:c,letterSpacing:1}}>{pi[r.packageId]} {r.packageName}</span><div style={{fontSize:10,color:"#888",marginTop:4}}>{gc[r.gameId]||"🎮"} {r.gameName}</div></div>
                  </div>

                  <div style={{background:"#0B0D10",borderRadius:12,padding:16,marginBottom:14}}>
                    <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 16px",fontSize:13}}>
                      <span style={{color:"#444",fontWeight:600}}>Game:</span>
                      <span style={{fontWeight:700,color:"#F0F0F2"}}>{gc[r.gameId]||"🎮"} {r.gameName}</span>

                      <span style={{color:"#444",fontWeight:600}}>Package:</span>
                      <span style={{fontWeight:700,color:c}}>{pi[r.packageId]} {r.packageName} — ${r.packagePrice}</span>

                      <span style={{color:"#444",fontWeight:600}}>Provider:</span>
                      <span style={{fontWeight:700,color:"#0B9635"}}>{r.providerName}</span>

                      <span style={{color:"#444",fontWeight:600}}>Reference:</span>
                      <span style={{fontWeight:700,color:"#0B9635",fontFamily:"monospace",fontSize:14,letterSpacing:1}}>{r.referenceNumber}</span>

                      {r.senderName&&<><span style={{color:"#444",fontWeight:600}}>Sender/Merchant:</span><span style={{fontWeight:700,color:"#F0F0F2"}}>{r.senderName}</span></>}

                      <span style={{color:"#444",fontWeight:600}}>Submitted:</span>
                      <span style={{color:"#888"}}>{r.date?new Date(r.date).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"—"}</span>
                    </div>
                  </div>

                  <div style={{background:"#D4AF3708",border:"1px solid #D4AF3718",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#D4AF37",lineHeight:1.6}}>
                    💡 <strong>Verify:</strong> Check {r.providerName} for reference <strong>{r.referenceNumber}</strong>{r.senderName?` from ${r.senderName}`:""} — <strong>${r.packagePrice}</strong> for {r.gameName}
                  </div>

                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>approvePkg(r.userId,r.gameId)} style={{flex:2,...btn("#0B9635"),padding:"14px",fontSize:14}}>✓ Activate {r.gameName} {r.packageName}</button>
                    <button onClick={()=>rejectPkg(r.userId,r.gameId)} style={{flex:1,...btn("#076B25"),padding:"14px",fontSize:14}}>✗ Reject</button>
                  </div>
                </div>
              );
            })}
          </div>)}


          {tab==="payments"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Payment Management</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>All payments and revenue tracking</p>

            <div className="agrid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              <div style={stat}><div style={lbl}>💰 TOTAL REVENUE</div><div style={{...val,fontSize:28,color:"#0B9635"}}>{fG(totalRevenue)}</div><button onClick={async()=>{if(!confirm("Reset ALL revenue to $0.00? This cannot be undone."))return;try{const r=await fetch("/api/admin/dashboard",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"reset_revenue"})});if(r.ok){toast.success("Revenue reset to zero");load();}else{toast.error("Failed to reset");}}catch(e){toast.error("Network error");}}} style={{marginTop:8,padding:"6px 12px",background:"#E3172515",color:"#E31725",border:"1px solid #E3172530",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>Reset Revenue</button></div>
              <div style={stat}><div style={lbl}>📋 TOTAL PAYMENTS</div><div style={{...val,fontSize:28}}>{approved.length}</div><div style={{fontSize:10,color:"#444"}}>{pending.length} pending</div></div>
              <div style={stat}><div style={lbl}>🔗 REFERRAL PAYOUTS</div><div style={{...val,fontSize:28,color:"#D4AF37"}}>{fG(refData.stats?.totalBonusPaid||0)}</div><div style={{fontSize:10,color:"#444"}}>{refData.stats?.totalOutstanding||0} outstanding</div></div>
            </div>

            <div className="agrid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              {pkgStats.map((p,i)=>(
                <div key={p.id} style={{...stat,borderColor:p.color+"20"}}>
                  <div style={lbl}>{p.icon} {p.name} REVENUE</div>
                  <div style={{...val,fontSize:24,color:p.color}}>{fG(p.revenue)}</div>
                  <div style={{fontSize:10,color:"#444"}}>{p.count} users</div>
                </div>
              ))}
            </div>

            <div style={section}>ALL PAYMENT RECORDS</div>
            <div className="atable-wrap"><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr>{["User","Phone","Package","Ref #","Provider","Amount","Status","Date"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 8px",color:"#444",fontSize:10,fontWeight:700,letterSpacing:1.5,borderBottom:"1px solid #151820"}}>{h}</th>)}</tr></thead>
              <tbody>{users.filter(u=>u.status!=="rejected").map(u=>{const gv=u.gamePackages?Object.values(typeof u.gamePackages==="object"?u.gamePackages:{}):[];const fp=gv[0];const p=fp?getPkg(fp.package):NOPKG;return(
                <tr key={u._id} style={{borderBottom:"1px solid #15182080"}}>
                  <td style={{padding:"10px 8px",fontWeight:600}}>{u.name}</td>
                  <td style={{padding:"10px 8px",color:"#555"}}>{u.phone}</td>
                  <td style={{padding:"10px 8px"}}><span style={badge(p.color+"18",p.color)}>{p.icon} {p.name}</span></td>
                  <td style={{padding:"10px 8px",fontFamily:"monospace",fontSize:11,color:"#0B9635",fontWeight:700}}>{u.referenceNumber}</td>
                  <td style={{padding:"10px 8px",color:"#555",textTransform:"uppercase",fontSize:11}}>{u.paymentProvider||"—"}</td>
                  <td style={{padding:"10px 8px",color:"#0B9635",fontWeight:700}}>{fG(u.amountPaid||FEE)}</td>
                  <td style={{padding:"10px 8px"}}><span style={badge(u.status==="approved"?"#0B963518":"#D4AF3718",u.status==="approved"?"#0B9635":"#D4AF37")}>{u.status==="approved"?"Paid":"Pending"}</span></td>
                  <td style={{padding:"10px 8px",fontSize:11,color:"#444"}}>{tAgo(u.createdAt)}</td>
                </tr>
              );})}</tbody>
            </table></div>
          </div>)}

          {/* ═══ SUPPORT ═══ */}
          {tab==="support"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Support Messages</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Read and reply to user messages</p>

            {activeChat?(<div>
              <button onClick={()=>{setActiveChat(null);setChatMessages([]);setChatUser(null)}} style={{...btn("#151820","#888"),marginBottom:16}}>← Back to threads</button>
              {chatUser&&<div style={{...card,display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#0B9635",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:13}}>{chatUser.name?.slice(0,2).toUpperCase()}</div>
                <div><div style={{fontWeight:700}}>{chatUser.name}</div><div style={{fontSize:12,color:"#444"}}>{chatUser.phone} • {chatUser.email}</div></div>
              </div>}

              <div style={{...card,maxHeight:400,overflowY:"auto",padding:16}}>
                {chatMessages.length===0?<div style={{textAlign:"center",padding:28,color:"#444"}}>No messages yet</div>:
                chatMessages.map((m,i)=>(
                  <div key={m._id||i} style={{display:"flex",flexDirection:"column",alignItems:m.sender==="admin"?"flex-end":"flex-start",marginBottom:12}}>
                    <div style={{maxWidth:"75%",background:m.sender==="admin"?"#0B963520":"#151820",border:"1px solid "+(m.sender==="admin"?"#0B963530":"#1E2028"),borderRadius:m.sender==="admin"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"10px 14px"}}>
                      <div style={{fontSize:10,color:m.sender==="admin"?"#0B9635":"#D4AF37",fontWeight:700,marginBottom:4}}>{m.sender==="admin"?"Admin":m.senderName||"User"}</div>
                      <div style={{fontSize:13,color:"#ddd",lineHeight:1.5}}>{m.body}</div>
                      <div style={{fontSize:9,color:"#333",marginTop:4,textAlign:"right"}}>{tAgo(m.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:8,marginTop:8}}>
                <input value={replyText} onChange={e=>setReplyText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendReply()}} placeholder="Type your reply..." style={{flex:1,padding:"12px 14px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:10,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} />
                <button onClick={sendReply} disabled={!replyText.trim()} style={{...btn("#0B9635"),padding:"12px 20px",opacity:!replyText.trim()?.5:1}}>Send</button>
              </div>
            </div>):(<div>
              {supportThreads.length===0?<div style={{...card,textAlign:"center",padding:48,color:"#444"}}><div style={{fontSize:48,marginBottom:8}}>💬</div>No support messages yet</div>:
              supportThreads.map((t,i)=>(
                <div key={t._id||i} style={{...card,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",borderColor:t.unread>0?"#0B963520":"#151820"}} onClick={()=>openChat(t._id)}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:"#0B9635",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:11}}>{t.user?.name?.slice(0,2).toUpperCase()||"??"}</div>
                    <div><div style={{fontWeight:700}}>{t.user?.name||"User"} <span style={{color:"#444",fontSize:11}}>({t.user?.phone})</span></div><div style={{fontSize:12,color:"#555",marginTop:2}}>{t.lastMessage?.slice(0,60)}{t.lastMessage?.length>60?"...":""}</div></div>
                  </div>
                  <div style={{textAlign:"right"}}>{t.unread>0&&<span style={badge("#0B963518","#0B9635")}>{t.unread} new</span>}<div style={{fontSize:10,color:"#333",marginTop:4}}>{tAgo(t.lastDate)}</div></div>
                </div>
              ))}
            </div>)}
          </div>)}

          {/* ═══ BROADCAST ═══ */}
          {tab==="broadcast"&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Broadcast Center</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Send announcements to all {approved.length} approved users</p>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
              {/* Compose */}
              <div style={{...card,borderColor:"#0B963520"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#0B9635",letterSpacing:1.5,marginBottom:14}}>COMPOSE</div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><label style={lbl}>SUBJECT</label><span style={{fontSize:10,color:broadcastForm.subject.length>100?"#E31725":"#444"}}>{broadcastForm.subject.length}/100</span></div>
                  <input value={broadcastForm.subject} onChange={e=>setBroadcastForm(f=>({...f,subject:e.target.value.slice(0,100)}))} placeholder="e.g. System Update, New Feature" style={{width:"100%",padding:"12px 14px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} />
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><label style={lbl}>MESSAGE</label><span style={{fontSize:10,color:broadcastForm.body.length>500?"#E31725":"#444"}}>{broadcastForm.body.length}/500</span></div>
                  <textarea value={broadcastForm.body} onChange={e=>setBroadcastForm(f=>({...f,body:e.target.value.slice(0,500)}))} placeholder="Type your announcement message..." style={{width:"100%",padding:"12px 14px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none",minHeight:140,resize:"vertical"}} />
                </div>
                <div style={{background:"#0B963508",border:"1px solid #0B963520",borderRadius:10,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>👥</span>
                  <span style={{fontSize:13,color:"#888"}}>Will be sent to <strong style={{color:"#0B9635"}}>{approved.length}</strong> approved users</span>
                </div>
                <button onClick={()=>{if(!broadcastForm.body.trim())return;if(!confirm(`Send this broadcast to ${approved.length} users?\n\nSubject: ${broadcastForm.subject||"(none)"}\nMessage: ${broadcastForm.body.slice(0,80)}...`))return;sendBroadcast()}} disabled={sending||!broadcastForm.body.trim()} style={{...btn("#0B9635"),padding:"14px 24px",fontSize:14,opacity:!broadcastForm.body.trim()?.5:1,width:"100%"}}>{sending?"Sending...":"📢 Send Broadcast"}</button>
              </div>

              {/* Preview */}
              <div style={{...card,borderColor:"#1E2028"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#888",letterSpacing:1.5,marginBottom:14}}>PREVIEW</div>
                <div style={{background:"#0B0D10",borderRadius:12,padding:16,border:"1px solid #1E2028"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <div style={{width:32,height:32,borderRadius:8,background:"#0B9635",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📢</div>
                    <div><div style={{fontWeight:700,fontSize:13}}>BetGenius AI</div><div style={{fontSize:10,color:"#444"}}>System Notification</div></div>
                  </div>
                  {broadcastForm.subject&&<div style={{fontWeight:700,fontSize:14,color:"#F0F0F2",marginBottom:4}}>{broadcastForm.subject}</div>}
                  <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>{broadcastForm.body||"Your message will appear here..."}</div>
                </div>
                <div style={{marginTop:12,fontSize:11,color:"#333",textAlign:"center"}}>This is how users will see the notification</div>
              </div>
            </div>

            <div style={section}>BROADCAST HISTORY ({broadcasts.length})</div>
            {broadcasts.length===0?<div style={{...card,textAlign:"center",padding:28,color:"#444"}}>No broadcasts sent yet</div>:
            broadcasts.map((b,i)=>(
              <div key={b._id||i} className={"as d"+Math.min(i+1,5)} style={{...card,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:14}}>{b.title||"Announcement"}</span>
                    <span style={{background:"#0B963510",color:"#0B9635",padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700}}>{b.sentTo} recipients</span>
                  </div>
                  <div style={{fontSize:13,color:"#888",lineHeight:1.5,marginBottom:4}}>{b.message?.length>120?b.message.slice(0,120)+"...":b.message}</div>
                  <div style={{fontSize:10,color:"#333"}}>Sent {fDate(b.createdAt)} by {b.sentBy||"Admin"}</div>
                </div>
                <button onClick={async()=>{if(confirm("Delete this broadcast?")){await fetch("/api/admin/broadcast",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({broadcastId:b._id})});load();}}} style={{background:"#E3172508",border:"1px solid #E3172520",borderRadius:8,padding:"6px 12px",color:"#E31725",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",flexShrink:0}}>Delete</button>
              </div>
            ))}
          </div>)}

          {/* ═══ SETTINGS ═══ */}
          {tab==="settings"&&settingsForm&&(<div className="as">
            <h1 style={{...val,fontSize:28,marginBottom:4}}>Platform Settings</h1>
            <p style={{fontSize:14,color:"#555",marginBottom:20}}>Configure your platform</p>

            <div style={{...card,borderColor:"#D4AF3720"}}><div style={{fontSize:12,fontWeight:700,color:"#D4AF37",marginBottom:14}}>🏷 SITE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[
                {l:"Site Name",k:"siteName"},{l:"Tagline",k:"siteTagline"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#0B963520"}}><div style={{fontSize:12,fontWeight:700,color:"#0B9635",marginBottom:14}}>💰 PRICING</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[
                {l:"Signup Fee ($)",k:"signupFee",type:"number"},
                {l:"Referral Bonus ($)",k:"referralBonus",type:"number"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input type={f.type||"text"} value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:f.type==="number"?Number(e.target.value):e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#D4AF3720"}}><div style={{fontSize:12,fontWeight:700,color:"#D4AF37",marginBottom:14}}>🥇 GOLD PACKAGE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>{[
                {l:"Price ($)",k:"goldPrice",type:"number"},{l:"Max Predictions",k:"goldMaxPreds",type:"number"},{l:"Odds Range",k:"goldOdds"},{l:"Duration (Days)",k:"goldDurationDays",type:"number"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input type={f.type||"text"} value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:f.type==="number"?Number(e.target.value):e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#94A7BD20"}}><div style={{fontSize:12,fontWeight:700,color:"#94A7BD",marginBottom:14}}>🥈 PLATINUM PACKAGE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>{[
                {l:"Price ($)",k:"platinumPrice",type:"number"},{l:"Max Predictions",k:"platinumMaxPreds",type:"number"},{l:"Odds Range",k:"platinumOdds"},{l:"Duration (Days)",k:"platinumDurationDays",type:"number"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input type={f.type||"text"} value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:f.type==="number"?Number(e.target.value):e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#7DD3E820"}}><div style={{fontSize:12,fontWeight:700,color:"#7DD3E8",marginBottom:14}}>💎 DIAMOND PACKAGE</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>{[
                {l:"Price ($)",k:"diamondPrice",type:"number"},{l:"Max Predictions",k:"diamondMaxPreds",type:"number"},{l:"Odds Range",k:"diamondOdds"},{l:"Duration (Days)",k:"diamondDurationDays",type:"number"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input type={f.type||"text"} value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:f.type==="number"?Number(e.target.value):e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            {/* MERCHANT MOMO */}
            <div style={{...card,borderColor:"#0B963520"}}><div style={{fontSize:12,fontWeight:700,color:"#0B9635",marginBottom:14}}>📱 MERCHANT MOBILE MONEY (Recommended)</div>
              <p style={{fontSize:11,color:"#555",marginBottom:12,lineHeight:1.5}}>Set a single merchant number that works across all networks. If set, this overrides per-network numbers below.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[
                {l:"Merchant Number",k:"merchantMomoNumber"},{l:"Merchant Name",k:"merchantMomoName"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:e.target.value}))} placeholder={f.k==="merchantMomoNumber"?"e.g. 0547610318":"e.g. BetGenius AI"} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#0B963520"}}><div style={{fontSize:12,fontWeight:700,color:"#0B9635",marginBottom:14}}>💳 MOBILE WALLET 1 {settingsForm.merchantMomoNumber?"(Overridden by Merchant)":""}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,opacity:settingsForm.merchantMomoNumber?.5:1}}>{[
                {l:"Provider Name",k:"momoProvider1Name"},{l:"Number",k:"momoProvider1Number"},{l:"Account Name",k:"momoProvider1Account"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:e.target.value}))} placeholder={f.k.includes("Name")&&!f.k.includes("Account")?"e.g. M-Pesa, MTN MoMo":""} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#0B963520"}}><div style={{fontSize:12,fontWeight:700,color:"#0B9635",marginBottom:14}}>💳 MOBILE WALLET 2</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[
                {l:"Provider Name",k:"momoProvider2Name"},{l:"Number",k:"momoProvider2Number"},{l:"Account Name",k:"momoProvider2Account"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            <div style={{...card,borderColor:"#0B963520"}}><div style={{fontSize:12,fontWeight:700,color:"#0B9635",marginBottom:14}}>💳 MOBILE WALLET 3</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[
                {l:"Provider Name",k:"momoProvider3Name"},{l:"Number",k:"momoProvider3Number"},{l:"Account Name",k:"momoProvider3Account"},
              ].map(f=>(<div key={f.k}><label style={{...lbl,display:"block",marginBottom:4}}>{f.l}</label><input value={settingsForm[f.k]||""} onChange={e=>setSettingsForm(s=>({...s,[f.k]:e.target.value}))} style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>))}</div>
            </div>

            {/* CRYPTO WALLETS */}
            <div style={{...card,borderColor:"#F7931A30"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:"#F7931A"}}>₿ CRYPTOCURRENCY WALLETS</div><label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><span style={{fontSize:11,color:"#555"}}>Enable Crypto</span><div onClick={()=>setSettingsForm(s=>({...s,cryptoEnabled:!s.cryptoEnabled}))} style={{width:36,height:20,borderRadius:10,background:settingsForm.cryptoEnabled!==false?"#0B9635":"#1E2028",cursor:"pointer",position:"relative",transition:"all .2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:2,left:settingsForm.cryptoEnabled!==false?18:2,transition:"left .2s"}} /></div></label></div>
              <p style={{fontSize:11,color:"#555",marginBottom:12,lineHeight:1.5}}>Add your crypto wallet addresses. Users will see these as payment options during signup and package purchase.</p>
              <div style={{marginBottom:12}}><label style={{...lbl,display:"block",marginBottom:4}}>USDT Wallet (TRC20 — Tron)</label><input value={settingsForm.usdtTrc20Address||""} onChange={e=>setSettingsForm(s=>({...s,usdtTrc20Address:e.target.value}))} placeholder="e.g. TN8s3f8dNz..." style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #26A17B30",borderRadius:8,color:"#26A17B",fontSize:12,fontFamily:"monospace",outline:"none"}} /></div>
              <div style={{marginBottom:12}}><label style={{...lbl,display:"block",marginBottom:4}}>USDT Wallet (ERC20 — Ethereum)</label><input value={settingsForm.usdtErc20Address||""} onChange={e=>setSettingsForm(s=>({...s,usdtErc20Address:e.target.value}))} placeholder="e.g. 0x742d35Cc..." style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #627EEA30",borderRadius:8,color:"#627EEA",fontSize:12,fontFamily:"monospace",outline:"none"}} /></div>
              <div><label style={{...lbl,display:"block",marginBottom:4}}>Bitcoin (BTC) Address</label><input value={settingsForm.btcAddress||""} onChange={e=>setSettingsForm(s=>({...s,btcAddress:e.target.value}))} placeholder="e.g. bc1q5d9r3..." style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #F7931A30",borderRadius:8,color:"#F7931A",fontSize:12,fontFamily:"monospace",outline:"none"}} /></div>
            </div>

            <div style={{...card,borderColor:"#0B963520"}}><div style={{fontSize:12,fontWeight:700,color:"#0B9635",marginBottom:14}}>📱 WHATSAPP</div>
              <div><label style={{...lbl,display:"block",marginBottom:4}}>WhatsApp Number</label><input value={settingsForm.whatsappNumber||""} onChange={e=>setSettingsForm(s=>({...s,whatsappNumber:e.target.value}))} placeholder="e.g. 233541234567" style={{width:"100%",padding:"10px 12px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:13,fontFamily:"'DM Sans'",outline:"none"}} /></div>
            </div>

            <button onClick={saveSettings} disabled={saving} style={{...btn("#0B9635"),padding:"16px 32px",fontSize:16,width:"100%",opacity:saving?.5:1}}>{saving?"Saving...":"💾 Save All Settings"}</button>
          </div>)}
        </main>
      </div>

      {/* ═══ USER DETAIL MODAL ═══ */}
      {userModal&&(()=>{const u=userModal;const gp=u.gamePackages?(typeof u.gamePackages==='object'?Object.values(u.gamePackages):[]):[];const firstPkg=gp[0];const p=firstPkg?getPkg(firstPkg.package):NOPKG;const rev=u.amountPaid||0;const isLocked=(firstPkg?.predictionsUsed||0)>=p.max;return(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}} onClick={()=>setUserModal(null)}>
          <div style={{background:"#12141A",border:"1px solid #1E2028",borderRadius:20,padding:32,maxWidth:480,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"scaleIn .3s cubic-bezier(.16,1,.3,1)",position:"relative"}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setUserModal(null)} style={{position:"absolute",top:14,right:14,background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer"}}>✕</button>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <div style={{width:48,height:48,borderRadius:12,background:"#0B9635",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:"#fff"}}>{u.avatar||u.name?.slice(0,2)}</div>
              <div><div style={{fontWeight:700,fontSize:18}}>{u.name}</div><span style={badge(u.status==="approved"?"#0B963518":u.status==="pending"?"#D4AF3718":"#E3172518",u.status==="approved"?"#0B9635":u.status==="pending"?"#D4AF37":"#E31725")}>{u.status}</span></div>
            </div>
            <div style={{background:"#0B0D10",borderRadius:12,padding:18,marginBottom:16}}>
              {[
                {l:"Phone",v:u.phone},{l:"Email",v:u.email||"—"},{l:"Betting ID",v:u.bettingId||"—",c:"#0B9635"},
                {l:"Package",v:`${p.icon} ${p.name} — ${p.max} predictions`,c:p.color},
                {l:"Predictions Used",v:`${firstPkg?.predictionsUsed||0}/${p.max}${isLocked?" (LOCKED)":""}`,c:isLocked?"#E31725":"#0B9635"},
                {l:"Revenue",v:fG(rev),c:"#0B9635"},
                {l:"Referral Code",v:u.referralCode||"Not assigned yet"},{l:"Referred By",v:u.referredBy||"None"},{l:"Referral Balance",v:fG(u.referralBalance||0),c:"#0B9635"},{l:"Total Earned",v:fG(u.referralTotalEarned||0),c:"#0B9635"},{l:"Referral Count",v:String(u.referralCount||0)},
                {l:"Reference",v:u.referenceNumber||"—",m:true},{l:"Provider",v:u.paymentProvider||"—"},
                {l:"Joined",v:fDate(u.createdAt)},
              ].map((r,i)=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<12?"1px solid #151820":"none"}}>
                  <span style={{color:"#444",fontSize:12}}>{r.l}</span>
                  <span style={{color:r.c||"#F0F0F2",fontWeight:600,fontSize:13,fontFamily:r.m?"monospace":"inherit"}}>{r.v}</span>
                </div>
              ))}
              {u.paymentProofUrl&&<div style={{marginTop:12,borderTop:"1px solid #151820",paddingTop:12}}><div style={{fontSize:11,color:"#444",fontWeight:700,letterSpacing:1,marginBottom:6}}>PAYMENT PROOF</div><img src={u.paymentProofUrl} alt="Payment proof" onClick={()=>window.open(u.paymentProofUrl,"_blank")} style={{maxWidth:"100%",maxHeight:180,borderRadius:10,border:"1px solid #1E2028",cursor:"pointer",objectFit:"cover"}} /></div>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {u.status==="pending"&&<button onClick={()=>{approve(u._id);setUserModal(null)}} style={{...btn("#0B9635"),flex:1,padding:12,fontSize:13}}>✓ Approve</button>}
              {u.status==="approved"&&<>
                {p.id!=="platinum"&&p.id!=="diamond"&&<button onClick={()=>upgradeUser(u._id,"platinum")} style={{...btn("#94A7BD","#000"),flex:1,padding:12,fontSize:12}}>→ Platinum</button>}
                {p.id!=="diamond"&&<button onClick={()=>upgradeUser(u._id,"diamond")} style={{...btn("#7DD3E8","#000"),flex:1,padding:12,fontSize:12}}>→ Diamond</button>}
                {isLocked&&<button onClick={()=>upgradeUser(u._id,firstPkg?.package||"gold")} style={{...btn("#0B9635"),flex:1,padding:12,fontSize:12}}>♻️ Reset Preds</button>}
                {!u.referralCode&&<button onClick={()=>generateCode(u._id)} style={{...btn("#D4AF37","#000"),flex:1,padding:12,fontSize:12}}>🔗 Generate Code</button>}
              </>}
              {(u.status==="approved"||u.status==="pending")&&<button onClick={async()=>{if(!confirm("Ban this user permanently?"))return;await fetch(`/api/users/${u._id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"banned"})});setUserModal(null);load()}} style={{...btn("#E31725"),padding:12,fontSize:12}}>🚫 Ban</button>}
              {(u.status==="approved"||u.status==="pending")&&<button onClick={async()=>{if(!confirm("Block this user temporarily?"))return;await fetch(`/api/users/${u._id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"blocked"})});setUserModal(null);load()}} style={{...btn("#D4AF37","#000"),padding:12,fontSize:12}}>🔒 Block</button>}
              {(u.status==="approved"||u.status==="pending")&&<button onClick={async()=>{if(!confirm("Suspend this user?"))return;await fetch(`/api/users/${u._id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"suspended"})});setUserModal(null);load()}} style={{...btn("#94A7BD","#000"),padding:12,fontSize:12}}>⏸ Suspend</button>}
              {(u.status==="banned"||u.status==="blocked"||u.status==="suspended")&&<button onClick={async()=>{await fetch(`/api/users/${u._id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"approved"})});setUserModal(null);load()}} style={{...btn("#0B9635"),flex:1,padding:12,fontSize:12}}>✓ Unblock / Reactivate</button>}
              <button onClick={()=>remove(u._id)} style={{...btn("#076B25"),padding:12,fontSize:12}}>🗑 Delete</button>
            </div>
          </div>
        </div>
      );})()}

      {/* ═══ CREATE ROUND MODAL ═══ */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:12}} onClick={()=>setModal(false)}>
          <div style={{background:"#12141A",border:"1px solid #1E2028",borderRadius:20,padding:22,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto",animation:"scaleIn .3s cubic-bezier(.16,1,.3,1)"}} onClick={e=>e.stopPropagation()}>

            <h2 style={{...val,fontSize:22,marginBottom:2}}>Create Round</h2>
            <p style={{fontSize:12,color:"#444",marginBottom:14}}>3 matches → publish live → users unlock with 1 credit</p>

            {/* Game toggle */}
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[{id:"football",icon:"\u26BD",name:"Football",c:"#0B9635"},{id:"basketball",icon:"\u{1F3C0}",name:"Basketball",c:"#E36414"},{id:"tennis",icon:"\u{1F3BE}",name:"Tennis",c:"#D4AF37"}].map(g=>(
                <button key={g.id} onClick={()=>{const defMkt=g.id==="basketball"?"Moneyline":g.id==="tennis"?"Match Winner":"1X2";setMf(f=>({...f,gameId:g.id,matches:f.matches.map(m=>({...m,mkt:defMkt,pick:""}))}))}} style={{flex:1,padding:10,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",border:mf.gameId===g.id?`2px solid ${g.c}`:"2px solid #1E2028",background:mf.gameId===g.id?g.c+"12":"transparent",color:mf.gameId===g.id?g.c:"#555"}}>{g.icon} {g.name}</button>
              ))}
            </div>

            {/* Free Bet Toggle */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,background:mf.isFree?"#0B963510":"#0B0D10",border:mf.isFree?"1px solid #0B963530":"1px solid #1E2028",borderRadius:10,padding:"10px 14px",cursor:"pointer"}} onClick={()=>setMf(f=>({...f,isFree:!f.isFree}))}>
              <div style={{width:36,height:20,borderRadius:10,background:mf.isFree?"#0B9635":"#1E2028",position:"relative",transition:"all .2s"}}><div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:2,left:mf.isFree?18:2,transition:"all .2s"}} /></div>
              <span style={{fontSize:12,fontWeight:700,color:mf.isFree?"#0B9635":"#555"}}>FREE BET</span>
              {mf.isFree && <span style={{fontSize:10,color:"#888",marginLeft:"auto"}}>Visible to all approved users — no credits needed</span>}
            </div>

            {/* 3 Match slots */}
            {mf.matches.map((m,i)=>{
              const gc = "#0B9635";
              const opts = MKTS[m.mkt] || MKTS["1X2"];
              return(
                <div key={i} style={{background:"#0B0D10",border:"1px solid #1E2028",borderRadius:14,padding:14,marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:gc,marginBottom:8}}>MATCH {i+1}</div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                    <input value={m.home} onChange={e=>updMatch(i,"home",e.target.value)} placeholder="Home Team" style={{padding:"10px",background:"#12141A",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:12,fontFamily:"'DM Sans'",outline:"none"}} />
                    <input value={m.away} onChange={e=>updMatch(i,"away",e.target.value)} placeholder="Away Team" style={{padding:"10px",background:"#12141A",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:12,fontFamily:"'DM Sans'",outline:"none"}} />
                  </div>

                  <input value={m.time} onChange={e=>updMatch(i,"time",e.target.value)} placeholder="Time (e.g. 14:30)" style={{width:"100%",padding:"8px 10px",background:"#12141A",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none",marginBottom:8}} />

                  <select value={m.mkt} onChange={e=>updMatch(i,"mkt",e.target.value)} style={{width:"100%",padding:"9px",background:"#12141A",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:11,fontFamily:"'DM Sans'",outline:"none",marginBottom:8,cursor:"pointer"}}>
                    {MKT_KEYS.map(k=><option key={k} value={k}>{k}</option>)}
                  </select>

                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                    {opts.map(o=>(
                      <button key={o} type="button" onClick={()=>updMatch(i,"pick",o)} style={{padding:"7px 12px",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans'",border:m.pick===o?`2px solid ${gc}`:"1px solid #1E2028",background:m.pick===o?gc+"15":"#12141A",color:m.pick===o?gc:"#666"}}>{o}</button>
                    ))}
                  </div>

                  <input value={m.odd} onChange={e=>updMatch(i,"odd",e.target.value)} placeholder="Odd (e.g. 1.85)" style={{width:"100%",padding:"8px 10px",background:"#12141A",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:12,fontFamily:"'DM Sans'",outline:"none"}} />
                </div>
              );
            })}

            {/* Betting link */}
            <div style={{marginBottom:10}}><div style={lbl}>BETTING LINK (optional)</div><input value={mf.bettingLink||""} onChange={e=>setMf(f=>({...f,bettingLink:e.target.value}))} placeholder="https://..." style={{width:"100%",padding:"10px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:12,fontFamily:"'DM Sans'",outline:"none"}} /></div>

            {/* Expire + Note */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              <div><div style={lbl}>EXPIRES IN (min)</div><input value={mf.expire} onChange={e=>setMf(f=>({...f,expire:e.target.value}))} placeholder="60" style={{width:"100%",padding:"10px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:12,fontFamily:"'DM Sans'",outline:"none"}} /></div>
              <div><div style={lbl}>NOTE (optional)</div><input value={mf.note} onChange={e=>setMf(f=>({...f,note:e.target.value}))} placeholder="High confidence" style={{width:"100%",padding:"10px",background:"#0B0D10",border:"1px solid #1E2028",borderRadius:8,color:"#F0F0F2",fontSize:12,fontFamily:"'DM Sans'",outline:"none"}} /></div>
            </div>

            {/* Total odd preview */}
            {mf.matches.some(m=>m.pick&&m.odd)&&(
              <div style={{background:"#0B963508",border:"1px solid #0B963520",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"#888"}}>Total Odd</span>
                <span style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"#0B9635",letterSpacing:1}}>{mf.matches.filter(m=>m.odd).reduce((a,m)=>a*parseFloat(m.odd||1),1).toFixed(2)}x</span>
              </div>
            )}

            <button onClick={sendPred} disabled={sending||!mf.matches.some(m=>m.home&&m.away&&m.pick)} style={{width:"100%",padding:15,background:mf.matches.some(m=>m.home&&m.away&&m.pick)?(mf.gameId==="egames"?"#8B5CF6":"#0B9635"):"#151820",color:mf.matches.some(m=>m.home&&m.away&&m.pick)?"#fff":"#444",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:mf.matches.some(m=>m.home&&m.away&&m.pick)?"pointer":"not-allowed",fontFamily:"'DM Sans'"}}>{sending?"Publishing...":"🚀 Publish Round Live"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
