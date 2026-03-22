import { useEffect, useState } from "react";
import { ChatInput } from "./components/ChatInput";
import { ChatResponse, type Message } from "./components/ChatResponse";
import { Setup } from "./pages/Setup";
import { Settings } from "./pages/Settings";

type Page = "loading" | "setup" | "chat" | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("loading");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Check setup status on load
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "ready") {
          setPage("chat");
        } else {
          setPage("setup");
        }
      })
      .catch(() => setPage("setup"));
  }, []);

  const handleSend = async (text: string) => {
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (response.status === 503) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Model is busy or not loaded. Please try again in a moment.",
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.event === "token") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.text,
                  };
                  return updated;
                });
              } else if (parsed.event === "done") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = {
                    ...last,
                    confidence: parsed.confidence,
                    sources: parsed.sources,
                    grounded: parsed.grounded,
                  };
                  return updated;
                });
              } else if (parsed.event === "error") {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: `Error: ${parsed.message}`,
                  };
                  return updated;
                });
              }
            } catch {
              // Non-JSON data, skip
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Connection error: ${err instanceof Error ? err.message : "Unknown error"}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  if (page === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (page === "setup") {
    return <Setup onReady={() => setPage("chat")} />;
  }

  if (page === "settings") {
    return <Settings onBack={() => setPage("chat")} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 600 }}>Project Almanac</h1>
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            Homesteading Knowledge Base
          </span>
        </div>
        <button onClick={() => setPage("settings")} style={settingsButtonStyle}>
          Settings
        </button>
      </header>

      <main style={mainStyle}>
        {messages.length === 0 && (
          <div style={emptyStyle}>
            <div>
              <p style={{ fontSize: "20px", marginBottom: "8px" }}>
                Ask a homesteading question
              </p>
              <p style={{ fontSize: "14px" }}>
                Food preservation, gardening, solar power, water systems, construction, and more.
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatResponse key={i} message={msg} />
        ))}
      </main>

      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
        <p style={disclaimerStyle}>
          For informational purposes only. Verify critical information with qualified sources.
        </p>
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: "12px 24px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const settingsButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const emptyStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--text-muted)",
  textAlign: "center",
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "var(--text-muted)",
  textAlign: "center",
  marginBottom: "8px",
};
