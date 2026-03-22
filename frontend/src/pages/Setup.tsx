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
      if (data.status === "ready") {
        onReady();
      }
    } catch {
      setError("Cannot connect to backend");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.event === "progress") {
                setDownloadProgress(
                  data.stage === "complete"
                    ? `Downloaded ${data.size_mb}MB`
                    : `Downloading... ${data.percent}%`
                );
              } else if (data.event === "done") {
                setDownloadProgress("Download complete!");
                await fetchStatus();
              } else if (data.event === "error") {
                setError(data.message);
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleLoadModel = async (name: string) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/models/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (r.ok) {
        await fetchStatus();
      } else {
        const data = await r.json();
        setError(data.detail || "Failed to load model");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load model");
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div style={styles.container}>
        <p style={{ color: "var(--text-muted)" }}>
          {error || "Connecting to backend..."}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Project Almanac</h1>
        <p style={styles.subtitle}>Self-hosted survival knowledge platform</p>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Hardware</h2>
          <p style={styles.detail}>
            RAM: {status.hardware.ram_gb} GB | CPUs: {status.hardware.cpu_count} |
            Content: {status.indexed_chunks} chunks indexed
          </p>
        </div>

        {status.status === "needs_model" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>No Model Detected</h2>
            <p style={styles.detail}>
              Place a GGUF model file in the <code>/app/models</code> volume, or
              download a recommended model below.
            </p>

            {status.recommended_models.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                {status.recommended_models.map((m) => (
                  <div key={m.name} style={styles.modelCard}>
                    <div>
                      <strong>{m.name}</strong>
                      <span style={styles.badge}>{m.parameters}</span>
                      <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: "4px 0 0" }}>
                        {m.description} ({m.size_gb} GB download)
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(m)}
                      disabled={downloading}
                      style={styles.button}
                    >
                      {downloading ? "..." : "Download"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {downloadProgress && (
              <p style={{ color: "var(--accent)", marginTop: "8px", fontSize: "14px" }}>
                {downloadProgress}
              </p>
            )}
          </div>
        )}

        {status.status === "model_available" && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Model Available</h2>
            <p style={styles.detail}>Select a model to load:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {status.available_models.map((m) => (
                <div key={m.name} style={styles.modelCard}>
                  <div>
                    <strong>{m.name}</strong>
                    <span style={styles.badge}>{m.size_mb} MB</span>
                  </div>
                  <button
                    onClick={() => handleLoadModel(m.name)}
                    disabled={loading}
                    style={styles.button}
                  >
                    {loading ? "Loading..." : "Load"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--danger)", marginTop: "12px", fontSize: "14px" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    maxWidth: "560px",
    width: "100%",
    padding: "32px",
    background: "var(--bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "4px",
  },
  subtitle: {
    color: "var(--text-muted)",
    fontSize: "14px",
    marginBottom: "24px",
  },
  section: {
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  detail: {
    color: "var(--text-muted)",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  modelCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    background: "var(--bg)",
    borderRadius: "8px",
    border: "1px solid var(--border)",
  },
  badge: {
    fontSize: "11px",
    color: "var(--accent)",
    marginLeft: "8px",
    padding: "2px 6px",
    border: "1px solid var(--accent)",
    borderRadius: "4px",
  },
  button: {
    padding: "8px 16px",
    background: "var(--accent)",
    color: "#000",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
    flexShrink: 0,
  },
};
