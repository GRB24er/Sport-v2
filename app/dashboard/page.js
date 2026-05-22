"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import PushOptIn from "@/components/PushOptIn";
import UpgradePrompt from "@/components/UpgradePrompt";
import ChatLauncher from "@/components/ChatLauncher";

const fUSD = v => '$' + Number(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

const DEF_PKGS = [
  { id:"gold", name:"Gold", odds:"15-25 Odds", price:40, color:"#D4AF37", icon:"\u{1F947}", max:3, features:["3 Rounds","15-25 Odds Range","EPL, La Liga, Serie A, Bundesliga"] },
  { id:"platinum", name:"Platinum", odds:"25-50 Odds", price:80, color:"#94A7BD", icon:"\u{1F948}", max:3, features:["3 Rounds","25-50 Odds Range","EPL, La Liga, Serie A, Bundesliga","Priority Support"] },
  { id:"diamond", name:"Diamond", odds:"HT/FT & Correct Score", price:160, color:"#7DD3E8", icon:"\u{1F48E}", max:3, features:["3 Rounds","HT/FT & Correct Score","High Odds from Our Sources","24/7 VIP Support"] },
];

const DEF_PROVS = [];
const DEF_CRYPTO_PROVS = [
  { id:"usdt_trc20", name:"USDT (TRC20)", color:"#26A17B", refLabel:"TRANSACTION HASH (TxID)", refPlaceholder:"e.g. 0x7a8b9c...", type:"crypto", network:"Tron (TRC20)", icon:"\u20AE" },
  { id:"usdt_erc20", name:"USDT (ERC20)", color:"#627EEA", refLabel:"TRANSACTION HASH (TxID)", refPlaceholder:"e.g. 0x7a8b9c...", type:"crypto", network:"Ethereum (ERC20)", icon:"\u20AE" },
  { id:"btc", name:"Bitcoin (BTC)", color:"#F7931A", refLabel:"TRANSACTION HASH (TxID)", refPlaceholder:"e.g. 3J98t1Wp...", type:"crypto", network:"Bitcoin Network", icon:"\u20BF" },
];

const GAMES = [
  { id:"football", name:"Football Predictions", sub:"EPL \u2022 La Liga \u2022 Serie A \u2022 Bundesliga", icon:"\u26BD", logo:"/pego-logo.png", color:"#0B9635", bg:"linear-gradient(135deg,#0B9635,#054d18)", desc:"Expert predictions for top European leagues. Get winning odds from our verified sources.", tags:["EPL","La Liga","Serie A","Bundesliga"], live:true, badge:"\u{1F525} LIVE" },
  { id:"basketball", name:"Basketball", sub:"NBA \u2022 Euroleague", icon:"\u{1F3C0}", color:"#E36414", bg:"linear-gradient(135deg,#E36414,#8B3A07)", desc:"Expert basketball predictions for NBA and Euroleague. Moneyline, spreads, and totals.", tags:["NBA","Euroleague"], live:true, badge:"\u{1F3C0} LIVE" },
  { id:"tennis", name:"Tennis", sub:"ATP \u2022 WTA", icon:"\u{1F3BE}", color:"#D4AF37", bg:"linear-gradient(135deg,#D4AF37,#8B7419)", desc:"Professional tennis predictions for ATP and WTA events. Match winners, sets, and handicaps.", tags:["ATP","WTA"], live:true, badge:"\u{1F3BE} LIVE" },
];

const GAME_ICONS = { "football":"\u26BD", "instant-virtual":"\u26BD", "virtual-football":"\u26BD", "egames":"\u{1F3AE}", "basketball":"\u{1F3C0}", "tennis":"\u{1F3BE}" };

export default function Dashboard() {
  const { data:session, status } = useSession();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [subModal, setSubModal] = useState(null);
  const [selPkg, setSelPkg] = useState(null);
  const [selProv, setSelProv] = useState(null);
  const [refNum, setRefNum] = useState("");
  const [senderName, setSenderName] = useState("");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [subProofUrl, setSubProofUrl] = useState("");
  const [subProofPreview, setSubProofPreview] = useState("");
  const [subUploading, setSubUploading] = useState(false);
  // New state for stats
  const [stats, setStats] = useState(null);
  const [recentPreds, setRecentPreds] = useState([]);
  const [expandedPred, setExpandedPred] = useState(null);
  const [toast, setToast] = useState(null);
  const [freeRounds, setFreeRounds] = useState([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (session?.user?.role === "admin") router.push("/admin");
  }, [status, session, router]);

  const loadUser = async () => {
    if (!session?.user?.id || session.user.id === "admin") return;
    try {
      const [uRes, sRes, nRes, stRes] = await Promise.all([
        fetch(`/api/users/${session.user.id}`),
        fetch("/api/admin/settings", { cache: "no-store" }),
        fetch("/api/notifications"),
        fetch(`/api/users/${session.user.id}/stats`),
      ]);
      if (uRes.ok) { const d = await uRes.json(); setUserData(d.user || null); }
      else { console.error("Failed to load user data:", uRes.status); }
      if (sRes.ok) { const d = await sRes.json(); if (d.settings) setSiteSettings(d.settings); }
      if (nRes.ok) { const d = await nRes.json(); setNotifs(d.notifications || []); }
      if (stRes.ok) { const d = await stRes.json(); setStats(d); setRecentPreds(d.recentPredictions || []); }
      // Load free rounds
      try {
        const frRes = await fetch("/api/rounds");
        if (frRes.ok) { const d = await frRes.json(); setFreeRounds((d.rounds || []).filter(r => r.isFree)); }
      } catch (e) {}
    } catch (e) {
      console.error("Dashboard load error:", e);
      setError("Failed to load data. Please refresh the page.");
    }
  };

  useEffect(() => { loadUser(); }, [session]);
  useEffect(() => { if (submitted) loadUser(); }, [submitted]);

  // Dynamic prices from settings
  const ss = siteSettings || {};
  const PKGS = [
    { ...DEF_PKGS[0], price: ss.goldPrice || 40, max: ss.goldMaxPreds || 3, odds: ss.goldOdds || "15-25 Odds" },
    { ...DEF_PKGS[1], price: ss.platinumPrice || 80, max: ss.platinumMaxPreds || 3, odds: ss.platinumOdds || "25-50 Odds" },
    { ...DEF_PKGS[2], price: ss.diamondPrice || 160, max: ss.diamondMaxPreds || 3, odds: ss.diamondOdds || "HT/FT & Correct Score" },
  ];
  PKGS[0].features = [`${PKGS[0].max} Rounds`, `${PKGS[0].odds} Range`, "EPL, La Liga, Serie A, Bundesliga"];
  PKGS[1].features = [`${PKGS[1].max} Rounds`, `${PKGS[1].odds} Range`, "EPL, La Liga, Serie A, Bundesliga", "Priority Support"];
  PKGS[2].features = [`${PKGS[2].max} Rounds`, `${PKGS[2].odds}`, "High Odds from Our Sources", "24/7 VIP Support"];

  // MoMo providers — Merchant override wins, else per-wallet list
  const momoEnabled = ss.momoEnabled || !!ss.merchantMomoNumber;
  let MOMO_PROVS = [];
  if (ss.merchantMomoNumber) {
    MOMO_PROVS = [{
      id: "momo_merchant",
      name: ss.merchantMomoName || "Mobile Money",
      num: ss.merchantMomoNumber,
      acct: ss.merchantMomoName || "Mobile Money",
      color: "#FFCB05",
      refLabel: "TRANSACTION REFERENCE",
      refPlaceholder: "e.g. TXN-123456",
      type: "momo",
    }];
  } else if (momoEnabled && Array.isArray(ss.momoProviders)) {
    MOMO_PROVS = ss.momoProviders.filter(p => p.enabled !== false).map(p => ({
      id: p.id || "momo_" + p.name?.toLowerCase().replace(/\s/g,"_"),
      name: p.name, num: p.number, acct: p.accountName || "BetGenius AI",
      color: p.color || "#0B9635", refLabel: "TRANSACTION REFERENCE", refPlaceholder: "e.g. TXN-123456", type: "momo",
    }));
  }
  const cryptoEnabled = ss.cryptoEnabled !== false;
  const CRYPTO_PROVS = !cryptoEnabled ? [] : [
    ss.usdtTrc20Address ? { ...DEF_CRYPTO_PROVS[0], address: ss.usdtTrc20Address } : null,
    ss.usdtErc20Address ? { ...DEF_CRYPTO_PROVS[1], address: ss.usdtErc20Address } : null,
    ss.btcAddress ? { ...DEF_CRYPTO_PROVS[2], address: ss.btcAddress } : null,
  ].filter(Boolean);
  const PROVS = [...MOMO_PROVS, ...CRYPTO_PROVS];

  if (status === "loading" || !session) return (
    <div style={{minHeight:"100vh",background:"#0B0D10",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}@keyframes sh{0%{background-position:200% center}100%{background-position:-200% center}}.sk{background:linear-gradient(90deg,#12141A 25%,#1A1D22 50%,#12141A 75%);background-size:200% 100%;animation:sh 1.5s ease-in-out infinite;border-radius:8px}`}</style>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #151820",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div className="sk" style={{width:120,height:40}} />
        <div style={{display:"flex",gap:10}}><div className="sk" style={{width:34,height:34,borderRadius:10}} /><div className="sk" style={{width:34,height:34,borderRadius:10}} /></div>
      </div>
      <div style={{maxWidth:540,margin:"0 auto",padding:"28px 20px"}}>
        <div className="sk" style={{width:"60%",height:28,marginBottom:8}} />
        <div className="sk" style={{width:"85%",height:14,marginBottom:24}} />
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {[0,1,2,3].map(i=><div key={i} className="sk" style={{height:80,borderRadius:14}} />)}
        </div>
        <div className="sk" style={{width:"40%",height:10,marginBottom:12}} />
        <div className="sk" style={{height:200,borderRadius:16,marginBottom:12}} />
        <div className="sk" style={{height:140,borderRadius:16}} />
      </div>
    </div>
  );

  const user = session.user;
  const firstName = user.name?.split(" ")[0] || "Player";
  const initials = user.name?.split(" ").map(w=>w[0]).join("").slice(0,2) || "?";
  const hasCode = !!(userData?.referralCode || user.referralCode);
  const refCode = userData?.referralCode || user.referralCode || null;

  // Per-game state helpers
  const gp = userData?.gamePackages || {};
  const pgp = userData?.pendingGamePackages || {};
  const getGamePkg = (gameId) => gp[gameId] || null;
  const getGamePending = (gameId) => pgp[gameId] || null;
  const gameHasPkg = (gameId) => !!getGamePkg(gameId);
  const gameIsPending = (gameId) => !!getGamePending(gameId);
  const anyPending = Object.keys(pgp).length > 0;
  const anyActive = Object.keys(gp).length > 0;

  // Credits helpers
  const getCreditsLeft = (gameId) => {
    const pkg = getGamePkg(gameId);
    if (!pkg) return 0;
    const p = PKGS.find(x => x.id === pkg.package);
    if (!p) return 0;
    return Math.max(0, p.max - (pkg.predictionsUsed || 0));
  };
  const getTotalCredits = () => {
    let total = 0;
    for (const gId of Object.keys(gp)) {
      total += getCreditsLeft(gId);
    }
    return total;
  };

  // Expiring packages
  const expiringGames = GAMES.filter(g => g.live).map(g => {
    const pkg = getGamePkg(g.id);
    if (!pkg?.expiresAt) return null;
    const days = Math.max(0, Math.ceil((new Date(pkg.expiresAt).getTime() - Date.now()) / (1000*60*60*24)));
    if (days <= 3 && days > 0) return { ...g, daysLeft: days };
    return null;
  }).filter(Boolean);

  const openSub = (game) => {
    if (!game?.live) return;
    if (gameHasPkg(game.id)) { router.push("/dashboard/predict?game=" + game.id); return; }
    if (gameIsPending(game.id)) return;
    setSubModal(game);
    setSelPkg(null); setSelProv(null); setRefNum(""); setSenderName(""); setStep(1); setSubmitted(false); setError(""); setSubProofUrl(""); setSubProofPreview(""); setSubUploading(false);
  };

  const closeSub = () => { setSubModal(null); setSelPkg(null); setSelProv(null); setRefNum(""); setSenderName(""); setStep(1); setSubmitted(false); setError(""); setSubProofUrl(""); setSubProofPreview(""); setSubUploading(false); };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
  const copyText = (text, label) => { navigator.clipboard?.writeText(text); showToast(`${label || "Copied"} to clipboard`); };

  const compressImg = (file, maxW = 1400, q = 0.7) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
      if (h > maxW) { w = Math.round((w * maxW) / h); h = maxW; }
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", q));
    };
    img.src = URL.createObjectURL(file);
  });

  const handleSubProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
    if (file.size > 20 * 1024 * 1024) { setError("Image too large. Maximum 20MB."); return; }
    setError("");
    setSubUploading(true);
    try {
      const base64 = await compressImg(file);
      setSubProofPreview(base64);
      const res = await fetch("/api/upload-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: base64 }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); setSubUploading(false); return; }
      setSubProofUrl(data.url);
    } catch (e) { setError("Upload failed. Try again."); }
    setSubUploading(false);
  };

  const submitRef = async () => {
    if (!refNum.trim()) { setError("Enter your transaction code or reference."); return; }
    if (!subProofUrl) { setError("Please upload your payment screenshot."); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: subModal.id, packageId: selPkg, paymentProvider: selProv, referenceNumber: refNum.trim(), senderName: senderName.trim(), paymentProofUrl: subProofUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); setSubmitting(false); return; }
      setSubmitted(true);
    } catch (e) { setError("Network error."); }
    setSubmitting(false);
  };

  const getGameButton = (game) => {
    if (!game.live) return { text: "Coming Soon", style: { background: "transparent", color: "#444", border: "1px solid #1E2028", cursor: "default" }, daysLeft: null };
    if (gameHasPkg(game.id)) {
      const gPkg = getGamePkg(game.id);
      const p = PKGS.find(x => x.id === gPkg.package);
      const daysLeft = gPkg.expiresAt ? Math.max(0, Math.ceil((new Date(gPkg.expiresAt).getTime() - Date.now()) / (1000*60*60*24))) : null;
      if (daysLeft !== null && daysLeft <= 0) {
        return { text: "Expired \u2014 Renew", style: { background: "#E3172515", color: "#E31725", border: "1.5px solid #E3172530" }, daysLeft: 0 };
      }
      return { text: `${p?.icon||""} Play Now \u2192`, style: { background: game.bg, color: "#fff", border: "none" }, daysLeft };
    }
    if (gameIsPending(game.id)) {
      const pending = getGamePending(game.id);
      const p = PKGS.find(x => x.id === pending.package);
      return { text: `\u23F3 ${p?.name||""} Pending`, style: { background: "#D4AF3715", color: "#D4AF37", border: "1.5px solid #D4AF3730", cursor: "default" }, daysLeft: null };
    }
    return { text: "Subscribe to Play", style: { background: "transparent", color: game.color, border: `1.5px solid ${game.color}35` }, daysLeft: null };
  };

  return (
    <div className="vd">
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10;overflow-x:hidden}
.vd{min-height:100vh;background:#0B0D10;color:#F0F0F2;font-family:'DM Sans',sans-serif}
@keyframes sp{to{transform:rotate(360deg)}}@keyframes su{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes fi{from{opacity:0}to{opacity:1}}@keyframes si{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes pu{0%,100%{opacity:1}50%{opacity:.5}}@keyframes sd{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes sh{0%{background-position:200% center}100%{background-position:-200% center}}
.asu{animation:su .5s cubic-bezier(.16,1,.3,1) both}.ad1{animation-delay:.05s}.ad2{animation-delay:.1s}.ad3{animation-delay:.15s}.ad4{animation-delay:.2s}.ad5{animation-delay:.25s}
.vbg{position:fixed;inset:0;z-index:0;background-image:radial-gradient(circle,#0B9635 1px,transparent 1px);background-size:30px 30px;opacity:.03;pointer-events:none}
.hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #151820;background:#0B0D10F0;backdrop-filter:blur(20px);position:sticky;top:0;z-index:90}
.hav{width:38px;height:38px;border-radius:10px;background:#0B9635;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:#fff;cursor:pointer;transition:all .15s;border:2px solid transparent;flex-shrink:0}.hav:hover,.hav.on{border-color:#0B9635;box-shadow:0 0 0 3px #0B963520}
.hr{display:flex;align-items:center;gap:8px}
.pf{position:absolute;top:62px;right:12px;width:300px;background:#12141A;border:1px solid #1E2028;border-radius:16px;z-index:100;overflow:hidden;animation:sd .2s cubic-bezier(.16,1,.3,1);box-shadow:0 20px 60px rgba(0,0,0,.6)}
.pf-t{padding:18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #151820;background:#0E101540}
.pf-av{width:44px;height:44px;border-radius:12px;background:#0B9635;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;flex-shrink:0}
.pf-nm{font-weight:700;font-size:15px}.pf-em{font-size:11px;color:#555;margin-top:1px;word-break:break-all}
.pf-bd{padding:14px 18px}
.pf-r{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #15182060}.pf-r:last-child{border-bottom:none}
.pf-rl{font-size:11px;color:#444;font-weight:600}.pf-rv{font-size:13px;font-weight:700;text-align:right}
.cb{margin-top:6px;padding:14px;background:#0B0D10;border:1px solid #1E2028;border-radius:10px}
.cb-no{color:#0B9635;font-size:12px;font-weight:600;line-height:1.5}
.cb-v{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#0B9635}
.cb-btn{margin-top:8px;width:100%;padding:10px;border-radius:8px;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans';transition:all .15s}.cb-btn:active{transform:scale(.97)}
.pf-out{width:100%;padding:11px;background:#0B963508;border:1px solid #0B963518;border-radius:10px;color:#0B9635;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans';margin-top:8px}
.mn{max-width:540px;margin:0 auto;padding:28px 20px;position:relative;z-index:1}
.mt{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:2px;margin-bottom:4px}
.ms{font-size:14px;color:#555;line-height:1.5;margin-bottom:24px}
.sec{font-size:10px;font-weight:700;letter-spacing:2px;color:#333;margin:24px 0 10px;text-transform:uppercase}
.lb{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:700;letter-spacing:1.5px;color:#0B9635;background:#0B963515;padding:3px 10px;border-radius:5px}
.ld{width:5px;height:5px;border-radius:50%;background:#0B9635;animation:pu 1.5s infinite}
.sb{display:inline-flex;font-size:9px;font-weight:700;letter-spacing:1px;color:#888;background:#88888812;padding:3px 10px;border-radius:5px}
/* Stats Grid */
.stg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px}
.stc{background:#12141A;border:1px solid #1E2028;border-radius:14px;padding:16px 12px;text-align:center;transition:all .2s}.stc:hover{border-color:#2A2D34;transform:translateY(-2px)}
.stv{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;line-height:1.1}
.stl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#444;text-transform:uppercase;margin-top:3px}
.sti{font-size:20px;margin-bottom:4px}
/* Expiry Banner */
.exp-ban{background:#E3172508;border:1px solid #E3172520;border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;animation:fi .3s}
.exp-txt{flex:1;font-size:12px;color:#E31725;line-height:1.5}
.exp-btn{padding:8px 16px;border-radius:8px;border:1.5px solid #E3172530;background:#E3172510;color:#E31725;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans';white-space:nowrap;flex-shrink:0}
/* Game Cards */
.gc{border-radius:16px;overflow:hidden;cursor:pointer;transition:all .25s cubic-bezier(.16,1,.3,1);border:1px solid #1E2028;background:#12141A;margin-bottom:12px}
.gc:hover{transform:translateY(-3px)}.gc:active{transform:translateY(0);transition:transform .08s}
.gc-b{padding:22px 20px 18px;position:relative;overflow:hidden}
.gc-dc{position:absolute;border-radius:50%;background:rgba(255,255,255,.06)}
.gc-tp{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;position:relative;z-index:1}
.gc-ic{font-size:40px;animation:fl 4s ease-in-out infinite;position:relative;z-index:1}
.gc-nm{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px;line-height:1;position:relative;z-index:1}
.gc-su{font-size:11px;color:rgba(255,255,255,.55);margin-top:3px;position:relative;z-index:1}
.gc-bd{padding:14px 20px 18px}
.gc-ds{font-size:13px;color:#666;line-height:1.5;flex:1}
.gc-tg{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.gc-t{font-size:9px;font-weight:600;padding:3px 8px;border-radius:5px}
.gc-info{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
.gc-badge{font-size:9px;font-weight:700;padding:3px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:4px}
.gc-acts{display:flex;gap:8px;margin-top:12px}
.gc-bt{padding:12px 24px;border-radius:10px;font-weight:700;font-size:13px;font-family:'DM Sans';cursor:pointer;transition:all .15s;border:none;white-space:nowrap;flex-shrink:0}.gc-bt:active{transform:scale(.96)}
.gc-bt2{padding:10px 18px;border-radius:10px;font-weight:700;font-size:12px;font-family:'DM Sans';cursor:pointer;transition:all .15s;border:1.5px solid #1E2028;background:transparent;color:#888;white-space:nowrap}.gc-bt2:hover{border-color:#2A2D34;color:#F0F0F2}
/* Coming Soon */
.gs{border-radius:12px;border:1px solid #15182080;background:#12141A;padding:16px 18px;display:flex;align-items:center;gap:14px;margin-bottom:10px;opacity:.55}
.gs-ic{font-size:28px;flex-shrink:0;filter:grayscale(40%)}.gs-inf{flex:1}.gs-nm{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;color:#666}.gs-ds{font-size:11px;color:#333;margin-top:1px}
.pend{background:#D4AF3708;border:1px solid #D4AF3718;border-radius:10px;padding:10px 14px;margin-top:8px;font-size:11px;color:#D4AF37;display:flex;align-items:center;gap:8px}
.pend-dot{width:6px;height:6px;border-radius:50%;background:#D4AF37;animation:pu 1.5s infinite;flex-shrink:0}
/* Skeleton */
.skel{background:linear-gradient(90deg,#12141A 25%,#1A1D22 50%,#12141A 75%);background-size:200% 100%;animation:sh 1.5s ease-in-out infinite;border-radius:8px}
/* Recent Predictions */
.rpc{background:#12141A;border:1px solid #1E2028;border-radius:12px;padding:14px 16px;margin-bottom:8px;cursor:pointer;transition:all .2s}.rpc:hover{border-color:#2A2D34;transform:translateY(-1px)}
.rp-hdr{display:flex;justify-content:space-between;align-items:center;gap:10px}
.rp-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.rp-gic{font-size:22px;flex-shrink:0}
.rp-info{flex:1;min-width:0}
.rp-teams{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rp-meta{font-size:10px;color:#444;margin-top:2px;display:flex;align-items:center;gap:6px}
.rp-right{text-align:right;flex-shrink:0}
.rp-odds{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px}
.rp-conf{font-size:9px;font-weight:700;color:#555}
.rp-badge{font-size:8px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:4px;display:inline-block}
.rp-expand{margin-top:12px;padding-top:12px;border-top:1px solid #1E2028;animation:fi .2s}
.rp-match{background:#0B0D10;border:1px solid #151820;border-radius:8px;padding:10px 12px;margin-bottom:6px}
.rp-match:last-child{margin-bottom:0}
.rp-mt{font-size:12px;font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between}
.rp-pk{font-size:11px;color:#555;display:flex;justify-content:space-between;padding:2px 0}
.rp-empty{text-align:center;padding:28px 16px;color:#333;font-size:13px}
.rp-cta{background:linear-gradient(135deg,#0B963510,#0B963505);border:1px solid #0B963520;border-radius:14px;padding:24px 18px;text-align:center;margin-bottom:12px}
.rp-cta-t{font-size:15px;font-weight:700;margin-bottom:6px}.rp-cta-s{font-size:12px;color:#555;margin-bottom:14px;line-height:1.5}
.rp-cta-btn{padding:12px 28px;border-radius:10px;border:none;background:#0B9635;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans'}
/* Referral Card */
.ref-c{background:linear-gradient(135deg,#0B963508,#D4AF3706);border:1px solid #0B963520;border-radius:14px;padding:18px;margin-bottom:12px}
.ref-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.ref-code{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:#0B9635}
.ref-copy{padding:6px 14px;border-radius:8px;border:none;background:#0B963515;color:#0B9635;font-size:10px;font-weight:700;cursor:pointer;font-family:'DM Sans'}
.ref-stats{display:flex;gap:8px}
.ref-st{flex:1;background:#0B0D1060;border:1px solid #15182060;border-radius:10px;padding:10px 8px;text-align:center}
.ref-sv{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px}
.ref-sl{font-size:8px;font-weight:700;letter-spacing:1px;color:#444;text-transform:uppercase;margin-top:2px}
.ref-share{width:100%;margin-top:12px;padding:12px;border-radius:10px;border:1.5px solid #0B963525;background:#0B963508;color:#0B9635;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans';transition:all .15s}.ref-share:hover{background:#0B963515}
/* Modal */
.mo{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;z-index:200;padding:0;animation:fi .15s}
.mm{background:#12141A;border:1px solid #1E2028;border-radius:22px 22px 0 0;padding:24px 22px 32px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;animation:su .3s cubic-bezier(.16,1,.3,1);-webkit-overflow-scrolling:touch}
.mm-bar{width:36px;height:4px;border-radius:2px;background:#2A2D34;margin:0 auto 16px}
.mm-ti{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;text-align:center;margin-bottom:3px}
.mm-su{font-size:13px;color:#555;text-align:center;margin-bottom:18px}
.mm-st{display:flex;gap:4px;margin-bottom:18px}.mm-st div{flex:1;height:3px;border-radius:2px;background:#1E2028;transition:background .3s}.mm-st div.on{background:#0B9635}
.pkg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.pk{border-radius:12px;padding:14px 8px;text-align:center;cursor:pointer;transition:all .2s;border:2px solid #1E2028;background:#0B0D10}.pk:hover{border-color:#2A2D34}.pk.on{border-width:2px}
.pk-i{font-size:22px;margin-bottom:2px}.pk-n{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px}.pk-o{font-size:9px;color:#555;margin-bottom:4px}.pk-p{font-family:'Bebas Neue',sans-serif;font-size:18px}.pk-u{font-size:9px;color:#444}.pk-d{font-size:9px;color:#666;margin-top:2px}.pk-c{margin-top:3px;font-size:9px;font-weight:700}
.pvg{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.pv{border-radius:12px;padding:16px;cursor:pointer;transition:all .2s;border:2px solid #1E2028;background:#0B0D10;display:flex;align-items:center;gap:14px}.pv:hover{border-color:#2A2D34}.pv.on{border-width:2px}
.pv-d{width:14px;height:14px;border-radius:50%;flex-shrink:0}.pv-n{font-weight:700;font-size:14px}.pv-nu{font-size:12px;color:#555;margin-top:1px}.pv-c{margin-left:auto;font-size:11px;font-weight:700;flex-shrink:0}
.det{background:#0B0D10;border:1px solid #151820;border-radius:12px;padding:14px;margin-bottom:16px;animation:fi .3s}
.det-l{font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:8px}.det-f{display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:12px;color:#666}
.det-t{display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:10px;border-top:1px solid #1E2028}
.inp{width:100%;padding:14px 16px;background:#0B0D10;border:1px solid #1E2028;border-radius:10px;color:#F0F0F2;font-size:14px;font-family:'DM Sans';outline:none}.inp:focus{border-color:#0B9635;box-shadow:0 0 0 3px #0B963510}.inp::placeholder{color:#2A2D34}
.err{background:#0B963510;border:1px solid #0B963520;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#0B9635;font-weight:600}
.ab{width:100%;padding:15px;border-radius:12px;border:none;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans';transition:all .15s}.ab:disabled{cursor:not-allowed;opacity:.4}.ab:not(:disabled):active{transform:scale(.97)}
.bb{width:100%;padding:12px;border-radius:10px;border:1px solid #1E2028;background:transparent;color:#888;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans';margin-top:8px}
.warn{background:#1E202830;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:11px;color:#555;line-height:1.6}
.suc-ic{font-size:52px;text-align:center;margin-bottom:12px}
.suc-box{background:#0B963510;border:1px solid #0B963520;border-radius:12px;padding:16px;margin-bottom:16px;text-align:left}
.suc-r{margin-bottom:10px}.suc-r:last-child{margin-bottom:0}.suc-rl{font-size:10px;color:#555;margin-bottom:2px}.suc-rv{font-size:14px;font-weight:700}
/* Bottom Nav */
.bnav{position:fixed;bottom:0;left:0;right:0;background:#0B0D10F5;backdrop-filter:blur(20px);border-top:1px solid #151820;display:flex;justify-content:space-around;padding:6px 0 env(safe-area-inset-bottom,6px);z-index:80}
.bn-i{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:10px;cursor:pointer;transition:all .15s;border:none;background:transparent;font-family:'DM Sans';-webkit-tap-highlight-color:transparent}
.bn-i:active{transform:scale(.92)}.bn-ic{font-size:18px;line-height:1}.bn-lb{font-size:9px;font-weight:700;letter-spacing:.5px}
.bn-i.on .bn-lb{color:#0B9635}.bn-i:not(.on) .bn-lb{color:#333}
/* Toast */
.toast{position:fixed;bottom:76px;left:50%;transform:translateX(-50%);background:#0B9635;color:#fff;padding:10px 22px;border-radius:10px;font-size:12px;font-weight:700;z-index:300;animation:si .2s cubic-bezier(.16,1,.3,1);box-shadow:0 8px 24px rgba(11,150,53,.25);white-space:nowrap}
@media(min-width:520px){.mo{align-items:center!important;padding:16px!important}.mm{border-radius:22px!important;max-width:440px!important}}
@media(max-width:768px){.hdr{padding:10px 16px!important}.mn{padding:20px 16px!important}.pf{width:calc(100vw - 24px)!important;right:12px!important;max-width:320px!important}}
@media(max-width:420px){.hdr{padding:8px 12px!important}.hav{width:34px!important;height:34px!important;font-size:11px!important;border-radius:8px!important}.mn{padding:16px 12px!important}.mt{font-size:24px!important}.ms{font-size:13px!important;margin-bottom:18px!important}.stg{gap:8px!important}.stc{padding:12px 8px!important}.stv{font-size:22px!important}.stl{font-size:8px!important}.gc-b{padding:18px 16px 14px!important}.gc-ic{font-size:34px!important}.gc-nm{font-size:24px!important}.gc-bd{padding:12px 16px 14px!important}.gc-acts{flex-direction:column!important}.gc-bt{width:100%!important;text-align:center!important;padding:11px!important;font-size:13px!important}.gc-bt2{width:100%!important;text-align:center!important}.gc-ds{font-size:12px!important}.gs{padding:12px 14px!important;gap:10px!important}.gs-ic{font-size:24px!important}.gs-nm{font-size:16px!important}.gs-ds{font-size:10px!important}.pf{width:calc(100vw - 24px)!important;right:12px!important;top:52px!important;border-radius:14px!important}.pf-t{padding:14px!important;gap:10px!important}.pf-av{width:38px!important;height:38px!important;font-size:14px!important}.pf-nm{font-size:14px!important}.pf-bd{padding:12px 14px!important}.cb-v{font-size:18px!important;letter-spacing:2px!important}.mm{padding:20px 16px 28px!important}.pkg{gap:6px!important}.pk{padding:12px 6px!important;border-radius:10px!important}.pk-i{font-size:18px!important}.pk-n{font-size:14px!important}.pk-p{font-size:16px!important}.pv{padding:12px!important;gap:10px!important}.pv-n{font-size:13px!important}.ab{padding:13px!important;font-size:14px!important}.sec{font-size:9px!important;margin:18px 0 8px!important}.ref-stats{gap:6px!important}.ref-st{padding:8px 6px!important}.ref-sv{font-size:15px!important}}
      `}</style>

      <div className="vbg" />

      <header className="hdr">
        <a href="/"><img src="/pego-logo.png" alt="BG" style={{height:46,width:"auto",objectFit:"contain"}} /></a>
        <div className="hr" style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{position:"relative",cursor:"pointer"}} onClick={()=>{setNotifOpen(!notifOpen);setProfileOpen(false);}}>
            <span style={{fontSize:20}}>{"\u{1F514}"}</span>
            {notifs.filter(n=>!n.read).length>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#0B9635",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,color:"#fff"}}>{notifs.filter(n=>!n.read).length}</div>}
          </div>
          <div className={`hav ${profileOpen?"on":""}`} onClick={()=>{setProfileOpen(!profileOpen);setNotifOpen(false);}}>{initials}</div>
        </div>
      </header>

      {/* NOTIFICATIONS */}
      {notifOpen && (<>
        <div style={{position:"fixed",inset:0,zIndex:95}} onClick={()=>setNotifOpen(false)} />
        <div style={{position:"fixed",top:56,right:12,width:320,maxWidth:"calc(100vw - 24px)",maxHeight:420,overflowY:"auto",background:"#12141A",border:"1px solid #1E2028",borderRadius:16,zIndex:96,padding:0,boxShadow:"0 20px 60px rgba(0,0,0,.5)"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #151820",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,fontSize:14}}>Notifications</span>
            {notifs.filter(n=>!n.read).length>0&&<button onClick={async()=>{await fetch("/api/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({markAll:true})});loadUser();}} style={{background:"none",border:"none",color:"#0B9635",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>Mark all read</button>}
          </div>
          {notifs.length===0?<div style={{padding:32,textAlign:"center",color:"#444",fontSize:13}}>No notifications yet</div>:
          notifs.slice(0,20).map((n,i)=>(
            <div key={n._id||i} style={{padding:"12px 16px",borderBottom:"1px solid #15182050",background:n.read?"transparent":"#0B963504"}}>
              <div style={{fontSize:13,color:n.read?"#666":"#F0F0F2",lineHeight:1.5}}>{n.message}</div>
              <div style={{fontSize:10,color:"#333",marginTop:4}}>{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </>)}

      {/* PROFILE */}
      {profileOpen && (<>
        <div style={{position:"fixed",inset:0,zIndex:95}} onClick={()=>setProfileOpen(false)} />
        <div className="pf">
          <div className="pf-t"><div className="pf-av">{initials}</div><div><div className="pf-nm">{user.name}</div><div className="pf-em">{user.email||user.phone}</div></div></div>
          <div className="pf-bd">
            {[{l:"Phone",v:user.phone,c:"#888"},{l:"Betting ID",v:user.bettingId||`BG-${user.phone}`,c:"#0B9635"}].map(r=>(
              <div key={r.l} className="pf-r"><span className="pf-rl">{r.l}</span><span className="pf-rv" style={{color:r.c}}>{r.v}</span></div>
            ))}
            {Object.entries(gp).map(([gId,gPkg])=>{
              const g=GAMES.find(x=>x.id===gId);const p=PKGS.find(x=>x.id===gPkg.package);
              return g&&p?(<div key={gId} className="pf-r"><span className="pf-rl">{g.icon} {g.name}</span><span className="pf-rv" style={{color:p.color}}>{p.icon} {p.name}</span></div>):null;
            })}
            {Object.entries(pgp).map(([gId,req])=>{
              const g=GAMES.find(x=>x.id===gId);const p=PKGS.find(x=>x.id===req.package);
              return g&&p?(<div key={gId} style={{margin:"6px 0",padding:10,background:"#D4AF3708",border:"1px solid #D4AF3718",borderRadius:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#D4AF37",fontWeight:700}}>{g.icon} {g.name}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"#D4AF3715",color:"#D4AF37",animation:"pu 2s infinite"}}>PENDING</span>
                </div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>{p.icon} {p.name} \u2014 {fUSD(p.price)}</div>
                <div style={{fontSize:10,color:"#444",marginTop:1}}>Ref: {req.referenceNumber}</div>
              </div>):null;
            })}
            <div className="cb">
              {hasCode ? (<><div style={{fontSize:10,color:"#444",fontWeight:700,letterSpacing:1,marginBottom:3}}>ACCESS CODE</div><div className="cb-v">{refCode}</div><button className="cb-btn" style={{background:"#0B963512",color:"#0B9635"}} onClick={()=>copyText(refCode,"Code")}>{"\u{1F4CB}"} Copy Code</button></>) : (<><div className="cb-no">{"\u26A0"} No valid access code.<br/>{anyPending?"Waiting for package approval.":"Purchase a package to get one."}</div></>)}
            </div>
            <button className="pf-out" onClick={()=>signOut({callbackUrl:"/"})}>Logout</button>
          </div>
        </div>
      </>)}

      {/* MAIN */}
      <main className="mn">
        <div className="asu"><h1 className="mt">Hey, {firstName} {"\u{1F44B}"}</h1><p className="ms">{anyActive?"Your predictions are ready. Check your rounds!":anyPending?"Your package is being verified. Hang tight!":"Subscribe to get expert football predictions."}</p></div>

        {/* SMART UPGRADE PROMPT — only shows when there's a meaningful upgrade path */}
        <UpgradePrompt user={userData} stats={stats} onClick={() => { const lg = GAMES.find(x => x.live); if (lg) openSub(lg); }} />

        {/* PUSH NOTIFICATION OPT-IN — hides itself if unsupported or already subscribed */}
        <PushOptIn compact />

        {/* STATS OVERVIEW */}
        <div className="stg asu ad1">
          <div className="stc">
            <div className="sti">{"\u{1F4CA}"}</div>
            <div className="stv">{stats?.totalPredictions || 0}</div>
            <div className="stl">Predictions</div>
          </div>
          <div className="stc">
            <div className="sti">{"\u26A1"}</div>
            <div className="stv" style={{color:"#0B9635"}}>{getTotalCredits()}</div>
            <div className="stl">Rounds Left</div>
          </div>
          <div className="stc">
            <div className="sti">{"\u26BD"}</div>
            <div className="stv" style={{color:"#8B5CF6"}}>{stats?.activePackages || 0}</div>
            <div className="stl">Active Packages</div>
          </div>
          <div className="stc">
            <div className="sti">{"\u{1F4B0}"}</div>
            <div className="stv" style={{color:"#D4AF37"}}>{fUSD(stats?.referralEarnings || 0)}</div>
            <div className="stl">Referral Earnings</div>
          </div>
        </div>

        {/* WIN STATS & STREAK */}
        {stats?.roundStats && stats.roundStats.total > 0 && (
          <div className="asu ad2" style={{background:"linear-gradient(135deg,#12141A,#0B963508)",border:"1px solid #0B963520",borderRadius:16,padding:20,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#0B9635",textTransform:"uppercase"}}>{"\u{1F3AF}"} YOUR PERFORMANCE</div>
              {stats.roundStats.streak >= 2 && (
                <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"#D4AF3715",border:"1px solid #D4AF3725",borderRadius:8,padding:"4px 10px",animation:"pu 2s infinite"}}>
                  <span style={{fontSize:12}}>{"\u{1F525}"}</span>
                  <span style={{fontSize:10,fontWeight:800,color:"#D4AF37",letterSpacing:1}}>{stats.roundStats.streak}-WIN STREAK</span>
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              <div style={{textAlign:"center",padding:"10px 4px",background:"#0B0D1060",borderRadius:10,border:"1px solid #15182060"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#0B9635"}}>{stats.roundStats.winRate}%</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Win Rate</div>
              </div>
              <div style={{textAlign:"center",padding:"10px 4px",background:"#0B0D1060",borderRadius:10,border:"1px solid #15182060"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#F0F0F2"}}>{stats.roundStats.wins}/{stats.roundStats.resolved}</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Won</div>
              </div>
              <div style={{textAlign:"center",padding:"10px 4px",background:"#0B0D1060",borderRadius:10,border:"1px solid #15182060"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#D4AF37"}}>{stats.roundStats.avgOdds}x</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Avg Odds</div>
              </div>
              <div style={{textAlign:"center",padding:"10px 4px",background:"#0B0D1060",borderRadius:10,border:"1px solid #15182060"}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:"#8B5CF6"}}>{stats.roundStats.bestStreak}</div>
                <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444",textTransform:"uppercase"}}>Best Streak</div>
              </div>
            </div>
            {stats.roundStats.streak >= 2 && (
              <button onClick={(e)=>{e.stopPropagation();const txt=`\u{1F525} I'm on a ${stats.roundStats.streak}-win streak on BetGenius AI!\n\u{1F3AF} ${stats.roundStats.winRate}% accuracy across ${stats.roundStats.resolved} rounds\n\nJoin me: ${typeof window!=="undefined"?window.location.origin+`/signup${refCode?`?ref=${refCode}`:""}`:""}`;if(navigator.share)navigator.share({title:"BetGenius AI",text:txt}).catch(()=>{});else{navigator.clipboard?.writeText(txt);showToast("Streak shared!");}}} style={{width:"100%",padding:12,borderRadius:10,border:"1.5px solid #D4AF3725",background:"#D4AF3708",color:"#D4AF37",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>
                {"\u{1F4E4}"} Share {stats.roundStats.streak}-Win Streak
              </button>
            )}
          </div>
        )}

        {/* ROUND RESULTS */}
        {stats?.recentRounds && stats.recentRounds.length > 0 && (
          <div className="asu ad2" style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#333",marginBottom:8,textTransform:"uppercase"}}>{"\u{1F3C6}"} ROUND RESULTS</div>
            {stats.recentRounds.slice(0,5).map(r => {
              const rc = r.result==="won"?"#0B9635":r.result==="lost"?"#E31725":"#555";
              const ri = r.result==="won"?"\u2705":r.result==="lost"?"\u274C":"\u23F3";
              const rl = r.result==="won"?"WON":r.result==="lost"?"LOST":"PENDING";
              return (
                <div key={r._id} style={{background:"#12141A",border:`1px solid ${r.result==="won"?"#0B963520":r.result==="lost"?"#E3172520":"#1E2028"}`,borderRadius:12,padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>{ri}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.teams}</div>
                    <div style={{fontSize:10,color:"#444",marginTop:2}}>{r.matchCount} matches {"\u2022"} {timeAgo(r.createdAt)}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:rc}}>{r.totalOdd}x</div>
                    <span style={{fontSize:8,fontWeight:800,letterSpacing:1,padding:"2px 8px",borderRadius:4,background:rc+"15",color:rc}}>{rl}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TIER PERFORMANCE BREAKDOWN */}
        {stats?.tierStats && Object.values(stats.tierStats).some(t => t.total > 0) && (
          <div className="asu ad2" style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#8B5CF6",marginBottom:10,textTransform:"uppercase"}}>{"\u{1F916}"} AI TIER BREAKDOWN</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[{k:"gold",l:"Gold",c:"#D4AF37",i:"\u{1F947}"},{k:"platinum",l:"Platinum",c:"#94A7BD",i:"\u{1F948}"},{k:"diamond",l:"Diamond",c:"#7DD3E8",i:"\u{1F48E}"}].map(t=>{
                const s=stats.tierStats[t.k];
                if(!s||s.total===0)return null;
                return(
                  <div key={t.k} style={{textAlign:"center",padding:"10px 6px",background:"#0B0D1060",borderRadius:10,border:`1px solid ${t.c}20`}}>
                    <div style={{fontSize:14,marginBottom:4}}>{t.i}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:t.c}}>{s.winRate}%</div>
                    <div style={{fontSize:8,fontWeight:700,letterSpacing:1,color:"#444"}}>{s.wins}W / {s.losses}L</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EXPIRY WARNING */}
        {expiringGames.map(eg => (
          <div key={eg.id} className="exp-ban asu ad2" style={eg.daysLeft<=1?{borderColor:"#E3172540",background:"linear-gradient(135deg,#12141A,#E3172508)"}:{}}>
            <div className="exp-txt">{eg.daysLeft<=1?"\u{1F6A8}":"\u26A0\uFE0F"} Your <strong>{eg.name}</strong> package {eg.daysLeft<=0?"expires TODAY!":eg.daysLeft===1?"expires TOMORROW!":(<>expires in <strong>{eg.daysLeft} days</strong></>)}. Renew to keep predictions flowing!</div>
            <button className="exp-btn" onClick={(e)=>{e.stopPropagation();setSubModal(eg);setSelPkg(null);setSelProv(null);setRefNum("");setSenderName("");setStep(1);setSubmitted(false);setError("");setSubProofUrl("");setSubProofPreview("");setSubUploading(false);}}>Renew Now</button>
          </div>
        ))}

        {/* Free Daily Bets */}
        {freeRounds.length > 0 && (<>
          <div className="sec asu ad2" style={{color:"#0B9635"}}>{"\u{1F381}"} FREE DAILY BETS</div>
          {freeRounds.map((r, i) => (
            <div key={r._id} className={`asu ad${i+2}`} style={{background:"linear-gradient(135deg,#0B963510,#0B0D10)",border:"1px solid #0B963530",borderRadius:16,padding:"16px 18px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{GAME_ICONS[r.gameId]||"\u26BD"}</span>
                  <span style={{fontWeight:700,fontSize:14,fontFamily:"'Bebas Neue'",letterSpacing:1,color:"#F0F0F2"}}>{r.gameId?.toUpperCase()}</span>
                  <span style={{background:"#0B9635",color:"#fff",padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:800,letterSpacing:1}}>FREE</span>
                </div>
                <span style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"#D4AF37",letterSpacing:1}}>{r.totalOdd?.toFixed(2)}x</span>
              </div>
              {r.matches?.map((m, mi) => (
                <div key={mi} style={{padding:"8px 0",borderBottom:mi<r.matches.length-1?"1px solid #1E2028":"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,color:"#ccc"}}>{m.homeTeam} vs {m.awayTeam}</span>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    {m.picks?.map((p, pi) => (
                      <span key={pi} style={{background:"#0B963520",color:"#0B9635",padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:700}}>{p.pick} ({p.odd}x)</span>
                    ))}
                  </div>
                  </div>
                  {m.matchTime&&<div style={{fontSize:10,color:"#555",marginTop:2}}>{"\u{1F4C5}"} {(()=>{try{const dt=new Date(m.matchTime);if(isNaN(dt))return m.matchTime;return dt.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})+" • "+dt.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});}catch(e){return m.matchTime;}})()}</div>}
                </div>
              ))}
              {r.adminNote && <div style={{marginTop:8,fontSize:12,color:"#D4AF37",fontStyle:"italic"}}>{r.adminNote}</div>}
              {r.betLink && <a href={r.betLink} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",marginTop:8,fontSize:12,color:"#0B9635",fontWeight:700,textDecoration:"none"}}>View Bet Slip {"\u2192"}</a>}
            </div>
          ))}
        </>)}

        <div className="sec asu ad2">{"\u{1F7E2}"} LIVE GAMES</div>

        {GAMES.filter(g=>g.live).map((g,i)=>{
          const btn = getGameButton(g);
          const pending = getGamePending(g.id);
          const pendPkg = pending ? PKGS.find(x=>x.id===pending.package) : null;
          const activePkg = getGamePkg(g.id);
          const activePkgInfo = activePkg ? PKGS.find(x=>x.id===activePkg.package) : null;
          const creditsLeft = getCreditsLeft(g.id);
          const isExpired = btn.daysLeft === 0;

          return (
            <div key={g.id} className={`gc asu ad${i+2}`} onClick={()=>openSub(g)} style={{cursor:gameIsPending(g.id)?"default":"pointer"}}>
              <div className="gc-b" style={{background:g.bg}}>
                <div className="gc-dc" style={{top:-25,right:-25,width:100,height:100}} />
                <div className="gc-dc" style={{bottom:-35,left:"15%",width:130,height:130}} />
                <div className="gc-tp">
                  <div className="lb"><div className="ld" /> LIVE</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.45)",fontWeight:700,letterSpacing:1}}>{g.badge}</div>
                </div>
                <div className="gc-ic" style={{animationDelay:`${i*.6}s`}}>{g.logo?<img src={g.logo} alt={g.name} style={{width:56,height:56,borderRadius:12,objectFit:"cover"}}/>:g.icon}</div>
                <div className="gc-nm">{g.name}</div><div className="gc-su">{g.sub}</div>
              </div>
              <div className="gc-bd">
                {/* Package info badges */}
                {activePkgInfo && !isExpired && (
                  <div className="gc-info">
                    <span className="gc-badge" style={{background:activePkgInfo.color+"15",color:activePkgInfo.color,border:`1px solid ${activePkgInfo.color}25`}}>{activePkgInfo.icon} {activePkgInfo.name}</span>
                    <span className="gc-badge" style={{background:"#0B963512",color:"#0B9635",border:"1px solid #0B963520"}}>{"\u26A1"} {creditsLeft}/{activePkgInfo.max} rounds</span>
                    {btn.daysLeft !== null && btn.daysLeft > 0 && (
                      <span className="gc-badge" style={{background:btn.daysLeft<=3?"#E3172510":btn.daysLeft<=7?"#D4AF3710":"#0B963510",color:btn.daysLeft<=3?"#E31725":btn.daysLeft<=7?"#D4AF37":"#0B9635",border:`1px solid ${btn.daysLeft<=3?"#E3172520":btn.daysLeft<=7?"#D4AF3720":"#0B963520"}`}}>{btn.daysLeft}d left</span>
                    )}
                  </div>
                )}
                <p className="gc-ds">{g.desc}</p>
                <div className="gc-tg">{g.tags.map(t=><span key={t} className="gc-t" style={{color:g.color,background:g.color+"12"}}>{t}</span>)}</div>

                {/* Action buttons */}
                {gameHasPkg(g.id) && !isExpired ? (
                  <div className="gc-acts">
                    <div className="gc-bt" style={btn.style} onClick={(e)=>{e.stopPropagation();router.push("/dashboard/predict?game="+g.id);}}>{btn.text}</div>
                    <div className="gc-bt2" onClick={(e)=>{e.stopPropagation();router.push("/dashboard/predict?game="+g.id);}}>History</div>
                  </div>
                ) : (
                  <div className="gc-acts">
                    <div className="gc-bt" style={btn.style}>{btn.text}</div>
                  </div>
                )}
              </div>
              {pending && (
                <div className="pend"><div className="pend-dot" /><span>{"\u23F3"} {pendPkg?.icon} {pendPkg?.name} \u2014 Awaiting admin approval \u2022 Ref: {pending.referenceNumber}</span></div>
              )}
            </div>
          );
        })}

        {/* RECENT PREDICTIONS */}
        <div className="sec asu ad3">{"\u{1F4C8}"} RECENT PREDICTIONS</div>

        {!anyActive && !anyPending && (
          <div className="rp-cta asu ad3">
            <div className="rp-cta-t">{"\u{1F680}"} Get Football Predictions</div>
            <div className="rp-cta-s">Subscribe to a package and get expert predictions for EPL, La Liga, Serie A & Bundesliga from our verified sources.</div>
            <button className="rp-cta-btn" onClick={()=>{const lg=GAMES.find(x=>x.live);if(lg)openSub(lg);}}>Subscribe Now</button>
          </div>
        )}

        {anyActive && recentPreds.length === 0 && (
          <div className="rp-empty asu ad3">No predictions yet. Your rounds will appear here once posted.</div>
        )}

        {recentPreds.slice(0, 5).map((pred, i) => {
          const gameIcon = GAME_ICONS[pred.gameId] || "\u26BD";
          const firstMatch = pred.matches?.[0];
          const teams = firstMatch ? `${firstMatch.homeTeam} vs ${firstMatch.awayTeam}` : "Prediction";
          const isExpanded = expandedPred === pred._id;
          const statusMap = {
            responded: { text: "READY", bg: "#0B963515", color: "#0B9635" },
            pending: { text: "ANALYZING", bg: "#D4AF3715", color: "#D4AF37" },
            rejected: { text: "REJECTED", bg: "#E3172515", color: "#E31725" },
          };
          const st = statusMap[pred.status] || statusMap.pending;

          return (
            <div key={pred._id} className={`rpc asu ad${Math.min(i+3, 5)}`} onClick={()=>setExpandedPred(isExpanded?null:pred._id)}>
              <div className="rp-hdr">
                <div className="rp-left">
                  <div className="rp-gic">{gameIcon}</div>
                  <div className="rp-info">
                    <div className="rp-teams">{teams}</div>
                    <div className="rp-meta">
                      <span className="rp-badge" style={{background:st.bg,color:st.color,animation:pred.status==="pending"?"pu 2s infinite":"none"}}>{st.text}</span>
                      <span>{timeAgo(pred.createdAt)}</span>
                      {pred.matches?.length > 1 && <span>{pred.matches.length} matches</span>}
                    </div>
                  </div>
                </div>
                <div className="rp-right">
                  {pred.totalOdd > 0 && <div className="rp-odds" style={{color:"#0B9635"}}>{pred.totalOdd.toFixed(1)}x</div>}
                  {pred.aiConfidence > 0 && <div className="rp-conf">{pred.aiConfidence}% conf</div>}
                </div>
              </div>

              {isExpanded && pred.status === "responded" && pred.matches?.length > 0 && (
                <div className="rp-expand">
                  {pred.matches.map((m, mi) => (
                    <div key={mi} className="rp-match">
                      <div className="rp-mt">
                        <span>{m.homeTeam} vs {m.awayTeam}</span>
                        {m.matchTime && <span style={{color:"#444",fontSize:10}}>{m.matchTime}</span>}
                      </div>
                      {m.picks?.map((pk, pi) => (
                        <div key={pi} className="rp-pk">
                          <span>{pk.market}: <strong style={{color:"#F0F0F2"}}>{pk.pick}</strong></span>
                          <span style={{color:"#0B9635",fontWeight:700}}>{pk.odd}x</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {pred.analysis && (
                    <div style={{marginTop:8,padding:10,background:"#0B963508",border:"1px solid #0B963515",borderRadius:8,fontSize:11,color:"#666",lineHeight:1.5}}>
                      <strong style={{color:"#0B9635"}}>AI Analysis:</strong> {pred.analysis}
                    </div>
                  )}
                  {pred.riskLevel && (
                    <div style={{marginTop:6,fontSize:10,color:{low:"#0B9635",medium:"#D4AF37",high:"#E31725"}[pred.riskLevel]||"#555",fontWeight:700}}>
                      Risk: {pred.riskLevel.toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* REFERRAL WIDGET */}
        {hasCode && (
          <>
            <div className="sec asu ad4">{"\u{1F91D}"} REFERRAL PROGRAM</div>
            <div className="ref-c asu ad4">
              <div className="ref-top">
                <div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:"#444",marginBottom:3}}>YOUR CODE</div>
                  <div className="ref-code">{refCode}</div>
                </div>
                <button className="ref-copy" onClick={(e)=>{e.stopPropagation();copyText(refCode,"Code");}}>{"\u{1F4CB}"} Copy</button>
              </div>
              <div className="ref-stats">
                <div className="ref-st">
                  <div className="ref-sv" style={{color:"#F0F0F2"}}>{stats?.referralCount || 0}</div>
                  <div className="ref-sl">Referrals</div>
                </div>
                <div className="ref-st">
                  <div className="ref-sv" style={{color:"#D4AF37"}}>{fUSD(stats?.referralEarnings || 0)}</div>
                  <div className="ref-sl">Earned</div>
                </div>
                <div className="ref-st">
                  <div className="ref-sv" style={{color:"#0B9635"}}>{fUSD(stats?.referralBalance || 0)}</div>
                  <div className="ref-sl">Balance</div>
                </div>
              </div>
              <button className="ref-share" onClick={(e)=>{
                e.stopPropagation();
                const shareData = { title:"BetGenius AI", text:`Join BetGenius AI and get expert football predictions! Use my code: ${refCode}`, url:typeof window!=="undefined"?window.location.origin+`/signup?ref=${refCode}`:"" };
                if (navigator.share) navigator.share(shareData).catch(()=>{});
                else navigator.clipboard?.writeText(`${shareData.text}\n${shareData.url}`);
              }}>{"\u{1F4E4}"} Share & Earn $2 per Referral</button>
            </div>
          </>
        )}

        {/* QUICK LINKS to Achievements + AI Chat + Bankroll */}
        <div className="sec asu ad4">{"✨"} EXPLORE</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
          <a href="/dashboard/achievements" style={{textDecoration:"none",color:"inherit"}}>
            <div style={{background:"linear-gradient(135deg,#12141A,#D4AF3708)",border:"1px solid #D4AF3725",borderRadius:14,padding:"14px 12px",transition:"all 0.2s",cursor:"pointer"}}>
              <div style={{fontSize:22,marginBottom:5}}>{"\u{1F3C6}"}</div>
              <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>Trophies</div>
              <div style={{fontSize:10,color:"#666",lineHeight:1.4}}>Unlock badges</div>
            </div>
          </a>
          <a href="/dashboard/chat" style={{textDecoration:"none",color:"inherit"}}>
            <div style={{background:"linear-gradient(135deg,#12141A,#0B963510)",border:"1px solid #0B963530",borderRadius:14,padding:"14px 12px",transition:"all 0.2s",cursor:"pointer"}}>
              <div style={{fontSize:22,marginBottom:5}}>{"\u{1F916}"}</div>
              <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>AI Analyst</div>
              <div style={{fontSize:10,color:"#666",lineHeight:1.4}}>Ask for picks</div>
            </div>
          </a>
          <a href="/dashboard/bankroll" style={{textDecoration:"none",color:"inherit"}}>
            <div style={{background:"linear-gradient(135deg,#12141A,#7DD3E810)",border:"1px solid #7DD3E830",borderRadius:14,padding:"14px 12px",transition:"all 0.2s",cursor:"pointer"}}>
              <div style={{fontSize:22,marginBottom:5}}>{"\u{1F4B0}"}</div>
              <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>Bankroll</div>
              <div style={{fontSize:10,color:"#666",lineHeight:1.4}}>Track P&L · Kelly</div>
            </div>
          </a>
        </div>

        {/* Coming soon section removed — all games are now live */}
        <div style={{height:70}} />
      </main>

      {/* FLOATING AI CHAT LAUNCHER */}
      <ChatLauncher />

      {/* TOAST */}
      {toast && <div className="toast">{"\u2713"} {toast}</div>}

      {/* BOTTOM NAV */}
      {!subModal && (
        <nav className="bnav">
          {[
            {icon:"\u{1F3E0}",label:"Home",path:"/dashboard",active:true},
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
      )}

      {/* SUBSCRIBE MODAL */}
      {subModal && (
        <div className="mo" onClick={closeSub}>
          <div className="mm" onClick={e=>e.stopPropagation()}>
            <div className="mm-bar" />
            <div className="mm-st"><div className={step>=1?"on":""}/><div className={step>=2?"on":""}/><div className={step>=3?"on":""}/></div>

            {step===1 && !submitted && (<div style={{animation:"fi .2s"}}>
              <div style={{textAlign:"center",marginBottom:18}}><div style={{fontSize:40,marginBottom:4}}>{subModal.icon}</div><div className="mm-ti">{subModal.name}</div><p className="mm-su">Select a package for this game</p></div>
              <div className="pkg">{PKGS.map(p=>{const s=selPkg===p.id;return(
                <div key={p.id} className={`pk ${s?"on":""}`} onClick={()=>setSelPkg(p.id)} style={{borderColor:s?p.color:"#1E2028",background:s?p.color+"10":"#0B0D10"}}>
                  <div className="pk-i">{p.icon}</div><div className="pk-n" style={{color:p.color}}>{p.name}</div><div className="pk-o">{p.odds}</div><div className="pk-p">{fUSD(p.price)}</div><div className="pk-d">{p.max} pred{p.max>1?"s":""}</div>{s&&<div className="pk-c" style={{color:p.color}}>{"\u2713"}</div>}
                </div>);})}</div>
              {selPkg&&(()=>{const p=PKGS.find(x=>x.id===selPkg);return(<div className="det"><div className="det-l" style={{color:p.color}}>{p.icon} {p.name.toUpperCase()}</div>{p.features.map(f=><div key={f} className="det-f"><span style={{color:"#0B9635"}}>{"\u2713"}</span>{f}</div>)}<div className="det-t"><span style={{color:"#555",fontWeight:600}}>Total</span><span style={{fontFamily:"'Bebas Neue'",fontSize:22,color:"#0B9635",letterSpacing:1}}>{fUSD(p.price)}</span></div></div>);})()}
              <button className="ab" disabled={!selPkg} onClick={()=>setStep(2)} style={{background:selPkg?"#0B9635":"#151820",color:selPkg?"#fff":"#444"}}>Continue to Payment {"\u2192"}</button>
            </div>)}

            {step===2 && !submitted && (()=>{const p=PKGS.find(x=>x.id===selPkg);return(<div style={{animation:"fi .2s"}}>
              <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:32,marginBottom:4}}>{"\u{1F4B3}"}</div><div className="mm-ti">Payment</div><p className="mm-su">Send <strong style={{color:"#0B9635"}}>{fUSD(p.price)}</strong> for {subModal.icon} {subModal.name}</p></div>
              <div style={{background:"#0B0D10",border:"1px solid #151820",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><span style={{fontSize:11,color:"#555"}}>{subModal.icon} {subModal.name}:</span> <span style={{fontWeight:700,color:p.color}}>{p.icon} {p.name}</span></div><span style={{fontFamily:"'Bebas Neue'",fontSize:18,color:"#0B9635"}}>{fUSD(p.price)}</span></div>
              {CRYPTO_PROVS.length>0&&(<div style={{display:"flex",gap:4,marginBottom:14,background:"#0B0D10",borderRadius:8,padding:3,border:"1px solid #1E2028"}}><button onClick={()=>{window._dashPayTab="momo";setSelProv(null);setError("")}} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",background:(window._dashPayTab||"momo")==="momo"?"#0B9635":"transparent",color:(window._dashPayTab||"momo")==="momo"?"#fff":"#555"}}>{"\u{1F4F1}"} Mobile Money</button><button onClick={()=>{window._dashPayTab="crypto";setSelProv(null);setError("")}} style={{flex:1,padding:"8px 0",borderRadius:6,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",background:window._dashPayTab==="crypto"?"linear-gradient(135deg,#F7931A,#26A17B)":"transparent",color:window._dashPayTab==="crypto"?"#fff":"#555"}}>{"\u20BF"} Crypto</button></div>)}
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",marginBottom:8}}>SELECT PAYMENT METHOD</div>
              <div className="pvg">{((window._dashPayTab||"momo")==="momo"?MOMO_PROVS:CRYPTO_PROVS).map(pv=>{const s=selProv===pv.id;return(
                <div key={pv.id} className={`pv ${s?"on":""}`} onClick={()=>setSelProv(pv.id)} style={{borderColor:s?pv.color:"#1E2028",background:s?pv.color+"08":"#0B0D10"}}>
                  <div className="pv-d" style={{background:pv.color}} /><div><div className="pv-n" style={{color:s?pv.color:"#F0F0F2"}}>{pv.name}</div><div className="pv-nu">{pv.type==="crypto"?`${pv.network}`:`Number: ${pv.num} \u2022 ${pv.acct||"BetGenius AI"}`}</div></div>{s&&<div className="pv-c" style={{color:pv.color}}>{"\u2713"}</div>}
                </div>);})}</div>
              {selProv&&(()=>{const pv=PROVS.find(x=>x.id===selProv);if(!pv) return null;return pv.type==="crypto"?(<div style={{background:pv.color+"08",border:`1px solid ${pv.color}20`,borderRadius:10,padding:14,marginBottom:14,animation:"fi .2s"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:pv.color,marginBottom:6}}>WALLET ADDRESS ({pv.network})</div><div style={{background:"#0B0D1080",borderRadius:6,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{flex:1,fontFamily:"monospace",fontSize:11,color:pv.color,wordBreak:"break-all"}}>{pv.address}</span><button onClick={()=>navigator.clipboard?.writeText(pv.address)} style={{background:pv.color+"15",color:pv.color,border:"none",padding:"4px 12px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'",flexShrink:0}}>Copy</button></div><div style={{fontSize:12,color:"#555"}}>Amount: <strong style={{color:"#0B9635"}}>{fUSD(p.price)}</strong></div><div style={{marginTop:6,fontSize:10,color:"#D4AF37"}}>{"\u26A0"} Send ONLY via {pv.network}</div></div>):(<div style={{background:pv.color+"08",border:`1px solid ${pv.color}20`,borderRadius:10,padding:14,marginBottom:14,animation:"fi .2s"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:pv.color,marginBottom:6}}>SEND TO</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontWeight:700,fontSize:16}}>{pv.num}</span><button onClick={()=>navigator.clipboard?.writeText(pv.num.replace(/-/g,""))} style={{background:pv.color+"15",color:pv.color,border:"none",padding:"4px 12px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans'"}}>Copy</button></div><div style={{fontSize:12,color:"#555"}}>Name: <strong style={{color:"#888"}}>{pv.acct||"BetGenius AI"}</strong> \u2022 Amount: <strong style={{color:"#0B9635"}}>{fUSD(p.price)}</strong></div></div>);})()}
              <button className="ab" disabled={!selProv} onClick={()=>setStep(3)} style={{background:selProv?"#0B9635":"#151820",color:selProv?"#fff":"#444"}}>I've Sent Payment {"\u2192"}</button>
              <button className="bb" onClick={()=>setStep(1)}>{"\u2190"} Back</button>
            </div>);})()}

            {step===3 && !submitted && (()=>{const p=PKGS.find(x=>x.id===selPkg);const pv=PROVS.find(x=>x.id===selProv);const isCrypto=pv?.type==="crypto";return(<div style={{animation:"fi .2s"}}>
              <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:32,marginBottom:4}}>{isCrypto?"\u{1F517}":"\u{1F4CB}"}</div><div className="mm-ti">{isCrypto?"Submit Transaction":"Submit Reference"}</div><p className="mm-su">Enter your <strong style={{color:pv?.color}}>{pv?.name}</strong> transaction details</p></div>
              <div style={{background:pv?.color+"08",border:`1px solid ${pv?.color}20`,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}><div className="pv-d" style={{background:pv?.color,flexShrink:0}} /><div><div style={{fontWeight:700,fontSize:13,color:pv?.color}}>{pv?.name}</div><div style={{fontSize:11,color:"#555"}}>{subModal.icon} {subModal.name} \u2014 {p.icon} {p.name} \u2014 {fUSD(p.price)}</div></div></div>
              <div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",marginBottom:5}}>{pv?.refLabel||"REFERENCE"}</label><input className="inp" placeholder={pv?.refPlaceholder||"e.g. REF-123456"} value={refNum} onChange={e=>setRefNum(e.target.value)} style={{fontFamily:isCrypto?"monospace":"inherit"}} /></div>
              <div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",marginBottom:5}}>{isCrypto?"WALLET / EXCHANGE NAME":"SENDER / MERCHANT NAME"}</label><input className="inp" placeholder={isCrypto?"e.g. Binance, Trust Wallet":"Name on the transaction"} value={senderName} onChange={e=>setSenderName(e.target.value)} /></div>
              <div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:2,color:"#444",marginBottom:5}}>PAYMENT SCREENSHOT (REQUIRED)</label>{!subProofPreview?(<label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"18px 14px",background:"#0B0D10",border:"2px dashed #1E2028",borderRadius:10,cursor:"pointer"}}><span style={{fontSize:24}}>{"\u{1F4F8}"}</span><span style={{fontSize:12,color:"#555",fontWeight:600}}>Tap to upload payment screenshot</span><span style={{fontSize:10,color:"#333"}}>JPG, PNG — Max 5MB</span><input type="file" accept="image/*" onChange={handleSubProofUpload} style={{display:"none"}} /></label>):(<div style={{position:"relative",borderRadius:10,overflow:"hidden",border:"1px solid #1E2028"}}><img src={subProofPreview} alt="Proof" style={{width:"100%",maxHeight:160,objectFit:"cover"}} />{subUploading&&<div style={{position:"absolute",inset:0,background:"rgba(11,13,16,.8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0B9635",fontWeight:700,fontSize:13}}>Uploading...</div>}{subProofUrl&&<div style={{position:"absolute",top:6,right:6,background:"#0B9635",color:"#fff",padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700}}>{"\u2713"} Uploaded</div>}<button type="button" onClick={()=>{setSubProofPreview("");setSubProofUrl("")}} style={{position:"absolute",top:6,left:6,background:"rgba(227,23,37,.8)",color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Remove</button></div>)}</div>
              <div className="warn">{"\u{1F512}"} Your {subModal.name} package will be activated once payment is verified. Usually 5–30 minutes.</div>
              {error && <div className="err">{"\u26A0"} {error}</div>}
              <button className="ab" disabled={submitting||!refNum.trim()} onClick={submitRef} style={{background:refNum.trim()?"#0B9635":"#151820",color:refNum.trim()?"#fff":"#444"}}>{submitting?"Submitting...":"Submit Reference"}</button>
              <button className="bb" onClick={()=>setStep(2)}>{"\u2190"} Back</button>
            </div>);})()}

            {submitted && (()=>{const p=PKGS.find(x=>x.id===selPkg);const pv=PROVS.find(x=>x.id===selProv);return(<div style={{textAlign:"center",animation:"fi .3s"}}>
              <div className="suc-ic">{"\u2705"}</div>
              <div className="mm-ti">Request Submitted</div>
              <p className="mm-su">Payment verification in progress for {subModal.icon} {subModal.name}</p>
              <div className="suc-box">
                {[{l:"Game",v:`${subModal.icon} ${subModal.name}`},{l:"Package",v:`${p.icon} ${p.name}`,c:p.color},{l:"Amount",v:fUSD(p.price),c:"#0B9635"},{l:"Provider",v:pv.name,c:pv.color},{l:"Reference",v:refNum,mono:true},{l:"Sender",v:senderName||"\u2014"}].map(r=>(
                  <div key={r.l} className="suc-r"><div className="suc-rl">{r.l}</div><div className="suc-rv" style={{color:r.c||"#F0F0F2",fontFamily:r.mono?"monospace":"inherit"}}>{r.v}</div></div>
                ))}
              </div>
              <p style={{fontSize:12,color:"#555",marginBottom:16}}>Package activates within 5-30 minutes after verification.</p>
              <button className="ab" onClick={closeSub} style={{background:"#0B9635",color:"#fff"}}>Done</button>
            </div>);})()}
          </div>
        </div>
      )}
    </div>
  );
}
