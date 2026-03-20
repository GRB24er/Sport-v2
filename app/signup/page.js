"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const LOGO_H = 90;
const DEF_FEE = 20;

const DEF_CRYPTO = [
  { id:"usdt_trc20", name:"USDT (TRC20)", short:"USDT TRC20", color:"#26A17B", dark:"#1A7A5C", bg:"linear-gradient(135deg,#26A17B,#50D4A2)", icon:"₮", type:"crypto", network:"Tron (TRC20)", feeNote:"Low fees (~$1)", steps:["Copy the USDT wallet address below","Open your crypto wallet (Binance, Trust Wallet, etc.)","Send the exact USDT amount via TRC20 network","Copy your Transaction Hash (TxID)","Paste it in the reference field below"] },
  { id:"usdt_erc20", name:"USDT (ERC20)", short:"USDT ERC20", color:"#627EEA", dark:"#3B5998", bg:"linear-gradient(135deg,#627EEA,#8BA3F9)", icon:"₮", type:"crypto", network:"Ethereum (ERC20)", feeNote:"Higher gas fees", steps:["Copy the USDT wallet address below","Open your crypto wallet","Send the exact USDT amount via ERC20 network","Copy your Transaction Hash (TxID)","Paste it in the reference field below"] },
  { id:"btc", name:"Bitcoin (BTC)", short:"Bitcoin", color:"#F7931A", dark:"#C77A15", bg:"linear-gradient(135deg,#F7931A,#FFB84D)", icon:"₿", type:"crypto", network:"Bitcoin Network", feeNote:"Standard BTC fees", steps:["Copy the Bitcoin address below","Open your BTC wallet or exchange","Send the exact BTC equivalent","Copy your Transaction Hash (TxID)","Paste it in the reference field below"] },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [ss, setSs] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [provider, setProvider] = useState(null);
  const [form, setForm] = useState({ name:"", email:"", phone:"", password:"", confirm:"", referral:"" });
  const [refNum, setRefNum] = useState("");
  const [senderName, setSenderName] = useState("");
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(null);
  const [timer, setTimer] = useState(1800);
  const timerRef = useRef(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofPreview, setProofPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetch("/api/admin/settings").then(r=>r.json()).then(d=>{if(d.settings)setSs(d.settings)}).catch(()=>{}); }, []);

  const s = ss || {};
  const FEE = s.signupFee || DEF_FEE;

  // Build MoMo providers from settings
  const momoEnabled = s.momoEnabled || false;
  const MOMO_PROVS = momoEnabled && Array.isArray(s.momoProviders) ? s.momoProviders.filter(p => p.enabled !== false).map(p => ({
    id: p.id || "momo_" + p.name?.toLowerCase().replace(/\s/g,"_"),
    name: p.name,
    num: p.number,
    acct: p.accountName || "BetGenius AI",
    color: p.color || "#0B9635",
    bg: `linear-gradient(135deg,${p.color || "#0B9635"},${p.color || "#0B9635"}cc)`,
    icon: "📱",
    type: "momo",
    steps: ["Send the exact amount to the number shown below", "Use the account name as reference", "Copy your transaction reference/ID", "Paste it in the reference field below"],
  })) : [];

  // Build crypto providers from settings
  const cryptoEnabled = s.cryptoEnabled !== false;
  const CRYPTO_PROVS = !cryptoEnabled ? [] : [
    s.usdtTrc20Address ? { ...DEF_CRYPTO[0], address: s.usdtTrc20Address } : null,
    s.usdtErc20Address ? { ...DEF_CRYPTO[1], address: s.usdtErc20Address } : null,
    s.btcAddress ? { ...DEF_CRYPTO[2], address: s.btcAddress } : null,
  ].filter(Boolean);

  const PROVS = [...MOMO_PROVS, ...CRYPTO_PROVS];

  const pv = PROVS.find(p => p.id === provider);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (step === 3 && !timerRef.current) {
      timerRef.current = setInterval(() => setTimer(t => { if (t <= 0) { clearInterval(timerRef.current); return 0; } return t - 1; }), 1000);
    }
    return () => {};
  }, [step]);

  const copy = (text, id) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const goStep2 = (e) => {
    e.preventDefault(); setErr("");
    if (!form.name || !form.email || !form.phone || !form.password) return setErr("All fields are required");
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr("Enter a valid email");
    if (form.phone.length < 7) return setErr("Enter a valid phone number");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setErr("Passwords don't match");
    setStep(2);
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return setErr("Image too large. Maximum 5MB.");
    setErr("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setProofPreview(base64);
      setUploading(true);
      try {
        const res = await fetch("/api/upload-image", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.error || "Upload failed"); setUploading(false); return; }
        setProofUrl(data.url);
      } catch (e) { setErr("Upload failed. Try again."); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault(); setErr("");
    if (!refNum.trim()) return setErr("Enter your transaction reference");
    if (!proofUrl) return setErr("Please upload your payment screenshot");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name:form.name, email:form.email, phone:form.phone, password:form.password, referenceNumber:refNum.trim(), paymentProvider:provider||"", senderName:senderName.trim(), referralUsed:form.referral||null, paymentProofUrl:proofUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Registration failed"); setLoading(false); return; }
      setCreated(data.user); setStep(4);
    } catch (e) { setErr("Network error. Try again."); }
    setLoading(false);
  };

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  return (
    <div className="su-root">
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}
.su-root{min-height:100vh;background:#0B0D10;color:#F0F0F2;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;position:relative;overflow-x:hidden}
.su-bg{position:fixed;inset:0;z-index:0;overflow:hidden}
.su-bg-orb{position:absolute;border-radius:50%;filter:blur(120px);opacity:.15;animation:orb 20s ease-in-out infinite}
.su-bg-orb:nth-child(1){width:500px;height:500px;background:#0B9635;top:-20%;left:-10%;animation-delay:0s}
.su-bg-orb:nth-child(2){width:400px;height:400px;background:#0B9635;bottom:-15%;right:-10%;animation-delay:-7s}
.su-bg-orb:nth-child(3){width:300px;height:300px;background:#D4AF37;top:50%;left:50%;animation-delay:-14s}
@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.1)}66%{transform:translate(-30px,20px) scale(.9)}}
.su-grid{position:fixed;inset:0;z-index:0;background-image:radial-gradient(circle,#0B9635 1px,transparent 1px);background-size:30px 30px;opacity:.04}
.su-cnt{position:relative;z-index:1;flex:1;display:flex;align-items:center;justify-content:center;padding:32px 20px}
.su-card{width:100%;max-width:480px;position:relative}
.su-inner{background:rgba(18,20,26,.85);backdrop-filter:blur(40px);border:1px solid rgba(255,255,255,.06);border-radius:28px;padding:40px 32px;position:relative;overflow:hidden}
.su-inner::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#0B9635,#D4AF37,#0B9635,transparent)}
.su-logo{display:flex;justify-content:center;margin-bottom:28px}
.su-prog{display:flex;gap:4px;margin-bottom:28px}
.su-bar{flex:1;height:3px;border-radius:2px;background:#1E2028;transition:all .4s cubic-bezier(.4,0,.2,1)}.su-bar.on{background:linear-gradient(90deg,#0B9635,#D4AF37)}
.su-step{text-align:center;margin-bottom:8px}
.su-step span{font-size:10px;font-weight:700;letter-spacing:3px;color:#333;text-transform:uppercase;background:rgba(227,23,37,.08);padding:4px 16px;border-radius:20px;border:1px solid rgba(227,23,37,.12)}
.su-h{font-size:32px;font-weight:800;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;text-align:center;margin-bottom:4px}
.su-sub{font-size:14px;color:#555;text-align:center;margin-bottom:24px;line-height:1.6}
.su-fee{display:flex;align-items:center;justify-content:center;gap:12px;background:rgba(11,150,53,.06);border:1px solid rgba(11,150,53,.15);border-radius:14px;padding:14px 20px;margin-bottom:28px}
.su-fee-a{font-family:'Bebas Neue',monospace;font-size:22px;font-weight:700;color:#0B9635;letter-spacing:1px}
.su-fee-u{font-size:12px;color:#555}
.su-field{margin-bottom:16px}
.su-lbl{display:block;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#444;margin-bottom:6px}
.su-inp{width:100%;padding:14px 16px;background:rgba(11,13,16,.6);border:1px solid #1E2028;border-radius:12px;color:#F0F0F2;font-size:14px;font-family:'DM Sans';outline:none;transition:all .2s}.su-inp:focus{border-color:#0B9635;box-shadow:0 0 0 3px rgba(227,23,37,.08)}.su-inp::placeholder{color:#2A2D34}
.su-pw{position:relative}.su-pw .su-inp{padding-right:56px}.su-pw-btn{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#555;cursor:pointer;font-size:12px;font-family:'DM Sans';font-weight:600}
.su-err{background:rgba(227,23,37,.06);border:1px solid rgba(227,23,37,.15);border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#0B9635;font-weight:600;display:flex;align-items:center;gap:8px}
.su-btn{width:100%;padding:16px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:'DM Sans';transition:all .2s;position:relative;overflow:hidden}
.su-btn:disabled{opacity:.4;cursor:not-allowed}.su-btn:active{transform:scale(.98)}
.su-btn-r{background:#0B9635;color:#fff}.su-btn-r:hover:not(:disabled){box-shadow:0 8px 30px rgba(227,23,37,.3);transform:translateY(-1px)}
.su-btn-g{background:#0B9635;color:#fff}.su-btn-g:hover:not(:disabled){box-shadow:0 8px 30px rgba(11,150,53,.3);transform:translateY(-1px)}
.su-btn-o{background:transparent;color:#888;border:1px solid #1E2028}.su-btn-o:hover{border-color:#555;color:#F0F0F2}
.su-row{display:flex;gap:10px}.su-row>:first-child{flex:1}.su-row>:last-child{flex:2}
.su-foot{text-align:center;margin-top:20px;font-size:13px;color:#444}
.su-link{color:#0B9635;font-weight:700;text-decoration:none}

/* PAYMENT PROVIDER CARDS */
.pv-grid{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.pv-card{position:relative;border-radius:16px;padding:18px 20px;cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);border:2px solid transparent;display:flex;align-items:center;gap:16px;background:rgba(11,13,16,.5)}
.pv-card:hover{transform:translateY(-2px)}.pv-card.on{border-width:2px;transform:scale(1.02);box-shadow:0 12px 40px rgba(0,0,0,.3)}
.pv-dot{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.pv-info{flex:1}.pv-name{font-weight:700;font-size:15px}.pv-num{font-size:12px;color:#555;margin-top:2px;font-family:'Space Mono',monospace}
.pv-check{width:22px;height:22px;border-radius:50%;border:2px solid #333;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;font-size:11px}
.pv-card.on .pv-check{border-color:currentColor}

/* PAYMENT DETAILS BOX */
.pay-box{border-radius:20px;padding:28px 24px;margin-bottom:20px;position:relative;overflow:hidden;animation:paySlide .5s cubic-bezier(.4,0,.2,1)}
@keyframes paySlide{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
.pay-box::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent);animation:payShine 3s infinite}
@keyframes payShine{0%{left:-100%}100%{left:100%}}
.pay-hdr{text-align:center;margin-bottom:20px;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.7}
.pay-row{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.06)}.pay-row:last-child{border-bottom:none}
.pay-lbl{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;opacity:.5}
.pay-val{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;letter-spacing:1px;display:flex;align-items:center;gap:10px}
.pay-copy{padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;font-size:11px;font-weight:700;cursor:pointer;font-family:'DM Sans';transition:all .2s;letter-spacing:.5px}
.pay-copy:hover{background:rgba(255,255,255,.12)}.pay-copy.ok{background:rgba(11,150,53,.2);border-color:rgba(11,150,53,.3);color:#0B9635}

/* TIMER */
.su-timer{display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.12);border-radius:12px;padding:12px;margin-bottom:20px}
.su-timer-t{font-size:12px;color:#D4AF37;font-weight:600}
.su-timer-v{font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:#D4AF37;letter-spacing:2px}

/* STEPS */
.pay-steps{margin-bottom:20px}
.pay-st{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.03);transition:all .2s}
.pay-st:hover{padding-left:8px}
.pay-sn{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;color:#0B0D10}
.pay-sc{font-size:13px;color:#666;line-height:1.6;flex:1}

/* SUCCESS */
.su-suc{background:rgba(11,150,53,.04);border:1px solid rgba(11,150,53,.12);border-radius:16px;padding:24px;margin-bottom:20px}
.su-suc-r{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.03)}.su-suc-r:last-child{border-bottom:none}
.su-suc-l{font-size:11px;color:#444;font-weight:600;letter-spacing:1px;text-transform:uppercase}
.su-suc-v{font-size:15px;font-weight:700}

.su-warn{background:rgba(212,175,55,.04);border:1px solid rgba(212,175,55,.12);border-radius:12px;padding:14px 16px;margin-bottom:20px;font-size:12px;color:#888;line-height:1.7}
.su-pgfoot{position:relative;z-index:1;text-align:center;padding:20px;font-size:11px;color:#222;border-top:1px solid #0E1015}

@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fadeUp .4s cubic-bezier(.4,0,.2,1) both}
.fu1{animation-delay:.05s}.fu2{animation-delay:.1s}.fu3{animation-delay:.15s}.fu4{animation-delay:.2s}.fu5{animation-delay:.25s}

@media(max-width:480px){.su-inner{padding:28px 20px!important;border-radius:20px!important}.su-cnt{padding:16px 12px!important}.su-h{font-size:24px!important}.su-row{flex-direction:column!important}.su-row>*{flex:unset!important}.pay-val{font-size:15px!important}.pv-dot{width:40px!important;height:40px!important;font-size:20px!important;border-radius:10px!important}}
      `}</style>

      <div className="su-bg">
        <div className="su-bg-orb" /><div className="su-bg-orb" /><div className="su-bg-orb" />
      </div>
      <div className="su-grid" />

      <div className="su-cnt">
        <div className="su-card">
          <div className="su-inner">
            <div className="su-logo"><a href="/"><img src="/pego-logo.png" alt="BetGenius AI" style={{height:LOGO_H,width:"auto",objectFit:"contain"}} /></a></div>
            <div className="su-prog">{[1,2,3,4].map(i=><div key={i} className={`su-bar ${step>=i?"on":""}`} />)}</div>
            <div className="su-step"><span>STEP {step} OF 4</span></div>

            {/* ═══ STEP 1 — DETAILS ═══ */}
            {step===1&&(<div className="fu">
              <h1 className="su-h">Create Your Account</h1>
              <p className="su-sub">Sign up to access winning predictions</p>
              <div className="su-fee"><span className="su-fee-a">${FEE}</span><span className="su-fee-u">USD • Registration Fee</span></div>
              <form onSubmit={goStep2}>
                <div className="su-field fu fu1"><label className="su-lbl">Full Name</label><input className="su-inp" placeholder="e.g. John Doe" value={form.name} onChange={e=>upd("name",e.target.value)} /></div>
                <div className="su-field fu fu2"><label className="su-lbl">Email Address</label><input className="su-inp" type="email" placeholder="e.g. john@email.com" value={form.email} onChange={e=>upd("email",e.target.value)} /></div>
                <div className="su-field fu fu3"><label className="su-lbl">Phone Number</label><input className="su-inp" type="tel" placeholder="e.g. +1234567890" value={form.phone} onChange={e=>upd("phone",e.target.value)} /></div>
                <div className="su-field fu fu4"><label className="su-lbl">Password</label><div className="su-pw"><input className="su-inp" type={showPw?"text":"password"} placeholder="Min 6 characters" value={form.password} onChange={e=>upd("password",e.target.value)} /><button type="button" className="su-pw-btn" onClick={()=>setShowPw(!showPw)}>{showPw?"Hide":"Show"}</button></div></div>
                <div className="su-field fu fu4"><label className="su-lbl">Confirm Password</label><input className="su-inp" type="password" placeholder="Re-enter password" value={form.confirm} onChange={e=>upd("confirm",e.target.value)} /></div>
                <div className="su-field fu fu5"><label className="su-lbl">Referral Code (Optional)</label><input className="su-inp" placeholder="e.g. BG-XXXX" value={form.referral} onChange={e=>upd("referral",e.target.value)} /></div>
                {err&&<div className="su-err">⚠ {err}</div>}
                <button type="submit" className="su-btn su-btn-r fu fu5">Continue to Payment</button>
              </form>
              <div className="su-foot">Already have an account? <a href="/login" className="su-link">Log In</a></div>
            </div>)}

            {/* ═══ STEP 2 — SELECT PROVIDER ═══ */}
            {step===2&&(<div className="fu">
              <h1 className="su-h">Select Payment Method</h1>
              <p className="su-sub">Choose how you'd like to pay</p>
              <div className="su-fee"><span className="su-fee-a">${FEE}</span><span className="su-fee-u">USD</span></div>

              <div className="pv-grid">
                {PROVS.map((p,i)=>(
                  <div key={p.id} className={`pv-card fu fu${i+1} ${provider===p.id?"on":""}`} onClick={()=>setProvider(p.id)} style={{borderColor:provider===p.id?p.color:"transparent",background:provider===p.id?p.color+"0F":"rgba(11,13,16,.5)"}}>
                    <div className="pv-dot" style={{background:p.bg}}>{p.icon}</div>
                    <div className="pv-info">
                      <div className="pv-name" style={{color:provider===p.id?p.color:"#F0F0F2"}}>{p.name}</div>
                      <div className="pv-num">{p.type==="momo"?p.num:`${p.network} • ${p.feeNote}`}</div>
                    </div>
                    <div className="pv-check" style={{borderColor:provider===p.id?p.color:"#333",background:provider===p.id?p.color:"transparent",color:provider===p.id?"#0B0D10":"transparent"}}>✓</div>
                  </div>
                ))}
              </div>

              {err&&<div className="su-err">⚠ {err}</div>}
              <div className="su-row">
                <button className="su-btn su-btn-o" onClick={()=>{setErr("");setStep(1)}}>Back</button>
                <button className="su-btn su-btn-g" disabled={!pv} onClick={()=>{setErr("");setStep(3)}}>Continue →</button>
              </div>
              {!pv&&<div style={{textAlign:"center",marginTop:10,fontSize:12,color:"#333"}}>Select a provider to continue</div>}
            </div>)}

            {/* ═══ STEP 3 — PAY & SUBMIT ═══ */}
            {step===3&&pv&&(<div className="fu">
              <h1 className="su-h">Complete Payment</h1>
              <p className="su-sub">Send <strong style={{color:"#0B9635"}}>${FEE} USD</strong> via <strong style={{color:pv.color}}>{pv.short||pv.name}</strong></p>

              <div className="su-timer" style={timer<=0?{borderColor:"rgba(227,23,37,.2)",background:"rgba(227,23,37,.06)"}:{}}>
                <span className="su-timer-t" style={timer<=0?{color:"#E31725"}:timer<300?{color:"#E31725"}:{}}>{timer<=0?"⚠ Time expired":"⏱ Time remaining"}</span>
                <span className="su-timer-v" style={timer<=0?{color:"#E31725"}:timer<300?{color:"#E31725"}:{}}>{mins}:{secs.toString().padStart(2,"0")}</span>
              </div>

              {/* Payment details box */}
              <div className="pay-box" style={{background:`linear-gradient(135deg,${(pv.dark||pv.color)}15,${pv.color}08)`,border:`1px solid ${pv.color}25`}}>
                <div className="pay-hdr" style={{color:pv.color}}>↓ SEND TO ↓</div>

                {pv.type==="momo"?(
                  <>
                    <div className="pay-row">
                      <div><div className="pay-lbl">Number</div></div>
                      <div className="pay-val" style={{color:pv.color}}>
                        <span>{pv.num}</span>
                        <button className={`pay-copy ${copied==="num"?"ok":""}`} onClick={()=>copy(pv.num,"num")} style={{flexShrink:0}}>{copied==="num"?"✓ Copied":"Copy"}</button>
                      </div>
                    </div>
                    <div className="pay-row">
                      <div><div className="pay-lbl">Account Name</div></div>
                      <div className="pay-val" style={{color:"#F0F0F2"}}>{pv.acct}</div>
                    </div>
                  </>
                ):(
                  <>
                    <div className="pay-row" style={{flexDirection:"column",alignItems:"flex-start",gap:8}}>
                      <div><div className="pay-lbl">{pv.name} Wallet Address</div></div>
                      <div style={{width:"100%",background:"#0B0D1080",borderRadius:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:8}}>
                        <span style={{flex:1,fontFamily:"'Space Mono',monospace",fontSize:12,color:pv.color,wordBreak:"break-all",lineHeight:1.5}}>{pv.address}</span>
                        <button className={`pay-copy ${copied==="addr"?"ok":""}`} onClick={()=>copy(pv.address,"addr")} style={{flexShrink:0}}>{copied==="addr"?"✓ Copied":"Copy"}</button>
                      </div>
                    </div>
                    <div className="pay-row">
                      <div><div className="pay-lbl">Network</div></div>
                      <div className="pay-val" style={{color:pv.color}}>{pv.network}</div>
                    </div>
                  </>
                )}
                <div className="pay-row">
                  <div><div className="pay-lbl">Amount (USD)</div></div>
                  <div className="pay-val" style={{color:"#0B9635"}}>
                    <span>${FEE}</span>
                    <button className={`pay-copy ${copied==="amt"?"ok":""}`} onClick={()=>copy(String(FEE),"amt")}>{copied==="amt"?"✓ Copied":"Copy"}</button>
                  </div>
                </div>
                {pv.type==="crypto"&&<div style={{marginTop:12,padding:"10px 14px",background:"#D4AF3708",border:"1px solid #D4AF3718",borderRadius:8,fontSize:11,color:"#D4AF37",lineHeight:1.6}}>⚠ Send ONLY via <strong>{pv.network}</strong>. Sending on wrong network = lost funds.</div>}
              </div>

              {/* Steps */}
              <div className="pay-steps">
                {pv.steps.map((st,i)=>(
                  <div key={i} className={`pay-st fu fu${Math.min(i+1,5)}`}>
                    <div className="pay-sn" style={{background:pv.bg}}>{i+1}</div>
                    <div className="pay-sc">{st}</div>
                  </div>
                ))}
              </div>

              <div className="su-warn">🔒 <strong style={{color:"#D4AF37"}}>Important:</strong> After sending, upload a screenshot of your payment and enter your {pv.type==="momo"?"transaction reference":"Transaction Hash (TxID)"} below. Verification usually takes 5–30 minutes.</div>

              {/* Reference form */}
              <form onSubmit={submit}>
                <div className="su-field"><label className="su-lbl">{pv.type==="momo"?"Transaction Reference":"Transaction Hash (TxID)"}</label><input className="su-inp" placeholder={pv.type==="momo"?"e.g. TXN-123456":"e.g. 0x7a8b9c..."} value={refNum} onChange={e=>setRefNum(e.target.value)} style={{borderColor:pv.color+"30",fontFamily:"'Space Mono',monospace"}} /></div>
                <div className="su-field"><label className="su-lbl">{pv.type==="momo"?"Sender Name":"Wallet / Exchange Name"}</label><input className="su-inp" placeholder={pv.type==="momo"?"Name on MoMo account":"e.g. Binance, Trust Wallet"} value={senderName} onChange={e=>setSenderName(e.target.value)} /></div>

                {/* Payment Proof Upload */}
                <div className="su-field">
                  <label className="su-lbl">Payment Screenshot (Required)</label>
                  {!proofPreview ? (
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:"24px 16px",background:"rgba(11,13,16,.6)",border:"2px dashed #1E2028",borderRadius:12,cursor:"pointer",transition:"all .2s"}}>
                      <span style={{fontSize:28}}>📸</span>
                      <span style={{fontSize:13,color:"#555",fontWeight:600}}>Tap to upload payment screenshot</span>
                      <span style={{fontSize:11,color:"#333"}}>JPG, PNG — Max 5MB</span>
                      <input type="file" accept="image/*" onChange={handleProofUpload} style={{display:"none"}} />
                    </label>
                  ) : (
                    <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid #1E2028"}}>
                      <img src={proofPreview} alt="Payment proof" style={{width:"100%",maxHeight:200,objectFit:"cover"}} />
                      {uploading && <div style={{position:"absolute",inset:0,background:"rgba(11,13,16,.8)",display:"flex",alignItems:"center",justifyContent:"center",color:"#0B9635",fontWeight:700,fontSize:14}}>Uploading...</div>}
                      {proofUrl && <div style={{position:"absolute",top:8,right:8,background:"#0B9635",color:"#fff",padding:"4px 10px",borderRadius:8,fontSize:11,fontWeight:700}}>✓ Uploaded</div>}
                      <button type="button" onClick={()=>{setProofPreview("");setProofUrl("")}} style={{position:"absolute",top:8,left:8,background:"rgba(227,23,37,.8)",color:"#fff",border:"none",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Remove</button>
                    </div>
                  )}
                </div>
                {err&&<div className="su-err">⚠ {err}</div>}
                <div className="su-row">
                  <button type="button" className="su-btn su-btn-o" onClick={()=>{setErr("");setStep(2)}}>Back</button>
                  <button type="submit" className="su-btn su-btn-g" disabled={loading||timer<=0} style={timer<=0?{opacity:.4,cursor:"not-allowed"}:{}}>{loading?"Submitting...":timer<=0?"Session Expired — Go Back":"Submit Registration"}</button>
                </div>
              </form>
            </div>)}

            {/* ═══ STEP 4 — SUCCESS ═══ */}
            {step===4&&(<div className="fu" style={{textAlign:"center"}}>
              <div style={{fontSize:64,marginBottom:16,animation:"fadeUp .5s"}}>⏳</div>
              <h1 className="su-h">Registration Submitted</h1>
              <p className="su-sub">Your payment of <strong style={{color:"#0B9635"}}>${FEE}</strong> is being verified</p>

              <div className="su-suc">
                {[
                  {l:"Full Name",v:created?.name||form.name},
                  {l:"Betting ID",v:created?.bettingId||`BG-${form.phone}`,c:"#0B9635",mono:true},
                  {l:"Payment",v:`$${FEE} via ${pv?.name||"Crypto"}`,c:"#0B9635"},
                  {l:"Reference",v:refNum,mono:true},
                  {l:"Status",v:"Pending Verification",c:"#D4AF37"},
                ].map(r=>(
                  <div key={r.l} className="su-suc-r">
                    <span className="su-suc-l">{r.l}</span>
                    <span className="su-suc-v" style={{color:r.c||"#F0F0F2",fontFamily:r.mono?"'Space Mono',monospace":"inherit"}}>{r.v}</span>
                  </div>
                ))}
              </div>

              <p style={{color:"#444",fontSize:13,marginBottom:24,lineHeight:1.7}}>Your payment is being verified. This usually takes <strong style={{color:"#888"}}>5–30 minutes</strong>. You'll be able to login once approved.</p>
              <a href="/login"><button className="su-btn su-btn-r">Go to Login →</button></a>
            </div>)}
          </div>
        </div>
      </div>

      <div className="su-pgfoot"><img src="/pego-logo.png" alt="BetGenius AI" style={{height:28,width:"auto",objectFit:"contain",opacity:.3,marginBottom:6,display:"block",margin:"0 auto 6px"}} /><div>© 2026 BetGenius AI. 18+ Only. Gamble Responsibly.</div></div>
    </div>
  );
}
