"use client";
import { useEffect, useState } from "react";

// Floating circular button that opens /dashboard/chat. Auto-hides on the chat page itself.
export default function ChatLauncher() {
  const [show, setShow] = useState(false);
  const [path, setPath] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPath(window.location.pathname);
    setShow(true);
  }, []);

  if (!show) return null;
  if (path.startsWith("/dashboard/chat")) return null;

  return (
    <>
      <style>{`
@keyframes pulse-ai{0%,100%{box-shadow:0 6px 24px rgba(11,150,53,0.4),0 0 0 0 rgba(11,150,53,0.5)}50%{box-shadow:0 6px 24px rgba(11,150,53,0.5),0 0 0 12px rgba(11,150,53,0)}}
.cl-fab{position:fixed;bottom:80px;right:18px;z-index:90;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#0B9635,#076B25);display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;color:#fff;font-size:24px;animation:pulse-ai 2.4s infinite;text-decoration:none;transition:transform 0.15s}
.cl-fab:hover{transform:scale(1.08)}
.cl-tip{position:absolute;right:64px;top:50%;transform:translateY(-50%);background:#12141A;border:1px solid #1E2028;color:#F0F0F2;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:6px 10px;border-radius:8px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity 0.15s}
.cl-fab:hover .cl-tip{opacity:1}
@media(max-width:600px){.cl-fab{bottom:74px;right:14px;width:50px;height:50px;font-size:21px}.cl-tip{display:none}}
      `}</style>
      <a href="/dashboard/chat" className="cl-fab" aria-label="AI Chat">
        🤖
        <span className="cl-tip">Ask the AI analyst</span>
      </a>
    </>
  );
}
