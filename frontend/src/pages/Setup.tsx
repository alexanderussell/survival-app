import { useEffect, useState } from "react";

interface SetupStatus {
  status: string;
  has_model: boolean;
  model_loaded: boolean;
  available_models: { name: string; size_mb: number }[];
  indexed_chunks: number;
  hardware: { ram_gb: number; cpu_count: number };
  recommended_models: {
    name: string;
    description: string;
    size_gb: number;
    url: string;
    parameters: string;
  }[];
}

interface SetupProps {
  onReady: () => void;
}

export function Setup({ onReady }: SetupProps) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/setup/status");
      const data = await r.json();
      setStatus(data);
      if (data.status === "ready") onReady();
    } catch {
      setError("Cannot connect to backend");
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleDownload = async (model: SetupStatus["recommended_models"][0]) => {
    setDownloading(true);
    setDownloadProgress("Connecting...");
    setError("");
    try {
      const r = await fetch("/api/setup/download-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: model.url, filename: model.name }),
      });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.event === "progress") {
              setDownloadProgress(data.stage === "complete" ? `Downloaded ${data.size_mb}MB` : "Downloading...");
            } else if (data.event === "done") {
              setDownloadProgress("Complete");
              await fetchStatus();
            } else if (data.event === "error") {
              setError(data.message);
            }
          } catch {}
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleLoad = async (name: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/models/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (r.ok) await fetchStatus();
      else {
        const d = await r.json();
        setError(d.detail || "Failed to load model");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="setup-page">
        <p className="setup-connecting">{error || "CONNECTING..."}</p>
        <style>{setupStyles}</style>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        {/* Title */}
        <div className="setup-header">
          <div className="setup-mark" />
          <div>
            <h1 className="setup-title">ALMANAC</h1>
            <p className="setup-sub">Self-hosted survival knowledge platform</p>
          </div>
        </div>

        {/* Hardware */}
        <div className="setup-section">
          <div className="setup-label">SYSTEM</div>
          <div className="setup-hw">
            <span>{status.hardware.ram_gb} GB RAM</span>
            <span className="setup-sep" />
            <span>{status.hardware.cpu_count} CPU cores</span>
            <span className="setup-sep" />
            <span>{status.indexed_chunks} chunks indexed</span>
          </div>
        </div>

        {/* Model needed */}
        {status.status === "needs_model" && (
          <div className="setup-section">
            <div className="setup-label">MODEL REQUIRED</div>
            <p className="setup-detail">
              Place a GGUF file in the models volume, or download one below.
            </p>
            {status.recommended_models.map((m) => (
              <div key={m.name} className="model-row">
                <div className="model-info">
                  <span className="model-name">{m.name}</span>
                  <span className="model-badge">{m.parameters}</span>
                  <p className="model-desc">{m.description} — {m.size_gb} GB</p>
                </div>
                <button
                  onClick={() => handleDownload(m)}
                  disabled={downloading}
                  className="setup-btn"
                >
                  {downloading ? "..." : "DOWNLOAD"}
                </button>
              </div>
            ))}
            {downloadProgress && (
              <p className="setup-progress">{downloadProgress}</p>
            )}
          </div>
        )}

        {/* Model ready to load */}
        {status.status === "model_available" && (
          <div className="setup-section">
            <div className="setup-label">LOAD MODEL</div>
            {status.available_models.map((m) => (
              <div key={m.name} className="model-row">
                <div className="model-info">
                  <span className="model-name">{m.name}</span>
                  <span className="model-badge">{m.size_mb} MB</span>
                </div>
                <button onClick={() => handleLoad(m.name)} disabled={loading} className="setup-btn">
                  {loading ? "LOADING..." : "LOAD"}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="setup-error">{error}</p>}
      </div>
      <style>{setupStyles}</style>
    </div>
  );
}

const setupStyles = `
  .setup-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
    animation: fadeInUp 0.4s ease;
  }
  .setup-connecting {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.12em;
  }
  .setup-card {
    max-width: 520px;
    width: 100%;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 32px;
  }
  .setup-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 28px;
  }
  .setup-mark {
    width: 6px;
    height: 32px;
    background: var(--accent);
    border-radius: 2px;
    flex-shrink: 0;
  }
  .setup-title {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.14em;
    color: var(--text-bright);
    line-height: 1.2;
  }
  .setup-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }
  .setup-section {
    margin-bottom: 20px;
  }
  .setup-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    color: var(--text-dim);
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }
  .setup-hw {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
  }
  .setup-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--border-light);
  }
  .setup-detail {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .model-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 8px;
  }
  .model-info { min-width: 0; }
  .model-name {
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text);
    font-weight: 500;
  }
  .model-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--accent);
    margin-left: 8px;
    padding: 1px 6px;
    border: 1px solid var(--accent-dim);
    border-radius: 3px;
    letter-spacing: 0.03em;
  }
  .model-desc {
    font-size: 11.5px;
    color: var(--text-dim);
    margin-top: 3px;
  }
  .setup-btn {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.08em;
    padding: 7px 14px;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    transition: filter 0.15s;
  }
  .setup-btn:hover { filter: brightness(1.1); }
  .setup-btn:disabled { opacity: 0.5; cursor: wait; }
  .setup-progress {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent);
    margin-top: 4px;
  }
  .setup-error {
    font-size: 12px;
    color: var(--danger);
    margin-top: 8px;
  }
`;
