"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sparkline from "@/components/Sparkline";

const fUSD = v => "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TYPE_META = {
  deposit:  { icon: "💵", label: "Deposit",  color: "#0B9635", sign: "+" },
  withdraw: { icon: "🏦", label: "Withdraw", color: "#94A7BD", sign: "−" },
  stake:    { icon: "🎯", label: "Stake",    color: "#D4AF37", sign: "−" },
  win:      { icon: "🏆", label: "Win",      color: "#0B9635", sign: "+" },
  loss:     { icon: "📉", label: "Loss",     color: "#E31725", sign: "−" },
  adjust:   { icon: "⚙️", label: "Adjust",   color: "#888",    sign: ""  },
};

function kellyStake({ bankroll, decimalOdds, winProbability }) {
  // f* = (bp - q) / b   where b = decimalOdds - 1, p = winProbability, q = 1 - p
  // Use half-Kelly by default — safer in practice
  const b = decimalOdds - 1;
  const p = winProbability / 100;
  const q = 1 - p;
  const f = (b * p - q) / b;
  if (!Number.isFinite(f) || f <= 0) return { fullKelly: 0, halfKelly: 0, edge: f * 100 };
  const fullStake = bankroll * f;
  return { fullKelly: fullStake, halfKelly: fullStake / 2, edge: f * 100 };
}

export default function BankrollPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showInit, setShowInit] = useState(false);
  const [form, setForm] = useState({ type: "stake", amount: "", odds: "", note: "" });
  const [initAmount, setInitAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Kelly state
  const [kellyOdds, setKellyOdds] = useState("");
  const [kellyProb, setKellyProb] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const load = async () => {
    try {
      const r = await fetch("/api/bankroll");
      const d = await r.json();
      setData(d);
      if (!d.bankroll?.startingBalance && d.transactions?.length === 0) setShowInit(true);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { if (session) load(); }, [session]);

  const submit = async () => {
    setErr("");
    if (!form.amount || isNaN(parseFloat(form.amount))) { setErr("Enter an amount"); return; }
    setBusy(true);
    const r = await fetch("/api/bankroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        amount: parseFloat(form.amount),
        odds: form.odds ? parseFloat(form.odds) : null,
        note: form.note,
      }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Failed"); return; }
    setForm({ type: "stake", amount: "", odds: "", note: "" });
    setShowAdd(false);
    load();
  };

  const setStarting = async () => {
    setErr("");
    const v = parseFloat(initAmount);
    if (!Number.isFinite(v) || v < 0) { setErr("Enter a starting balance"); return; }
    setBusy(true);
    const r = await fetch("/api/bankroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_starting", amount: v }),
    });
    setBusy(false);
    if (!r.ok) { setErr("Failed"); return; }
    setShowInit(false);
    setInitAmount("");
    load();
  };

  const removeTx = async (txId) => {
    if (!confirm("Remove this transaction? The balance will be rolled back.")) return;
    await fetch(`/api/bankroll?txId=${txId}`, { method: "DELETE" });
    load();
  };

  if (status === "loading" || !session || loading) {
    return <div style={{ minHeight: "100vh", background: "#0B0D10", color: "#F0F0F2", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>Loading bankroll…</div>;
  }

  const b = data?.bankroll || { balance: 0, startingBalance: 0, totalStaked: 0, totalWon: 0, profit: 0, roi: 0 };
  const series = data?.series || [];
  const positive = b.profit >= 0;

  const kelly = kellyOdds && kellyProb
    ? kellyStake({ bankroll: b.balance || 0, decimalOdds: parseFloat(kellyOdds), winProbability: parseFloat(kellyProb) })
    : null;

  return (
    <div className="br-root">
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10}
.br-root{min-height:100dvh;background:#0B0D10;color:#F0F0F2;font-family:'DM Sans',sans-serif;padding-bottom:40px}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.au{animation:fadeUp 0.4s both}.d1{animation-delay:0.05s}.d2{animation-delay:0.1s}.d3{animation-delay:0.15s}.d4{animation-delay:0.2s}

.hdr{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #151820;background:#0B0D10F0;backdrop-filter:blur(20px);position:sticky;top:0;z-index:5}
.hdr-t{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px}
.back{background:#12141A;border:1px solid #1E2028;color:#888;font-size:12px;font-weight:600;padding:7px 14px;border-radius:8px;cursor:pointer;text-decoration:none}
.back:hover{border-color:#2A2D34;color:#F0F0F2}

.wrap{max-width:780px;margin:0 auto;padding:24px 20px 0}
.h1{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:2px;margin-bottom:4px;line-height:1.1}
.sub{color:#555;font-size:14px;margin-bottom:24px;line-height:1.5}

.balance-card{background:linear-gradient(135deg,#12141A,#0B963510);border:1px solid #0B963525;border-radius:18px;padding:24px;margin-bottom:14px}
.balance-row{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.balance-l{flex:1;min-width:200px}
.balance-lbl{font-size:10px;font-weight:700;letter-spacing:2px;color:#666;text-transform:uppercase;margin-bottom:4px}
.balance-v{font-family:'Bebas Neue',sans-serif;font-size:44px;line-height:1;letter-spacing:1px}
.balance-sub{font-size:12px;color:#666;margin-top:4px}
.balance-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px}

.stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}
.stat{background:#12141A;border:1px solid #1E2028;border-radius:12px;padding:14px}
.stat-lbl{font-size:9px;font-weight:700;letter-spacing:1.5px;color:#555;text-transform:uppercase;margin-bottom:4px}
.stat-v{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px}

.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.act{background:#0B9635;color:#fff;border:none;padding:13px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;letter-spacing:0.5px}
.act:hover{background:#076B25}
.act.alt{background:#12141A;border:1px solid #1E2028;color:#F0F0F2}
.act.alt:hover{border-color:#2A2D34}

.kelly-card{background:linear-gradient(135deg,#12141A,#D4AF3708);border:1px solid #D4AF3725;border-radius:14px;padding:18px;margin-bottom:14px}
.kelly-h{font-size:13px;font-weight:700;color:#D4AF37;margin-bottom:4px;letter-spacing:0.5px}
.kelly-sub{font-size:11px;color:#666;margin-bottom:14px;line-height:1.4}
.kelly-inputs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.kelly-result{background:#0B0D1080;border:1px solid #1E2028;border-radius:10px;padding:12px 14px}
.kelly-r-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}
.kelly-r-row span:first-child{color:#666}
.kelly-r-row .v{font-weight:700;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px}

.input{width:100%;padding:11px 13px;background:#0B0D10;border:1px solid #1E2028;border-radius:9px;color:#F0F0F2;font-size:13px;font-family:'DM Sans',sans-serif;outline:none}
.input:focus{border-color:#0B9635;box-shadow:0 0 0 3px #0B963512}
.input::placeholder{color:#444}
.lbl{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#666;text-transform:uppercase;margin-bottom:4px;display:block}

.sect-lbl{font-size:10px;font-weight:700;letter-spacing:2px;color:#444;margin:18px 0 10px;text-transform:uppercase}
.tx{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#12141A;border:1px solid #1E2028;border-radius:10px;margin-bottom:6px;transition:all 0.15s}
.tx:hover{border-color:#2A2D34}
.tx-ic{font-size:22px;flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:#0B0D10;border-radius:10px}
.tx-mid{flex:1;min-width:0}
.tx-label{font-size:12px;font-weight:600}
.tx-meta{font-size:10px;color:#555;margin-top:2px}
.tx-r{text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.tx-amt{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:0.5px}
.tx-del{background:none;border:none;color:#444;cursor:pointer;font-size:14px;padding:4px 8px}
.tx-del:hover{color:#E31725}

.modal{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;z-index:200;padding:0;animation:fadeUp 0.2s}
.modal-inner{background:#12141A;border:1px solid #1E2028;border-radius:22px 22px 0 0;padding:24px 22px 32px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;animation:fadeUp 0.3s}
.modal-h{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;text-align:center;margin-bottom:4px}
.modal-s{font-size:12px;color:#666;text-align:center;margin-bottom:18px}
.type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px}
.type-btn{background:#0B0D10;border:1px solid #1E2028;border-radius:10px;padding:10px 6px;text-align:center;cursor:pointer;font-family:'DM Sans',sans-serif;color:#888;font-size:11px;font-weight:600;transition:all 0.15s}
.type-btn.on{border-width:2px}
.type-ic{font-size:18px;display:block;margin-bottom:3px}
.err{background:#E3172508;border:1px solid #E3172530;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#E31725}
.submit{width:100%;padding:13px;background:#0B9635;color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:6px}
.submit:disabled{opacity:0.4;cursor:not-allowed}
.cancel{width:100%;padding:11px;background:transparent;border:1px solid #1E2028;color:#888;border-radius:11px;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:8px}

@media(min-width:520px){.modal{align-items:center;padding:20px}.modal-inner{border-radius:22px}}
@media(max-width:520px){.wrap{padding:16px 14px 0}.balance-v{font-size:36px}.stat-row{grid-template-columns:1fr 1fr 1fr;gap:6px}.stat{padding:10px 8px}.stat-v{font-size:18px}.kelly-inputs{grid-template-columns:1fr}}
      `}</style>

      <header className="hdr">
        <div className="hdr-t">💰 BANKROLL</div>
        <a href="/dashboard" className="back">← Dashboard</a>
      </header>

      <div className="wrap">
        <div className="au">
          <h1 className="h1">Your Bankroll</h1>
          <p className="sub">Track your stakes, returns, ROI and use Kelly criterion for optimal stake sizing.</p>
        </div>

        {showInit ? (
          <div className="balance-card au d1" style={{textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:10}}>💰</div>
            <div className="balance-lbl">SET STARTING BANKROLL</div>
            <div style={{fontSize:13,color:"#666",marginBottom:16,lineHeight:1.5,maxWidth:340,margin:"0 auto 16px"}}>Enter your starting balance to begin tracking. You can change this anytime.</div>
            <input className="input" type="number" placeholder="e.g. 500" value={initAmount} onChange={e=>setInitAmount(e.target.value)} style={{maxWidth:260,marginBottom:10,textAlign:"center",fontSize:18,fontWeight:700}} />
            {err && <div className="err" style={{maxWidth:260,margin:"0 auto 10px"}}>{err}</div>}
            <button className="submit" onClick={setStarting} disabled={busy} style={{maxWidth:260,margin:"0 auto"}}>{busy?"Saving…":"Start Tracking"}</button>
          </div>
        ) : (
          <div className="balance-card au d1">
            <div className="balance-row">
              <div className="balance-l">
                <div className="balance-lbl">CURRENT BALANCE</div>
                <div className="balance-v" style={{color:b.balance>=b.startingBalance?"#0B9635":"#E31725"}}>{fUSD(b.balance)}</div>
                <div className="balance-sub">Started at {fUSD(b.startingBalance)} · {b.currency}</div>
              </div>
              <div className="balance-r">
                <Sparkline data={series} width={180} height={56} color={positive ? "#0B9635" : "#E31725"} />
                <div style={{fontSize:11,color:"#444"}}>30-day P&L</div>
              </div>
            </div>
          </div>
        )}

        {!showInit && (
          <>
            <div className="stat-row au d2">
              <div className="stat">
                <div className="stat-lbl">TOTAL STAKED</div>
                <div className="stat-v">{fUSD(b.totalStaked)}</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">TOTAL WON</div>
                <div className="stat-v" style={{color:"#D4AF37"}}>{fUSD(b.totalWon)}</div>
              </div>
              <div className="stat">
                <div className="stat-lbl">ROI</div>
                <div className="stat-v" style={{color:b.roi>=0?"#0B9635":"#E31725"}}>{b.roi>=0?"+":""}{b.roi}%</div>
              </div>
            </div>

            <div className="actions au d2">
              <button className="act" onClick={()=>{setForm({type:"stake",amount:"",odds:"",note:""});setShowAdd(true)}}>+ Log Bet</button>
              <button className="act alt" onClick={()=>{setShowInit(true)}}>Reset Bankroll</button>
            </div>

            {/* Kelly calculator */}
            <div className="kelly-card au d3">
              <div className="kelly-h">📐 Kelly Stake Calculator</div>
              <div className="kelly-sub">Optimal bet sizing based on your edge. Full Kelly is aggressive — half-Kelly is the safer real-world default.</div>
              <div className="kelly-inputs">
                <div><label className="lbl">Decimal odds</label><input className="input" type="number" step="0.01" placeholder="e.g. 2.10" value={kellyOdds} onChange={e=>setKellyOdds(e.target.value)} /></div>
                <div><label className="lbl">Your win probability (%)</label><input className="input" type="number" min="1" max="99" placeholder="e.g. 55" value={kellyProb} onChange={e=>setKellyProb(e.target.value)} /></div>
              </div>
              {kelly && (
                <div className="kelly-result">
                  <div className="kelly-r-row">
                    <span>Edge</span>
                    <span className="v" style={{color:kelly.edge>0?"#0B9635":"#E31725"}}>{kelly.edge>0?"+":""}{kelly.edge.toFixed(1)}%</span>
                  </div>
                  <div className="kelly-r-row">
                    <span>Full Kelly stake</span>
                    <span className="v" style={{color:"#D4AF37"}}>{kelly.edge>0?fUSD(kelly.fullKelly):"—"}</span>
                  </div>
                  <div className="kelly-r-row">
                    <span>½ Kelly (recommended)</span>
                    <span className="v" style={{color:"#0B9635"}}>{kelly.edge>0?fUSD(kelly.halfKelly):"—"}</span>
                  </div>
                  {kelly.edge <= 0 && (
                    <div style={{fontSize:11,color:"#E31725",marginTop:8,padding:8,background:"#E3172508",border:"1px solid #E3172520",borderRadius:6}}>⚠️ Negative edge — odds don't justify a bet at this win probability.</div>
                  )}
                </div>
              )}
            </div>

            {/* Transactions */}
            <div className="sect-lbl">📋 RECENT ACTIVITY</div>
            {data?.transactions?.length === 0 ? (
              <div style={{textAlign:"center",padding:32,color:"#444",fontSize:13,background:"#12141A",border:"1px dashed #1E2028",borderRadius:12}}>
                No bets logged yet. Tap "Log Bet" to start tracking.
              </div>
            ) : data.transactions.map(t => {
              const meta = TYPE_META[t.type] || TYPE_META.adjust;
              return (
                <div key={t._id} className="tx au">
                  <div className="tx-ic" style={{color:meta.color}}>{meta.icon}</div>
                  <div className="tx-mid">
                    <div className="tx-label">{meta.label}{t.odds?` · ${t.odds}x odds`:""}</div>
                    <div className="tx-meta">{t.note ? `${t.note} · ` : ""}{new Date(t.createdAt).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                  <div className="tx-r">
                    <div className="tx-amt" style={{color:meta.color}}>{meta.sign}{fUSD(Math.abs(t.amount))}</div>
                  </div>
                  <button className="tx-del" onClick={()=>removeTx(t._id)} title="Remove">×</button>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ADD TRANSACTION MODAL */}
      {showAdd && (
        <div className="modal" onClick={()=>setShowAdd(false)}>
          <div className="modal-inner" onClick={e=>e.stopPropagation()}>
            <div className="modal-h">LOG A TRANSACTION</div>
            <div className="modal-s">Pick a type, enter amount, optionally add odds & a note</div>

            <div className="type-grid">
              {Object.entries(TYPE_META).map(([k, m]) => (
                <div
                  key={k}
                  className={`type-btn ${form.type === k ? "on" : ""}`}
                  onClick={() => setForm(f => ({ ...f, type: k }))}
                  style={form.type === k ? { borderColor: m.color, background: m.color + "10", color: m.color } : {}}
                >
                  <span className="type-ic">{m.icon}</span>
                  {m.label}
                </div>
              ))}
            </div>

            <div style={{marginBottom:12}}>
              <label className="lbl">Amount ({b.currency})</label>
              <input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
            </div>

            {(form.type === "stake" || form.type === "win") && (
              <div style={{marginBottom:12}}>
                <label className="lbl">Odds (optional)</label>
                <input className="input" type="number" step="0.01" placeholder="e.g. 1.85" value={form.odds} onChange={e=>setForm(f=>({...f,odds:e.target.value}))} />
              </div>
            )}

            <div style={{marginBottom:14}}>
              <label className="lbl">Note (optional)</label>
              <input className="input" placeholder="e.g. Real Madrid vs Barca - over 2.5" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} maxLength={200} />
            </div>

            {err && <div className="err">{err}</div>}

            <button className="submit" onClick={submit} disabled={busy || !form.amount}>{busy ? "Saving…" : "Save Transaction"}</button>
            <button className="cancel" onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
