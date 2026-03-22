import { useEffect, useRef, useState } from "react";
import { ChatInput } from "./components/ChatInput";
import { ChatResponse, type Message } from "./components/ChatResponse";
import { Setup } from "./pages/Setup";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { ContextSummary } from "./pages/ContextSummary";

type Page = "loading" | "setup" | "chat" | "settings" | "profile" | "context-summary";
type ChatMode = "normal" | "profile";

const SUGGESTED = [
  "How do I safely can tomatoes at home?",
  "What size solar panel system do I need for off-grid?",
  "How do I start raising backyard chickens?",
  "What's the best way to purify well water?",
];

export default function App() {
  const [page, setPage] = useState<Page>("loading");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("normal");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user has a profile
  useEffect(() => {
    fetch("/api/context/profile")
      .then((r) => r.json())
      .then((data) => setHasProfile(Object.keys(data).length > 0))
      .catch(() => {});
  }, [page, chatMode]);

  useEffect(() => {
    if (page !== "loading" && page !== "setup") return;
    const checkStatus = () => {
      fetch("/api/setup/status")
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "ready") setPage("chat");
          else if (page === "loading") setPage("setup");
        })
        .catch(() => { if (page === "loading") setPage("setup"); });
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [page]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Start profile conversation
  const startProfileChat = () => {
    setChatMode("profile");
    setMessages([]);
    // Send initial message to kick off the conversation
    handleSend("Hi, I'd like to set up my profile.", true);
  };

  const handleSend = async (text: string, isProfileInit = false) => {
    const isProfile = chatMode === "profile" || isProfileInit;
    const endpoint = isProfile ? "/api/profile/chat" : "/api/chat";

    // Build history for profile chat
    const history = isProfile
      ? messages
          .filter((m) => m.content)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const body = isProfile
        ? { message: text, history }
        : { message: text };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 503) {
        setMessages((prev) => {
          const u = [...prev];
          u[u.length - 1] = { role: "assistant", content: "Model is busy or not loaded. Try again shortly." };
          return u;
        });
        return;
      }
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let profileSaved = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.event === "token") {
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + parsed.text };
                return u;
              });
            } else if (parsed.event === "done") {
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = {
                  ...u[u.length - 1],
                  confidence: parsed.confidence,
                  sources: parsed.sources,
                  grounded: parsed.grounded,
                };
                return u;
              });
            } else if (parsed.event === "profile_saved") {
              profileSaved = true;
              setHasProfile(true);
            } else if (parsed.event === "error") {
              setMessages((prev) => {
                const u = [...prev];
                u[u.length - 1] = { role: "assistant", content: parsed.message };
                return u;
              });
            }
          } catch { /* skip */ }
        }
      }

      // If profile was saved, clean up the JSON from the displayed message
      if (profileSaved) {
        setMessages((prev) => {
          const u = [...prev];
          const last = u[u.length - 1];
          // Remove the JSON block from the visible message
          let cleaned = last.content.replace(/```json\s*\{[\s\S]*?\}\s*```/g, "").trim();
          cleaned = cleaned.replace(/\{"profile":\s*\{[\s\S]*?\}\}/g, "").trim();
          if (!cleaned) {
            cleaned = "Your profile has been saved! All future answers will be personalized to your situation.";
          }
          u[u.length - 1] = { ...last, content: cleaned };
          return u;
        });
        // Switch back to normal mode after a brief pause
        setTimeout(() => setChatMode("normal"), 1500);
      }
    } catch (err) {
      setMessages((prev) => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}` };
        return u;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // New chat — clear messages and reset mode
  const handleNewChat = () => {
    setMessages([]);
    setChatMode("normal");
  };

  if (page === "loading") {
    return (
      <div className="page-center">
        <div className="loading-indicator">
          <div className="loading-dot" />
          <span>INITIALIZING</span>
        </div>
        <style>{`
          .page-center { display: flex; align-items: center; justify-content: center; height: 100vh; }
          .loading-indicator {
            display: flex; align-items: center; gap: 10px;
            font-family: var(--font-mono); font-size: 11px;
            color: var(--text-dim); letter-spacing: 0.12em;
          }
          .loading-dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: var(--accent); animation: pulse 1.2s ease infinite;
          }
        `}</style>
      </div>
    );
  }

  if (page === "setup") return <Setup onReady={() => setPage("chat")} />;
  if (page === "settings") return <Settings onBack={() => setPage("chat")} onProfile={() => setPage("profile")} />;
  if (page === "profile") return <Profile onBack={() => setPage("settings")} />;
  if (page === "context-summary") return (
    <ContextSummary
      onBack={() => setPage("chat")}
      onRerun={() => { setPage("chat"); setTimeout(startProfileChat, 100); }}
    />
  );

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <div className="header-mark" />
          <div>
            <h1 className="header-title">ALMANAC</h1>
            <span className="header-sub">
              {chatMode === "profile" ? "Setting up your profile" : "Survival Knowledge Base"}
            </span>
          </div>
        </div>
        <div className="header-actions">
          {messages.length > 0 && chatMode === "normal" && (
            <button onClick={handleNewChat} className="header-btn" title="New chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          )}
          <button
            onClick={() => { if (hasProfile) { setPage("context-summary"); } else { startProfileChat(); } }}
            className={`header-btn ${hasProfile ? "has-profile" : ""}`}
            title={hasProfile ? "View your context" : "Set up your profile"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {hasProfile && <span className="profile-dot" />}
          </button>
          <button onClick={() => setPage("settings")} className="header-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="app-main" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 3v26M3 16h26" stroke="var(--border-light)" strokeWidth="1"/>
                <circle cx="16" cy="16" r="10" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3 3"/>
                <circle cx="16" cy="16" r="3" fill="var(--accent)" opacity="0.3"/>
              </svg>
            </div>
            <h2 className="empty-title">What do you need to know?</h2>
            <p className="empty-sub">
              Grounded answers from USDA, FEMA, and Extension Service sources.
            </p>
            <div className="suggested-grid">
              {SUGGESTED.map((q) => (
                <button key={q} className="suggested-btn" onClick={() => handleSend(q)}>
                  {q}
                </button>
              ))}
            </div>

            {!hasProfile && (
              <>
                <div className="context-divider" />
                <button className="context-cta" onClick={startProfileChat}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Add your context for personalized answers
                </button>
                <p className="context-privacy">
                  Everything stored locally on your device. Never leaves your network.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="messages-list">
            {chatMode === "profile" && messages.length <= 2 && (
              <div className="profile-banner">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Setting up your profile — stored locally, never leaves your device
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatResponse key={i} message={msg} isLatest={i === messages.length - 1} />
            ))}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          {chatMode === "profile" && !isStreaming && messages.length > 4 && (
            <button className="done-profile-btn" onClick={() => { setChatMode("normal"); setMessages([]); }}>
              Done — back to chat
            </button>
          )}
          <ChatInput
            onSend={(text) => handleSend(text)}
            disabled={isStreaming}
          />
          <p className="footer-disclaimer">
            For informational purposes only. Always verify critical information with qualified sources.
          </p>
        </div>
      </footer>

      <style>{`
        .app-layout { display:flex; flex-direction:column; height:100vh; max-height:100vh; }
        .app-header { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--border); background:var(--bg); flex-shrink:0; }
        .header-left { display:flex; align-items:center; gap:12px; }
        .header-mark { width:8px; height:24px; background:var(--accent); border-radius:2px; }
        .header-title { font-family:var(--font-mono); font-size:14px; font-weight:500; letter-spacing:0.14em; color:var(--text-bright); line-height:1.2; }
        .header-sub { font-size:11px; color:var(--text-dim); letter-spacing:0.02em; }
        .header-actions { display:flex; gap:4px; }
        .header-btn { position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center; background:transparent; color:var(--text-muted); border:1px solid transparent; border-radius:6px; cursor:pointer; transition:all 0.15s; }
        .header-btn:hover { color:var(--text); border-color:var(--border); background:var(--bg-elevated); }
        .profile-dot { position:absolute; top:4px; right:4px; width:6px; height:6px; border-radius:50%; background:var(--sage-bright); }

        .app-main { flex:1; overflow-y:auto; padding:0; }

        .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100%; padding:40px 24px; text-align:center; animation:fadeInUp 0.4s ease; }
        .empty-icon { margin-bottom:20px; opacity:0.7; }
        .empty-title { font-family:var(--font-mono); font-size:18px; font-weight:500; color:var(--text); margin-bottom:6px; }
        .empty-sub { font-size:13px; color:var(--text-muted); margin-bottom:28px; max-width:360px; }
        .suggested-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; max-width:480px; width:100%; }
        .suggested-btn { background:var(--bg-card); border:1px solid var(--border); border-radius:6px; padding:12px 14px; color:var(--text-muted); font-size:12.5px; line-height:1.45; text-align:left; cursor:pointer; transition:all 0.15s; font-family:var(--font-body); }
        .suggested-btn:hover { border-color:var(--accent); color:var(--text); background:var(--accent-dim); }

        .context-divider { width:60px; height:1px; background:var(--border); margin:20px auto 16px; }
        .context-cta { display:inline-flex; align-items:center; gap:8px; padding:8px 18px; background:none; border:1px dashed var(--border-light); border-radius:20px; color:var(--text-muted); font-family:var(--font-body); font-size:13px; cursor:pointer; transition:all 0.15s; }
        .context-cta:hover { border-color:var(--accent); color:var(--text); border-style:solid; }
        .context-privacy { font-family:var(--font-mono); font-size:10px; color:var(--text-dim); margin-top:8px; }

        .messages-list { display:flex; flex-direction:column; gap:20px; padding:24px 20px; max-width:720px; margin:0 auto; width:100%; }
        .profile-banner { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-muted); font-family:var(--font-mono); padding:8px 12px; background:var(--bg-elevated); border:1px solid var(--border); border-radius:6px; animation:fadeInUp 0.3s ease; }

        .app-footer { border-top:1px solid var(--border); background:var(--bg); padding:12px 20px 16px; flex-shrink:0; }
        .footer-inner { max-width:720px; margin:0 auto; }
        .footer-disclaimer { font-family:var(--font-mono); font-size:10px; color:var(--text-dim); text-align:center; margin-top:8px; }
        .done-profile-btn { display:block; width:100%; padding:8px; margin-bottom:8px; background:none; border:1px solid var(--border-light); border-radius:6px; color:var(--text-muted); font-family:var(--font-mono); font-size:12px; cursor:pointer; transition:all 0.15s; }
        .done-profile-btn:hover { border-color:var(--accent); color:var(--text); }

        @media (max-width:600px) {
          .suggested-grid { grid-template-columns:1fr; }
          .messages-list { padding:16px 12px; }
        }
      `}</style>
    </div>
  );
}
