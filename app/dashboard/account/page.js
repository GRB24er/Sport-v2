"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PACKAGES_META = {
  gold: { name: "Gold", icon: "\u{1F947}", color: "#D4AF37", maxPredictions: 3 },
  platinum: { name: "Platinum", icon: "\u{1F948}", color: "#94A7BD", maxPredictions: 3 },
  diamond: { name: "Diamond", icon: "\u{1F48E}", color: "#7DD3E8", maxPredictions: 3 },
};

const fUSD = v => '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const GAME_NAMES = { football: "Football", "virtual-football": "Football", egames: "Football", "instant-virtual": "Football" };

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setUserData(data.user || data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.user?.id]);

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B0D10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1E2028", borderTopColor: "#0B9635", borderRadius: "50%", animation: "sp .8s linear infinite" }} />
        <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  const gamePackages = userData?.gamePackages || {};
  const pendingPackages = userData?.pendingGamePackages || {};
  const activePackages = Object.entries(gamePackages).filter(([, val]) => {
    if (!val?.expiresAt) return false;
    return new Date(val.expiresAt) > new Date();
  });
  const pendingEntries = Object.entries(pendingPackages).filter(([, val]) => val && val.package);

  const statusColor =
    userData?.status === "approved" ? "#0B9635"
    : userData?.status === "pending" ? "#D4AF37"
    : "#E31725";

  const refCode = userData?.referralCode || null;
  const memberSince = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0D10", color: "#F0F0F2", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#0B0D10}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fu .5s cubic-bezier(.16,1,.3,1) both}@media(max-width:420px){.acct-stats{gap:8px!important}.acct-sb{padding:8px 6px!important}}`}</style>

      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid #151820", background: "#0B0D10F0", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 90 }}>
        <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onClick={() => router.push("/dashboard")}>
          <span style={{ fontSize: 18, color: "#888" }}>{"\u2190"}</span>
          <img src="/pego-logo.png" alt="BG" style={{ height: 40, width: "auto" }} />
        </div>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, marginLeft: "auto" }}>My Account</span>
      </header>

      <main style={{ maxWidth: 540, margin: "0 auto", padding: "28px 20px" }}>

        {/* Profile Card */}
        <div className="fu" style={{ background: "#12141A", border: "1px solid #1E2028", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#0B963520", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#0B9635", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1, flexShrink: 0 }}>
              {userData?.avatar || userData?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1 }}>{userData?.name || "\u2014"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: statusColor, background: statusColor + "15", padding: "2px 8px", borderRadius: 4 }}>
                  {userData?.status?.toUpperCase() || "UNKNOWN"}
                </span>
                {memberSince && <span style={{ fontSize: 10, color: "#444" }}>Since {memberSince}</span>}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#1E2028", margin: "0 0 16px" }} />

          {[
            { label: "EMAIL", value: userData?.email },
            { label: "PHONE", value: userData?.phone },
            { label: "BETTING ID", value: userData?.bettingId, color: "#0B9635", mono: true },
          ].map((field) => (
            <div key={field.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #15182050" }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#444" }}>{field.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: field.color || "#F0F0F2", fontFamily: field.mono ? "'Space Mono',monospace" : "inherit" }}>
                {field.value || "\u2014"}
              </span>
            </div>
          ))}

          {/* Referral Code */}
          {refCode && (
            <div style={{ marginTop: 14, background: "#0B963508", border: "1px solid #0B963518", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: "#444", marginBottom: 2 }}>REFERRAL CODE</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 3, color: "#0B9635" }}>{refCode}</div>
              </div>
              <button onClick={() => copyToClipboard(refCode)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#0B963515", color: "#0B9635", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans'" }}>
                {copied ? "\u2713 Copied" : "\u{1F4CB} Copy"}
              </button>
            </div>
          )}
        </div>

        {/* Referral Stats */}
        {refCode && (
          <div className="fu" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Referrals", value: userData?.referralCount || 0, color: "#F0F0F2" },
              { label: "Earned", value: fUSD(userData?.referralTotalEarned || 0), color: "#D4AF37" },
              { label: "Balance", value: fUSD(userData?.referralBalance || 0), color: "#0B9635" },
            ].map(s => (
              <div key={s.label} className="acct-sb" style={{ flex: 1, background: "#12141A", border: "1px solid #1E2028", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: "#444", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Active Game Packages */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#333", margin: "20px 0 10px", textTransform: "uppercase" }}>{"\u26BD"} ACTIVE PACKAGES</div>

        {activePackages.length === 0 && pendingEntries.length === 0 ? (
          <div className="fu" style={{ background: "#12141A", border: "1px solid #1E2028", borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u{1F4E6}"}</div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 14, lineHeight: 1.6 }}>No active packages. Subscribe to get expert predictions.</div>
            <button onClick={() => router.push("/dashboard")} style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: "#0B9635", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans'" }}>
              Subscribe Now {"\u2192"}
            </button>
          </div>
        ) : (
          <>
            {activePackages.map(([gameId, pkg]) => {
              const meta = PACKAGES_META[pkg.package] || { name: pkg.package, icon: "\u{1F4E6}", color: "#F0F0F2", maxPredictions: 3 };
              const daysLeft = Math.max(0, Math.ceil((new Date(pkg.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
              const roundsUsed = pkg.predictionsUsed || 0;
              const roundsTotal = meta.maxPredictions;
              const pct = Math.min(100, (roundsUsed / roundsTotal) * 100);

              return (
                <div key={gameId} className="fu" style={{ background: "#12141A", border: `1px solid ${meta.color}20`, borderRadius: 14, padding: 18, marginBottom: 10, cursor: "pointer" }} onClick={() => router.push("/dashboard/predict?game=" + gameId)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <span style={{ fontSize: 32 }}>{meta.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: meta.color }}>{meta.name}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>{GAME_NAMES[gameId] || gameId}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: daysLeft <= 3 ? "#E3172512" : "#0B963512", color: daysLeft <= 3 ? "#E31725" : "#0B9635" }}>
                        {daysLeft}d left
                      </span>
                    </div>
                  </div>

                  <div className="acct-stats" style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div className="acct-sb" style={{ flex: 1, background: "#0B0D10", border: "1px solid #151820", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20 }}>{roundsUsed}/{roundsTotal}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: "#444", textTransform: "uppercase", marginTop: 2 }}>Rounds Used</div>
                    </div>
                    <div className="acct-sb" style={{ flex: 1, background: "#0B0D10", border: "1px solid #151820", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "#0B9635" }}>{roundsTotal - roundsUsed}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: "#444", textTransform: "uppercase", marginTop: 2 }}>Rounds Left</div>
                    </div>
                    <div className="acct-sb" style={{ flex: 1, background: "#0B0D10", border: "1px solid #151820", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: daysLeft <= 3 ? "#E31725" : daysLeft <= 7 ? "#D4AF37" : "#0B9635" }}>{daysLeft}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: "#444", textTransform: "uppercase", marginTop: 2 }}>Days Left</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 4, background: "#0B0D10", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 2, transition: "width .3s ease" }} />
                  </div>
                </div>
              );
            })}

            {/* Pending Packages */}
            {pendingEntries.map(([gameId, req]) => {
              const meta = PACKAGES_META[req.package] || { name: req.package, icon: "\u{1F4E6}", color: "#D4AF37" };
              return (
                <div key={gameId} className="fu" style={{ background: "#D4AF3706", border: "1px solid #D4AF3718", borderRadius: 14, padding: 16, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 28 }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#D4AF37" }}>{meta.name} \u2014 {GAME_NAMES[gameId] || gameId}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Ref: {req.referenceNumber}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 5, background: "#D4AF3715", color: "#D4AF37", letterSpacing: 1, animation: "pu 2s infinite" }}>PENDING</span>
                </div>
              );
            })}
          </>
        )}

        {/* Quick Links */}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#333", margin: "24px 0 10px", textTransform: "uppercase" }}>{"\u26A1"} QUICK LINKS</div>

        <div className="fu" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Predictions", icon: "\u{1F4C8}", path: "/dashboard/predict?game=football" },
            { label: "My Package", icon: "\u{1F4E6}", path: "/dashboard/package" },
            { label: "Referrals", icon: "\u{1F91D}", path: "/dashboard/referrals" },
            { label: "Dashboard", icon: "\u{1F3E0}", path: "/dashboard" },
          ].map(link => (
            <button key={link.label} onClick={() => router.push(link.path)} style={{ background: "#12141A", border: "1px solid #1E2028", borderRadius: 12, padding: "14px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: "'DM Sans'", color: "#888", fontSize: 13, fontWeight: 600, transition: "all .15s" }}>
              <span style={{ fontSize: 18 }}>{link.icon}</span>{link.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={() => signOut({ callbackUrl: "/" })} style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #E3172520", background: "#E3172508", color: "#E31725", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans'", marginTop: 8 }}>
          Logout
        </button>

        <div style={{ height: 40 }} />
      </main>

      {/* BOTTOM NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0B0D10F5", backdropFilter: "blur(20px)", borderTop: "1px solid #151820", display: "flex", justifyContent: "space-around", padding: "6px 0 env(safe-area-inset-bottom,6px)", zIndex: 80 }}>
        {[
          { icon: "\u{1F3E0}", label: "Home", path: "/dashboard" },
          { icon: "\u26BD", label: "Predict", path: "/dashboard/predict?game=football" },
          { icon: "\u{1F4E6}", label: "Package", path: "/dashboard/package" },
          { icon: "\u{1F4CA}", label: "Stats", path: "/dashboard/stats" },
          { icon: "\u{1F464}", label: "Account", path: "/dashboard/account", active: true },
        ].map(n => (
          <button key={n.label} onClick={() => router.push(n.path)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px", borderRadius: 10, cursor: "pointer", border: "none", background: "transparent", fontFamily: "'DM Sans'", WebkitTapHighlightColor: "transparent" }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, color: n.active ? "#0B9635" : "#333" }}>{n.label}</span>
          </button>
        ))}
      </nav>

      <style>{`@keyframes pu{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
