"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "Should I bet on Arsenal vs Chelsea this weekend?",
  "Build me a 5-pick acc with combined odds around 20",
  "What markets have the highest hit-rate in Bundesliga?",
  "Explain Kelly criterion for a $100 bankroll",
];

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState({ used: 0, limit: 20 });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) loadThreads();
  }, [session]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadThreads = async () => {
    try {
      const r = await fetch("/api/chat");
      if (r.ok) {
        const d = await r.json();
        setThreads(d.threads || []);
      }
    } catch (e) {}
  };

  const openThread = async (id) => {
    setActiveId(id);
    setError("");
    try {
      const r = await fetch(`/api/chat?threadId=${id}`);
      if (r.ok) {
        const d = await r.json();
        setMessages(d.thread?.messages || []);
      }
    } catch (e) {}
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setError("");
    setSending(true);
    const optimistic = [...messages, { role: "user", content: text, createdAt: new Date() }];
    setMessages(optimistic);
    setInput("");
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, threadId: activeId }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Failed");
        setMessages(messages); // revert
        setSending(false);
        return;
      }
      setMessages([...optimistic, { role: "assistant", content: d.reply, createdAt: new Date() }]);
      if (!activeId) setActiveId(d.threadId);
      setUsage({ used: d.usedToday, limit: d.limit });
      loadThreads();
    } catch (e) {
      setError("Network error");
      setMessages(messages);
    }
    setSending(false);
  };

  const deleteThread = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/chat?threadId=${id}`, { method: "DELETE" });
    if (activeId === id) newChat();
    loadThreads();
  };

  if (status === "loading" || !session) {
    return <div style={{ minHeight: "100vh", background: "#0B0D10" }} />;
  }

  return (
    <div className="chat-root">
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0B0D10;overflow-x:hidden}
.chat-root{min-height:100dvh;background:#0B0D10;color:#F0F0F2;font-family:'DM Sans',sans-serif;display:flex}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,80%,100%{opacity:0.3}40%{opacity:1}}

.side{width:280px;background:#0E1015;border-right:1px solid #151820;display:flex;flex-direction:column;flex-shrink:0}
.side-hdr{padding:16px 18px;border-bottom:1px solid #151820;display:flex;align-items:center;justify-content:space-between}
.side-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px}
.new-btn{background:#0B9635;color:#fff;border:none;padding:10px 14px;border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;letter-spacing:0.5px;width:calc(100% - 36px);margin:14px 18px 8px}
.new-btn:hover{background:#076B25}
.side-list{flex:1;overflow-y:auto;padding:8px 10px 16px}
.side-empty{text-align:center;color:#444;font-size:12px;padding:32px 16px;line-height:1.6}
.thread{padding:10px 12px;border-radius:10px;cursor:pointer;margin-bottom:4px;display:flex;align-items:center;gap:8px;transition:all 0.15s;border:1px solid transparent}
.thread:hover{background:#12141A;border-color:#1E2028}
.thread.on{background:#12141A;border-color:#0B963530}
.thread-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500}
.thread-del{opacity:0;background:none;border:none;color:#555;cursor:pointer;padding:2px 6px;font-size:14px;transition:opacity 0.15s}
.thread:hover .thread-del{opacity:1}
.thread-del:hover{color:#E31725}

.main{flex:1;display:flex;flex-direction:column;min-width:0;background:#0B0D10}
.main-hdr{padding:14px 24px;border-bottom:1px solid #151820;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0B0D10F0;backdrop-filter:blur(20px);position:sticky;top:0;z-index:5}
.main-hdr-l{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.menu-btn{display:none;background:none;border:none;color:#F0F0F2;font-size:20px;cursor:pointer;padding:4px 8px}
.main-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.usage{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#444;padding:4px 10px;background:#12141A;border:1px solid #1E2028;border-radius:8px;text-transform:uppercase}
.back-btn{background:#12141A;border:1px solid #1E2028;color:#888;font-size:11px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.back-btn:hover{border-color:#2A2D34;color:#F0F0F2}

.scroll{flex:1;overflow-y:auto;padding:20px 0 12px;scroll-behavior:smooth}
.scroll-inner{max-width:760px;margin:0 auto;padding:0 24px}

.welcome{text-align:center;padding:48px 20px 20px}
.welcome-icon{font-size:56px;margin-bottom:16px;animation:fadeUp 0.5s}
.welcome-h{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:2px;margin-bottom:8px}
.welcome-p{color:#666;font-size:14px;max-width:420px;margin:0 auto 32px;line-height:1.6}
.sugg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:560px;margin:0 auto}
.sugg{background:#12141A;border:1px solid #1E2028;border-radius:12px;padding:14px 16px;text-align:left;cursor:pointer;font-size:13px;color:#888;transition:all 0.15s;line-height:1.5;font-family:'DM Sans',sans-serif}
.sugg:hover{border-color:#0B963540;background:#0B963508;color:#F0F0F2;transform:translateY(-1px)}

.msg{margin-bottom:16px;animation:fadeUp 0.25s}
.msg.user{display:flex;justify-content:flex-end}
.msg.user .bubble{background:#0B9635;color:#fff;border-radius:18px 18px 4px 18px;padding:11px 16px;max-width:78%;font-size:14px;line-height:1.55}
.msg.ai{display:flex;gap:12px;align-items:flex-start}
.msg.ai .ai-av{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#0B9635,#076B25);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;font-weight:800;color:#fff}
.msg.ai .bubble{background:#12141A;border:1px solid #1E2028;border-radius:4px 18px 18px 18px;padding:12px 16px;max-width:calc(100% - 44px);font-size:14px;line-height:1.6;color:#EEEFF1;white-space:pre-wrap;word-wrap:break-word}
.typing{display:inline-flex;gap:4px;align-items:center}
.typing span{width:6px;height:6px;border-radius:50%;background:#0B9635;animation:blink 1.4s infinite}
.typing span:nth-child(2){animation-delay:0.16s}
.typing span:nth-child(3){animation-delay:0.32s}

.err{background:#E3172508;border:1px solid #E3172530;border-radius:10px;padding:10px 14px;margin:0 24px 12px;font-size:12px;color:#E31725}
.err-i{display:flex;justify-content:center}

.composer{border-top:1px solid #151820;background:#0B0D10;padding:14px 0 max(14px, env(safe-area-inset-bottom))}
.composer-inner{max-width:760px;margin:0 auto;padding:0 16px;display:flex;gap:8px;align-items:flex-end}
.composer-input{flex:1;background:#12141A;border:1px solid #1E2028;border-radius:14px;padding:12px 16px;color:#F0F0F2;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;resize:none;min-height:46px;max-height:160px;line-height:1.5}
.composer-input:focus{border-color:#0B9635;box-shadow:0 0 0 3px #0B963512}
.composer-input::placeholder{color:#444}
.send-btn{background:#0B9635;color:#fff;border:none;border-radius:14px;padding:12px 16px;font-weight:700;cursor:pointer;font-size:14px;height:46px;min-width:46px;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.send-btn:disabled{opacity:0.4;cursor:not-allowed}
.send-btn:not(:disabled):hover{background:#076B25}
.send-btn:not(:disabled):active{transform:scale(0.96)}
.disclaimer{text-align:center;font-size:10px;color:#333;margin-top:8px;padding:0 16px}

@media(max-width:768px){
  .side{position:fixed;left:-300px;top:0;bottom:0;z-index:50;transition:left 0.25s;width:280px}
  .side.open{left:0;box-shadow:8px 0 40px rgba(0,0,0,0.6)}
  .menu-btn{display:block}
  .main-hdr{padding:12px 16px}
  .scroll-inner{padding:0 16px}
  .sugg-grid{grid-template-columns:1fr}
  .composer-inner{padding:0 12px}
}
      `}</style>

      {/* SIDEBAR */}
      <aside className="side">
        <div className="side-hdr">
          <div className="side-title">CHATS</div>
          <a href="/dashboard" className="back-btn">←</a>
        </div>
        <button className="new-btn" onClick={newChat}>+ NEW CHAT</button>
        <div className="side-list">
          {threads.length === 0 ? (
            <div className="side-empty">No conversations yet.<br/>Start chatting with the AI analyst.</div>
          ) : threads.map(t => (
            <div key={t._id} className={`thread ${activeId === t._id ? "on" : ""}`} onClick={() => openThread(t._id)}>
              <span style={{fontSize:14}}>💬</span>
              <div className="thread-t">{t.title || "Untitled"}</div>
              <button className="thread-del" onClick={(e) => deleteThread(t._id, e)} title="Delete">×</button>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="main-hdr">
          <div className="main-hdr-l">
            <div className="main-title">{activeId ? (threads.find(t => t._id === activeId)?.title || "Chat") : "BetGenius AI Analyst"}</div>
          </div>
          <span className="usage">{usage.used}/{usage.limit} today</span>
        </header>

        <div className="scroll" ref={scrollRef}>
          <div className="scroll-inner">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-icon">🤖</div>
                <div className="welcome-h">ASK YOUR AI ANALYST</div>
                <div className="welcome-p">Ask about fixtures, markets, odds, bankroll strategy. Honest reasoning, no guarantees.</div>
                <div className="sugg-grid">
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="sugg" onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`msg ${m.role === "user" ? "user" : "ai"}`}>
                {m.role === "assistant" && <div className="ai-av">AI</div>}
                <div className="bubble">{m.content}</div>
              </div>
            ))}
            {sending && (
              <div className="msg ai">
                <div className="ai-av">AI</div>
                <div className="bubble"><div className="typing"><span/><span/><span/></div></div>
              </div>
            )}
          </div>
        </div>

        {error && <div className="err"><div className="err-i">{error}</div></div>}

        <div className="composer">
          <div className="composer-inner">
            <textarea
              ref={inputRef}
              className="composer-input"
              placeholder="Ask anything about football betting..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              disabled={sending}
            />
            <button className="send-btn" onClick={() => send()} disabled={sending || !input.trim()}>
              {sending ? "..." : "→"}
            </button>
          </div>
          <div className="disclaimer">AI provides analysis, not guarantees. Bet responsibly · 18+</div>
        </div>
      </main>
    </div>
  );
}
