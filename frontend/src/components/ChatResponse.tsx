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
}

function ConfidenceBadge({ score, grounded }: { score: number; grounded?: boolean }) {
  let color = "var(--danger)";
  let label = "Low confidence";

  if (score >= 0.7) {
    color = "var(--accent)";
    label = "High confidence";
  } else if (score >= 0.4) {
    color = "var(--warning)";
    label = "Medium confidence";
  }

  if (grounded === false) {
    color = "var(--danger)";
    label = "Ungrounded — verify independently";
  }

  return (
    <span
      style={{
        fontSize: "11px",
        color,
        padding: "2px 8px",
        border: `1px solid ${color}`,
        borderRadius: "12px",
      }}
    >
      {label} ({Math.round(score * 100)}%)
    </span>
  );
}

function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  const unique = sources.filter(
    (s, i, arr) => arr.findIndex((x) => x.source === s.source && x.section === s.section) === i
  );

  return (
    <details style={{ marginTop: "4px" }}>
      <summary style={{ fontSize: "11px", color: "var(--text-muted)", cursor: "pointer" }}>
        {unique.length} source{unique.length > 1 ? "s" : ""}
      </summary>
      <ul style={{ margin: "4px 0 0 16px", fontSize: "12px", color: "var(--text-muted)" }}>
        {unique.map((s, i) => (
          <li key={i}>
            {s.source}
            {s.section ? ` — ${s.section}` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ChatResponse({ message }: ChatResponseProps) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: "4px",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          borderRadius: "var(--radius)",
          background: isUser ? "var(--accent-muted)" : "var(--bg-secondary)",
          color: isUser ? "#fff" : "var(--text)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          fontSize: "15px",
        }}
      >
        {message.content || (
          <span style={{ color: "var(--text-muted)" }}>Thinking...</span>
        )}
      </div>

      {!isUser && message.confidence !== undefined && (
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <ConfidenceBadge score={message.confidence} grounded={message.grounded} />
          {message.sources && <SourceList sources={message.sources} />}
        </div>
      )}
    </div>
  );
}
