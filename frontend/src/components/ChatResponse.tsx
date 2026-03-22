import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Source {
  source: string;
  section: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  confidence?: number;
  grounded?: boolean;
}

interface ChatResponseProps {
  message: Message;
  isLatest?: boolean;
}

/* ─── Sources & Confidence Dropdown ─── */

function SourcesDropdown({ sources, confidence, grounded }: {
  sources: Source[];
  confidence: number;
  grounded?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const unique = sources.filter(
    (s, i, arr) =>
      arr.findIndex((x) => x.source === s.source && x.section === s.section) === i
  );

  const pct = Math.round(confidence * 100);
  let statusColor = "var(--danger)";
  let statusLabel = "Low";
  if (grounded === false) {
    statusColor = "var(--danger)";
    statusLabel = "Unverified";
  } else if (confidence >= 0.65) {
    statusColor = "var(--sage-bright)";
    statusLabel = "Grounded";
  } else if (confidence >= 0.4) {
    statusColor = "var(--accent)";
    statusLabel = "Partial";
  }

  return (
    <div className="sources-dropdown">
      {/* Collapsed header */}
      <button
        className="sources-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div className="sources-header-left">
          {/* Source icon with count badge */}
          <div className="sources-icon-group">
            <div className="sources-icon-pill">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 4c0-1 2.7-2 6-2s6 1 6 2M2 4v8c0 1 2.7 2 6 2s6-1 6-2V4M2 4c0 1 2.7 2 6 2s6-1 6-2M2 8c0 1 2.7 2 6 2s6-1 6-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="sources-badge">{unique.length}</span>
            </div>
            <div className="sources-icon-pill">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 1v14M1 8h14M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
                <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              </svg>
              <span className="sources-badge" style={{ background: statusColor }}>{pct}</span>
            </div>
          </div>

          <span className="sources-summary">
            {unique.length} source{unique.length !== 1 ? "s" : ""}
            <span className="sources-sep">·</span>
            <span style={{ color: statusColor }}>{statusLabel}</span>
            <span className="sources-pct">{pct}%</span>
          </span>
        </div>

        <svg
          className={`sources-chevron ${open ? "open" : ""}`}
          width="16" height="16" viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded list */}
      {open && (
        <div className="sources-list">
          {unique.map((s, i) => (
            <div key={i} className="source-row">
              <svg className="source-row-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg className="source-row-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <div className="source-row-info">
                <span className="source-row-name">{s.source}</span>
                {s.section && (
                  <>
                    <span className="source-row-sep">·</span>
                    <span className="source-row-section">{s.section}</span>
                  </>
                )}
              </div>
              <div
                className="source-row-dot"
                style={{ background: statusColor }}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`
        .sources-dropdown {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--bg-elevated);
          overflow: hidden;
          animation: slideIn 0.3s ease 0.1s both;
        }
        .sources-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          font-family: var(--font-body);
          transition: background 0.15s;
        }
        .sources-header:hover {
          background: rgba(255,255,255,0.02);
        }
        .sources-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sources-icon-group {
          display: flex;
          align-items: center;
          gap: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 3px 6px;
        }
        .sources-icon-pill {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: var(--text-muted);
        }
        .sources-badge {
          position: absolute;
          top: -2px;
          right: -4px;
          font-family: var(--font-mono);
          font-size: 8px;
          font-weight: 600;
          min-width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: var(--accent);
          color: var(--bg);
          padding: 0 3px;
          line-height: 1;
        }
        .sources-summary {
          font-size: 13px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sources-sep {
          color: var(--text-dim);
          margin: 0 2px;
        }
        .sources-pct {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-dim);
          margin-left: 2px;
        }
        .sources-chevron {
          color: var(--text-dim);
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .sources-chevron.open {
          transform: rotate(180deg);
        }

        /* Expanded list */
        .sources-list {
          border-top: 1px solid var(--border);
          padding: 4px 0;
          animation: fadeInUp 0.2s ease;
        }
        .source-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          transition: background 0.1s;
        }
        .source-row:hover {
          background: rgba(255,255,255,0.015);
        }
        .source-row-chevron {
          color: var(--text-dim);
          flex-shrink: 0;
        }
        .source-row-icon {
          color: var(--accent);
          flex-shrink: 0;
          opacity: 0.7;
        }
        .source-row-info {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .source-row-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
        }
        .source-row-sep {
          color: var(--text-dim);
        }
        .source-row-section {
          font-size: 13px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .source-row-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

/* ─── Chat Response ─── */

export function ChatResponse({ message, isLatest }: ChatResponseProps) {
  const isUser = message.role === "user";
  const isThinking = !isUser && !message.content && isLatest;

  return (
    <div className={`msg ${isUser ? "msg-user" : "msg-assistant"}`}>
      {!isUser && (
        <div className="msg-indicator">
          <div className="msg-dot" />
        </div>
      )}

      <div className="msg-body">
        {isUser && <div className="msg-role">YOU</div>}

        <div className={`msg-content ${isUser ? "msg-content-user" : ""}`}>
          {isUser ? (
            message.content
          ) : isThinking ? (
            <span className="thinking">
              <span className="thinking-dot" />
              <span className="thinking-dot" style={{ animationDelay: "0.15s" }} />
              <span className="thinking-dot" style={{ animationDelay: "0.3s" }} />
            </span>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.confidence !== undefined && message.sources && message.sources.length > 0 && (
          <SourcesDropdown
            sources={message.sources}
            confidence={message.confidence}
            grounded={message.grounded}
          />
        )}
      </div>

      <style>{`
        .msg {
          display: flex;
          gap: 12px;
          animation: fadeInUp 0.25s ease both;
          max-width: 100%;
        }
        .msg-user {
          justify-content: flex-end;
          padding-left: 40px;
        }
        .msg-assistant {
          padding-right: 20px;
        }
        .msg-indicator {
          flex-shrink: 0;
          width: 20px;
          display: flex;
          justify-content: center;
          padding-top: 6px;
        }
        .msg-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--sage);
        }
        .msg-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          max-width: 100%;
        }
        .msg-role {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-dim);
          letter-spacing: 0.1em;
          text-align: right;
        }
        .msg-content {
          font-size: 14.5px;
          line-height: 1.75;
          color: var(--text);
          overflow-wrap: break-word;
        }
        .msg-content-user {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px 8px 2px 8px;
          padding: 10px 16px;
          color: var(--text-bright);
          font-size: 14.5px;
          line-height: 1.6;
        }
        .thinking {
          display: inline-flex;
          gap: 4px;
          padding: 4px 0;
        }
        .thinking-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: pulse 1s ease infinite;
        }
      `}</style>
    </div>
  );
}
