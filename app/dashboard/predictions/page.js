"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function StatusBadge({ status }) {
  const map = {
    responded: {
      label: "READY",
      bg: "rgba(11,150,53,0.15)",
      color: "#0B9635",
      border: "1px solid rgba(11,150,53,0.3)",
      pulse: false,
    },
    pending: {
      label: "ANALYZING",
      bg: "rgba(212,175,55,0.15)",
      color: "#D4AF37",
      border: "1px solid rgba(212,175,55,0.3)",
      pulse: true,
    },
    rejected: {
      label: "REJECTED",
      bg: "rgba(220,38,38,0.15)",
      color: "#DC2626",
      border: "1px solid rgba(220,38,38,0.3)",
      pulse: false,
    },
  };
  const s = map[status] || map.pending;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        background: s.bg,
        color: s.color,
        border: s.border,
        animation: s.pulse ? "pulse-badge 1.8s ease-in-out infinite" : "none",
      }}
    >
      {s.label}
    </span>
  );
}

export default function PredictionsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    fetch("/api/predictions?limit=50")
      .then((r) => r.json())
      .then((d) => setPredictions(d.predictions || []))
      .catch((err) => { console.error(err); setFetchError("Failed to load predictions. Pull down to retry."); })
      .finally(() => setLoading(false));
  }, [authStatus]);

  if (authStatus === "loading" || (authStatus === "authenticated" && loading)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0B0D10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-badge { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        `}</style>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid #1E2028",
            borderTopColor: "#0B9635",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (authStatus === "unauthenticated") return null;

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0D10",
        color: "#F0F0F2",
        fontFamily: "'DM Sans', sans-serif",
        padding: "24px 16px",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-badge { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            href="/dashboard"
            style={{
              color: "#5B5C5F",
              textDecoration: "none",
              fontSize: 22,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#F0F0F2")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#5B5C5F")}
          >
            &#8592;
          </Link>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28,
              fontWeight: 400,
              letterSpacing: "0.04em",
              color: "#F0F0F2",
            }}
          >
            My Predictions{" "}
            <span style={{ color: "#5B5C5F", fontSize: 20 }}>
              ({predictions.length})
            </span>
          </h1>
        </div>

        <Link
          href="/dashboard/predict"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "#0B9635",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0a8430")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0B9635")}
        >
          + New Prediction
        </Link>
      </div>

      {/* Error state */}
      {fetchError && (
        <div style={{background:"#E3172510",border:"1px solid #E3172530",borderRadius:14,padding:"20px 24px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:14,color:"#E31725",fontWeight:600}}>{fetchError}</div>
          <button onClick={() => { setFetchError(null); setLoading(true); fetch("/api/predictions?limit=50").then(r=>r.json()).then(d=>setPredictions(d.predictions||[])).catch(()=>setFetchError("Still failing. Try again later.")).finally(()=>setLoading(false)); }} style={{marginTop:10,padding:"8px 20px",borderRadius:8,border:"1px solid #E3172540",background:"transparent",color:"#E31725",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans'"}}>Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!fetchError && predictions.length === 0 && (
        <div
          style={{
            background: "#12141A",
            border: "1px solid #1E2028",
            borderRadius: 14,
            padding: "60px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#129302;</div>
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 24,
              fontWeight: 400,
              margin: "0 0 10px",
              color: "#F0F0F2",
            }}
          >
            No Predictions Yet
          </h2>
          <p
            style={{
              color: "#5B5C5F",
              fontSize: 14,
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            Subscribe to a package to get started
          </p>
          <Link
            href="/dashboard/predict"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#0B9635",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            Get Prediction
          </Link>
        </div>
      )}

      {/* Prediction cards */}
      {predictions.map((p) => {
        const isExpanded = expandedId === p._id;
        const gameName = p.gameId || "Football";
        const matches = p.matches || [];

        return (
          <div
            key={p._id}
            onClick={() => toggleExpand(p._id)}
            style={{
              background: "#12141A",
              border: "1px solid #1E2028",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 14,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#2A2C34")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "#1E2028")
            }
          >
            {/* Card header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#D4AF37",
                  }}
                >
                  {gameName}
                </span>
                <StatusBadge status={p.status} />
              </div>
              <span style={{ fontSize: 12, color: "#5B5C5F" }}>
                {p.createdAt ? relativeTime(p.createdAt) : ""}
              </span>
            </div>

            {/* Match teams */}
            {matches.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {matches.slice(0, isExpanded ? matches.length : 3).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 14,
                      color: "#F0F0F2",
                      padding: "4px 0",
                      borderBottom:
                        i < (isExpanded ? matches.length : Math.min(matches.length, 3)) - 1
                          ? "1px solid #1E2028"
                          : "none",
                    }}
                  >
                    {m.homeTeam || "TBD"}{" "}
                    <span style={{ color: "#5B5C5F", fontSize: 12 }}>vs</span>{" "}
                    {m.awayTeam || "TBD"}
                  </div>
                ))}
                {!isExpanded && matches.length > 3 && (
                  <div style={{ fontSize: 12, color: "#5B5C5F", paddingTop: 4 }}>
                    +{matches.length - 3} more match{matches.length - 3 > 1 ? "es" : ""}
                  </div>
                )}
              </div>
            )}

            {/* Footer: odds, confidence, risk */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {p.totalOdd != null && (
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#D4AF37",
                  }}
                >
                  Total Odds:{" "}
                  <span style={{ color: "#F0F0F2" }}>
                    {Number(p.totalOdd).toFixed(2)}
                  </span>
                </span>
              )}

              {p.aiConfidence != null && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#0B9635",
                    fontWeight: 600,
                  }}
                >
                  AI: {Math.round(p.aiConfidence)}%
                </span>
              )}

              {p.riskLevel && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    background:
                      p.riskLevel === "high"
                        ? "rgba(220,38,38,0.15)"
                        : p.riskLevel === "medium"
                        ? "rgba(212,175,55,0.15)"
                        : "rgba(11,150,53,0.15)",
                    color:
                      p.riskLevel === "high"
                        ? "#DC2626"
                        : p.riskLevel === "medium"
                        ? "#D4AF37"
                        : "#0B9635",
                    border: `1px solid ${
                      p.riskLevel === "high"
                        ? "rgba(220,38,38,0.3)"
                        : p.riskLevel === "medium"
                        ? "rgba(212,175,55,0.3)"
                        : "rgba(11,150,53,0.3)"
                    }`,
                  }}
                >
                  {p.riskLevel} risk
                </span>
              )}

              {/* Expand indicator */}
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 14,
                  color: "#5B5C5F",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              >
                &#9660;
              </span>
            </div>

            {/* Expanded picks */}
            {isExpanded && matches.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid #1E2028",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#5B5C5F",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Match Picks
                </div>
                {matches.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "#0B0D10",
                      borderRadius: 8,
                      marginBottom: 6,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <span style={{ color: "#F0F0F2", fontWeight: 500 }}>
                        {m.homeTeam || "TBD"} vs {m.awayTeam || "TBD"}
                      </span>
                      {m.market && (
                        <span
                          style={{
                            color: "#5B5C5F",
                            fontSize: 11,
                            marginLeft: 8,
                          }}
                        >
                          {m.market}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {m.pick && (
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#0B9635",
                            fontSize: 13,
                          }}
                        >
                          {m.pick}
                        </span>
                      )}
                      {m.odd != null && (
                        <span
                          style={{
                            color: "#D4AF37",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                        >
                          @{Number(m.odd).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ height: 70 }} />

      {/* BOTTOM NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0B0D10F5", backdropFilter: "blur(20px)", borderTop: "1px solid #151820", display: "flex", justifyContent: "space-around", padding: "6px 0", zIndex: 80 }}>
        {[
          { icon: "\u{1F3E0}", label: "Home", path: "/dashboard" },
          { icon: "\u26BD", label: "Predict", path: "/dashboard/predict?game=football" },
          { icon: "\u{1F4E6}", label: "Package", path: "/dashboard/package" },
          { icon: "\u{1F4CA}", label: "Stats", path: "/dashboard/stats" },
          { icon: "\u{1F464}", label: "Account", path: "/dashboard/account" },
        ].map(n => (
          <button key={n.label} onClick={() => router.push(n.path)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px", borderRadius: 10, cursor: "pointer", border: "none", background: "transparent", fontFamily: "'DM Sans'" }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: .5, color: "#333" }}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
