import { useEffect, useState } from "react";

interface ContextSummaryProps {
  onBack: () => void;
  onRerun: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  region_description: "Location",
  state: "State",
  usda_zone: "USDA Zone",
  climate: "Climate",
  dwelling: "Home type",
  property_size: "Property size",
  setting: "Setting",
  household_size: "Household size",
  children: "Children",
  pets: "Pets",
  medical_needs: "Medical needs",
  water_source: "Water source",
  heating: "Heating",
  power: "Power",
  sewage: "Sewage",
  has_garden: "Garden",
  garden_size: "Garden size",
  garden_details: "Garden details",
  livestock: "Livestock",
  livestock_details: "Livestock details",
  food_storage: "Food storage",
  experience_level: "Experience",
  skills: "Skills",
  priorities: "Focus",
  preparing_for: "Preparing for",
  notes: "Notes",
};

const GROUPS: Record<string, string[]> = {
  "Location": ["region_description", "dwelling", "setting", "property_size"],
  "Household": ["household_size", "children", "pets", "medical_needs"],
  "Infrastructure": ["water_source", "heating", "power"],
  "Food Production": ["has_garden", "garden_size", "garden_details", "livestock", "livestock_details", "food_storage"],
  "About You": ["experience_level", "skills", "priorities", "notes"],
};

export function ContextSummary({ onBack, onRerun }: ContextSummaryProps) {
  const [profile, setProfile] = useState<Record<string, string | number | boolean> | null>(null);

  useEffect(() => {
    fetch("/api/context/profile")
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => setProfile({}));
  }, []);

  if (!profile) {
    return (
      <div className="cs-page">
        <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        <style>{styles}</style>
      </div>
    );
  }

  const hasData = Object.keys(profile).length > 0;

  return (
    <div className="cs-page">
      <div className="cs-inner">
        <div className="cs-header">
          <button onClick={onBack} className="cs-back" aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="cs-title">YOUR CONTEXT</h1>
            <p className="cs-sub">This personalizes every response you get</p>
          </div>
        </div>

        {!hasData ? (
          <div className="cs-empty">
            <p>No context added yet. Run the questionnaire to personalize your experience.</p>
            <button className="cs-cta" onClick={onRerun}>Start Questionnaire</button>
          </div>
        ) : (
          <>
            {Object.entries(GROUPS).map(([group, fields]) => {
              const groupFields = fields.filter((f) => profile[f] !== undefined && profile[f] !== "");
              if (groupFields.length === 0) return null;
              return (
                <div key={group} className="cs-group">
                  <div className="cs-group-label">{group}</div>
                  {groupFields.map((field) => (
                    <div key={field} className="cs-row">
                      <span className="cs-key">{FIELD_LABELS[field] || field}</span>
                      <span className="cs-val">{String(profile[field])}</span>
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="cs-actions">
              <button className="cs-cta-outline" onClick={onRerun}>
                Re-run Questionnaire
              </button>
              <p className="cs-privacy">
                All data stored locally on your device. Nothing leaves your network.
              </p>
            </div>
          </>
        )}
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .cs-page {
    min-height: 100vh;
    padding: 24px;
    animation: fadeInUp 0.3s ease;
  }
  .cs-inner {
    max-width: 520px;
    margin: 0 auto;
  }
  .cs-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  .cs-back {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg-elevated); color: var(--text-muted);
    border: 1px solid var(--border); border-radius: 6px;
    cursor: pointer; flex-shrink: 0; transition: all 0.15s;
  }
  .cs-back:hover { color: var(--text); border-color: var(--border-light); }
  .cs-title {
    font-family: var(--font-mono); font-size: 13px; font-weight: 500;
    letter-spacing: 0.14em; color: var(--text);
  }
  .cs-sub {
    font-size: 12px; color: var(--text-muted); margin-top: 1px;
  }
  .cs-empty {
    text-align: center; padding: 40px 20px;
    color: var(--text-muted); font-size: 14px;
  }
  .cs-cta {
    display: inline-block; margin-top: 16px;
    padding: 10px 24px; background: var(--accent); color: var(--bg);
    border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: var(--font-body); transition: filter 0.15s;
  }
  .cs-cta:hover { filter: brightness(1.1); }
  .cs-group {
    margin-bottom: 16px;
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: 8px; padding: 14px 16px;
  }
  .cs-group-label {
    font-family: var(--font-mono); font-size: 9.5px; font-weight: 500;
    color: var(--text-dim); letter-spacing: 0.14em;
    margin-bottom: 10px; padding-bottom: 6px;
    border-bottom: 1px solid var(--border); text-transform: uppercase;
  }
  .cs-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 5px 0; font-size: 13px; gap: 16px;
  }
  .cs-key { color: var(--text-muted); flex-shrink: 0; }
  .cs-val {
    color: var(--text); text-align: right;
    word-break: break-word; max-width: 60%;
  }
  .cs-actions {
    margin-top: 8px; padding-top: 16px;
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .cs-cta-outline {
    padding: 8px 20px;
    background: none; border: 1px solid var(--border-light);
    border-radius: 6px; color: var(--text-muted);
    font-family: var(--font-mono); font-size: 12px;
    cursor: pointer; transition: all 0.15s;
  }
  .cs-cta-outline:hover {
    border-color: var(--accent); color: var(--text);
  }
  .cs-privacy {
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-dim); margin-top: 12px; letter-spacing: 0.02em;
  }
`;
