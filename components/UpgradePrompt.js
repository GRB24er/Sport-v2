"use client";
import { useState, useEffect } from "react";

// Smart in-context prompt that nudges the user to a higher tier based on what they have.
// Shown only when relevant: no active package, gold-only on a win streak, etc.

const TIER_INFO = {
  gold: { name: "Gold", icon: "🥇", color: "#D4AF37", oddsRange: "15–25", price: 40, perks: ["3 expert rounds", "EPL, La Liga, Serie A, Bundesliga"] },
  platinum: { name: "Platinum", icon: "🥈", color: "#A0B2C6", oddsRange: "25–50", price: 80, perks: ["3 expert rounds", "Higher-odds value picks", "Priority support"] },
  diamond: { name: "Diamond", icon: "💎", color: "#7DD3E8", oddsRange: "HT/FT & Correct Score", price: 160, perks: ["Premium markets", "Specialist analysis", "VIP support"] },
};

function activeTiers(user) {
  if (!user?.gamePackages) return [];
  const gp = user.gamePackages instanceof Map ? Object.fromEntries(user.gamePackages) : user.gamePackages;
  return Object.values(gp).map(p => p?.package).filter(Boolean);
}

function decide({ user, stats }) {
  const tiers = activeTiers(user);
  // No subscriptions → push Gold
  if (tiers.length === 0) {
    return {
      headline: "Start winning with Gold",
      body: "Get 3 expert rounds at 15–25 odds. Real picks, real results.",
      ctaTier: "gold",
      cta: "See Gold",
    };
  }
  // Strong streak on Gold → push Platinum
  if (tiers.includes("gold") && !tiers.includes("platinum") && stats?.roundStats?.streak >= 2) {
    return {
      headline: "You're on fire — try Platinum",
      body: `${stats.roundStats.streak}-win streak detected. Platinum unlocks 25–50 odds for bigger payouts.`,
      ctaTier: "platinum",
      cta: "Upgrade to Platinum",
    };
  }
  // High win-rate → push Diamond
  if ((tiers.includes("gold") || tiers.includes("platinum")) && !tiers.includes("diamond") && (stats?.roundStats?.winRate || 0) >= 60) {
    return {
      headline: "Premium markets are open to you",
      body: `${stats.roundStats.winRate}% win-rate puts you in the top tier. Diamond unlocks HT/FT and Correct Score picks.`,
      ctaTier: "diamond",
      cta: "Try Diamond",
    };
  }
  // Default: nothing
  return null;
}

export default function UpgradePrompt({ user, stats, href = "/dashboard", onClick }) {
  const [hidden, setHidden] = useState(false);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    const d = decide({ user, stats });
    setDecision(d);
    try {
      if (d && localStorage.getItem(`bg_upgrade_${d.ctaTier}_dismissed`) === "1") setHidden(true);
    } catch {}
  }, [user, stats]);

  if (!decision || hidden) return null;
  const tier = TIER_INFO[decision.ctaTier];

  const dismiss = (e) => {
    e.stopPropagation();
    e.preventDefault();
    try { localStorage.setItem(`bg_upgrade_${decision.ctaTier}_dismissed`, "1"); } catch {}
    setHidden(true);
  };

  const handleCta = (e) => {
    if (onClick) {
      // We have a handler — call it directly. Stop the click here so it
      // doesn't bubble to anything else and don't navigate.
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
    // If no onClick, fall through and let the <a> follow its href normally.
  };

  // Outer container is NOT clickable on its own — the CTA button handles
  // the action so we don't end up with two competing click targets.
  return (
    <div
      style={{
        position: "relative",
        background: `linear-gradient(135deg, ${tier.color}10, #0B963508)`,
        border: `1px solid ${tier.color}30`,
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}
      >×</button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ fontSize: 40, lineHeight: 1, filter: `drop-shadow(0 4px 12px ${tier.color}40)` }}>{tier.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1.5, color: tier.color, marginBottom: 2 }}>
            {decision.headline}
          </div>
          <div style={{ fontSize: 12.5, color: "#888", lineHeight: 1.5, marginBottom: 10 }}>{decision.body}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {tier.perks.map(p => (
              <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${tier.color}15`, color: tier.color, letterSpacing: 0.3 }}>✓ {p}</span>
            ))}
          </div>
          {onClick ? (
            <button
              type="button"
              onClick={handleCta}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: tier.color,
                color: "#0B0D10",
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                letterSpacing: 0.5,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {decision.cta} <span style={{ fontSize: 14 }}>→</span>
            </button>
          ) : (
            <a
              href={href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: tier.color,
                color: "#0B0D10",
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                letterSpacing: 0.5,
              }}
            >
              {decision.cta} <span style={{ fontSize: 14 }}>→</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
