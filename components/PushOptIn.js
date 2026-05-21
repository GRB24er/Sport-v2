"use client";
import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window === "undefined" ? "" : window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushOptIn({ compact = false }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sw = "serviceWorker" in navigator;
    const push = "PushManager" in window;
    setSupported(sw && push);
    if (!sw || !push) return;
    setPermission(Notification.permission);

    fetch("/api/push/subscribe").then(r => r.json()).then(d => {
      setEnabled(!!d.enabled);
      setPublicKey(d.publicKey || "");
    }).catch(() => {});

    if (sw) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      }).catch(() => {});
    }

    try {
      if (localStorage.getItem("bg_push_dismissed") === "1") setHidden(true);
    } catch {}
  }, []);

  const enable = async () => {
    setError("");
    setBusy(true);
    try {
      if (!publicKey) throw new Error("Push not configured by admin yet");
      if (Notification.permission === "denied") throw new Error("You blocked notifications in your browser settings");

      const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permission not granted");

      let reg;
      try {
        reg = await navigator.serviceWorker.ready;
      } catch {
        reg = await navigator.serviceWorker.register("/sw.js");
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error("Failed to register subscription");
      setSubscribed(true);
    } catch (e) {
      setError(e.message || "Failed");
    }
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e.message || "Failed");
    }
    setBusy(false);
  };

  const dismiss = () => {
    try { localStorage.setItem("bg_push_dismissed", "1"); } catch {}
    setHidden(true);
  };

  if (!supported || !enabled || hidden) return null;
  if (subscribed && compact) return null;

  if (compact) {
    return (
      <div style={{ background: "linear-gradient(135deg,#12141A,#0B963510)", border: "1px solid #0B963525", borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 24 }}>🔔</div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Get instant win alerts</div>
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>Push notifications when new predictions drop or your round resolves.</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={enable} disabled={busy} style={{ background: "#0B9635", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, fontFamily: "'DM Sans',sans-serif" }}>
            {busy ? "..." : "ENABLE"}
          </button>
          <button onClick={dismiss} style={{ background: "transparent", border: "1px solid #1E2028", color: "#555", padding: "8px 10px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>×</button>
        </div>
        {error && <div style={{ width: "100%", fontSize: 11, color: "#E31725", marginTop: 4 }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ background: "#12141A", border: "1px solid #1E2028", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🔔 Push Notifications</div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 12, lineHeight: 1.5 }}>
        {subscribed ? "You're getting push alerts on this device." : "Enable to be alerted when new predictions are published or your round resolves."}
      </div>
      {subscribed ? (
        <button onClick={disable} disabled={busy} style={{ background: "transparent", color: "#888", border: "1px solid #1E2028", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          {busy ? "..." : "Disable on this device"}
        </button>
      ) : (
        <button onClick={enable} disabled={busy} style={{ background: "#0B9635", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          {busy ? "Working…" : "Enable notifications"}
        </button>
      )}
      {error && <div style={{ fontSize: 11, color: "#E31725", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
