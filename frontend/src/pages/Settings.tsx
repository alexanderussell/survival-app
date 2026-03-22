import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  model_loaded: boolean;
  model_name: string | null;
  indexed_chunks: number;
}

interface ModelsData {
  models: { name: string; size_mb: number }[];
  active: string | null;
}

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [models, setModels] = useState<ModelsData | null>(null);

  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => {});
    fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => {});
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: "640px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={onBack} style={styles.backButton}>
          Back
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: 600 }}>Settings</h1>
      </div>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Model</h2>
        {health?.model_loaded ? (
          <div style={styles.infoRow}>
            <span style={{ color: "var(--accent)" }}>Active:</span>
            <span>{health.model_name}</span>
          </div>
        ) : (
          <p style={styles.muted}>No model loaded</p>
        )}
        {models?.models && models.models.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            <p style={styles.muted}>Available models:</p>
            {models.models.map((m) => (
              <div key={m.name} style={styles.infoRow}>
                <span>{m.name}</span>
                <span style={styles.muted}>{m.size_mb} MB</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Content</h2>
        <div style={styles.infoRow}>
          <span>Indexed chunks:</span>
          <span>{health?.indexed_chunks ?? "..."}</span>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>About</h2>
        <div style={styles.infoRow}>
          <span>Version:</span>
          <span>0.1.0</span>
        </div>
        <div style={styles.infoRow}>
          <span>License:</span>
          <span>AGPL-3.0</span>
        </div>
        <div style={{ marginTop: "8px" }}>
          <a
            href="https://github.com/alexanderussell/survival-app"
            target="_blank"
            rel="noopener"
            style={{ color: "var(--accent)", fontSize: "14px" }}
          >
            GitHub Repository
          </a>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: "24px",
    padding: "16px",
    background: "var(--bg-secondary)",
    borderRadius: "8px",
    border: "1px solid var(--border)",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "12px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: "14px",
  },
  muted: {
    color: "var(--text-muted)",
    fontSize: "13px",
  },
  backButton: {
    padding: "6px 12px",
    background: "var(--bg-secondary)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
};
